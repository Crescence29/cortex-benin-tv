import { useState } from 'react';

// Beaucoup de cover_image/thumbnail sont des URL externes collées par les
// journalistes (pas de système d'upload propre au site) : certaines finissent
// par 404 ou par un lien mort. Sans ça, le navigateur affiche sa petite icône
// d'image cassée brute. Ce composant retombe alors sur le même espace vide
// stylé (dégradé de marque) que le cas "pas d'image du tout", au lieu de
// laisser transparaître l'erreur de chargement.
export default function SafeImage({ src, alt, placeholderClassName, placeholder, ...imgProps }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    if (placeholder) return placeholder;
    return placeholderClassName ? <div className={placeholderClassName} /> : null;
  }

  return <img src={src} alt={alt} onError={() => setBroken(true)} {...imgProps} />;
}
