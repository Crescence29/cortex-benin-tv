import { Router } from 'express';
import slugify from 'slugify';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { category, program, limit = 20, page = 1, sort } = req.query;
  const lang = req.query.lang || 'fr';
  const conditions = ["v.status = 'published'", 'vt.lang_code = ?'];
  const params = [lang];

  if (category) {
    conditions.push('c.slug = ?');
    params.push(category);
  }
  if (program) {
    conditions.push('v.program = ?');
    params.push(program);
  }

  const safeLimit = Math.min(parseInt(limit, 10) || 20, 50);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT v.id, vt.title, vt.slug, vt.description, v.video_url, v.thumbnail,
            v.program, v.duration_seconds, v.status, v.published_at, v.view_count,
            c.id AS category_id, c.slug AS category_slug,
            COALESCE(ct.name, ct_fr.name) AS category_name
     FROM videos v
     JOIN video_translations vt ON vt.video_id = v.id
     JOIN categories c ON c.id = v.category_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = vt.lang_code
     LEFT JOIN category_translations ct_fr ON ct_fr.category_id = c.id AND ct_fr.lang_code = 'fr'
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${sort === 'views' ? 'v.view_count DESC' : 'v.published_at DESC'} LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );
  res.json(rows);
});

router.get('/:slug', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT v.id, vt.title, vt.slug, vt.description, v.video_url, v.thumbnail,
            v.program, v.duration_seconds, v.status, v.published_at, v.view_count,
            c.id AS category_id, c.slug AS category_slug,
            COALESCE(ct.name, ct_fr.name) AS category_name
     FROM video_translations vt
     JOIN videos v ON v.id = vt.video_id
     JOIN categories c ON c.id = v.category_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = vt.lang_code
     LEFT JOIN category_translations ct_fr ON ct_fr.category_id = c.id AND ct_fr.lang_code = 'fr'
     WHERE vt.slug = ? AND v.status = 'published'`,
    [req.params.slug]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Vidéo introuvable' });
  pool.query('UPDATE videos SET view_count = view_count + 1 WHERE id = ?', [rows[0].id]).catch(() => {});
  res.json(rows[0]);
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  const [videos] = await pool.query(
    `SELECT v.id, v.thumbnail, v.status, v.published_at, v.created_at, v.program,
            c.slug AS category_slug, COALESCE(ct.name, c.slug) AS category_name
     FROM videos v
     JOIN categories c ON c.id = v.category_id
     LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.lang_code = 'fr'
     ORDER BY v.created_at DESC`
  );
  const [translations] = await pool.query('SELECT video_id, lang_code, title FROM video_translations');
  const byVideo = {};
  for (const t of translations) {
    (byVideo[t.video_id] ||= []).push({ lang_code: t.lang_code, title: t.title });
  }
  res.json(
    videos.map((v) => ({
      ...v,
      translations: byVideo[v.id] || [],
      title: (byVideo[v.id]?.find((t) => t.lang_code === 'fr') || byVideo[v.id]?.[0] || {}).title,
    }))
  );
});

router.get('/admin/:id', requireAuth, async (req, res) => {
  const [[video]] = await pool.query('SELECT * FROM videos WHERE id = ?', [req.params.id]);
  if (!video) return res.status(404).json({ error: 'Vidéo introuvable' });
  const [translations] = await pool.query(
    'SELECT lang_code, title, description FROM video_translations WHERE video_id = ?',
    [req.params.id]
  );
  res.json({ ...video, translations });
});

router.post('/', requireAuth, async (req, res) => {
  const { category_id, video_url, thumbnail, program, duration_seconds, status, lang, title, description } =
    req.body;
  if (!category_id || !video_url || !lang || !title) {
    return res.status(400).json({ error: 'Catégorie, URL vidéo, langue et titre requis' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const published_at = status === 'published' ? new Date() : null;
    const [result] = await conn.query(
      `INSERT INTO videos (video_url, thumbnail, category_id, program, duration_seconds, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [video_url, thumbnail || null, category_id, program || null, duration_seconds || null, status || 'draft', published_at]
    );
    const slug = slugify(title, { lower: true, strict: true });
    await conn.query(
      `INSERT INTO video_translations (video_id, lang_code, title, slug, description) VALUES (?, ?, ?, ?, ?)`,
      [result.insertId, lang, title, slug, description || null]
    );
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
  const { category_id, video_url, thumbnail, program, duration_seconds, status } = req.body;
  const [[existing]] = await pool.query('SELECT * FROM videos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Vidéo introuvable' });

  let published_at = existing.published_at;
  if (status === 'published' && existing.status !== 'published') published_at = new Date();
  if (status === 'draft') published_at = null;

  await pool.query(
    `UPDATE videos SET category_id=?, video_url=?, thumbnail=?, program=?, duration_seconds=?, status=?, published_at=? WHERE id=?`,
    [
      category_id ?? existing.category_id,
      video_url ?? existing.video_url,
      thumbnail !== undefined ? thumbnail || null : existing.thumbnail,
      program !== undefined ? program || null : existing.program,
      duration_seconds !== undefined ? duration_seconds || null : existing.duration_seconds,
      status ?? existing.status,
      published_at,
      req.params.id,
    ]
  );
  res.json({ ok: true });
});

router.put('/:id/translations/:lang', requireAuth, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });
  const slug = slugify(title, { lower: true, strict: true });
  try {
    await pool.query(
      `INSERT INTO video_translations (video_id, lang_code, title, slug, description)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), slug=VALUES(slug), description=VALUES(description)`,
      [req.params.id, req.params.lang, title, slug, description || null]
    );
    res.json({ ok: true, slug });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ce titre existe déjà dans cette langue' });
    throw err;
  }
});

router.delete('/:id/translations/:lang', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM video_translations WHERE video_id = ? AND lang_code = ?', [
    req.params.id,
    req.params.lang,
  ]);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM videos WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
