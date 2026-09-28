-- Cortex Bénin TV — projets/campagnes (ex: Octobre Rose, Novembre Bleu)
-- avec galerie d'affiches/flyers et vidéos réalisées pendant le projet.
USE cortex_benin_tv;

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description TEXT NULL,
  period_label VARCHAR(100) NULL,
  cover_image_url VARCHAR(500) NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(200) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  title VARCHAR(200) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;
