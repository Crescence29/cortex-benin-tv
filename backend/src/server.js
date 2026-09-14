import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import 'dotenv/config';

import categoriesRouter from './routes/categories.js';
import articlesRouter from './routes/articles.js';
import videosRouter from './routes/videos.js';
import feedsRouter from './routes/feeds.js';
import cronRouter from './routes/cron.js';
import languagesRouter from './routes/languages.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import liveRouter from './routes/live.js';
import tvRouter from './routes/tv.js';
import analyticsRouter from './routes/analytics.js';
import mediaRouter from './routes/media.js';
import tagsRouter from './routes/tags.js';
import newsletterRouter from './routes/newsletter.js';
import partnersRouter from './routes/partners.js';
import showsRouter from './routes/shows.js';
import announcementsRouter from './routes/announcements.js';
import settingsRouter from './routes/settings.js';
import devRouter from './routes/dev.js';
import contactRouter from './routes/contact.js';
import logsRouter from './routes/logs.js';
import rssRouter from './routes/rss.js';
import sitemapRouter from './routes/sitemap.js';
import { fetchAllFeeds } from './feeds/fetchFeeds.js';
import { createDraftsFromNewFeedItems } from './feeds/draftFromFeeds.js';
import { pool } from './db/pool.js';
import { loginLimiter } from './middleware/rateLimit.js';
import { trackRequest, trackError } from './lib/systemMetrics.js';
import { registerRoutes } from './lib/apiRegistry.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

// En dev, plusieurs instances de Vite peuvent tourner sur des ports voisins
// (5173, 5174, ...) si un port est déjà occupé — on autorise tout localhost,
// ainsi que les adresses IP du réseau local (192.168.x.x, 10.x.x.x) pour
// permettre de partager l'accès à des collègues sur le même réseau.
const isLocalhost = (origin) =>
  !origin ||
  /^https?:\/\/localhost:\d+$/.test(origin) ||
  /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d+$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      if (process.env.NODE_ENV === 'production') {
        return callback(null, origin === process.env.CORS_ORIGIN);
      }
      callback(null, isLocalhost(origin) || origin === process.env.CORS_ORIGIN);
    },
  })
);
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const { method, path } = req; // capturés tout de suite : les routeurs imbriqués
  // réécrivent temporairement req.url pendant le traitement de la requête.
  res.on('finish', () => trackRequest(Date.now() - start, res.statusCode, method, path));
  next();
});

app.get('/api/health', async (_req, res) => {
  let db = 'error';
  try {
    await pool.query('SELECT 1');
    db = 'ok';
  } catch {
    db = 'error';
  }
  res.json({ ok: true, api: 'ok', db, checkedAt: new Date().toISOString() });
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/videos', videosRouter);
app.use('/api/feeds', feedsRouter);
app.use('/api/cron', cronRouter);
app.use('/api/languages', languagesRouter);
app.use('/api/users', usersRouter);
app.use('/api/live', liveRouter);
app.use('/api/tv', tvRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/rss.xml', rssRouter);
app.use('/sitemap.xml', sitemapRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/shows', showsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin', devRouter);
app.use('/api/contact', contactRouter);
app.use('/api/logs', logsRouter);

registerRoutes('/api/auth', authRouter);
registerRoutes('/api/categories', categoriesRouter);
registerRoutes('/api/articles', articlesRouter);
registerRoutes('/api/videos', videosRouter);
registerRoutes('/api/feeds', feedsRouter);
registerRoutes('/api/cron', cronRouter);
registerRoutes('/api/languages', languagesRouter);
registerRoutes('/api/users', usersRouter);
registerRoutes('/api/live', liveRouter);
registerRoutes('/api/tv', tvRouter);
registerRoutes('/api/analytics', analyticsRouter);
registerRoutes('/api/media', mediaRouter);
registerRoutes('/api/tags', tagsRouter);
registerRoutes('/api/newsletter', newsletterRouter);
registerRoutes('/api/partners', partnersRouter);
registerRoutes('/api/shows', showsRouter);
registerRoutes('/api/announcements', announcementsRouter);
registerRoutes('/api/settings', settingsRouter);
registerRoutes('/api/admin', devRouter);
registerRoutes('/api/contact', contactRouter);
registerRoutes('/api/logs', logsRouter);

app.use((err, req, res, _next) => {
  console.error(err);
  trackError(err, req);
  res.status(500).json({ error: 'Erreur serveur' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Cortex Bénin TV API en écoute sur le port ${PORT}`);
});

// Rafraîchit les flux RSS agrégés toutes les 30 minutes
cron.schedule('*/30 * * * *', () => {
  fetchAllFeeds().catch((err) => console.error('Erreur de rafraîchissement des flux:', err));
});

// Toutes les heures : transforme les nouvelles actualités détectées en
// brouillons d'articles en attente de validation par un journaliste
// (jamais publiés automatiquement).
cron.schedule('0 * * * *', () => {
  createDraftsFromNewFeedItems()
    .then(({ created }) => created && console.log(`${created} brouillon(s) d'article créé(s) depuis la veille.`))
    .catch((err) => console.error('Erreur de création de brouillons depuis les flux:', err));
});

// Publie automatiquement les articles programmés dont la date est passée
cron.schedule('* * * * *', () => {
  pool
    .query("UPDATE articles SET status = 'published' WHERE status = 'scheduled' AND published_at <= NOW()")
    .catch((err) => console.error('Erreur de publication programmée:', err));
});
