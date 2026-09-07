-- Cortex Bénin TV — onglet développeur : super-admin, journal d'activité, identité visuelle
USE cortex_benin_tv;

ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  actor_name VARCHAR(150) NULL,
  actor_role VARCHAR(30) NULL,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(60) NULL,
  target_id VARCHAR(60) NULL,
  details VARCHAR(500) NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS site_settings (
  id VARCHAR(20) PRIMARY KEY,
  data JSON NOT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO site_settings (id, data) VALUES ('main', JSON_OBJECT('logo_mode', 'image', 'logo_text', 'CORTEX BÉNIN TV'));

-- Désigne le premier compte admin existant comme super-admin (à ajuster si besoin)
UPDATE users SET is_super_admin = TRUE WHERE email = 'cortexbenin@gmail.com';
