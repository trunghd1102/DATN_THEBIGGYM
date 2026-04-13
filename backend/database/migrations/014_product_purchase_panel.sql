USE biggym;

SET @add_purchase_panel_title = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'purchase_panel_title'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN purchase_panel_title VARCHAR(180) NULL AFTER notes_json"
  )
);
PREPARE stmt FROM @add_purchase_panel_title;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_purchase_panel_body = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'purchase_panel_body'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN purchase_panel_body TEXT NULL AFTER purchase_panel_title"
  )
);
PREPARE stmt FROM @add_purchase_panel_body;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
