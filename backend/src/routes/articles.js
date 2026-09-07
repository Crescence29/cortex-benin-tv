import { Router } from 'express';
import slugify from 'slugify';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeArticleHtml } from '../lib/sanitize.js';

const router = Router();

async function syncTags(conn, articleId, tagNames = []) {
  await conn.query('DELETE FROM article_tags WHERE article_id = ?', [articleId]);
  for (const raw of tagNames) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugify(name, { lower: true, strict: true });
    await conn.query('INSERT INTO tags (slug, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [
      slug,
      name,
    ]);
    const [[tag]] = await conn.query('SELECT id FROM tags WHERE slug = ?', [slug]);
    await conn.query('INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)', [articleId, tag.id]);
  }
}

async function syncImages(conn, articleId, urls = []) {
  await conn.query('DELETE FROM article_images WHERE article_id = ?', [articleId]);
  let order = 0;
  for (const url of urls) {
    if (!url?.trim()) continue;
    await conn.query('INSERT INTO article_images (article_id, url, sort_order) VALUES (?, ?, ?)', [
      articleId,
      url.trim(),
      order++,
    ]);
  }
}

async function getTagsFor(articleIds) {
  if (articleIds.length === 0) return {};
  const [rows] = await pool.query(
    `SELECT at.article_id, t.id, t.name, t.slug FROM article_tags at
     JOIN tags t ON t.id = at.tag_id WHERE at.article_id IN (?)`,
    [articleIds]
  );
  const byArticle = {};
  for (const r of rows) (byArticle[r.article_id] ||= []).push({ id: r.id, name: r.name, slug: r.slug });
  return byArticle;
}

// --- Public : uniquement les articles traduits et publiés dans la langue demandée ---

router.get('/', async (req, res) => {
  const { category, q, featured, tag, limit = 20, page = 1, sort } = req.query;
  const lang = req.query.lang || 'fr';
  const conditions = ["a.status = 'published'", 'at.lang_code = ?'];
  const params = [lang];

  if (category) {
    conditions.push('c.slug = ?');
    params.push(category);
  }
  if (q) {
    conditions.push('(at.title LIKE ? OR at.excerpt LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (featured === 'true') {
    conditions.push('a.is_featured = TRUE');
  }
  if (tag) {
    conditions.push('EXISTS (SELECT 1 FROM article_tags atg JOIN tags tg ON tg.id = atg.tag_id WHERE atg.article_id = a.id AND tg.slug = ?)');
    params.push(tag);
  }

  const safeLimit = Math.min(parseInt(limit, 10) || 20, 50);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT a.id, at.title, at.slug, at.excerpt, at.content, a.cover_image, a.video_url, a.is_featured,
            a.status, a.published_at, a.created_at, a.view_count,
            c.id AS category_id, c.slug AS category_slug,
            COALESCE(ct.name, ct_fr.name) AS category_name,
            u.name AS author_name
     FROM articles a
     JOIN article_translations at ON at.article_id = a.id
     JOIN categories c ON c.id = a.category_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = at.lang_code
     LEFT JOIN category_translations ct_fr ON ct_fr.category_id = c.id AND ct_fr.lang_code = 'fr'
     JOIN users u ON u.id = a.author_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${sort === 'views' ? 'a.view_count DESC' : 'a.published_at DESC'} LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );
  const tagsByArticle = await getTagsFor(rows.map((r) => r.id));
  res.json(rows.map((r) => ({ ...r, tags: tagsByArticle[r.id] || [] })));
});

router.get('/:slug', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.id, at.title, at.slug, at.excerpt, at.content, at.seo_title, at.seo_description,
            a.cover_image, a.video_url, a.is_featured,
            a.status, a.published_at, a.created_at, at.lang_code, a.view_count,
            c.id AS category_id, c.slug AS category_slug,
            COALESCE(ct.name, ct_fr.name) AS category_name,
            u.name AS author_name
     FROM article_translations at
     JOIN articles a ON a.id = at.article_id
     JOIN categories c ON c.id = a.category_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = at.lang_code
     LEFT JOIN category_translations ct_fr ON ct_fr.category_id = c.id AND ct_fr.lang_code = 'fr'
     JOIN users u ON u.id = a.author_id
     WHERE at.slug = ? AND a.status = 'published'`,
    [req.params.slug]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Article introuvable' });
  pool.query('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [rows[0].id]).catch(() => {});
  const [images] = await pool.query('SELECT url FROM article_images WHERE article_id = ? ORDER BY sort_order', [
    rows[0].id,
  ]);
  const tagsByArticle = await getTagsFor([rows[0].id]);
  res.json({ ...rows[0], gallery: images.map((i) => i.url), tags: tagsByArticle[rows[0].id] || [] });
});

// --- Admin (authentification requise) ---

router.get('/admin/all', requireAuth, async (req, res) => {
  const { q, category, status, author } = req.query;
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('c.slug = ?');
    params.push(category);
  }
  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (author) {
    conditions.push('a.author_id = ?');
    params.push(author);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [articles] = await pool.query(
    `SELECT a.id, a.cover_image, a.status, a.is_featured, a.published_at, a.created_at,
            a.author_id, u.name AS author_name,
            c.slug AS category_slug, COALESCE(ct.name, c.slug) AS category_name
     FROM articles a
     JOIN categories c ON c.id = a.category_id
     JOIN users u ON u.id = a.author_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = 'fr'
     ${where}
     ORDER BY a.created_at DESC`,
    params
  );
  const [translations] = await pool.query(
    'SELECT article_id, lang_code, title FROM article_translations'
  );
  const byArticle = {};
  for (const t of translations) {
    (byArticle[t.article_id] ||= []).push({ lang_code: t.lang_code, title: t.title });
  }

  let result = articles.map((a) => ({
    ...a,
    translations: byArticle[a.id] || [],
    title: (byArticle[a.id]?.find((t) => t.lang_code === 'fr') || byArticle[a.id]?.[0] || {}).title,
  }));

  if (q) {
    const needle = q.toLowerCase();
    result = result.filter((a) => (a.title || '').toLowerCase().includes(needle));
  }

  res.json(result);
});

router.get('/admin/:id', requireAuth, async (req, res) => {
  const [[article]] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
  if (!article) return res.status(404).json({ error: 'Article introuvable' });
  const [translations] = await pool.query(
    'SELECT lang_code, title, slug, excerpt, content, seo_title, seo_description FROM article_translations WHERE article_id = ?',
    [req.params.id]
  );
  const translationsByLang = {};
  for (const t of translations) translationsByLang[t.lang_code] = t;
  const [images] = await pool.query('SELECT url FROM article_images WHERE article_id = ? ORDER BY sort_order', [
    req.params.id,
  ]);
  const tagsByArticle = await getTagsFor([Number(req.params.id)]);
  res.json({
    ...article,
    translations: translationsByLang,
    gallery: images.map((i) => i.url),
    tags: (tagsByArticle[req.params.id] || []).map((t) => t.name),
  });
});

router.post('/', requireAuth, async (req, res) => {
  const {
    category_id, cover_image, video_url, status, is_featured, author_id,
    scheduled_at, tags, gallery, lang, title, excerpt, content, seo_title, seo_description,
  } = req.body;
  if (!category_id || !lang || !title || !content) {
    return res.status(400).json({ error: 'Catégorie, langue, titre et contenu requis' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let published_at = null;
    if (status === 'published') published_at = new Date();
    if (status === 'scheduled') published_at = scheduled_at ? new Date(scheduled_at) : null;

    const [result] = await conn.query(
      `INSERT INTO articles (cover_image, video_url, category_id, author_id, status, is_featured, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cover_image || null,
        video_url || null,
        category_id,
        author_id || req.user.id,
        status || 'draft',
        !!is_featured,
        published_at,
      ]
    );
    const slug = slugify(title, { lower: true, strict: true });
    await conn.query(
      `INSERT INTO article_translations (article_id, lang_code, title, slug, excerpt, content, seo_title, seo_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [result.insertId, lang, title, slug, excerpt || null, sanitizeArticleHtml(content), seo_title || null, seo_description || null]
    );
    await syncTags(conn, result.insertId, tags || []);
    await syncImages(conn, result.insertId, gallery || []);
    await conn.commit();
    res.status(201).json({ id: result.insertId, slug });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ce titre existe déjà dans cette langue' });
    throw err;
  } finally {
    conn.release();
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { cover_image, video_url, category_id, status, is_featured, author_id, scheduled_at, tags, gallery } =
    req.body;
  const [[existing]] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Article introuvable' });

  let published_at = existing.published_at;
  if (status === 'published' && existing.status !== 'published') published_at = new Date();
  if (status === 'scheduled') published_at = scheduled_at ? new Date(scheduled_at) : existing.published_at;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE articles SET cover_image=?, video_url=?, category_id=?, status=?, is_featured=?, author_id=?, published_at=? WHERE id=?`,
      [
        cover_image ?? existing.cover_image,
        video_url ?? existing.video_url,
        category_id ?? existing.category_id,
        status ?? existing.status,
        is_featured ?? existing.is_featured,
        author_id ?? existing.author_id,
        published_at,
        req.params.id,
      ]
    );
    if (tags !== undefined) await syncTags(conn, req.params.id, tags);
    if (gallery !== undefined) await syncImages(conn, req.params.id, gallery);
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// Crée ou met à jour la traduction d'un article dans une langue donnée
router.put('/:id/translations/:lang', requireAuth, async (req, res) => {
  const { title, excerpt, content, seo_title, seo_description } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Titre et contenu requis' });

  const slug = slugify(title, { lower: true, strict: true });
  try {
    await pool.query(
      `INSERT INTO article_translations (article_id, lang_code, title, slug, excerpt, content, seo_title, seo_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), slug=VALUES(slug), excerpt=VALUES(excerpt),
         content=VALUES(content), seo_title=VALUES(seo_title), seo_description=VALUES(seo_description)`,
      [req.params.id, req.params.lang, title, slug, excerpt || null, sanitizeArticleHtml(content), seo_title || null, seo_description || null]
    );
    res.json({ ok: true, slug });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ce titre existe déjà dans cette langue' });
    throw err;
  }
});

router.delete('/:id/translations/:lang', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM article_translations WHERE article_id = ? AND lang_code = ?', [
    req.params.id,
    req.params.lang,
  ]);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
