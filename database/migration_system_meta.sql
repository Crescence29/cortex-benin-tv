-- Petite table clé/valeur pour des faits techniques réels (ex : date de la
-- dernière sauvegarde manuelle déclenchée depuis le dashboard développeur).
CREATE TABLE IF NOT EXISTS system_meta (
  `key` VARCHAR(50) PRIMARY KEY,
  value VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
