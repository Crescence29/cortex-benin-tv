-- Cortex Bénin TV — messages reçus depuis le formulaire de contact
USE cortex_benin_tv;

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  company VARCHAR(150) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(200) NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
