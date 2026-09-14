import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDeveloper } from '../middleware/requireDeveloper.js';
import { logActivity, clientIp } from '../lib/logActivity.js';

const router = Router();

// Public : lu par la navbar/footer/pages pour afficher le logo courant.
router.get('/', async (_req, res) => {
  const [[row]] = await pool.query("SELECT data FROM site_settings WHERE id = 'main'");
  res.json(row?.data || { logo_mode: 'image', logo_text: 'CORTEX BÉNIN TV' });
});

router.put('/', requireAuth, requireDeveloper, async (req, res) => {
  const { logo_mode, logo_text, maintenance_mode, maintenance_message, default_language, system_email } = req.body;
  if (logo_mode && !['image', 'text'].includes(logo_mode)) {
    return res.status(400).json({ error: 'logo_mode doit être "image" ou "text"' });
  }
  const [[row]] = await pool.query("SELECT data FROM site_settings WHERE id = 'main'");
  const current = row?.data || {};
  const next = {
    ...current,
    ...(logo_mode ? { logo_mode } : {}),
    ...(logo_text !== undefined ? { logo_text } : {}),
    ...(maintenance_mode !== undefined ? { maintenance_mode: !!maintenance_mode } : {}),
    ...(maintenance_message !== undefined ? { maintenance_message } : {}),
    ...(default_language !== undefined ? { default_language } : {}),
    ...(system_email !== undefined ? { system_email } : {}),
  };

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
    details: `logo_mode=${next.logo_mode}${next.logo_text ? `, logo_text="${next.logo_text}"` : ''}${maintenance_mode !== undefined ? `, maintenance_mode=${!!maintenance_mode}` : ''}`,
    ip: clientIp(req),
  });

  res.json({ ok: true, settings: next });
});

export default router;
