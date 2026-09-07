import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity, clientIp } from '../lib/logActivity.js';

const router = Router();

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

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await logActivity({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'login_failed', details: 'Mot de passe incorrect', ip });
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, is_super_admin: !!user.is_super_admin },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  await logActivity({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'login_success', ip });

  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, is_super_admin: !!user.is_super_admin },
  });
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
