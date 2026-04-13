USE biggym;

SET @add_inventory_reserved = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME = 'inventory_reserved'
    ),
    'SELECT 1',
    "ALTER TABLE orders ADD COLUMN inventory_reserved TINYINT(1) NOT NULL DEFAULT 0 AFTER paid_at"
  )
);
PREPARE stmt FROM @add_inventory_reserved;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
