import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import cloudinary from '../lib/cloudinary.js';

const router = Router();

// Upload réel de fichiers (images/vidéos) vers Cloudinary — remplace le
// besoin de coller une URL externe pour les affiches/flyers/vidéos des
// projets. Fichier gardé en mémoire (pas écrit sur le disque du serveur,
// qui est de toute façon éphémère sur Render) puis transmis directement à
// Cloudinary en streaming.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 Mo
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    cb(ok ? null : new Error('Seuls les fichiers image ou vidéo sont acceptés'), ok);
  },
});

// N'autorise que des noms de dossier sûrs (le slug d'un projet, typiquement)
// pour éviter d'écrire en dehors de l'espace prévu sur Cloudinary.
function safeFolder(value) {
  const cleaned = String(value || 'divers').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80);
  return cleaned || 'divers';
}

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const folder = safeFolder(req.body.folder);
  const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `cortex-benin-tv/${folder}`, resource_type: resourceType },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    stream.end(req.file.buffer);
  });

  res.status(201).json({
    url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type,
  });
});

// Galerie des fichiers déjà envoyés dans un dossier donné, pour pouvoir en
// resélectionner un sans le réenvoyer.
router.get('/gallery', requireAuth, async (req, res) => {
  const folder = safeFolder(req.query.folder);
  const resourceType = req.query.type === 'video' ? 'video' : 'image';
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: resourceType,
      prefix: `cortex-benin-tv/${folder}/`,
      max_results: 100,
    });
    res.json(
      result.resources.map((r) => ({
        url: r.secure_url,
        public_id: r.public_id,
        created_at: r.created_at,
        thumbnail_url: resourceType === 'image'
          ? cloudinary.url(r.public_id, { width: 160, height: 160, crop: 'fill', secure: true })
          : r.secure_url,
      }))
    );
  } catch (err) {
    if (err?.http_code === 404) return res.json([]); // dossier pas encore créé (aucun envoi)
    throw err;
  }
});

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
