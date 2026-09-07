USE cortex_benin_tv;

-- "En Direct" (national) et "En Direct Local" partageaient la même ligne
-- (id=1) : un seul flux, deux pages différentes. On introduit un vrai
-- second flux distinct, identifié par un slug plutôt qu'un id fixe.

ALTER TABLE live_stream ADD COLUMN slug VARCHAR(30) NULL UNIQUE AFTER id;

UPDATE live_stream SET slug = 'main' WHERE id = 1;

INSERT INTO live_stream (id, slug, is_live, title, stream_url)
SELECT 2, 'local', FALSE, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM live_stream WHERE slug = 'local');
