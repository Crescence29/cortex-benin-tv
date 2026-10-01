import { Router } from 'express';

const router = Router();

// Plan gratuit API-Football : pas d'accès à la saison en cours ni au calendrier
// à venir (paramètre "next" bloqué, dates limitées à ~2 jours). Seul l'endpoint
// "live" fonctionne sans restriction — on se limite donc aux scores des matchs
// en cours, filtrés aux compétitions pertinentes pour notre public.
const RELEVANT_LEAGUE_IDS = new Set([
  415, // Championnat National (Bénin)
  6,   // Coupe d'Afrique des Nations
  36,  // CAN - Qualifications
  19,  // Championnat d'Afrique des Nations (CHAN)
  12,  // Ligue des champions CAF
  39,  // Premier League (Angleterre)
  61,  // Ligue 1 (France)
  140, // La Liga (Espagne)
  135, // Serie A (Italie)
  78,  // Bundesliga (Allemagne)
]);
const BENIN_TEAM_ID = 1516;

let cache = { data: [], fetchedAt: 0 };
const CACHE_TTL_MS = 60_000;

async function fetchLiveFixtures() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return [];

  const res = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
    headers: { 'x-apisports-key': apiKey },
  });
  if (!res.ok) throw new Error(`API-Football a répondu ${res.status}`);
  const body = await res.json();

  return (body.response || [])
    .filter((f) => RELEVANT_LEAGUE_IDS.has(f.league.id) || f.teams.home.id === BENIN_TEAM_ID || f.teams.away.id === BENIN_TEAM_ID)
    .map((f) => ({
      id: f.fixture.id,
      league: { id: f.league.id, name: f.league.name, logo: f.league.logo },
      home: { name: f.teams.home.name, logo: f.teams.home.logo, winner: f.teams.home.winner },
      away: { name: f.teams.away.name, logo: f.teams.away.logo, winner: f.teams.away.winner },
      goals: { home: f.goals.home, away: f.goals.away },
      status: { short: f.fixture.status.short, long: f.fixture.status.long, elapsed: f.fixture.status.elapsed },
    }));
}

// Scores des matchs actuellement en direct (compétitions africaines + grands
// championnats européens). Mis en cache côté serveur pour respecter le quota
// du plan gratuit (10 requêtes/minute) quel que soit le nombre de visiteurs.
router.get('/live', async (_req, res) => {
  const now = Date.now();
  if (now - cache.fetchedAt < CACHE_TTL_MS) {
    return res.json(cache.data);
  }
  try {
    const data = await fetchLiveFixtures();
    cache = { data, fetchedAt: now };
    res.json(data);
  } catch {
    // En cas d'erreur, on sert le dernier cache connu plutôt qu'une erreur
    // visible, le flux "en direct" n'étant pas une donnée critique du site.
    res.json(cache.data);
  }
});

export default router;
