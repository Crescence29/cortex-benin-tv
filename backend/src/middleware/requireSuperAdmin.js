export function requireSuperAdmin(req, res, next) {
  if (!req.user?.is_super_admin) {
    return res.status(403).json({ error: 'Réservé au super-administrateur' });
  }
  next();
}
