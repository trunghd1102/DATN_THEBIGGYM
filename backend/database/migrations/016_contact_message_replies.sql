USE biggym;

SET @add_contact_reply_message = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND COLUMN_NAME = 'reply_message'
    ),
    'SELECT 1',
    'ALTER TABLE contact_messages ADD COLUMN reply_message TEXT NULL AFTER message'
  )
);
PREPARE stmt FROM @add_contact_reply_message;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_contact_replied_by = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND COLUMN_NAME = 'replied_by'
    ),
    'SELECT 1',
    'ALTER TABLE contact_messages ADD COLUMN replied_by INT NULL AFTER reply_message'
  )
);
PREPARE stmt FROM @add_contact_replied_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_contact_replied_at = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND COLUMN_NAME = 'replied_at'
    ),
    'SELECT 1',
    'ALTER TABLE contact_messages ADD COLUMN replied_at TIMESTAMP NULL DEFAULT NULL AFTER replied_by'
  )
);
PREPARE stmt FROM @add_contact_replied_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_contact_replied_by_idx = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND INDEX_NAME = 'idx_contact_messages_replied_by'
    ),
    'SELECT 1',
    'CREATE INDEX idx_contact_messages_replied_by ON contact_messages(replied_by)'
  )
);
PREPARE stmt FROM @add_contact_replied_by_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_contact_replied_by_fk = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contact_messages'
        AND CONSTRAINT_NAME = 'fk_contact_messages_replied_by'
    ),
    'SELECT 1',
    'ALTER TABLE contact_messages ADD CONSTRAINT fk_contact_messages_replied_by FOREIGN KEY (replied_by) REFERENCES users(id) ON DELETE SET NULL'
  )
);
PREPARE stmt FROM @add_contact_replied_by_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
