import { Router } from 'express';
import { logActivity, clientIp } from '../lib/logActivity.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Reçoit les erreurs JavaScript non interceptées côté navigateur (window.onerror /
// unhandledrejection) pour qu'un développeur puisse voir ce qui casse réellement
// chez les visiteurs, pas seulement en local. Public (pas d'auth : une page cassée
// n'a pas forcément d'utilisateur connecté), mais limité en débit pour éviter le spam.
router.post('/client-error', publicWriteLimiter, async (req, res) => {
  const { message, source, line, column, stack, url } = req.body;
  if (!message) return res.status(400).json({ error: 'message requis' });

  await logActivity({
    action: 'client_js_error',
    details: [
      message,
      source ? `${source}:${line ?? '?'}:${column ?? '?'}` : null,
      url ? `page: ${url}` : null,
      stack ? stack.slice(0, 300) : null,
    ]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 500),
    ip: clientIp(req),
  });

  res.status(204).end();
});

export default router;
