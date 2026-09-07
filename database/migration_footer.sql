-- Cortex Bénin TV — partenaires et émissions gérables depuis l'admin
USE cortex_benin_tv;

CREATE TABLE IF NOT EXISTS partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  logo_url VARCHAR(500) NOT NULL,
  website_url VARCHAR(500) NULL,
  bg_color VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  logo_url VARCHAR(500) NOT NULL,
  bg_color VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO partners (name, logo_url, website_url, bg_color, sort_order) VALUES
  ('Imprimerie Notre-Dame', '/partenaires/imprimerie-notre-dame.png', NULL, '#ffffff', 1),
  ('Tina Mood', '/partenaires/TINA MODE blanc.png', NULL, '#ffffff', 2),
  ('Partenaire éducatif', '/partenaires/logo.png', NULL, '#ffffff', 3);

INSERT INTO shows (name, logo_url, bg_color, sort_order) VALUES
  ('C''est son Anniversaire', '/emissions/CSA-logo-png.png', '#ffffff', 1),
  ('Tout Savoir', '/emissions/Tout savoir.png', '#ffffff', 2),
  ('24 Heures pour l''Information', '/emissions/logo 24h POUR L''INFORMATION.png', '#ffffff', 3),
  ('Question Devinette', '/emissions/logo question devinette .png', '#ffffff', 4);
