import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

const STATIC_PATHS = [
  '',
  'a-propos',
  'contact',
  'emissions',
  'podcasts',
  'direct',
  'en-direct-local',
  'videos',
  'mentions-legales',
  'confidentialite',
  'rubrique/local',
  'rubrique/culture',
  'rubrique/musique',
  'rubrique/sports',
  'rubrique/jeunesse',
];

function urlEntry(loc, lastmod) {
  return `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
}

router.get('/', async (_req, res) => {
  const siteUrl = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');

  const [articles] = await pool.query(
    `SELECT at.slug, a.published_at, a.updated_at
     FROM articles a
     JOIN article_translations at ON at.article_id = a.id AND at.lang_code = 'fr'
     WHERE a.status = 'published'
     ORDER BY a.published_at DESC`
  );

  const [videos] = await pool.query(
    `SELECT vt.slug, v.published_at
     FROM videos v
     JOIN video_translations vt ON vt.video_id = v.id AND vt.lang_code = 'fr'
     WHERE v.status = 'published'
     ORDER BY v.published_at DESC`
  );

  const staticEntries = STATIC_PATHS.map((p) => urlEntry(`${siteUrl}/${p}`));
  const articleEntries = articles.map((a) =>
    urlEntry(`${siteUrl}/article/${a.slug}`, new Date(a.updated_at || a.published_at).toISOString())
  );
  const videoEntries = videos.map((v) =>
    urlEntry(`${siteUrl}/video/${v.slug}`, new Date(v.published_at).toISOString())
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...articleEntries, ...videoEntries].join('\n')}
</urlset>`;

  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});

export default router;
