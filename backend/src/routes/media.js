import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const [covers] = await pool.query(
    `SELECT a.id AS article_id, a.cover_image AS url, COALESCE(t.title, '(sans titre)') AS title
     FROM articles a
     LEFT JOIN article_translations t ON t.article_id = a.id AND t.lang_code = 'fr'
     WHERE a.cover_image IS NOT NULL`
  );
  const [gallery] = await pool.query(
    `SELECT ai.article_id, ai.url, COALESCE(t.title, '(sans titre)') AS title
     FROM article_images ai
     LEFT JOIN article_translations t ON t.article_id = ai.article_id AND t.lang_code = 'fr'`
  );
  const [thumbs] = await pool.query(
    `SELECT v.id AS video_id, v.thumbnail AS url, COALESCE(t.title, '(sans titre)') AS title
     FROM videos v
     LEFT JOIN video_translations t ON t.video_id = v.id AND t.lang_code = 'fr'
     WHERE v.thumbnail IS NOT NULL`
  );

  const items = [
    ...covers.map((c) => ({ url: c.url, title: c.title, source: 'Image de couverture', articleId: c.article_id })),
    ...gallery.map((g) => ({ url: g.url, title: g.title, source: 'Galerie', articleId: g.article_id })),
    ...thumbs.map((t) => ({ url: t.url, title: t.title, source: 'Miniature vidéo', videoId: t.video_id })),
  ];

  res.json(items);
});

export default router;
