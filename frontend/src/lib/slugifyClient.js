// Slug simplifié côté client, utilisé uniquement pour nommer le "dossier"
// Cloudinary d'un contenu en cours d'édition (avant qu'il ait forcément un
// id/slug définitif côté serveur).
export function slugifyClient(value) {
  return (value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'divers';
}
