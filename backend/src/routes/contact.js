import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';
import { logActivity, clientIp } from '../lib/logActivity.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', publicWriteLimiter, async (req, res) => {
  const { name, company, phone, email, subject, message } = req.body;
  if (!name || !email || !message || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Nom, email valide et message requis' });
  }
  const [result] = await pool.query(
    'INSERT INTO contact_messages (name, company, phone, email, subject, message) VALUES (?, ?, ?, ?, ?, ?)',
    [name, company || null, phone || null, email, subject || null, message]
  );
  await logActivity({
    action: 'contact_message_received',
    targetType: 'contact_message',
    targetId: result.insertId,
    details: `${name} <${email}>${subject ? ` — ${subject}` : ''}`,
    ip: clientIp(req),
  });
  res.status(201).json({ ok: true });
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
  res.json(rows);
});

router.put('/admin/:id/read', requireAuth, async (req, res) => {
  await pool.query('UPDATE contact_messages SET is_read = TRUE WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

router.delete('/admin/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
