-- Cortex Bénin TV — schéma de base de données MySQL (multilingue)

CREATE DATABASE IF NOT EXISTS cortex_benin_tv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cortex_benin_tv;

CREATE TABLE languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE category_translations (
  category_id INT NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (category_id, lang_code),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (lang_code) REFERENCES languages(code) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'editor') NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cover_image VARCHAR(500),
  video_url VARCHAR(500) NULL,
  category_id INT NOT NULL,
  author_id INT NOT NULL,
  status ENUM('draft', 'pending_review', 'scheduled', 'published') NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  published_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_status_published (status, published_at),
  INDEX idx_category (category_id)
) ENGINE=InnoDB;

CREATE TABLE article_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL,
  excerpt VARCHAR(500),
  content MEDIUMTEXT NOT NULL,
  seo_title VARCHAR(255) NULL,
  seo_description VARCHAR(300) NULL,
  UNIQUE KEY uniq_article_lang (article_id, lang_code),
  UNIQUE KEY uniq_slug (slug),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (lang_code) REFERENCES languages(code) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE article_tags (
  article_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE article_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_url VARCHAR(500) NOT NULL,
  thumbnail VARCHAR(500),
  category_id INT NOT NULL,
  program VARCHAR(150) NULL COMMENT 'Nom de l''émission, si applicable',
  duration_seconds INT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_status_published (status, published_at)
) ENGINE=InnoDB;

CREATE TABLE video_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL,
  description VARCHAR(500),
  UNIQUE KEY uniq_video_lang (video_id, lang_code),
  UNIQUE KEY uniq_slug (slug),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (lang_code) REFERENCES languages(code) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE feed_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  url VARCHAR(500) NOT NULL,
  category_id INT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_fetched_at TIMESTAMP NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE feed_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  link VARCHAR(1000) NOT NULL,
  summary VARCHAR(1000),
  image VARCHAR(500),
  published_at DATETIME NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES feed_sources(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_link (link(500))
) ENGINE=InnoDB;

INSERT INTO languages (code, name, native_name, sort_order) VALUES
  ('fr', 'French', 'Français', 1),
  ('en', 'English', 'English', 2),
  ('es', 'Spanish', 'Español', 3),
  ('pt', 'Portuguese', 'Português', 4),
  ('pt-br', 'Brazilian Portuguese', 'Português do Brasil', 5),
  ('ha', 'Hausa', 'Hausa', 6),
  ('sw', 'Swahili', 'Kiswahili', 7),
  ('nqo', 'Mandenkan', 'Mandenkan', 8),
  ('ff', 'Fulfulde', 'Fulfulde', 9),
  ('ro', 'Romanian', 'Română', 10),
  ('ru', 'Russian', 'Русский', 11),
  ('uk', 'Ukrainian', 'Українською', 12),
  ('vi', 'Vietnamese', 'Tiếng Việt', 13),
  ('km', 'Khmer', 'ខ្មែរ', 14),
  ('zh', 'Chinese', '华语', 15),
  ('zh-tw', 'Traditional Chinese', '華語', 16),
  ('hy', 'Armenian', 'Հայերեն', 17),
  ('fa', 'Persian', 'فارسی', 18);

INSERT INTO categories (slug) VALUES
  ('culture'), ('videos'), ('emission'), ('local'), ('international'),
  ('podcasts'), ('musique'), ('sports');

INSERT INTO category_translations (category_id, lang_code, name)
SELECT id, 'fr', CASE slug
  WHEN 'culture' THEN 'Culture'
  WHEN 'videos' THEN 'Vidéos'
  WHEN 'emission' THEN 'Émission'
  WHEN 'local' THEN 'Local'
  WHEN 'international' THEN 'International'
  WHEN 'podcasts' THEN 'Podcasts'
  WHEN 'musique' THEN 'Musique'
  WHEN 'sports' THEN 'Sports'
END FROM categories;

INSERT INTO category_translations (category_id, lang_code, name)
SELECT id, 'en', CASE slug
  WHEN 'culture' THEN 'Culture'
  WHEN 'videos' THEN 'Videos'
  WHEN 'emission' THEN 'Shows'
  WHEN 'local' THEN 'Local'
  WHEN 'international' THEN 'International'
  WHEN 'podcasts' THEN 'Podcasts'
  WHEN 'musique' THEN 'Music'
  WHEN 'sports' THEN 'Sports'
END FROM categories;
