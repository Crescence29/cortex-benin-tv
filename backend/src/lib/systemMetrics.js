// Compteurs en mémoire — remis à zéro à chaque redémarrage du serveur.
// Volontairement simple : pas de fabrication de métriques, seulement ce que
// le process peut mesurer honnêtement sur lui-même depuis son démarrage.

const state = {
  bootAt: Date.now(),
  requestCount: 0,
  errorCount: 0,
  responseTimes: [], // derniers temps de réponse en ms (buffer glissant)
  recentErrors: [], // { message, path, status, at }
  routeCounts: new Map(), // "MÉTHODE /chemin" -> nombre d'appels
  routeErrorCounts: new Map(), // "MÉTHODE /chemin" -> nombre de réponses en erreur (>=400)
};

const MAX_RESPONSE_SAMPLES = 200;
const MAX_ERROR_SAMPLES = 20;

function routeKey(method, path) {
  // Regroupe les routes à paramètre (ex: /articles/mon-article) pour éviter
  // une entrée par valeur distincte — on garde les deux premiers segments.
  const segments = path.split('?')[0].split('/').filter(Boolean).slice(0, 2);
  return `${method} /${segments.join('/')}`;
}

export function trackRequest(durationMs, statusCode, method, path) {
  state.requestCount += 1;
  state.responseTimes.push(durationMs);
  if (state.responseTimes.length > MAX_RESPONSE_SAMPLES) state.responseTimes.shift();
  if (statusCode >= 500) state.errorCount += 1;
  if (method && path) {
    const key = routeKey(method, path);
    state.routeCounts.set(key, (state.routeCounts.get(key) || 0) + 1);
    if (statusCode >= 400) {
      state.routeErrorCounts.set(key, (state.routeErrorCounts.get(key) || 0) + 1);
    }
  }
}

export function trackError(err, req) {
  state.errorCount += 1;
  state.recentErrors.unshift({
    message: err?.message || 'Erreur inconnue',
    path: req?.originalUrl || null,
    method: req?.method || null,
    at: new Date().toISOString(),
  });
  if (state.recentErrors.length > MAX_ERROR_SAMPLES) state.recentErrors.length = MAX_ERROR_SAMPLES;
}

// Remet à zéro les compteurs en mémoire (requêtes, erreurs, temps de
// réponse) sans toucher à quoi que ce soit en base — l'équivalent le plus
// honnête d'un "vider le cache" dans cette application, qui n'a pas de vrai
// cache serveur (Redis, CDN...) à proprement parler.
export function resetMetrics() {
  state.requestCount = 0;
  state.errorCount = 0;
  state.responseTimes.length = 0;
  state.recentErrors.length = 0;
  state.routeCounts.clear();
  state.routeErrorCounts.clear();
}

export function getMetrics() {
  const avg =
    state.responseTimes.length > 0
      ? Math.round(state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length)
      : null;
  const topRoutes = [...state.routeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([route, count]) => ({ route, count }));
  const endpointStats = [...state.routeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([route, count]) => ({ route, count, errors: state.routeErrorCounts.get(route) || 0 }));
  return {
    uptimeSeconds: Math.round((Date.now() - state.bootAt) / 1000),
    requestCount: state.requestCount,
    avgResponseTimeMs: avg,
    responseTimeSamples: state.responseTimes.slice(-30),
    errorCount: state.errorCount,
    recentErrors: state.recentErrors,
    topRoutes,
    endpointStats,
  };
}
