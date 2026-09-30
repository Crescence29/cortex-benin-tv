-- Corrige un vrai bug : VARCHAR(200) était trop court pour des légendes
-- d'affiche/titre de vidéo un peu détaillés, provoquant une erreur serveur
-- ("Data too long for column 'caption'") à l'enregistrement.
USE cortex_benin_tv;

ALTER TABLE project_images MODIFY COLUMN caption VARCHAR(500) NULL;
ALTER TABLE project_videos MODIFY COLUMN title VARCHAR(500) NULL;
