import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity, clientIp } from '../lib/logActivity.js';

const router = Router();
const VALID_SLUGS = new Set(['main', 'local']);

router.get('/admin/all', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT slug, is_live, title, stream_url, updated_at FROM live_stream ORDER BY id');
  res.json(rows);
});

router.get('/:slug?', async (req, res) => {
  const slug = req.params.slug || 'main';
  if (!VALID_SLUGS.has(slug)) return res.status(404).json({ error: 'Flux inconnu' });
  const [[row]] = await pool.query(
    'SELECT is_live, title, stream_url, updated_at FROM live_stream WHERE slug = ?',
    [slug]
  );
  res.json(row || { is_live: false, title: null, stream_url: null });
});

router.put('/:slug?', requireAuth, async (req, res) => {
  const slug = req.params.slug || 'main';
  if (!VALID_SLUGS.has(slug)) return res.status(404).json({ error: 'Flux inconnu' });
  const { is_live, title, stream_url } = req.body;
  await pool.query(
    `UPDATE live_stream SET is_live = ?, title = ?, stream_url = ? WHERE slug = ?`,
    [!!is_live, title || null, stream_url || null, slug]
  );
  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: is_live ? 'live_started' : 'live_stopped',
    targetType: 'live_stream',
    details: `${slug === 'local' ? 'Local' : 'Principal'} — ${title || ''}`.trim(),
    ip: clientIp(req),
  });
  res.json({ ok: true });
});

export default router;
