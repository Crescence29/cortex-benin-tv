-- Corrige un bug découvert en test : sous utf8mb4_unicode_ci, MySQL traite
-- 👍 😂 😮 😢 😡 comme des caractères égaux entre eux (seul ❤️ s'en distingue),
-- ce qui fusionnait silencieusement leurs compteurs de réactions dans la
-- même ligne. utf8mb4_bin compare les emojis octet par octet et les garde
-- bien distincts.
USE cortex_benin_tv;

ALTER TABLE content_reactions
  MODIFY emoji VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
