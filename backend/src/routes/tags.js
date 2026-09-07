import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 8, 30);
  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.slug, COUNT(at.article_id) AS article_count
     FROM tags t
     JOIN article_tags at ON at.tag_id = t.id
     JOIN articles a ON a.id = at.article_id AND a.status = 'published'
     GROUP BY t.id
     ORDER BY article_count DESC, t.name
     LIMIT ?`,
    [limit]
  );
  res.json(rows);
});

export default router;
