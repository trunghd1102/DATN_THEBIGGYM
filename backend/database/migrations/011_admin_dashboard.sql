USE biggym;

SET @add_fulfillment_status = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME = 'fulfillment_status'
    ),
    'SELECT 1',
    "ALTER TABLE orders ADD COLUMN fulfillment_status ENUM('pending', 'shipping', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' AFTER payment_status"
  )
);
PREPARE stmt FROM @add_fulfillment_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_fulfillment_index = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND INDEX_NAME = 'idx_orders_fulfillment_status'
    ),
    'SELECT 1',
    'CREATE INDEX idx_orders_fulfillment_status ON orders(fulfillment_status)'
  )
);
PREPARE stmt FROM @add_fulfillment_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS shop_settings (
  id TINYINT PRIMARY KEY,
  shop_name VARCHAR(150) NOT NULL,
  contact_email VARCHAR(150) NULL,
  contact_phone VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  hero_title VARCHAR(180) NULL,
  hero_subtitle VARCHAR(255) NULL,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO shop_settings (
  id,
  shop_name,
  contact_email,
  contact_phone,
  address,
  hero_title,
  hero_subtitle,
  low_stock_threshold
) VALUES (
  1,
  'THE BIG GYM',
  'thebiggym@phamductrung.id.vn',
  '1900 1009',
  '219 Hồ Sen, Phường Lê Chân, TP. Hải Phòng',
  'Bảng điều khiển quản trị',
  'Theo dõi vận hành, đơn hàng và tăng trưởng toàn hệ thống BigGym.',
  5
) AS new
ON DUPLICATE KEY UPDATE
  shop_name = new.shop_name,
  contact_email = new.contact_email,
  contact_phone = new.contact_phone,
  address = new.address,
  hero_title = new.hero_title,
  hero_subtitle = new.hero_subtitle,
  low_stock_threshold = new.low_stock_threshold;
