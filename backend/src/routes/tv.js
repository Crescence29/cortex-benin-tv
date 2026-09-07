import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/schedule', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.day_of_week, s.start_time, s.title, c.slug AS category_slug,
            COALESCE(ct.name, c.slug) AS category_name
     FROM tv_schedule s
     LEFT JOIN categories c ON c.id = s.category_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = 'fr'
     ORDER BY s.day_of_week, s.start_time`
  );
  res.json(rows);
});

router.post('/schedule', requireAuth, async (req, res) => {
  const { day_of_week, start_time, title, category_id } = req.body;
  if (day_of_week === undefined || !start_time || !title) {
    return res.status(400).json({ error: 'Jour, heure et titre requis' });
  }
  const [result] = await pool.query(
    'INSERT INTO tv_schedule (day_of_week, start_time, title, category_id) VALUES (?, ?, ?, ?)',
    [day_of_week, start_time, title, category_id || null]
  );
  res.status(201).json({ id: result.insertId });
});

router.delete('/schedule/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM tv_schedule WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
