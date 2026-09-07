import sanitizeHtml from 'sanitize-html';

// N'autorise que http(s) pour les URLs saisies par un admin/éditeur et
// rendues ensuite comme <a href> côté public (annonces, partenaires...).
// Bloque javascript:, data:, vbscript:, etc.
export function isSafeUrl(url) {
  if (!url) return true; // champ optionnel
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Purifie le HTML riche des articles avant stockage — défense en profondeur
// en plus de la purification côté client au rendu.
export function sanitizeArticleHtml(html) {
  if (!html) return html;
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'blockquote', 'img', 'figure', 'figcaption', 'span', 'div',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
