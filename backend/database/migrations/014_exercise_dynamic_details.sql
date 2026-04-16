USE biggym;

SET @add_focus_label = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'focus_label'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN focus_label VARCHAR(180) NULL AFTER level_slug"
  )
);
PREPARE stmt FROM @add_focus_label;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_calorie_burn_text = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'calorie_burn_text'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN calorie_burn_text VARCHAR(120) NULL AFTER primary_muscles"
  )
);
PREPARE stmt FROM @add_calorie_burn_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_expert_tip = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'expert_tip'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN expert_tip TEXT NULL AFTER video_url"
  )
);
PREPARE stmt FROM @add_expert_tip;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_execution_steps_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'execution_steps_json'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN execution_steps_json LONGTEXT NULL AFTER expert_tip"
  )
);
PREPARE stmt FROM @add_execution_steps_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_common_mistakes_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'common_mistakes_json'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN common_mistakes_json LONGTEXT NULL AFTER execution_steps_json"
  )
);
PREPARE stmt FROM @add_common_mistakes_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_muscle_tags_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'muscle_tags_json'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN muscle_tags_json LONGTEXT NULL AFTER common_mistakes_json"
  )
);
PREPARE stmt FROM @add_muscle_tags_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_recommended_sets_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'recommended_sets_json'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN recommended_sets_json LONGTEXT NULL AFTER muscle_tags_json"
  )
);
PREPARE stmt FROM @add_recommended_sets_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_related_exercises_json = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'related_exercises_json'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN related_exercises_json LONGTEXT NULL AFTER recommended_sets_json"
  )
);
PREPARE stmt FROM @add_related_exercises_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_is_active = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'is_active'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1 AFTER related_exercises_json"
  )
);
PREPARE stmt FROM @add_is_active;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_sort_order = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'sort_order'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER is_active"
  )
);
PREPARE stmt FROM @add_sort_order;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_updated_at = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND COLUMN_NAME = 'updated_at'
    ),
    'SELECT 1',
    "ALTER TABLE exercises ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at"
  )
);
PREPARE stmt FROM @add_updated_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_exercises_active_sort_idx = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'exercises'
        AND INDEX_NAME = 'idx_exercises_active_sort'
    ),
    'SELECT 1',
    'CREATE INDEX idx_exercises_active_sort ON exercises(is_active, sort_order, title)'
  )
);
PREPARE stmt FROM @add_exercises_active_sort_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @previous_sql_safe_updates = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE exercises
SET sort_order = id
WHERE sort_order = 0
  AND id > 0;

SET SQL_SAFE_UPDATES = @previous_sql_safe_updates;
