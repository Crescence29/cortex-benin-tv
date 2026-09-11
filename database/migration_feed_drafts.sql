-- Suivi de la conversion des éléments de flux RSS en brouillons d'articles
ALTER TABLE feed_items ADD COLUMN draft_article_id INT NULL;

ALTER TABLE feed_items
  ADD CONSTRAINT fk_feed_items_draft_article
    FOREIGN KEY (draft_article_id) REFERENCES articles(id) ON DELETE SET NULL;
