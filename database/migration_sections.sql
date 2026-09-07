-- Cortex Bénin TV — sections additionnelles : direct, grille TV, planning, analytics
USE cortex_benin_tv;

ALTER TABLE articles ADD COLUMN view_count INT NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN view_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS live_stream (
  id INT PRIMARY KEY,
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  title VARCHAR(255) NULL,
  stream_url VARCHAR(500) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO live_stream (id, is_live) VALUES (1, FALSE);

CREATE TABLE IF NOT EXISTS tv_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_of_week TINYINT NOT NULL COMMENT '0=dimanche .. 6=samedi',
  start_time TIME NOT NULL,
  title VARCHAR(255) NOT NULL,
  category_id INT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;
