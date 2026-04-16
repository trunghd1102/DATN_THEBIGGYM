USE biggym;

SET @add_contact_messages_user_id = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND COLUMN_NAME = 'user_id'
    ),
    'SELECT 1',
    'ALTER TABLE contact_messages ADD COLUMN user_id INT NULL AFTER id'
  )
);
PREPARE stmt FROM @add_contact_messages_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_contact_messages_status_idx = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND INDEX_NAME = 'idx_contact_messages_status_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_contact_messages_status_created ON contact_messages(status, created_at)'
  )
);
PREPARE stmt FROM @add_contact_messages_status_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_contact_messages_user_idx = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND INDEX_NAME = 'idx_contact_messages_user_id'
    ),
    'SELECT 1',
    'CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id)'
  )
);
PREPARE stmt FROM @add_contact_messages_user_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_contact_messages_user_fk = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND CONSTRAINT_NAME = 'fk_contact_messages_user'
    ),
    'SELECT 1',
    'ALTER TABLE contact_messages ADD CONSTRAINT fk_contact_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'
  )
);
PREPARE stmt FROM @add_contact_messages_user_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
