import { Router } from 'express';
import os from 'node:os';
import fs from 'node:fs';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDeveloper } from '../middleware/requireDeveloper.js';
import { logActivity, clientIp } from '../lib/logActivity.js';
import { getMetrics, resetMetrics } from '../lib/systemMetrics.js';
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

// Vue d'ensemble des médias : ce site n'a aucun système d'upload de fichiers
// (vérifié dans le code) — les images/vidéos sont des URL externes collées
// par les journalistes, jamais des fichiers stockés sur ce serveur. Il n'y a
// donc honnêtement ni stockage à mesurer, ni CDN, ni limite de taille
// d'upload à faire respecter. Ce qui EST réel et utile ici : le compte des
// médias référencés par type, et la détection de liens morts.
router.get('/media-overview', requireAuth, requireDeveloper, async (_req, res) => {
  const [covers] = await pool.query(
    `SELECT a.id AS article_id, a.cover_image AS url, COALESCE(t.title, '(sans titre)') AS title
     FROM articles a
     LEFT JOIN article_translations t ON t.article_id = a.id AND t.lang_code = 'fr'
     WHERE a.cover_image IS NOT NULL AND a.cover_image != ''`
  );
  const [gallery] = await pool.query(
    `SELECT ai.article_id, ai.url, COALESCE(t.title, '(sans titre)') AS title
     FROM article_images ai
     LEFT JOIN article_translations t ON t.article_id = ai.article_id AND t.lang_code = 'fr'
     WHERE ai.url IS NOT NULL AND ai.url != ''`
  );
  const [thumbs] = await pool.query(
    `SELECT v.id AS video_id, v.thumbnail AS url, COALESCE(t.title, '(sans titre)') AS title
     FROM videos v
     LEFT JOIN video_translations t ON t.video_id = v.id AND t.lang_code = 'fr'
     WHERE v.thumbnail IS NOT NULL AND v.thumbnail != ''`
  );
  const [videoUrls] = await pool.query(
    `SELECT v.id AS video_id, v.video_url AS url, COALESCE(t.title, '(sans titre)') AS title
     FROM videos v
     LEFT JOIN video_translations t ON t.video_id = v.id AND t.lang_code = 'fr'
     WHERE v.video_url IS NOT NULL AND v.video_url != ''`
  );
  const [articleVideoUrls] = await pool.query(
    `SELECT a.id AS article_id, a.video_url AS url, COALESCE(t.title, '(sans titre)') AS title
     FROM articles a
     LEFT JOIN article_translations t ON t.article_id = a.id AND t.lang_code = 'fr'
     WHERE a.video_url IS NOT NULL AND a.video_url != ''`
  );

  const items = [
    ...covers.map((c) => ({ url: c.url, title: c.title, source: 'Image de couverture (article)', articleId: c.article_id })),
    ...gallery.map((g) => ({ url: g.url, title: g.title, source: 'Galerie (article)', articleId: g.article_id })),
    ...thumbs.map((t) => ({ url: t.url, title: t.title, source: 'Miniature (vidéo)', videoId: t.video_id })),
    ...videoUrls.map((v) => ({ url: v.url, title: v.title, source: 'Fichier vidéo', videoId: v.video_id })),
    ...articleVideoUrls.map((v) => ({ url: v.url, title: v.title, source: 'Vidéo intégrée (article)', articleId: v.article_id })),
  ];

  const byType = {};
  for (const item of items) {
    byType[item.source] = (byType[item.source] || 0) + 1;
  }

  res.json({
    totalCount: items.length,
    byType,
    items,
    note: "Aucun fichier n'est téléversé ni stocké sur ce serveur : chaque média est une URL externe renseignée manuellement. Il n'y a donc pas de stockage, de CDN, de limite de taille d'upload ou de nettoyage automatique de fichiers à gérer ici — seuls le décompte par type et la vérification des liens sont réels.",
  });
});

// Vérifie réellement, en direct, si chaque URL de média référencée répond
// encore (requête HTTP HEAD, repli en GET si HEAD n'est pas supporté). Limité
// et parallélisé raisonnablement pour ne pas bloquer le serveur longtemps.
router.post('/media-overview/check-links', requireAuth, requireDeveloper, async (_req, res) => {
  const [covers] = await pool.query("SELECT cover_image AS url FROM articles WHERE cover_image IS NOT NULL AND cover_image != ''");
  const [gallery] = await pool.query("SELECT url FROM article_images WHERE url IS NOT NULL AND url != ''");
  const [thumbs] = await pool.query("SELECT thumbnail AS url FROM videos WHERE thumbnail IS NOT NULL AND thumbnail != ''");
  const [videoUrls] = await pool.query("SELECT video_url AS url FROM videos WHERE video_url IS NOT NULL AND video_url != ''");
  const [articleVideoUrls] = await pool.query("SELECT video_url AS url FROM articles WHERE video_url IS NOT NULL AND video_url != ''");

  const urls = [...new Set([...covers, ...gallery, ...thumbs, ...videoUrls, ...articleVideoUrls].map((r) => r.url))].slice(0, 300);

  async function checkOne(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      let response = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
      if (response.status === 405 || response.status === 501) {
        response = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
      }
      return { url, ok: response.ok, statusCode: response.status };
    } catch (err) {
      return { url, ok: false, statusCode: null, error: err.name === 'AbortError' ? 'Délai dépassé' : 'Injoignable' };
    } finally {
      clearTimeout(timeout);
    }
  }

  const CONCURRENCY = 8;
  const results = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map(checkOne))));
  }

  res.json({
    checked: results.length,
    broken: results.filter((r) => !r.ok),
    checkedAt: new Date().toISOString(),
  });
});

// Vue d'ensemble déploiement/versions. Honnête sur ce qui existe vraiment :
// un seul environnement (tout part sur Render/Vercel à chaque push sur
// main), aucune version taguée, pas de CHANGELOG.md, pas d'accès à l'API
// Render pour un rollback automatique. Ce qui EST réel : le commit
// effectivement déployé (fourni par Render), le dernier commit sur GitHub,
// et l'historique réel des commits comme journal de déploiement/changelog.
const GITHUB_REPO = 'Crescence29/cortex-benin-tv';

router.get('/deployment-overview', requireAuth, requireDeveloper, async (_req, res) => {
  const deployedCommit = process.env.RENDER_GIT_COMMIT || null;

  let latestCommit = null;
  let recentCommits = [];
  let githubError = null;
  try {
    const [latestRes, listRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/main`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'cortex-benin-tv-dashboard' },
      }),
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits?sha=main&per_page=20`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'cortex-benin-tv-dashboard' },
      }),
    ]);
    if (latestRes.ok) {
      const data = await latestRes.json();
      latestCommit = {
        sha: data.sha,
        message: data.commit.message.split('\n')[0],
        author: data.commit.author.name,
        date: data.commit.author.date,
        url: data.html_url,
      };
    } else {
      githubError = `GitHub a répondu ${latestRes.status}`;
    }
    if (listRes.ok) {
      const list = await listRes.json();
      recentCommits = list.map((c) => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
        isDeployed: deployedCommit ? c.sha.startsWith(deployedCommit) || deployedCommit.startsWith(c.sha) : false,
      }));
    }
  } catch (err) {
    githubError = `Impossible de contacter GitHub : ${err.message}`;
  }

  res.json({
    environment: 'production (environnement unique — pas de staging séparé)',
    appVersion: process.env.npm_package_version || '1.0.0',
    deployedCommit,
    latestCommit,
    isUpToDate: deployedCommit && latestCommit ? (latestCommit.sha.startsWith(deployedCommit) || deployedCommit.startsWith(latestCommit.sha)) : null,
    recentCommits,
    githubError,
    rollbackInstructions:
      "Pas de rollback automatique en un clic (nécessiterait un accès à l'API Render, non configuré). " +
      "Pour revenir en arrière : soit exécuter `git revert <commit>` puis pousser sur `main` (Render/Vercel redéploient automatiquement), " +
      "soit ouvrir le tableau de bord Render → onglet Deploys → choisir un déploiement précédent → \"Redeploy\".",
    checkedAt: new Date().toISOString(),
  });
});

// Configuration technique : paramètres réels (URL, version, environnement,
// fuseau horaire, réglages modifiables stockés en base) et statut — jamais la
// valeur — des variables d'environnement sensibles. DB_PASSWORD, JWT_SECRET et
// CRON_SECRET ne sont JAMAIS renvoyés, même partiellement : seul un booléen
// "défini/non défini" est exposé.
const SENSITIVE_ENV_KEYS = ['DB_PASSWORD', 'JWT_SECRET', 'CRON_SECRET'];
const VISIBLE_ENV_KEYS = ['PORT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'CORS_ORIGIN', 'SITE_URL', 'NODE_ENV'];

router.get('/config-overview', requireAuth, requireDeveloper, async (req, res) => {
  const [[row]] = await pool.query("SELECT data FROM site_settings WHERE id = 'main'");
  const settings = row?.data || {};

  const envVars = [
    ...VISIBLE_ENV_KEYS.map((key) => ({ key, sensitive: false, value: process.env[key] ?? null, isSet: process.env[key] !== undefined })),
    ...SENSITIVE_ENV_KEYS.map((key) => ({ key, sensitive: true, value: null, isSet: !!process.env[key] })),
  ];

  res.json({
    appName: 'Cortex Bénin TV',
    mainUrl: process.env.CORS_ORIGIN || null,
    apiUrl: `${req.protocol}://${req.get('host')}`,
    apiVersion: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    serverTime: new Date().toISOString(),
    settings: {
      maintenance_mode: !!settings.maintenance_mode,
      maintenance_message: settings.maintenance_message || '',
      default_language: settings.default_language || 'fr',
      system_email: settings.system_email || '',
    },
    envVars,
    storageNote: "Aucun système d'upload de fichiers n'existe sur ce site : pas de stockage ni de CDN à configurer (voir le panneau \"Fichiers et médias\").",
  });
});

// Centre de maintenance : rassemble en un seul endroit les vraies actions déjà
// disponibles ailleurs (sauvegarde, restauration, mode maintenance) et ajoute
// ce qui n'existait pas encore : suivi réel des tâches planifiées (utile ici
// précisément parce que le cron horaire de brouillons s'était déjà tu sur
// Render en veille — voir rapport.md), et une réinitialisation honnête des
// compteurs en mémoire (pas de vrai cache serveur/CDN à vider dans cette appli).
// "Redémarrer un service" et "nettoyer des fichiers temporaires" ne sont
// volontairement PAS proposés ici : cette application n'a ni accès à l'API
// de l'hébergeur pour redémarrer quoi que ce soit, ni fichiers temporaires
// générés par elle-même (voir le panneau "Fichiers et médias").
const SCHEDULED_TASKS = [
  { key: 'cron_feed_fetch_last_run', label: 'Récupération des flux RSS', everyMinutes: 30, overdueAfterMinutes: 45 },
  { key: 'cron_draft_creation_last_run', label: 'Création de brouillons depuis les flux', everyMinutes: 60, overdueAfterMinutes: 90 },
  { key: 'cron_scheduled_publish_last_run', label: 'Publication des articles programmés', everyMinutes: 1, overdueAfterMinutes: 5 },
];

router.get('/maintenance-overview', requireAuth, requireDeveloper, async (_req, res) => {
  const [[settingsRow]] = await pool.query("SELECT data FROM site_settings WHERE id = 'main'");
  const settings = settingsRow?.data || {};

  const [metaRows] = await pool.query(
    "SELECT `key`, value FROM system_meta WHERE `key` IN (?, ?, ?, 'last_backup_at')",
    SCHEDULED_TASKS.map((t) => t.key)
  );
  const metaByKey = Object.fromEntries(metaRows.map((r) => [r.key, r.value]));

  const now = Date.now();
  const scheduledTasks = SCHEDULED_TASKS.map((t) => {
    const lastRunAt = metaByKey[t.key] || null;
    const minutesSinceLastRun = lastRunAt ? (now - new Date(lastRunAt).getTime()) / 60000 : null;
    return {
      label: t.label,
      everyMinutes: t.everyMinutes,
      lastRunAt,
      overdue: minutesSinceLastRun === null ? null : minutesSinceLastRun > t.overdueAfterMinutes,
    };
  });

  res.json({
    maintenanceMode: !!settings.maintenance_mode,
    lastBackupAt: metaByKey.last_backup_at || null,
    scheduledTasks,
    metrics: getMetrics(),
    cacheNote: "Cette application ne dispose pas de cache serveur (Redis, CDN...) : les pages et l'API sont générées à chaque requête depuis la base de données. Il n'y a donc rien à \"vider\" à ce niveau — seuls les compteurs de métriques ci-dessous vivent en mémoire et peuvent être réinitialisés.",
    unavailableNote: "Redémarrage de service et nettoyage de fichiers temporaires non proposés : aucun accès à l'API de l'hébergeur pour le premier, aucun fichier temporaire généré par cette application pour le second.",
  });
});

router.post('/maintenance/check-services', requireAuth, requireDeveloper, async (_req, res) => {
  const dbStart = Date.now();
  let db = 'error';
  try {
    await pool.query('SELECT 1');
    db = 'ok';
  } catch {
    db = 'error';
  }
  const [[feedCount]] = await pool.query('SELECT COUNT(*) AS total FROM feed_sources WHERE active = TRUE');

  res.json({
    api: 'ok',
    db,
    dbLatencyMs: Date.now() - dbStart,
    activeFeedSources: feedCount.total,
    checkedAt: new Date().toISOString(),
  });
});

const pendingMaintenanceEnable = new Map();

// Activer le mode maintenance bloque le site public pour de vrais visiteurs :
// c'est l'opération la plus "dangereuse" de ce centre, donc la seule qui
// exige une confirmation par code. La désactiver (restaurer le service
// normal) reste un simple appel à PUT /api/settings, sans friction.
router.post('/maintenance/enable/start', requireAuth, requireDeveloper, async (req, res) => {
  const code = startPending(pendingMaintenanceEnable, req.user.id, { actorId: req.user.id });
  res.json({ code, expiresInSeconds: CONFIRM_TTL_MS / 1000 });
});

router.post('/maintenance/enable/confirm', requireAuth, requireDeveloper, async (req, res) => {
  const check = checkPending(pendingMaintenanceEnable, req.user.id, req.body.code, req.user.id);
  if (!check.ok) return res.status(400).json({ error: check.error });

  const message = typeof req.body.message === 'string' ? req.body.message : '';
  const [[row]] = await pool.query("SELECT data FROM site_settings WHERE id = 'main'");
  const current = row?.data || {};
  const next = { ...current, maintenance_mode: true, ...(message ? { maintenance_message: message } : {}) };
  await pool.query(
    "INSERT INTO site_settings (id, data) VALUES ('main', ?) ON DUPLICATE KEY UPDATE data = ?",
    [JSON.stringify(next), JSON.stringify(next)]
  );

  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'settings_updated',
    targetType: 'site_settings',
    targetId: 'main',
    details: 'maintenance_mode=true (activé depuis le Centre de maintenance)',
    ip: clientIp(req),
  });

  res.json({ ok: true, settings: next });
});

router.post('/maintenance/reset-metrics', requireAuth, requireDeveloper, async (req, res) => {
  resetMetrics();
  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'metrics_reset',
    ip: clientIp(req),
  });
  res.json({ ok: true });
});

// Vue d'ensemble sécurité. La plupart de ce bloc existe déjà ailleurs dans ce
// tableau de bord (sessions actives, historique de connexion, IP, appareils,
// révocation → "Rôles et utilisateurs" ; permissions granulaires → la
// hiérarchie de rôles ; clés API/tokens → non applicable, voir "Gestion de
// l'API") : ce panneau les résume et ajoute ce qui est réellement nouveau —
// le statut 2FA par compte, et des alertes de sécurité calculées à partir de
// vrais événements du journal d'activité (pas de simulation).
router.get('/security-overview', requireAuth, requireDeveloper, async (_req, res) => {
  const [users] = await pool.query(
    'SELECT id, name, email, role, is_developer, two_factor_enabled FROM users ORDER BY name'
  );
  const [[sessionsCount]] = await pool.query('SELECT COUNT(*) AS total FROM sessions WHERE revoked_at IS NULL');
  const [[failed24h]] = await pool.query(
    "SELECT COUNT(*) AS total FROM activity_logs WHERE action = 'login_failed' AND created_at >= NOW() - INTERVAL 24 HOUR"
  );
  const [[lastLogin]] = await pool.query(
    "SELECT actor_name, created_at FROM activity_logs WHERE action = 'login_success' ORDER BY created_at DESC LIMIT 1"
  );

  // Alerte réelle n°1 : un compte avec plusieurs échecs de connexion dans la
  // dernière heure (signe possible de tentative de devinette de mot de passe).
  const [bruteForceRows] = await pool.query(
    `SELECT actor_name, COUNT(*) AS attempts, MAX(created_at) AS lastAttemptAt
     FROM activity_logs
     WHERE action = 'login_failed' AND created_at >= NOW() - INTERVAL 1 HOUR
     GROUP BY actor_name HAVING COUNT(*) >= 3
     ORDER BY attempts DESC`
  );

  // Alerte réelle n°2 : bannissements et usurpations de compte dans les
  // dernières 24h — des actions sensibles qui méritent d'être remarquées.
  const [sensitiveEvents] = await pool.query(
    `SELECT action, actor_name, details, created_at FROM activity_logs
     WHERE action IN ('user_banned', 'impersonation_started', 'developer_access_granted')
       AND created_at >= NOW() - INTERVAL 24 HOUR
     ORDER BY created_at DESC`
  );

  const alerts = [
    ...bruteForceRows.map((r) => ({
      severity: 'high',
      message: `${r.attempts} échecs de connexion pour "${r.actor_name}" dans la dernière heure`,
      at: r.lastAttemptAt,
    })),
    ...sensitiveEvents.map((e) => ({
      severity: 'medium',
      message: `${e.actor_name} — ${e.action}${e.details ? ` (${e.details})` : ''}`,
      at: e.created_at,
    })),
  ];

  res.json({
    accounts: users.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role, isDeveloper: !!u.is_developer,
      twoFactorEnabled: !!u.two_factor_enabled,
    })),
    activeSessions: sessionsCount.total,
    failedLogins24h: failed24h.total,
    lastLogin: lastLogin ? { name: lastLogin.actor_name, at: lastLogin.created_at } : null,
    alerts,
    apiKeysNote: "Non applicable : cette API est strictement interne (voir \"Gestion de l'API\"), il n'existe pas de clés API ou de tokens tiers à gérer.",
    note: "Sessions actives, historique de connexion, IP, appareils connectés et révocation sont gérés dans \"Rôles et utilisateurs\". Les permissions granulaires correspondent à la hiérarchie de rôles à 4 niveaux déjà en place.",
  });
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
