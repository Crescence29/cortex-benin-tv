USE cortex_benin_tv;

-- La catégorie "Jeunesse" avait été ajoutée directement en base en cours de
-- projet mais jamais capturée dans une migration : sur une base fraîche
-- (schema.sql seul), elle manquait, cassant le lien de navigation "Jeunesse".

INSERT INTO categories (slug)
SELECT 'jeunesse' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'jeunesse');

INSERT INTO category_translations (category_id, lang_code, name)
SELECT c.id, 'fr', 'Jeunesse' FROM categories c WHERE c.slug = 'jeunesse'
  AND NOT EXISTS (
    SELECT 1 FROM category_translations WHERE category_id = c.id AND lang_code = 'fr'
  );

INSERT INTO category_translations (category_id, lang_code, name)
SELECT c.id, 'en', 'Youth' FROM categories c WHERE c.slug = 'jeunesse'
  AND NOT EXISTS (
    SELECT 1 FROM category_translations WHERE category_id = c.id AND lang_code = 'en'
  );
