import Parser from 'rss-parser';
import { pool } from '../db/pool.js';

const parser = new Parser();

// Récupère les nouveaux articles de chaque flux RSS actif et les stocke,
// avec attribution à la source (pas de republication de contenu intégral).
export async function fetchAllFeeds() {
  const [sources] = await pool.query('SELECT * FROM feed_sources WHERE active = TRUE');
  let totalNew = 0;
  const errors = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items) {
        if (!item.link) continue;
        const image = item.enclosure?.url || null;
        const [result] = await pool.query(
          `INSERT IGNORE INTO feed_items (source_id, title, link, summary, image, published_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            source.id,
            item.title || '(sans titre)',
            item.link,
            item.contentSnippet?.slice(0, 500) || null,
            image,
            item.isoDate ? new Date(item.isoDate) : null,
          ]
        );
        totalNew += result.affectedRows;
      }
      await pool.query('UPDATE feed_sources SET last_fetched_at = NOW() WHERE id = ?', [source.id]);
    } catch (err) {
      errors.push({ source: source.name, error: err.message });
    }
  }

  return { sourcesChecked: sources.length, newItems: totalNew, errors };
}
