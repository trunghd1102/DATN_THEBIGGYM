USE biggym;

ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

SET @add_auth_provider = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'auth_provider'
    ),
    'SELECT 1',
    "ALTER TABLE users ADD COLUMN auth_provider ENUM('local', 'google') NOT NULL DEFAULT 'local' AFTER role"
  )
);
PREPARE stmt FROM @add_auth_provider;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_google_id = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'google_id'
    ),
    'SELECT 1',
    "ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER auth_provider"
  )
);
PREPARE stmt FROM @add_google_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_avatar_url = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'avatar_url'
    ),
    'SELECT 1',
    "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER google_id"
  )
);
PREPARE stmt FROM @add_avatar_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
