import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

function escapeXml(str = '') {
  return str.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

router.get('/', async (req, res) => {
  const lang = req.query.lang || 'fr';
  const [rows] = await pool.query(
    `SELECT at.title, at.slug, at.excerpt, a.published_at
     FROM articles a
     JOIN article_translations at ON at.article_id = a.id AND at.lang_code = ?
     WHERE a.status = 'published'
     ORDER BY a.published_at DESC
     LIMIT 30`,
    [lang]
  );

  const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
  const items = rows
    .map(
      (a) => `  <item>
    <title>${escapeXml(a.title)}</title>
    <link>${siteUrl}/article/${a.slug}</link>
    <guid>${siteUrl}/article/${a.slug}</guid>
    <description>${escapeXml(a.excerpt || '')}</description>
    <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
  </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Cortex Bénin TV</title>
  <link>${siteUrl}</link>
  <description>Actualités locales et internationales, culture, émissions</description>
  <language>${lang}</language>
${items}
</channel>
</rss>`;

  res.set('Content-Type', 'application/rss+xml; charset=utf-8');
  res.send(xml);
});

export default router;
