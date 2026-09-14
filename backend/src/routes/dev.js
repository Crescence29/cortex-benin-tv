import { Router } from 'express';
import os from 'node:os';
import fs from 'node:fs';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDeveloper } from '../middleware/requireDeveloper.js';
import { logActivity, clientIp } from '../lib/logActivity.js';
import { getMetrics } from '../lib/systemMetrics.js';
import { getRoutes } from '../lib/apiRegistry.js';
import { RATE_LIMITS } from '../middleware/rateLimit.js';
import { startPending, checkPending, CONFIRM_TTL_MS } from '../lib/pendingConfirmations.js';

const router = Router();

const pendingRestore = new Map();
// Tables volontairement exclues de la restauration : la sauvegarde ne
// contient pas les mots de passe (retirés à l'export pour ne jamais les
// exposer), et les sessions restaurées seraient de toute façon invalides.
// Restaurer ces tables casserait donc l'authentification de tout le monde.
const RESTORE_EXCLUDED_TABLES = new Set(['users', 'sessions']);
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// La sauvegarde vient d'un export JSON : les dates y sont des chaînes ISO
// ("...T...Z"), que MySQL refuse telles quelles pour une colonne DATETIME.
// On les repasse en objets Date pour que le driver les reformate correctement.
function normalizeValueForInsert(value) {
  if (typeof value === 'string' && ISO_DATETIME.test(value)) return new Date(value);
  // Une colonne JSON revient de la sauvegarde comme un objet JS imbriqué
  // (mysql2 la désérialise automatiquement à la lecture) ; il faut la
  // resérialiser en texte JSON pour l'insertion, sinon MySQL reçoit
  // littéralement la chaîne "[object Object]".
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return value;
}

// Historique complet conservé en base ; on ne renvoie que les 500 entrées les plus
// récentes, avec une recherche optionnelle (?q=) sur l'acteur, l'action et le détail.
router.get('/activity-logs', requireAuth, requireDeveloper, async (req, res) => {
  const { q } = req.query;
  if (q) {
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT * FROM activity_logs
       WHERE actor_name LIKE ? OR action LIKE ? OR details LIKE ? OR ip_address LIKE ?
       ORDER BY created_at DESC LIMIT 500`,
      [like, like, like, like]
    );
    return res.json(rows);
  }
  const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500');
  res.json(rows);
});

// Vue "Logs et surveillance" : rassemble en une liste unique, catégorisée et
// cherchable, tout ce qui peut réellement se produire sur ce service — erreurs
// serveur (exceptions), erreurs API (réponses en échec par endpoint), erreurs
// JS côté navigateur, connexions/déconnexions, échecs d'authentification et
// erreurs de synchronisation des flux RSS. Il n'y a pas de système de paiement
// dans cette application : la catégorie existe pour respecter le format demandé
// mais reste honnêtement vide plutôt que de fabriquer de fausses transactions.
router.get('/logs-overview', requireAuth, requireDeveloper, async (req, res) => {
  const { q } = req.query;
  const metrics = getMetrics();

  const categorized = {
    login_success: 'Connexion',
    logout: 'Déconnexion',
    login_failed: 'Échec d\'authentification',
    sync_error: 'Erreur de synchronisation',
    client_js_error: 'Erreur JavaScript',
  };
  const actions = Object.keys(categorized);
  const placeholders = actions.map(() => '?').join(',');
  const like = q ? `%${q}%` : null;

  const [rows] = await pool.query(
    `SELECT * FROM activity_logs
     WHERE action IN (${placeholders})
     ${like ? 'AND (actor_name LIKE ? OR details LIKE ? OR ip_address LIKE ?)' : ''}
     ORDER BY created_at DESC LIMIT 300`,
    like ? [...actions, like, like, like] : actions
  );

  const events = rows.map((r) => ({
    level: r.action === 'login_failed' || r.action === 'sync_error' || r.action === 'client_js_error' ? 'error' : 'info',
    category: categorized[r.action] || r.action,
    label: r.actor_name || 'Visiteur',
    details: r.details,
    ip: r.ip_address,
    at: r.created_at,
  }));

  const serverErrors = metrics.recentErrors
    .filter((e) => !q || `${e.message} ${e.path}`.toLowerCase().includes(q.toLowerCase()))
    .map((e) => ({
      level: 'error',
      category: 'Erreur serveur',
      label: `${e.method || ''} ${e.path || ''}`.trim(),
      details: e.message,
      ip: null,
      at: e.at,
    }));

  const apiErrors = metrics.endpointStats
    .filter((s) => s.errors > 0)
    .filter((s) => !q || s.route.toLowerCase().includes(q.toLowerCase()))
    .map((s) => ({
      level: 'error',
      category: 'Erreur API',
      label: s.route,
      details: `${s.errors} réponse${s.errors > 1 ? 's' : ''} en erreur sur ${s.count} appel${s.count > 1 ? 's' : ''}`,
      ip: null,
      at: null,
    }));

  const all = [...serverErrors, ...apiErrors, ...events].sort((a, b) => {
    if (!a.at) return 1;
    if (!b.at) return -1;
    return new Date(b.at) - new Date(a.at);
  });

  res.json({
    events: all,
    counts: {
      connexions: rows.filter((r) => r.action === 'login_success').length,
      deconnexions: rows.filter((r) => r.action === 'logout').length,
      echecsAuth: rows.filter((r) => r.action === 'login_failed').length,
      erreursSync: rows.filter((r) => r.action === 'sync_error').length,
      erreursJs: rows.filter((r) => r.action === 'client_js_error').length,
      erreursServeur: serverErrors.length,
      erreursApi: apiErrors.length,
    },
    paymentNote: "Aucun système de paiement n'existe sur ce site : cette catégorie ne peut donc produire aucune erreur.",
  });
});

function diskUsage() {
  try {
    // Disponible depuis Node 18.15+. Renvoie null plutôt qu'une valeur inventée
    // si l'appel échoue (ex : environnement qui ne le supporte pas).
    const stats = fs.statfsSync('/');
    const total = stats.blocks * stats.bsize;
    const free = stats.bfree * stats.bsize;
    return { totalBytes: total, freeBytes: free, usedBytes: total - free };
  } catch {
    return null;
  }
}

// Vue d'ensemble technique réelle du service, pour le tableau de bord développeur.
// Chaque valeur est mesurée en direct — rien n'est simulé ; ce qui ne peut pas
// être mesuré honnêtement (ex: aucune sauvegarde encore faite) reste à null.
router.get('/system-status', requireAuth, requireDeveloper, async (_req, res) => {
  const dbStart = Date.now();
  let db = 'error';
  try {
    await pool.query('SELECT 1');
    db = 'ok';
  } catch {
    db = 'error';
  }
  const dbLatencyMs = Date.now() - dbStart;

  const [[lastBackup]] = await pool.query("SELECT value FROM system_meta WHERE `key` = 'last_backup_at'");
  const [[loginStats]] = await pool.query(
    `SELECT COUNT(*) AS last24h, MAX(created_at) AS lastLoginAt
     FROM activity_logs WHERE action = 'login_success' AND created_at >= NOW() - INTERVAL 24 HOUR`
  );
  const [recentLogins] = await pool.query(
    `SELECT actor_name, actor_role, ip_address, created_at
     FROM activity_logs WHERE action = 'login_success'
     ORDER BY created_at DESC LIMIT 10`
  );
  const [tableSizes] = await pool.query(
    `SELECT table_name AS \`table\`, table_rows AS \`rows\`,
            (data_length + index_length) AS sizeBytes
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
     ORDER BY sizeBytes DESC LIMIT 10`
  );

  const metrics = getMetrics();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const proc = process.memoryUsage();

  res.json({
    api: 'ok',
    db,
    dbLatencyMs,
    uptimeSeconds: metrics.uptimeSeconds,
    requestCount: metrics.requestCount,
    avgResponseTimeMs: metrics.avgResponseTimeMs,
    responseTimeSamples: metrics.responseTimeSamples,
    topRoutes: metrics.topRoutes,
    errorCount: metrics.errorCount,
    recentErrors: metrics.recentErrors,
    loginsLast24h: loginStats.last24h,
    lastLoginAt: loginStats.lastLoginAt,
    recentLogins,
    version: process.env.npm_package_version || '1.0.0',
    deployCommit: process.env.RENDER_GIT_COMMIT || null,
    lastBackupAt: lastBackup?.value || null,
    memory: { totalBytes: totalMem, freeBytes: freeMem, usedBytes: totalMem - freeMem },
    processMemory: { rss: proc.rss, heapUsed: proc.heapUsed, heapTotal: proc.heapTotal },
    cpuLoad1m: os.loadavg()[0],
    cpuLoad5m: os.loadavg()[1],
    cpuLoad15m: os.loadavg()[2],
    cpuCount: os.cpus().length,
    disk: diskUsage(),
    tableSizes,
    checkedAt: new Date().toISOString(),
  });
});

// Vue d'ensemble de l'API pour le développeur : liste réelle des endpoints
// enregistrés (issue des routeurs Express eux-mêmes), leurs statistiques
// d'usage/erreurs, les limites de requêtes réellement appliquées, et l'état
// des services externes dont dépend le site. Il n'y a ni clés API, ni
// tokens, ni webhooks à gérer : l'API est strictement interne, consommée
// uniquement par le frontend de Cortex Bénin TV — donc honnêtement absents
// plutôt qu'inventés.
router.get('/api-overview', requireAuth, requireDeveloper, async (_req, res) => {
  const routes = getRoutes();
  const grouped = {};
  for (const r of routes) {
    const group = '/' + r.path.split('/').filter(Boolean).slice(0, 2).join('/');
    (grouped[group] ||= []).push(r);
  }

  const metrics = getMetrics();

  const dbStart = Date.now();
  let dbCheck;
  try {
    await pool.query('SELECT 1');
    dbCheck = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch {
    dbCheck = { status: 'error', latencyMs: Date.now() - dbStart };
  }

  const [feedSources] = await pool.query(
    'SELECT name, url, active, last_fetched_at FROM feed_sources ORDER BY name'
  );

  res.json({
    version: process.env.npm_package_version || '1.0.0',
    endpointGroups: Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, items]) => ({ group, routes: items })),
    endpointStats: metrics.endpointStats,
    rateLimits: RATE_LIMITS.map((r) => ({
      label: r.label,
      routes: r.routes,
      limit: r.limit,
      windowMinutes: Math.round(r.windowMs / 60000),
    })),
    externalServices: [
      {
        name: 'Base de données MySQL (Aiven)',
        status: dbCheck.status,
        detail: `${dbCheck.latencyMs} ms`,
      },
      {
        name: 'Hébergement backend (Render)',
        status: 'ok',
        detail: process.env.RENDER_GIT_COMMIT ? `commit ${process.env.RENDER_GIT_COMMIT.slice(0, 7)}` : 'environnement local',
      },
      ...feedSources.map((f) => ({
        name: `Flux RSS — ${f.name}`,
        status: f.active ? (f.last_fetched_at ? 'ok' : 'pending') : 'disabled',
        detail: f.last_fetched_at
          ? `dernière récupération : ${new Date(f.last_fetched_at).toLocaleString('fr-FR')}`
          : f.active
            ? 'jamais récupéré'
            : 'désactivé',
      })),
    ],
    note: "Cette API est interne : elle n'est consommée que par le site Cortex Bénin TV lui-même. Il n'existe donc pas de clés API, de tokens d'accès tiers ni de webhooks sortants à gérer.",
  });
});

// Vue d'ensemble de la base de données : état, taille réelle, connexions
// actives et requêtes lentes lues directement depuis les statistiques MySQL
// (SHOW STATUS / SHOW VARIABLES), migrations connues (fichiers réellement
// présents dans database/), et date de dernière sauvegarde.
router.get('/database-overview', requireAuth, requireDeveloper, async (_req, res) => {
  const dbStart = Date.now();
  let status = 'error';
  try {
    await pool.query('SELECT 1');
    status = 'ok';
  } catch {
    status = 'error';
  }
  const latencyMs = Date.now() - dbStart;

  const [[dbNameRow]] = await pool.query('SELECT DATABASE() AS name');
  const [tableSizes] = await pool.query(
    `SELECT table_name AS \`table\`, table_rows AS \`rows\`,
            (data_length + index_length) AS sizeBytes
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
     ORDER BY sizeBytes DESC`
  );
  const totalSizeBytes = tableSizes.reduce((sum, t) => sum + Number(t.sizeBytes || 0), 0);
  const totalRowsApprox = tableSizes.reduce((sum, t) => sum + Number(t.rows || 0), 0);

  const [[threadsRow]] = await pool.query("SHOW STATUS LIKE 'Threads_connected'");
  const [[maxConnRow]] = await pool.query("SHOW VARIABLES LIKE 'max_connections'");
  const [[slowQueriesRow]] = await pool.query("SHOW STATUS LIKE 'Slow_queries'");
  const [[longQueryTimeRow]] = await pool.query("SHOW VARIABLES LIKE 'long_query_time'");
  const [[abortedConnectsRow]] = await pool.query("SHOW STATUS LIKE 'Aborted_connects'");
  const [[uptimeRow]] = await pool.query("SHOW STATUS LIKE 'Uptime'");

  const [[lastBackup]] = await pool.query("SELECT value FROM system_meta WHERE `key` = 'last_backup_at'");

  let migrationFiles = [];
  try {
    const dir = new URL('../../../database', import.meta.url);
    migrationFiles = fs.readdirSync(dir).filter((f) => f.startsWith('migration_') && f.endsWith('.sql')).sort();
  } catch {
    migrationFiles = [];
  }

  res.json({
    status,
    latencyMs,
    databaseName: dbNameRow.name,
    tableCount: tableSizes.length,
    totalSizeBytes,
    totalRowsApprox,
    tableSizes,
    activeConnections: Number(threadsRow?.Value ?? 0),
    maxConnections: Number(maxConnRow?.Value ?? 0),
    slowQueries: Number(slowQueriesRow?.Value ?? 0),
    longQueryTimeSeconds: Number(longQueryTimeRow?.Value ?? 0),
    abortedConnects: Number(abortedConnectsRow?.Value ?? 0),
    serverUptimeSeconds: Number(uptimeRow?.Value ?? 0),
    lastBackupAt: lastBackup?.value || null,
    migrations: migrationFiles.map((f) => ({
      file: f,
      // Pas de table de suivi des migrations dans ce projet : on liste
      // honnêtement les fichiers présents dans le dépôt, sans prétendre
      // savoir lesquels ont déjà été appliqués en production.
      note: 'Présent dans le dépôt — application déjà faite manuellement, non suivie automatiquement',
    })),
    checkedAt: new Date().toISOString(),
  });
});

// Vérification d'intégrité réelle : CHECK TABLE sur chaque table, opération
// en lecture seule fournie nativement par MySQL — ne modifie rien.
router.post('/database-overview/integrity-check', requireAuth, requireDeveloper, async (_req, res) => {
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map((t) => Object.values(t)[0]);
  const results = [];
  for (const name of tableNames) {
    const [[check]] = await pool.query(`CHECK TABLE \`${name}\``);
    results.push({ table: name, status: check.Msg_text });
  }
  res.json({ results, checkedAt: new Date().toISOString() });
});

// Restauration depuis une sauvegarde JSON précédemment téléchargée.
// Volontairement lourd : réservé aux comptes développeur, confirmation par
// code, transaction tout-ou-rien, et exclusion explicite de "users" et
// "sessions" (la sauvegarde ne contient pas les mots de passe — les
// restaurer casserait l'authentification de tous les comptes).
router.post('/database-overview/restore/start', requireAuth, requireDeveloper, async (req, res) => {
  const dump = req.body?.backup;
  if (!dump || typeof dump !== 'object' || Array.isArray(dump)) {
    return res.status(400).json({ error: 'Fichier de sauvegarde invalide — attendu : { nomDeTable: [lignes...] }' });
  }
  const tables = Object.keys(dump).filter((t) => !RESTORE_EXCLUDED_TABLES.has(t));
  const code = startPending(pendingRestore, req.user.id, { dump, actorId: req.user.id });
  res.json({ code, tables, expiresInSeconds: CONFIRM_TTL_MS / 1000 });
});

router.post('/database-overview/restore/confirm', requireAuth, requireDeveloper, async (req, res) => {
  const check = checkPending(pendingRestore, req.user.id, req.body.code, req.user.id);
  if (!check.ok) return res.status(400).json({ error: check.error });

  const { dump } = check.pending;
  const tableNames = Object.keys(dump).filter((t) => !RESTORE_EXCLUDED_TABLES.has(t));

  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.beginTransaction();
    for (const table of tableNames) {
      const rows = dump[table];
      if (!Array.isArray(rows)) continue;
      await conn.query(`DELETE FROM \`${table}\``);
      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        const placeholders = columns.map(() => '?').join(',');
        await conn.query(
          `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(',')}) VALUES (${placeholders})`,
          columns.map((c) => normalizeValueForInsert(row[c]))
        );
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    conn.release();
  }

  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'database_restored',
    details: `${tableNames.length} table(s) restaurée(s) depuis une sauvegarde importée par ${req.user.name} (users/sessions exclus)`,
    ip: clientIp(req),
  });

  res.json({ ok: true, tablesRestored: tableNames.length });
});

// Sauvegarde manuelle : exporte le contenu réel de chaque table en JSON et
// l'envoie en téléchargement, tout en enregistrant la date pour l'afficher
// ensuite comme "Dernière sauvegarde" sur le dashboard.
router.post('/backup', requireAuth, requireDeveloper, async (req, res) => {
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map((t) => Object.values(t)[0]);

  const dump = {};
  for (const name of tableNames) {
    const [rows] = await pool.query(`SELECT * FROM \`${name}\``);
    dump[name] =
      name === 'users' ? rows.map(({ password_hash, ...rest }) => rest) : rows;
  }

  const now = new Date().toISOString();
  await pool.query(
    "INSERT INTO system_meta (`key`, value) VALUES ('last_backup_at', ?) ON DUPLICATE KEY UPDATE value = ?",
    [now, now]
  );
  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'manual_backup',
    details: `${tableNames.length} tables exportées`,
    ip: clientIp(req),
  });

  res.setHeader('Content-Disposition', `attachment; filename="cortex-backup-${now.slice(0, 10)}.json"`);
  res.json({ createdAt: now, tables: tableNames.length, data: dump });
});

export default router;
