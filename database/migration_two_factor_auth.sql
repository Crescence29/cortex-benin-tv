-- Authentification à double facteur (TOTP) réelle, par compte.
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN two_factor_backup_codes JSON NULL;
