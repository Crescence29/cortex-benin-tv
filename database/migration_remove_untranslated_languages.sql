USE cortex_benin_tv;

-- pt-br et zh-tw étaient proposés dans le sélecteur de langue mais
-- n'avaient jamais de traduction de l'interface (translations.js) ni de
-- contenu réel — retirés pour ne plus proposer une langue à moitié traduite.
DELETE FROM languages WHERE code IN ('pt-br', 'zh-tw');
