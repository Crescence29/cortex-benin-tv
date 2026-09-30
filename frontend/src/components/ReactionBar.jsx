import { useEffect, useState } from 'react';
import { api } from '../api';
import './ReactionBar.css';

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡'];
const LABELS = { '❤️': "J'aime", '👍': 'Top', '😂': 'Haha', '😮': 'Wow', '😢': 'Triste', '😡': 'Grrr' };

function storageKey(contentType, contentId) {
  return `cortex_reaction_${contentType}_${contentId}`;
}

// Réactions façon Facebook, sans compte visiteur : le serveur ne garde qu'un
// compteur par (contenu, emoji) — c'est le navigateur qui retient, via
// localStorage, ce que CE visiteur a cliqué, pour permettre de changer
// d'avis ou d'annuler sa réaction.
export default function ReactionBar({ contentType, contentId }) {
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(() => {
    try {
      return localStorage.getItem(storageKey(contentType, contentId));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    api.getReactions(contentType, contentId).then(setCounts).catch(() => {});
  }, [contentType, contentId]);

  async function onPick(emoji) {
    const key = storageKey(contentType, contentId);
    const previous = selected;
    const next = previous === emoji ? null : emoji;

    setSelected(next);
    try {
      if (next) localStorage.setItem(key, next);
      else localStorage.removeItem(key);
    } catch {
      // localStorage indisponible (navigation privée...) : la réaction
      // fonctionne quand même pour cette visite, juste sans persistance.
    }

    setCounts((c) => {
      const updated = { ...c };
      if (previous) updated[previous] = Math.max((updated[previous] || 1) - 1, 0);
      if (next) updated[next] = (updated[next] || 0) + 1;
      return updated;
    });

    try {
      if (previous) await api.sendReaction(contentType, contentId, previous, 'remove');
      if (next) await api.sendReaction(contentType, contentId, next, 'add');
    } catch {
      // Échec réseau silencieux : l'état local reste tel quel, cohérent
      // avec ce que le visiteur voit, même si le serveur n'a pas pu suivre.
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="reaction-bar">
      <div className="reaction-bar__buttons">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={'reaction-bar__btn' + (selected === emoji ? ' is-active' : '')}
            onClick={() => onPick(emoji)}
            title={LABELS[emoji]}
          >
            <span className="reaction-bar__emoji">{emoji}</span>
            {counts[emoji] > 0 && <span className="reaction-bar__count">{counts[emoji]}</span>}
          </button>
        ))}
      </div>
      {total > 0 && (
        <span className="reaction-bar__total">{total} réaction{total > 1 ? 's' : ''}</span>
      )}
    </div>
  );
}
