-- Suite du correctif précédent (VARCHAR 200 puis 500 encore trop court) :
-- passage en TEXT pour ne plus jamais buter sur une limite de longueur.
USE cortex_benin_tv;

ALTER TABLE project_images MODIFY COLUMN caption TEXT NULL;
ALTER TABLE project_videos MODIFY COLUMN title TEXT NULL;
