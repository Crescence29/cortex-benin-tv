import { useEffect } from 'react';

const DEFAULT_TITLE = "Cortex Bénin TV — Actualités, direct et émissions du Bénin";
const DEFAULT_DESCRIPTION =
  "Cortex Bénin TV — média audiovisuel béninois d'information, d'actualité et de production, en direct 24h/24 et 7j/7.";
const DEFAULT_IMAGE = '/logo.png';

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets the document title and description/OG meta tags for the current page.
 * Falls back to the site-wide defaults for any field left out, and restores
 * them on unmount so navigating away never leaves a stale title behind.
 */
export function useSEO({ title, description, image } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — Cortex Bénin TV` : DEFAULT_TITLE;
    document.title = fullTitle;

    setMeta('name', 'description', description || DEFAULT_DESCRIPTION);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description || DEFAULT_DESCRIPTION);
    setMeta('property', 'og:image', image || DEFAULT_IMAGE);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description || DEFAULT_DESCRIPTION);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:title', DEFAULT_TITLE);
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:image', DEFAULT_IMAGE);
      setMeta('name', 'twitter:title', DEFAULT_TITLE);
      setMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
    };
  }, [title, description, image]);
}
