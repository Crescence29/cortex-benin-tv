import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity, clientIp } from '../lib/logActivity.js';
import { generateSecret, buildOtpAuthUrl, verifyTotp, generateBackupCodes } from '../lib/twoFactor.js';

const router = Router();

// Secrets 2FA en attente de confirmation (le temps que l'utilisateur scanne
// le QR code et retape un premier code) — jamais écrits en base tant que la
// confirmation n'a pas prouvé que l'appareil est correctement configuré.
// La preuve ici est le code TOTP lui-même (verifyTotp), pas un code généré
// par le serveur : ce n'est donc pas le même mécanisme que
// lib/pendingConfirmations.js (accès développeur, bannissement...).
const pendingTwoFactorSetup = new Map();
const TWO_FACTOR_SETUP_TTL_MS = 5 * 60 * 1000;

function storePendingSecret(userId, secret) {
  pendingTwoFactorSetup.set(userId, { secret, expiresAt: Date.now() + TWO_FACTOR_SETUP_TTL_MS });
}

function getPendingSecret(userId) {
  const entry = pendingTwoFactorSetup.get(userId);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.secret;
}

async function issueSession(user, req) {
  const ip = clientIp(req);
  const tokenId = crypto.randomBytes(24).toString('hex');
  await pool.query(
    'INSERT INTO sessions (user_id, token_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
    [user.id, tokenId, ip, (req.headers['user-agent'] || '').slice(0, 255)]
  );
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, is_developer: !!user.is_developer, jti: tokenId },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  await logActivity({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'login_success', ip });
  return {
    token,
    user: { id: user.id, name: user.name, role: user.role, is_developer: !!user.is_developer },
  };
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  const ip = clientIp(req);

  if (!user) {
    await logActivity({ actorName: email, action: 'login_failed', details: 'Compte introuvable', ip });
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  if (user.status !== 'active') {
    const messages = { suspended: 'Ce compte a été suspendu', banned: 'Ce compte a été banni' };
    await logActivity({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'login_failed', details: `Compte ${user.status}`, ip });
    return res.status(403).json({ error: messages[user.status] || 'Ce compte a été désactivé' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await logActivity({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'login_failed', details: 'Mot de passe incorrect', ip });
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  if (user.two_factor_enabled) {
    // Jeton temporaire, à usage unique pour la vérification 2FA seulement —
    // ne permet aucun appel API, distinct des vrais jetons de session (pas
    // de jti, purpose dédié vérifié explicitement côté /2fa/verify-login).
    const tempToken = jwt.sign({ id: user.id, purpose: '2fa_pending' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    return res.json({ requiresTwoFactor: true, tempToken });
  }

  res.json(await issueSession(user, req));
});

router.post('/2fa/verify-login', async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) return res.status(400).json({ error: 'Code requis' });

  let payload;
  try {
    payload = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session de connexion expirée, recommencez' });
  }
  if (payload.purpose !== '2fa_pending') return res.status(401).json({ error: 'Jeton invalide' });

  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.id]);
  const ip = clientIp(req);
  if (!user || !user.two_factor_enabled) return res.status(400).json({ error: '2FA non activée sur ce compte' });

  let ok = verifyTotp(code, user.two_factor_secret);
  let usedBackupCode = false;

  if (!ok && user.two_factor_backup_codes) {
    const codes = user.two_factor_backup_codes;
    for (let i = 0; i < codes.length; i++) {
      if (await bcrypt.compare(String(code).trim(), codes[i])) {
        ok = true;
        usedBackupCode = true;
        codes.splice(i, 1);
        await pool.query('UPDATE users SET two_factor_backup_codes = ? WHERE id = ?', [JSON.stringify(codes), user.id]);
        break;
      }
    }
  }

  if (!ok) {
    await logActivity({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'login_failed', details: 'Code 2FA incorrect', ip });
    return res.status(401).json({ error: 'Code incorrect' });
  }

  if (usedBackupCode) {
    await logActivity({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'backup_code_used', ip });
  }

  res.json(await issueSession(user, req));
});

router.post('/2fa/setup/start', requireAuth, async (req, res) => {
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (user.two_factor_enabled) return res.status(400).json({ error: 'La 2FA est déjà activée sur ce compte' });

  const secret = generateSecret();
  const otpauthUrl = buildOtpAuthUrl(user.email, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  storePendingSecret(req.user.id, secret);

  res.json({ secret, qrCodeDataUrl });
});

router.post('/2fa/setup/confirm', requireAuth, async (req, res) => {
  const secret = getPendingSecret(req.user.id);
  if (!secret) return res.status(400).json({ error: "Session d'activation expirée, recommencez" });

  if (!verifyTotp(req.body.code, secret)) {
    return res.status(400).json({ error: 'Code incorrect — vérifie l\'heure de ton appareil et réessaie' });
  }
  pendingTwoFactorSetup.delete(req.user.id);

  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

  await pool.query(
    'UPDATE users SET two_factor_enabled = TRUE, two_factor_secret = ?, two_factor_backup_codes = ? WHERE id = ?',
    [secret, JSON.stringify(hashedCodes), req.user.id]
  );

  await logActivity({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'two_factor_enabled', ip: clientIp(req),
  });

  res.json({ ok: true, backupCodes });
});

router.post('/2fa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const valid = await bcrypt.compare(password || '', user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect' });

  await pool.query(
    'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE id = ?',
    [req.user.id]
  );

  await logActivity({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'two_factor_disabled', ip: clientIp(req),
  });

  res.json({ ok: true });
});

router.post('/logout', requireAuth, async (req, res) => {
  if (req.user.jti) {
    await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE token_id = ?', [req.user.jti]);
  }
  await logActivity({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'logout',
    ip: clientIp(req),
  });
  res.json({ ok: true });
});

router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
  }
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
  res.json({ ok: true });
});

export default router;
