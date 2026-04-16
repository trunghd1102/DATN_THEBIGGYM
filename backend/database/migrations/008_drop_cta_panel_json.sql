USE biggym;

SET @drop_cta_panel_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'cta_panel_json'
    ),
    "ALTER TABLE products DROP COLUMN cta_panel_json",
    "SELECT 1"
  )
);
PREPARE stmt FROM @drop_cta_panel_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
