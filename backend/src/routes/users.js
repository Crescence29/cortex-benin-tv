import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity, clientIp } from '../lib/logActivity.js';
import { ROLE_RANK, canManage, requireMinRole } from '../lib/roles.js';
import { startPending, checkPending, CONFIRM_TTL_MS } from '../lib/pendingConfirmations.js';

const router = Router();

async function getTargetUser(id) {
  const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return row;
}

const pendingDeveloperAccess = new Map();
const pendingBanActions = new Map();

router.get('/', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.is_developer, u.status, u.two_factor_enabled, u.created_at,
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

router.post('/:id/developer-access/start', requireAuth, async (req, res) => {
  if (!req.user.is_developer) {
    return res.status(403).json({ error: "Seul un compte développeur peut accorder ou retirer cet accès" });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre accès développeur' });
  }
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const desired = !target.is_developer;
  const code = startPending(pendingDeveloperAccess, req.params.id, { desired, actorId: req.user.id });
  res.json({ code, desired, expiresInSeconds: CONFIRM_TTL_MS / 1000 });
});

router.post('/:id/developer-access/confirm', requireAuth, async (req, res) => {
  if (!req.user.is_developer) {
    return res.status(403).json({ error: "Seul un compte développeur peut accorder ou retirer cet accès" });
  }
  const check = checkPending(pendingDeveloperAccess, req.params.id, req.body.code, req.user.id);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });

  await pool.query('UPDATE users SET is_developer = ? WHERE id = ?', [check.pending.desired, req.params.id]);

  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: check.pending.desired ? 'developer_access_granted' : 'developer_access_revoked',
    targetType: 'user',
    targetId: req.params.id,
    details: target.name,
    ip: clientIp(req),
  });

  res.json({ ok: true, is_developer: check.pending.desired });
});

// Suspension : réversible en un clic (pas de code), comme avant. La cible ne
// peut pas être bannie ici — voir /ban/start et /ban/confirm, à dessein plus
// lourds à déclencher ET à annuler.
router.post('/:id/suspend', requireAuth, requireMinRole('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas suspendre votre propre compte' });
  }
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (!canManage(req.user.role, target.role)) {
    return res.status(403).json({ error: 'Droits insuffisants pour modifier ce compte' });
  }
  if (target.status === 'banned') {
    return res.status(400).json({ error: 'Ce compte est banni ; utilisez le débannissement pour le réactiver' });
  }

  const nextStatus = target.status === 'active' ? 'suspended' : 'active';
  await pool.query('UPDATE users SET status = ? WHERE id = ?', [nextStatus, req.params.id]);
  if (nextStatus === 'suspended') {
    await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [req.params.id]);
  }
  await logActivity({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: nextStatus === 'suspended' ? 'user_suspended' : 'user_reactivated',
    targetType: 'user', targetId: req.params.id, details: target.name, ip: clientIp(req),
  });
  res.json({ ok: true, status: nextStatus });
});

router.post('/:id/ban/start', requireAuth, requireMinRole('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas bannir votre propre compte' });
  }
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (!canManage(req.user.role, target.role)) {
    return res.status(403).json({ error: 'Droits insuffisants pour modifier ce compte' });
  }
  if (target.status === 'banned') return res.status(400).json({ error: 'Ce compte est déjà banni' });

  const code = startPending(pendingBanActions, req.params.id, { desired: 'banned', actorId: req.user.id });
  res.json({ code, expiresInSeconds: CONFIRM_TTL_MS / 1000 });
});

router.post('/:id/ban/confirm', requireAuth, requireMinRole('admin'), async (req, res) => {
  const check = checkPending(pendingBanActions, req.params.id, req.body.code, req.user.id);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (!canManage(req.user.role, target.role)) {
    return res.status(403).json({ error: 'Droits insuffisants pour modifier ce compte' });
  }

  await pool.query('UPDATE users SET status = ? WHERE id = ?', ['banned', req.params.id]);
  await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [req.params.id]);
  await logActivity({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'user_banned', targetType: 'user', targetId: req.params.id, details: target.name, ip: clientIp(req),
  });
  res.json({ ok: true, status: 'banned' });
});

router.post('/:id/unban/start', requireAuth, requireMinRole('admin'), async (req, res) => {
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (!canManage(req.user.role, target.role)) {
    return res.status(403).json({ error: 'Droits insuffisants pour modifier ce compte' });
  }
  if (target.status !== 'banned') return res.status(400).json({ error: "Ce compte n'est pas banni" });

  const code = startPending(pendingBanActions, req.params.id, { desired: 'active', actorId: req.user.id });
  res.json({ code, expiresInSeconds: CONFIRM_TTL_MS / 1000 });
});

router.post('/:id/unban/confirm', requireAuth, requireMinRole('admin'), async (req, res) => {
  const check = checkPending(pendingBanActions, req.params.id, req.body.code, req.user.id);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (!canManage(req.user.role, target.role)) {
    return res.status(403).json({ error: 'Droits insuffisants pour modifier ce compte' });
  }

  await pool.query('UPDATE users SET status = ? WHERE id = ?', ['active', req.params.id]);
  await logActivity({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'user_unbanned', targetType: 'user', targetId: req.params.id, details: target.name, ip: clientIp(req),
  });
  res.json({ ok: true, status: 'active' });
});

// Connexion développeur sur n'importe quel compte, sans son mot de passe.
// Volontairement lourd : réservé aux comptes développeur, confirmation par
// code, session réelle créée et marquée comme usurpée, journalisée comme
// action sensible. Un développeur ne peut pas usurper un autre développeur.
router.post('/:id/impersonate/start', requireAuth, async (req, res) => {
  if (!req.user.is_developer) {
    return res.status(403).json({ error: 'Réservé aux comptes développeur' });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Vous êtes déjà connecté sur ce compte' });
  }
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.is_developer) {
    return res.status(403).json({ error: 'Impossible de se connecter sur un autre compte développeur' });
  }
  if (target.status !== 'active') {
    return res.status(400).json({ error: 'Ce compte est suspendu ou banni' });
  }

  const code = startPending(pendingBanActions, `impersonate:${req.params.id}`, { actorId: req.user.id });
  res.json({ code, expiresInSeconds: CONFIRM_TTL_MS / 1000 });
});

router.post('/:id/impersonate/confirm', requireAuth, async (req, res) => {
  if (!req.user.is_developer) {
    return res.status(403).json({ error: 'Réservé aux comptes développeur' });
  }
  const check = checkPending(pendingBanActions, `impersonate:${req.params.id}`, req.body.code, req.user.id);
  if (!check.ok) return res.status(400).json({ error: check.error });
  const target = await getTargetUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const tokenId = crypto.randomBytes(24).toString('hex');
  await pool.query(
    'INSERT INTO sessions (user_id, token_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
    [target.id, tokenId, clientIp(req), `Usurpation par ${req.user.name} — ${(req.headers['user-agent'] || '').slice(0, 200)}`]
  );
  const token = jwt.sign(
    { id: target.id, name: target.name, role: target.role, is_developer: !!target.is_developer, jti: tokenId, impersonatedBy: req.user.id },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'impersonation_started',
    targetType: 'user',
    targetId: req.params.id,
    details: `${req.user.name} s'est connecté en tant que ${target.name} (${target.email})`,
    ip: clientIp(req),
  });

  res.json({ token, user: { id: target.id, name: target.name, role: target.role, is_developer: !!target.is_developer } });
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
  const { name, email, role, password } = req.body;
  const existing = await getTargetUser(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const isSelf = existing.id === req.user.id;
  const managingTarget = canManage(req.user.role, existing.role);

  // Modifier le nom, l'email ou son propre mot de passe reste toujours
  // possible pour soi-même ; le reste (rôle, mot de passe d'un tiers) exige
  // un rang strictement supérieur à la cible. Le flag développeur ne passe
  // pas par ici (voir /developer-access/*), ni le statut du compte (voir
  // /suspend, /ban/*, /unban/*).
  const wantsRoleChange = role && role !== existing.role;
  const wantsEmailChange = email && email !== existing.email;
  const wantsPasswordChangeForOther = password && !isSelf;

  if ((wantsRoleChange || wantsPasswordChangeForOther || (wantsEmailChange && !isSelf)) && !managingTarget) {
    return res.status(403).json({ error: 'Droits insuffisants pour modifier ce compte' });
  }
  if (wantsRoleChange && !canManage(req.user.role, role)) {
    return res.status(403).json({ error: 'Vous ne pouvez pas attribuer ce rôle' });
  }

  const nextRole = wantsRoleChange ? role : existing.role;
  const nextName = name ?? existing.name;
  const nextEmail = wantsEmailChange ? email : existing.email;

  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET name=?, email=?, role=?, password_hash=? WHERE id=?',
        [nextName, nextEmail, nextRole, hash, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name=?, email=?, role=? WHERE id=?',
        [nextName, nextEmail, nextRole, req.params.id]
      );
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    throw err;
  }

  if (wantsEmailChange) {
    await logActivity({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: 'email_changed', targetType: 'user', targetId: req.params.id,
      details: `${existing.name} : ${existing.email} → ${email}`, ip: clientIp(req),
    });
  }

  if (wantsRoleChange) {
    await logActivity({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: 'role_changed', targetType: 'user', targetId: req.params.id,
      details: `${existing.name} : ${existing.role} → ${role}`, ip: clientIp(req),
    });
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
