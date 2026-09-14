-- Remplace le simple booléen is_active par un vrai statut à 3 états, pour
-- distinguer une suspension temporaire (réversible en un clic) d'un
-- bannissement permanent (accordé et levé uniquement via un code de
-- confirmation, comme l'accès développeur).
ALTER TABLE users ADD COLUMN status ENUM('active','suspended','banned') NOT NULL DEFAULT 'active';
UPDATE users SET status = IF(is_active, 'active', 'suspended');
ALTER TABLE users DROP COLUMN is_active;
