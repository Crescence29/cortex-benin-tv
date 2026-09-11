// Compteurs en mémoire — remis à zéro à chaque redémarrage du serveur.
// Volontairement simple : pas de fabrication de métriques, seulement ce que
// le process peut mesurer honnêtement sur lui-même depuis son démarrage.

const state = {
  bootAt: Date.now(),
  requestCount: 0,
  errorCount: 0,
  responseTimes: [], // derniers temps de réponse en ms (buffer glissant)
  recentErrors: [], // { message, path, status, at }
};

const MAX_RESPONSE_SAMPLES = 200;
const MAX_ERROR_SAMPLES = 20;

export function trackRequest(durationMs, statusCode) {
  state.requestCount += 1;
  state.responseTimes.push(durationMs);
  if (state.responseTimes.length > MAX_RESPONSE_SAMPLES) state.responseTimes.shift();
  if (statusCode >= 500) state.errorCount += 1;
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

export function getMetrics() {
  const avg =
    state.responseTimes.length > 0
      ? Math.round(state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length)
      : null;
  return {
    uptimeSeconds: Math.round((Date.now() - state.bootAt) / 1000),
    requestCount: state.requestCount,
    avgResponseTimeMs: avg,
    errorCount: state.errorCount,
    recentErrors: state.recentErrors,
  };
}
