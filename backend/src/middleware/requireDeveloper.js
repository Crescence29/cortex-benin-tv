// Accès technique (API/logs/maintenance/configuration), volontairement séparé
// de la hiérarchie métier : un Super Admin n'a pas ces outils par défaut, un
// Développeur n'a pas plus de droits métier par défaut que le rôle qu'on lui
// a par ailleurs attribué.
export function requireDeveloper(req, res, next) {
  if (!req.user?.is_developer) {
    return res.status(403).json({ error: 'Réservé aux comptes développeur' });
  }
  next();
}
