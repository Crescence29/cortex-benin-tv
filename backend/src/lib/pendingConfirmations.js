import crypto from 'node:crypto';

// Confirmations par code à 6 chiffres pour les actions sensibles et
// difficiles à annuler (accès développeur, bannissement, restauration de
// base de données...). Volontairement en mémoire (pas en base) : c'est une
// friction anti-clic-accidentel de courte durée, pas un vrai secret à
// protéger sur le long terme.
const CONFIRM_TTL_MS = 5 * 60 * 1000;

function cleanupPending(map) {
  const now = Date.now();
  for (const [id, entry] of map) {
    if (entry.expiresAt < now) map.delete(id);
  }
}

export function startPending(map, id, payload) {
  cleanupPending(map);
  const code = crypto.randomInt(100000, 1000000).toString();
  map.set(id, { ...payload, code, expiresAt: Date.now() + CONFIRM_TTL_MS });
  return code;
}

export function checkPending(map, id, code, actorId) {
  const pending = map.get(id);
  if (!pending || pending.actorId !== actorId || pending.expiresAt < Date.now()) {
    return { ok: false, error: 'Code expiré ou demande introuvable, recommencez' };
  }
  if (pending.code !== String(code || '')) {
    return { ok: false, error: 'Code incorrect' };
  }
  map.delete(id);
  return { ok: true, pending };
}

export { CONFIRM_TTL_MS };
