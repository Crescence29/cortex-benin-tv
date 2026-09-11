import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  const token = header.slice('Bearer '.length);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  // Le token seul ne suffit pas : on vérifie que la session correspondante
  // n'a pas été révoquée ("forcer la déconnexion") et que le compte est
  // toujours actif, sans attendre l'expiration naturelle du token.
  if (payload.jti) {
    const [[session]] = await pool.query(
      'SELECT revoked_at FROM sessions WHERE token_id = ?',
      [payload.jti]
    );
    if (!session || session.revoked_at) {
      return res.status(401).json({ error: 'Session terminée, merci de vous reconnecter' });
    }
    pool.query('UPDATE sessions SET last_seen_at = NOW() WHERE token_id = ?', [payload.jti]).catch(() => {});
  }

  const [[user]] = await pool.query('SELECT is_active FROM users WHERE id = ?', [payload.id]);
  if (!user || !user.is_active) {
    return res.status(403).json({ error: 'Compte désactivé' });
  }

  req.user = payload;
  next();
}
