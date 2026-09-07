import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { isSafeUrl } from '../lib/sanitize.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, logo_url, website_url, bg_color FROM partners WHERE is_active = TRUE ORDER BY sort_order, name'
  );
  res.json(rows);
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM partners ORDER BY sort_order, name');
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { name, logo_url, website_url, bg_color, sort_order } = req.body;
  if (!name || !logo_url) return res.status(400).json({ error: 'Nom et logo requis' });
  if (!isSafeUrl(website_url)) return res.status(400).json({ error: 'Site web invalide (http ou https requis)' });
  const [result] = await pool.query(
    'INSERT INTO partners (name, logo_url, website_url, bg_color, sort_order) VALUES (?, ?, ?, ?, ?)',
    [name, logo_url, website_url || null, bg_color || '#ffffff', sort_order || 0]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, logo_url, website_url, bg_color, sort_order, is_active } = req.body;
  const [[existing]] = await pool.query('SELECT * FROM partners WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Partenaire introuvable' });
  if (!isSafeUrl(website_url)) return res.status(400).json({ error: 'Site web invalide (http ou https requis)' });
  await pool.query(
    'UPDATE partners SET name=?, logo_url=?, website_url=?, bg_color=?, sort_order=?, is_active=? WHERE id=?',
    [
      name ?? existing.name,
      logo_url ?? existing.logo_url,
      website_url ?? existing.website_url,
      bg_color ?? existing.bg_color,
      sort_order ?? existing.sort_order,
      is_active ?? existing.is_active,
      req.params.id,
    ]
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM partners WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
