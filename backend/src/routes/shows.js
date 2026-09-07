import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.logo_url, s.bg_color, s.description, s.schedule_label,
            c.slug AS category_slug, c.id AS category_id, ct.name AS category_name
     FROM shows s
     LEFT JOIN categories c ON c.id = s.category_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = 'fr'
     WHERE s.is_active = TRUE
     ORDER BY s.sort_order, s.name`
  );
  res.json(rows);
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, c.slug AS category_slug FROM shows s LEFT JOIN categories c ON c.id = s.category_id ORDER BY s.sort_order, s.name`
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { name, logo_url, bg_color, sort_order, description, schedule_label, category_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const [result] = await pool.query(
    'INSERT INTO shows (name, logo_url, bg_color, sort_order, description, schedule_label, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, logo_url || null, bg_color || '#ffffff', sort_order || 0, description || null, schedule_label || null, category_id || null]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, logo_url, bg_color, sort_order, is_active, description, schedule_label, category_id } = req.body;
  const [[existing]] = await pool.query('SELECT * FROM shows WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Émission introuvable' });
  await pool.query(
    'UPDATE shows SET name=?, logo_url=?, bg_color=?, sort_order=?, is_active=?, description=?, schedule_label=?, category_id=? WHERE id=?',
    [
      name ?? existing.name,
      logo_url ?? existing.logo_url,
      bg_color ?? existing.bg_color,
      sort_order ?? existing.sort_order,
      is_active ?? existing.is_active,
      description !== undefined ? description : existing.description,
      schedule_label !== undefined ? schedule_label : existing.schedule_label,
      category_id !== undefined ? category_id : existing.category_id,
      req.params.id,
    ]
  );
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM shows WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
