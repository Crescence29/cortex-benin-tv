-- Cortex Bénin TV — réactions emoji (façon Facebook) sur articles, vidéos
-- et projets. Pas de compte visiteur : une ligne par (contenu, emoji) avec
-- un compteur agrégé ; le navigateur du visiteur retient localement ce
-- qu'il a déjà cliqué (localStorage) pour permettre d'annuler/changer sa
-- réaction, sans avoir besoin d'authentifier qui que ce soit.
USE cortex_benin_tv;

CREATE TABLE IF NOT EXISTS content_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content_type ENUM('article', 'video', 'project') NOT NULL,
  content_id INT NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  UNIQUE KEY unique_content_emoji (content_type, content_id, emoji)
) ENGINE=InnoDB;
