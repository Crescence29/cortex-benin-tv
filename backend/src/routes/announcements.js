import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { isSafeUrl } from '../lib/sanitize.js';

const router = Router();

// Annonces actuellement programmées (dans leur fenêtre de diffusion)
router.get('/', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, message, link_url FROM announcements
     WHERE is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()
     ORDER BY starts_at DESC`
  );
  res.json(rows);
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM announcements ORDER BY starts_at DESC');
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { message, link_url, starts_at, ends_at, is_active } = req.body;
  if (!message || !starts_at || !ends_at) {
    return res.status(400).json({ error: 'Message, date de début et date de fin requis' });
  }
  if (!isSafeUrl(link_url)) {
    return res.status(400).json({ error: 'Lien invalide (http ou https requis)' });
  }
  const [result] = await pool.query(
    'INSERT INTO announcements (message, link_url, starts_at, ends_at, is_active) VALUES (?, ?, ?, ?, ?)',
    [message, link_url || null, starts_at, ends_at, is_active ?? true]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { message, link_url, starts_at, ends_at, is_active } = req.body;
  const [[existing]] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Annonce introuvable' });
  if (!isSafeUrl(link_url)) {
    return res.status(400).json({ error: 'Lien invalide (http ou https requis)' });
  }
  await pool.query(
    'UPDATE announcements SET message=?, link_url=?, starts_at=?, ends_at=?, is_active=? WHERE id=?',
    [
      message ?? existing.message,
      link_url ?? existing.link_url,
      starts_at ?? existing.starts_at,
      ends_at ?? existing.ends_at,
      is_active ?? existing.is_active,
      req.params.id,
    ]
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
