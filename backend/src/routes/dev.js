import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';

const router = Router();

// Historique complet conservé en base ; on ne renvoie que les 500 entrées les plus récentes.
router.get('/activity-logs', requireAuth, requireSuperAdmin, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500');
  res.json(rows);
});

export default router;
