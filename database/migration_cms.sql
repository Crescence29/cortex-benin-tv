-- Cortex Bénin TV — CMS journalistique : statuts étendus, tags, galerie, SEO
USE cortex_benin_tv;

ALTER TABLE articles
  MODIFY status ENUM('draft', 'pending_review', 'scheduled', 'published') NOT NULL DEFAULT 'draft',
  ADD COLUMN video_url VARCHAR(500) NULL AFTER cover_image;

ALTER TABLE article_translations
  ADD COLUMN seo_title VARCHAR(255) NULL,
  ADD COLUMN seo_description VARCHAR(300) NULL;

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS article_tags (
  article_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS article_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB;
