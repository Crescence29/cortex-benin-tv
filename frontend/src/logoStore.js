import { api } from './api';

// Petit magasin partagé (pub/sub) pour que le logo se mette à jour partout
// instantanément après un changement dans l'onglet développeur, sans recharger la page.
let state = { logo_mode: 'image', logo_text: 'CORTEX BÉNIN TV' };
let loaded = false;
const listeners = new Set();

export function getLogoState() {
  return state;
}

export function setLogoState(next) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

export function subscribeLogo(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function ensureLogoLoaded() {
  if (loaded) return state;
  loaded = true;
  try {
    const settings = await api.getSettings();
    setLogoState(settings);
  } catch {
    // garde les valeurs par défaut si l'appel échoue
  }
  return state;
}
