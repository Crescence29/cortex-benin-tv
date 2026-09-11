-- Étend le rôle métier à une vraie hiérarchie à 4 niveaux, et sépare l'accès
-- technique ("développeur") de la hiérarchie métier : un compte peut être
-- développeur sans que ça lui donne automatiquement plus de droits sur le
-- contenu, et inversement.

-- 1) Élargit l'enum le temps de migrer les valeurs existantes, puis le
--    resserre à sa forme finale.
ALTER TABLE users MODIFY COLUMN role ENUM('admin','editor','super_admin','manager','user') NOT NULL DEFAULT 'user';
-- Un ancien "editor" pouvait déjà publier directement : on le fait atterrir
-- sur "manager" (même capacité), pas "user" (qui devra passer par une
-- validation), pour ne rien casser du jour au lendemain sur les comptes
-- existants. "user" ne sera utilisé que pour de nouveaux comptes plus limités.
UPDATE users SET role = 'manager' WHERE role = 'editor';
UPDATE users SET role = 'super_admin' WHERE role = 'admin' AND is_super_admin = TRUE;
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','admin','manager','user') NOT NULL DEFAULT 'user';

-- 2) Le flag technique devient indépendant du rôle métier.
ALTER TABLE users ADD COLUMN is_developer BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET is_developer = is_super_admin;
ALTER TABLE users DROP COLUMN is_super_admin;

-- 3) Permet de désactiver un compte sans le supprimer.
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 4) Suivi réel des sessions (appareils connectés), pour pouvoir les lister
--    et forcer une déconnexion à distance.
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_id VARCHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(64),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
