import DOMPurify from 'dompurify';

// Purifie le HTML riche (articles) avant injection dans le DOM :
// bloque <script>, gestionnaires on*, javascript: dans les liens/images, etc.
export function sanitizeHtml(html = '') {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'blockquote', 'img', 'figure', 'figcaption', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}
