// Hiérarchie métier — indépendante du flag technique "développeur" (voir
// requireDeveloper.js). Un rang plus élevé peut gérer tout compte de rang
// strictement inférieur, jamais un compte de rang égal ou supérieur.
export const ROLE_RANK = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  user: 1,
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
  manager: 'Manager',
  user: 'Utilisateur',
};

export function rankOf(role) {
  return ROLE_RANK[role] || 0;
}

// Un rôle peut gérer (créer/modifier/désactiver/déconnecter) un compte
// uniquement si son rang est strictement supérieur à celui de la cible.
export function canManage(actorRole, targetRole) {
  return rankOf(actorRole) > rankOf(targetRole);
}

// Seuls manager et au-dessus peuvent publier directement du contenu ; un
// "user" peut créer/modifier mais son contenu reste en attente de validation.
export function canPublishDirectly(role) {
  return rankOf(role) >= ROLE_RANK.manager;
}

export function requireMinRole(minRole) {
  const minRank = ROLE_RANK[minRole];
  return (req, res, next) => {
    if (rankOf(req.user?.role) < minRank) {
      return res.status(403).json({ error: 'Droits insuffisants pour cette action' });
    }
    next();
  };
}
