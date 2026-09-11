import { Router } from 'express';
import { fetchAllFeeds } from '../feeds/fetchFeeds.js';
import { createDraftsFromNewFeedItems } from '../feeds/draftFromFeeds.js';

const router = Router();

// Point d'entrée pour un service de ping externe (cron-job.org) chargé de
// réveiller le service gratuit et déclencher la veille + création de
// brouillons, le temps que l'hébergement définitif tourne en continu.
// Protégé par une clé partagée : sans elle, la route ne fait rien.
router.get('/tick', async (req, res) => {
  if (!process.env.CRON_SECRET || req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Clé invalide' });
  }
  const feeds = await fetchAllFeeds();
  const drafts = await createDraftsFromNewFeedItems();
  res.json({ feeds, drafts });
});

export default router;
