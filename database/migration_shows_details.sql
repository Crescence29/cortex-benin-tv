USE cortex_benin_tv;

ALTER TABLE shows
  ADD COLUMN description VARCHAR(255) NULL AFTER name,
  ADD COLUMN schedule_label VARCHAR(150) NULL AFTER description,
  ADD COLUMN category_id INT NULL AFTER schedule_label,
  ADD CONSTRAINT fk_shows_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
