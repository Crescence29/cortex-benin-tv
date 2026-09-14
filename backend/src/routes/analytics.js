import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const [[articleTotals]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(status='published') AS published, SUM(view_count) AS views
     FROM articles`
  );
  const [[videoTotals]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(status='published') AS published, SUM(view_count) AS views
     FROM videos`
  );
  const [topArticles] = await pool.query(
    `SELECT a.id, a.view_count,
            COALESCE(
              t_fr.title,
              (SELECT t2.title FROM article_translations t2 WHERE t2.article_id = a.id LIMIT 1)
            ) AS title
     FROM articles a
     LEFT JOIN article_translations t_fr ON t_fr.article_id = a.id AND t_fr.lang_code = 'fr'
     ORDER BY a.view_count DESC
     LIMIT 10`
  );
  const [viewsByCategory] = await pool.query(
    `SELECT COALESCE(ct.name, c.slug) AS category, SUM(a.view_count) AS views
     FROM articles a
     JOIN categories c ON c.id = a.category_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = 'fr'
     GROUP BY c.id
     ORDER BY views DESC`
  );

  res.json({
    articles: {
      total: articleTotals.total,
      published: Number(articleTotals.published) || 0,
      views: Number(articleTotals.views) || 0,
    },
    videos: {
      total: videoTotals.total,
      published: Number(videoTotals.published) || 0,
      views: Number(videoTotals.views) || 0,
    },
    topArticles,
    viewsByCategory,
  });
});

export default router;
