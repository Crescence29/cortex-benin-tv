import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  const lang = req.query.lang || 'fr';
  const [rows] = await pool.query(
    `SELECT c.id, c.slug, COALESCE(ct.name, ct_fr.name) AS name
     FROM categories c
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = ?
     LEFT JOIN category_translations ct_fr ON ct_fr.category_id = c.id AND ct_fr.lang_code = 'fr'
     ORDER BY name`,
    [lang]
  );
  res.json(rows);
});

export default router;
