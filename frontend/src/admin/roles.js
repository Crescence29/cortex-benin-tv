export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
  manager: 'Manager',
  user: 'Utilisateur',
};

export const ROLE_RANK = { super_admin: 4, admin: 3, manager: 2, user: 1 };

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export function canManage(actorRole, targetRole) {
  return (ROLE_RANK[actorRole] || 0) > (ROLE_RANK[targetRole] || 0);
}

export const STATUS_LABELS = {
  active: 'Actif',
  suspended: 'Suspendu',
  banned: 'Banni',
};
