import { Router } from 'express';
import dns from 'node:dns/promises';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hasDeliverableDomain(email) {
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    const records = await dns.resolveMx(domain);
    if (records && records.length > 0) return true;
  } catch {
    // no MX records — some domains route mail via an A/AAAA record instead
  }
  try {
    await dns.resolve(domain);
    return true;
  } catch {
    return false;
  }
}

router.post('/', publicWriteLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }
  if (!(await hasDeliverableDomain(email))) {
    return res.status(400).json({
      error: "Ce domaine d'email n'existe pas ou ne reçoit pas de courrier (ex: gmail.com, yahoo.fr, outlook.com...)",
    });
  }
  try {
    await pool.query('INSERT INTO newsletter_subscribers (email) VALUES (?)', [email.trim().toLowerCase()]);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.json({ ok: true, alreadySubscribed: true });
    throw err;
  }
});

router.delete('/', publicWriteLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }
  const [result] = await pool.query('DELETE FROM newsletter_subscribers WHERE email = ?', [email.trim().toLowerCase()]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Cette adresse ne figure pas dans nos abonnés' });
  }
  res.json({ ok: true });
});

router.get('/count', requireAuth, async (_req, res) => {
  const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM newsletter_subscribers');
  res.json({ total: row.total });
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT id, email, created_at FROM newsletter_subscribers ORDER BY created_at DESC');
  res.json(rows);
});

router.delete('/admin/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM newsletter_subscribers WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
