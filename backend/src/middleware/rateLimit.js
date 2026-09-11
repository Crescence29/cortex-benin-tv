import rateLimit from 'express-rate-limit';

// Décrit les limites réellement appliquées, pour pouvoir les afficher telles
// quelles sur le tableau de bord développeur sans dupliquer les chiffres.
export const RATE_LIMITS = [
  {
    label: 'Connexion admin',
    routes: ['POST /api/auth/login'],
    windowMs: 15 * 60 * 1000,
    limit: 10,
  },
  {
    label: 'Formulaires publics (contact, newsletter)',
    routes: ['POST /api/contact', 'POST /api/newsletter', 'DELETE /api/newsletter'],
    windowMs: 60 * 60 * 1000,
    limit: 20,
  },
];

export const loginLimiter = rateLimit({
  windowMs: RATE_LIMITS[0].windowMs,
  limit: RATE_LIMITS[0].limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion, réessayez plus tard.' },
});

// Limite le spam sur les formulaires publics (contact, newsletter)
export const publicWriteLimiter = rateLimit({
  windowMs: RATE_LIMITS[1].windowMs,
  limit: RATE_LIMITS[1].limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez plus tard.' },
});
