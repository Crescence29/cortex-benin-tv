import { pool } from '../db/pool.js';

// Enregistre un événement sensible dans le journal d'activité (historique complet en base).
export async function logActivity({ actorId = null, actorName = null, actorRole = null, action, targetType = null, targetId = null, details = null, ip = null }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (actor_id, actor_name, actor_role, action, target_type, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [actorId, actorName, actorRole, action, targetType, targetId, details, ip]
    );
  } catch (err) {
    console.error('Erreur de journalisation:', err);
  }
}

export function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
}
