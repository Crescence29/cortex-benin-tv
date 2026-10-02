import { registerSW } from 'virtual:pwa-register';

// Dès qu'une nouvelle version du site est prête, on recharge la page pour que
// le visiteur ne reste pas bloqué sur l'ancienne. Pour ne jamais effacer ce
// qu'une personne est en train de saisir (formulaire d'admin, email...), on
// attend qu'aucun champ ne soit actif et que rien n'ait été tapé depuis le
// dernier envoi de formulaire.
let dirty = false;
document.addEventListener('input', () => { dirty = true; }, true);
document.addEventListener('submit', () => { setTimeout(() => { dirty = false; }, 1500); }, true);

function isTypingInField() {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export function startAutoUpdate() {
  let timer = null;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (timer) return;
      timer = setInterval(() => {
        if (!dirty && !isTypingInField()) {
          clearInterval(timer);
          updateSW(true);
        }
      }, 3000);
    },
  });
}
