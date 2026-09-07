-- Cortex Bénin TV — passage au multilingue (contenu traduit par langue)
USE cortex_benin_tv;

CREATE TABLE IF NOT EXISTS languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO languages (code, name, native_name, sort_order) VALUES
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

-- Traductions des rubriques
CREATE TABLE IF NOT EXISTS category_translations (
  category_id INT NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (category_id, lang_code),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (lang_code) REFERENCES languages(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Traductions des articles (un article = un id, une ligne de traduction par langue rédigée)
CREATE TABLE IF NOT EXISTS article_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL,
  excerpt VARCHAR(500),
  content MEDIUMTEXT NOT NULL,
  UNIQUE KEY uniq_article_lang (article_id, lang_code),
  UNIQUE KEY uniq_slug (slug),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (lang_code) REFERENCES languages(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Traductions des vidéos
CREATE TABLE IF NOT EXISTS video_translations (
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
