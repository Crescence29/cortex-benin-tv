import { Router } from 'express';
import os from 'node:os';
import fs from 'node:fs';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';
import { logActivity, clientIp } from '../lib/logActivity.js';
import { getMetrics } from '../lib/systemMetrics.js';

const router = Router();

// Historique complet conservé en base ; on ne renvoie que les 500 entrées les plus récentes.
router.get('/activity-logs', requireAuth, requireSuperAdmin, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500');
  res.json(rows);
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
router.get('/system-status', requireAuth, requireSuperAdmin, async (_req, res) => {
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

  const metrics = getMetrics();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  res.json({
    api: 'ok',
    db,
    dbLatencyMs,
    uptimeSeconds: metrics.uptimeSeconds,
    requestCount: metrics.requestCount,
    avgResponseTimeMs: metrics.avgResponseTimeMs,
    errorCount: metrics.errorCount,
    recentErrors: metrics.recentErrors,
    loginsLast24h: loginStats.last24h,
    lastLoginAt: loginStats.lastLoginAt,
    version: process.env.npm_package_version || '1.0.0',
    deployCommit: process.env.RENDER_GIT_COMMIT || null,
    lastBackupAt: lastBackup?.value || null,
    memory: { totalBytes: totalMem, freeBytes: freeMem, usedBytes: totalMem - freeMem },
    cpuLoad1m: os.loadavg()[0],
    cpuCount: os.cpus().length,
    disk: diskUsage(),
    checkedAt: new Date().toISOString(),
  });
});

// Sauvegarde manuelle : exporte le contenu réel de chaque table en JSON et
// l'envoie en téléchargement, tout en enregistrant la date pour l'afficher
// ensuite comme "Dernière sauvegarde" sur le dashboard.
router.post('/backup', requireAuth, requireSuperAdmin, async (req, res) => {
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
