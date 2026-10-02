-- Cortex Bénin TV — programmation de la publication des affiches/flyers d'un projet.
-- publish_at est stockée en UTC ; NULL = visible immédiatement.
USE cortex_benin_tv;

ALTER TABLE project_images
  ADD COLUMN publish_at DATETIME NULL AFTER caption;
