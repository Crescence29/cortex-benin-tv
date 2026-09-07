import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity, clientIp } from '../lib/logActivity.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Réservé aux administrateurs' });
  next();
}

router.get('/', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role, is_super_admin, created_at FROM users ORDER BY name');
  // Le compte super-admin est invisible pour tout le monde sauf lui-même.
  const visible = rows.filter((u) => !u.is_super_admin || u.id === req.user.id);
  res.json(visible);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, role === 'admin' ? 'admin' : 'editor']
    );
    await logActivity({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'user_created',
      targetType: 'user',
      targetId: result.insertId,
      details: `${name} (${email}) — ${role || 'editor'}`,
      ip: clientIp(req),
    });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    throw err;
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, role, password } = req.body;
  const [[existing]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });

  // Seul le titulaire du compte super-admin peut modifier son propre rôle/statut.
  if (existing.is_super_admin && existing.id !== req.user.id) {
    return res.status(403).json({ error: "Ce compte ne peut être modifié que par son titulaire" });
  }

  const updates = { name: name ?? existing.name, role: role ?? existing.role };
  if (password) {
    updates.password_hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET name=?, role=?, password_hash=? WHERE id=?', [
      updates.name,
      updates.role,
      updates.password_hash,
      req.params.id,
    ]);
  } else {
    await pool.query('UPDATE users SET name=?, role=? WHERE id=?', [updates.name, updates.role, req.params.id]);
  }

  if (role && role !== existing.role) {
    await logActivity({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'role_changed',
      targetType: 'user',
      targetId: req.params.id,
      details: `${existing.name} : ${existing.role} → ${role}`,
      ip: clientIp(req),
    });
  }

  if (password) {
    await logActivity({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'password_reset',
      targetType: 'user',
      targetId: req.params.id,
      details: `Mot de passe réinitialisé pour ${existing.name} (${existing.email})`,
      ip: clientIp(req),
    });
  }

  res.json({ ok: true });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  const [[existing]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (existing?.is_super_admin) {
    return res.status(403).json({ error: 'Le compte super-admin ne peut pas être supprimé' });
  }
  await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'user_deleted',
    targetType: 'user',
    targetId: req.params.id,
    details: existing ? `${existing.name} (${existing.email})` : null,
    ip: clientIp(req),
  });
  res.json({ ok: true });
});

export default router;
