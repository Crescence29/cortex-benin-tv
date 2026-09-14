import slugify from 'slugify';
import { pool } from '../db/pool.js';
import { sanitizeArticleHtml } from '../lib/sanitize.js';
import { logActivity } from '../lib/logActivity.js';

const MAX_DRAFTS_PER_RUN = 20;

// Transforme les nouveaux éléments de flux RSS (déjà récupérés par fetchAllFeeds)
// en brouillons d'articles à valider par un journaliste. Ne publie jamais rien
// automatiquement : chaque brouillon reste en statut "pending_review" tant
// qu'un humain ne l'a pas relu, réécrit si besoin, et publié depuis le dashboard.
export async function createDraftsFromNewFeedItems() {
  const [items] = await pool.query(
    `SELECT fi.id, fi.title, fi.link, fi.summary, fi.image, fs.name AS source_name, fs.category_id
     FROM feed_items fi
     JOIN feed_sources fs ON fs.id = fi.source_id
     WHERE fi.draft_article_id IS NULL
     ORDER BY fi.fetched_at ASC
     LIMIT ?`,
    [MAX_DRAFTS_PER_RUN]
  );

  if (items.length === 0) return { created: 0 };

  const [[fallbackCategory]] = await pool.query('SELECT id FROM categories ORDER BY id LIMIT 1');
  const [[systemAuthor]] = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1"
  );
  if (!systemAuthor) return { created: 0, skipped: items.length, reason: 'no_admin_user' };

  let created = 0;
  for (const item of items) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const categoryId = item.category_id || fallbackCategory?.id;
      if (!categoryId) {
        await conn.rollback();
        continue;
      }

      const [result] = await conn.query(
        `INSERT INTO articles (cover_image, category_id, author_id, status)
         VALUES (?, ?, ?, 'pending_review')`,
        [item.image || null, categoryId, systemAuthor.id]
      );

      const slug = `${slugify(item.title, { lower: true, strict: true })}-${result.insertId}`;
      const content = sanitizeArticleHtml(`
        <p><em>Brouillon généré automatiquement à partir d'une veille de sources externes —
        à relire, reformuler et vérifier avant toute publication.</em></p>
        ${item.summary ? `<p>${item.summary}</p>` : ''}
        <p>Source : ${item.source_name} — <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.link}</a></p>
      `);

      await conn.query(
        `INSERT INTO article_translations (article_id, lang_code, title, slug, excerpt, content)
         VALUES (?, 'fr', ?, ?, ?, ?)`,
        [result.insertId, item.title, slug, item.summary?.slice(0, 300) || null, content]
      );

      await conn.query('UPDATE feed_items SET draft_article_id = ? WHERE id = ?', [result.insertId, item.id]);

      await conn.commit();
      created += 1;
    } catch (err) {
      await conn.rollback();
      console.error('Erreur création brouillon depuis flux:', item.link, err.message);
      await logActivity({
        action: 'sync_error',
        targetType: 'feed_item',
        targetId: item.id,
        details: `Brouillon depuis ${item.link} — ${err.message}`,
      });
    } finally {
      conn.release();
    }
  }

  return { created };
}
