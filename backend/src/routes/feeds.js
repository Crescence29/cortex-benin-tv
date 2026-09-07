import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchAllFeeds } from '../feeds/fetchFeeds.js';

const router = Router();

// Articles agrégés depuis les flux RSS externes (avec attribution à la source)
router.get('/items', async (req, res) => {
  const { category, limit = 20 } = req.query;
  const conditions = [];
  const params = [];
  if (category) {
    conditions.push('s.category_id = (SELECT id FROM categories WHERE slug = ?)');
    params.push(category);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.min(parseInt(limit, 10) || 20, 50);

  const [rows] = await pool.query(
    `SELECT fi.id, fi.title, fi.link, fi.summary, fi.image, fi.published_at, s.name AS source_name
     FROM feed_items fi
     JOIN feed_sources s ON s.id = fi.source_id
     ${where}
     ORDER BY fi.published_at DESC LIMIT ?`,
    [...params, safeLimit]
  );
  res.json(rows);
});

router.get('/sources', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM feed_sources ORDER BY name');
  res.json(rows);
});

router.post('/sources', requireAuth, async (req, res) => {
  const { name, url, category_id } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Nom et URL requis' });
  const [result] = await pool.query(
    'INSERT INTO feed_sources (name, url, category_id) VALUES (?, ?, ?)',
    [name, url, category_id || null]
  );
  res.status(201).json({ id: result.insertId });
});

router.delete('/sources/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM feed_sources WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// Déclenche manuellement la récupération de tous les flux actifs
router.post('/refresh', requireAuth, async (_req, res) => {
  const result = await fetchAllFeeds();
  res.json(result);
});

export default router;
