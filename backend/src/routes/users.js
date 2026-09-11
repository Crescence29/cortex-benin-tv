import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity, clientIp } from '../lib/logActivity.js';
import { ROLE_RANK, canManage, requireMinRole } from '../lib/roles.js';

const router = Router();

async function getTargetUser(id) {
  const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return row;
}

router.get('/', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.is_developer, u.is_active, u.created_at,
            (SELECT MAX(s.last_seen_at) FROM sessions s WHERE s.user_id = u.id) AS last_seen_at
     FROM users u ORDER BY u.name`
  );
  // Un compte ne voit les comptes de rang égal ou supérieur au sien que s'il s'agit du sien.
  const visible = rows.filter((u) => canManage(req.user.role, u.role) || u.id === req.user.id);
  res.json(visible);
});

router.get('/:id/sessions', requireAuth, requireMinRole('admin'), async (req, res) => {
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (!canManage(req.user.role, target.role) && target.id !== req.user.id) {
    return res.status(403).json({ error: 'Droits insuffisants' });
  }
  const [sessions] = await pool.query(
    `SELECT id, ip_address, user_agent, created_at, last_seen_at
     FROM sessions WHERE user_id = ? AND revoked_at IS NULL
     ORDER BY last_seen_at DESC`,
    [req.params.id]
  );
  res.json(sessions);
});

router.post('/:id/force-logout', requireAuth, requireMinRole('admin'), async (req, res) => {
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (!canManage(req.user.role, target.role) && target.id !== req.user.id) {
    return res.status(403).json({ error: 'Droits insuffisants' });
  }
  const [result] = await pool.query(
    'UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
    [req.params.id]
  );
  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'force_logout',
    targetType: 'user',
    targetId: req.params.id,
    details: `${target.name} — ${result.affectedRows} session(s) déconnectée(s)`,
    ip: clientIp(req),
  });
  res.json({ ok: true, sessionsRevoked: result.affectedRows });
});

router.post('/', requireAuth, requireMinRole('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
  }
  const targetRole = ROLE_RANK[role] ? role : 'user';
  if (!canManage(req.user.role, targetRole)) {
    return res.status(403).json({ error: 'Vous ne pouvez pas créer un compte de ce rang' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, targetRole]
    );
    await logActivity({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'user_created',
      targetType: 'user',
      targetId: result.insertId,
      details: `${name} (${email}) — ${targetRole}`,
      ip: clientIp(req),
    });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    throw err;
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, role, password, is_active, is_developer } = req.body;
  const existing = await getTargetUser(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const isSelf = existing.id === req.user.id;
  const managingTarget = canManage(req.user.role, existing.role);

  // Modifier le nom ou son propre mot de passe reste toujours possible pour
  // soi-même ; tout le reste (rôle, activation, flag développeur, mot de
  // passe d'un tiers) exige d'avoir un rang strictement supérieur à la cible.
  const wantsRoleChange = role && role !== existing.role;
  const wantsActiveChange = is_active !== undefined && !!is_active !== !!existing.is_active;
  const wantsDeveloperChange = is_developer !== undefined && !!is_developer !== !!existing.is_developer;
  const wantsPasswordChangeForOther = password && !isSelf;

  if (wantsActiveChange && is_active === false && isSelf) {
    return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' });
  }
  if ((wantsRoleChange || wantsPasswordChangeForOther || (wantsActiveChange && !isSelf)) && !managingTarget) {
    return res.status(403).json({ error: 'Droits insuffisants pour modifier ce compte' });
  }
  if (wantsRoleChange && !canManage(req.user.role, role)) {
    return res.status(403).json({ error: 'Vous ne pouvez pas attribuer ce rôle' });
  }
  // Le flag développeur ne se transmet que d'un développeur à un autre compte —
  // volontairement séparé de la hiérarchie métier.
  if (wantsDeveloperChange && !req.user.is_developer) {
    return res.status(403).json({ error: "Seul un compte développeur peut accorder ou retirer cet accès" });
  }

  const nextRole = wantsRoleChange ? role : existing.role;
  const nextActive = wantsActiveChange ? !!is_active : existing.is_active;
  const nextDeveloper = wantsDeveloperChange ? !!is_developer : existing.is_developer;
  const nextName = name ?? existing.name;

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET name=?, role=?, is_active=?, is_developer=?, password_hash=? WHERE id=?',
      [nextName, nextRole, nextActive, nextDeveloper, hash, req.params.id]
    );
  } else {
    await pool.query(
      'UPDATE users SET name=?, role=?, is_active=?, is_developer=? WHERE id=?',
      [nextName, nextRole, nextActive, nextDeveloper, req.params.id]
    );
  }

  if (wantsRoleChange) {
    await logActivity({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: 'role_changed', targetType: 'user', targetId: req.params.id,
      details: `${existing.name} : ${existing.role} → ${role}`, ip: clientIp(req),
    });
  }
  if (wantsActiveChange) {
    await logActivity({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: is_active ? 'user_reactivated' : 'user_deactivated', targetType: 'user', targetId: req.params.id,
      details: existing.name, ip: clientIp(req),
    });
    if (!is_active) {
      await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [req.params.id]);
    }
  }
  if (password) {
    await logActivity({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: 'password_reset', targetType: 'user', targetId: req.params.id,
      details: `Mot de passe réinitialisé pour ${existing.name} (${existing.email})`, ip: clientIp(req),
    });
  }

  res.json({ ok: true });
});

router.delete('/:id', requireAuth, requireMinRole('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  const existing = await getTargetUser(req.params.id);
  if (existing && !canManage(req.user.role, existing.role)) {
    return res.status(403).json({ error: 'Droits insuffisants pour supprimer ce compte' });
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
