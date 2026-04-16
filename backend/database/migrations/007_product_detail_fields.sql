USE biggym;

SET @add_gallery_images_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'gallery_images_json'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN gallery_images_json LONGTEXT NULL AFTER image_url"
  )
);
PREPARE stmt FROM @add_gallery_images_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_flavors_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'flavors_json'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN flavors_json LONGTEXT NULL AFTER gallery_images_json"
  )
);
PREPARE stmt FROM @add_flavors_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_sizes_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'sizes_json'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN sizes_json LONGTEXT NULL AFTER flavors_json"
  )
);
PREPARE stmt FROM @add_sizes_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_feature_cards_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'feature_cards_json'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN feature_cards_json LONGTEXT NULL AFTER sizes_json"
  )
);
PREPARE stmt FROM @add_feature_cards_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_quick_info_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'quick_info_json'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN quick_info_json LONGTEXT NULL AFTER feature_cards_json"
  )
);
PREPARE stmt FROM @add_quick_info_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_highlights_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'highlights_json'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN highlights_json LONGTEXT NULL AFTER quick_info_json"
  )
);
PREPARE stmt FROM @add_highlights_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_usage_guide_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'usage_guide_json'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN usage_guide_json LONGTEXT NULL AFTER highlights_json"
  )
);
PREPARE stmt FROM @add_usage_guide_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_notes_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'notes_json'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN notes_json LONGTEXT NULL AFTER usage_guide_json"
  )
);
PREPARE stmt FROM @add_notes_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
