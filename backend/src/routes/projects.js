import { Router } from 'express';
import slugify from 'slugify';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { isSafeUrl } from '../lib/sanitize.js';

const router = Router();

// publish_at est stockée en UTC ; on la renvoie en ISO (suffixe Z) pour que le
// navigateur la convertisse dans le fuseau du visiteur/de la rédaction.
const PUBLISH_AT_ISO = "DATE_FORMAT(publish_at, '%Y-%m-%dT%H:%i:%s.000Z')";

// publicOnly : n'expose que les affiches déjà publiées (publish_at vide ou passé).
async function attachChildren(projects, { publicOnly = false } = {}) {
  if (projects.length === 0) return projects;
  const ids = projects.map((p) => p.id);
  const placeholders = ids.map(() => '?').join(',');
  const visibility = publicOnly ? ' AND (publish_at IS NULL OR publish_at <= UTC_TIMESTAMP())' : '';
  const [images] = await pool.query(
    `SELECT id, project_id, image_url, caption, sort_order, ${PUBLISH_AT_ISO} AS publish_at
     FROM project_images WHERE project_id IN (${placeholders})${visibility} ORDER BY sort_order, id`,
    ids
  );
  const [videos] = await pool.query(
    `SELECT * FROM project_videos WHERE project_id IN (${placeholders}) ORDER BY sort_order, id`,
    ids
  );
  return projects.map((p) => ({
    ...p,
    images: images.filter((i) => i.project_id === p.id),
    videos: videos.filter((v) => v.project_id === p.id),
  }));
}

// Liste publique : projets publiés uniquement, avec leur galerie et leurs vidéos.
router.get('/', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM projects WHERE is_published = TRUE ORDER BY sort_order, created_at DESC'
  );
  res.json(await attachChildren(rows, { publicOnly: true }));
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM projects ORDER BY sort_order, created_at DESC');
  res.json(await attachChildren(rows));
});

router.get('/admin/:id', requireAuth, async (req, res) => {
  const [[project]] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ error: 'Projet introuvable' });
  const [withChildren] = await attachChildren([project]);
  res.json(withChildren);
});

router.get('/:slug', async (req, res) => {
  const [[project]] = await pool.query(
    'SELECT * FROM projects WHERE slug = ? AND is_published = TRUE',
    [req.params.slug]
  );
  if (!project) return res.status(404).json({ error: 'Projet introuvable' });
  const [withChildren] = await attachChildren([project], { publicOnly: true });
  res.json(withChildren);
});

// Date ISO envoyée par le navigateur -> 'YYYY-MM-DD HH:MM:SS' en UTC.
// null si vide, undefined si invalide.
function toUtcSql(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function validateChildren(images = [], videos = []) {
  for (const img of images) {
    if (!img.image_url || !isSafeUrl(img.image_url)) return "URL d'affiche/flyer invalide (http ou https requis)";
    if (toUtcSql(img.publish_at) === undefined) return 'Date de publication invalide';
  }
  for (const vid of videos) {
    if (!vid.video_url || !isSafeUrl(vid.video_url)) return 'URL de vidéo invalide (http ou https requis)';
  }
  return null;
}

async function replaceChildren(conn, projectId, images = [], videos = []) {
  await conn.query('DELETE FROM project_images WHERE project_id = ?', [projectId]);
  await conn.query('DELETE FROM project_videos WHERE project_id = ?', [projectId]);
  for (let i = 0; i < images.length; i += 1) {
    const img = images[i];
    await conn.query(
      'INSERT INTO project_images (project_id, image_url, caption, publish_at, sort_order) VALUES (?, ?, ?, ?, ?)',
      [projectId, img.image_url, img.caption || null, toUtcSql(img.publish_at), i]
    );
  }
  for (let i = 0; i < videos.length; i += 1) {
    const vid = videos[i];
    await conn.query(
      'INSERT INTO project_videos (project_id, video_url, title, sort_order) VALUES (?, ?, ?, ?)',
      [projectId, vid.video_url, vid.title || null, i]
    );
  }
}

router.post('/', requireAuth, async (req, res) => {
  const { title, description, period_label, cover_image_url, is_published, sort_order, images, videos } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });
  if (cover_image_url && !isSafeUrl(cover_image_url)) {
    return res.status(400).json({ error: "URL de couverture invalide (http ou https requis)" });
  }
  const childError = validateChildren(images, videos);
  if (childError) return res.status(400).json({ error: childError });

  const baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let n = 1;
  // Garantit un slug unique — deux projets peuvent partager le même nom
  // au fil des années (ex: "Octobre Rose" revient chaque année).
  while (true) {
    const [[existing]] = await pool.query('SELECT id FROM projects WHERE slug = ?', [slug]);
    if (!existing) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO projects (title, slug, description, period_label, cover_image_url, is_published, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, slug, description || null, period_label || null, cover_image_url || null, is_published ?? true, sort_order || 0]
    );
    await replaceChildren(conn, result.insertId, images, videos);
    await conn.commit();
    res.status(201).json({ id: result.insertId, slug });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { title, description, period_label, cover_image_url, is_published, sort_order, images, videos } = req.body;
  const [[existing]] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Projet introuvable' });
  if (cover_image_url && !isSafeUrl(cover_image_url)) {
    return res.status(400).json({ error: "URL de couverture invalide (http ou https requis)" });
  }
  const childError = validateChildren(images, videos);
  if (childError) return res.status(400).json({ error: childError });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE projects SET title=?, description=?, period_label=?, cover_image_url=?, is_published=?, sort_order=? WHERE id=?',
      [
        title ?? existing.title,
        description !== undefined ? description : existing.description,
        period_label !== undefined ? period_label : existing.period_label,
        cover_image_url !== undefined ? cover_image_url : existing.cover_image_url,
        is_published ?? existing.is_published,
        sort_order ?? existing.sort_order,
        req.params.id,
      ]
    );
    if (images !== undefined || videos !== undefined) {
      const [existingImages] = await conn.query(
        `SELECT image_url, caption, ${PUBLISH_AT_ISO} AS publish_at, sort_order FROM project_images WHERE project_id = ? ORDER BY sort_order, id`,
        [req.params.id]
      );
      const [existingVideos] = await conn.query('SELECT video_url, title, sort_order FROM project_videos WHERE project_id = ?', [req.params.id]);
      await replaceChildren(conn, req.params.id, images ?? existingImages, videos ?? existingVideos);
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
