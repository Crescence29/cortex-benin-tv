import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

const CONTENT_TYPES = new Set(['article', 'video', 'project']);
// Jeu d'emojis fixe (façon Facebook) — évite qu'un visiteur envoie n'importe
// quel caractère arbitraire dans la colonne emoji.
const ALLOWED_EMOJIS = new Set(['❤️', '😂', '😮', '😢', '😡']);

function validParams(contentType, contentId) {
  return CONTENT_TYPES.has(contentType) && Number.isInteger(Number(contentId)) && Number(contentId) > 0;
}

// Compteurs actuels pour un contenu donné, ex: { "❤️": 5, "😂": 2 }
router.get('/:contentType/:contentId', async (req, res) => {
  const { contentType, contentId } = req.params;
  if (!validParams(contentType, contentId)) return res.status(400).json({ error: 'Paramètres invalides' });
  const [rows] = await pool.query(
    'SELECT emoji, count FROM content_reactions WHERE content_type = ? AND content_id = ?',
    [contentType, contentId]
  );
  const counts = {};
  for (const r of rows) counts[r.emoji] = r.count;
  res.json(counts);
});

// action: 'add' incrémente, 'remove' décrémente (jamais sous 0) — le visiteur
// n'est identifié par rien côté serveur, c'est le front qui décide quand
// appeler add/remove selon ce qu'il a retenu en localStorage.
router.post('/:contentType/:contentId', async (req, res) => {
  const { contentType, contentId } = req.params;
  const { emoji, action } = req.body;
  if (!validParams(contentType, contentId)) return res.status(400).json({ error: 'Paramètres invalides' });
  if (!ALLOWED_EMOJIS.has(emoji)) return res.status(400).json({ error: 'Emoji non autorisé' });
  if (action !== 'add' && action !== 'remove') return res.status(400).json({ error: 'Action invalide' });

  if (action === 'add') {
    await pool.query(
      `INSERT INTO content_reactions (content_type, content_id, emoji, count) VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE count = count + 1`,
      [contentType, contentId, emoji]
    );
  } else {
    await pool.query(
      `UPDATE content_reactions SET count = GREATEST(count - 1, 0)
       WHERE content_type = ? AND content_id = ? AND emoji = ?`,
      [contentType, contentId, emoji]
    );
  }

  const [rows] = await pool.query(
    'SELECT emoji, count FROM content_reactions WHERE content_type = ? AND content_id = ?',
    [contentType, contentId]
  );
  const counts = {};
  for (const r of rows) counts[r.emoji] = r.count;
  res.json(counts);
});

export default router;
