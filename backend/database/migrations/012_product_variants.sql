USE biggym;

CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  flavor_label VARCHAR(120) NOT NULL DEFAULT '',
  size_label VARCHAR(120) NOT NULL DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  image_url VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_variants_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT uq_product_variants_combo
    UNIQUE (product_id, flavor_label, size_label)
);

SET @add_product_variants_product_idx = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'product_variants'
        AND INDEX_NAME = 'idx_product_variants_product_id'
    ),
    'SELECT 1',
    'CREATE INDEX idx_product_variants_product_id ON product_variants(product_id)'
  )
);
PREPARE stmt FROM @add_product_variants_product_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_product_variants_stock_idx = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'product_variants'
        AND INDEX_NAME = 'idx_product_variants_stock'
    ),
    'SELECT 1',
    'CREATE INDEX idx_product_variants_stock ON product_variants(product_id, is_active, stock_quantity)'
  )
);
PREPARE stmt FROM @add_product_variants_stock_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_cart_variant_column = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cart_items'
        AND COLUMN_NAME = 'product_variant_id'
    ),
    'SELECT 1',
    'ALTER TABLE cart_items ADD COLUMN product_variant_id INT NULL AFTER product_id'
  )
);
PREPARE stmt FROM @add_cart_variant_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_order_item_variant_column = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'order_items'
        AND COLUMN_NAME = 'product_variant_id'
    ),
    'SELECT 1',
    'ALTER TABLE order_items ADD COLUMN product_variant_id INT NULL AFTER product_id'
  )
);
PREPARE stmt FROM @add_order_item_variant_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_order_item_variant_flavor = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'order_items'
        AND COLUMN_NAME = 'variant_flavor'
    ),
    'SELECT 1',
    'ALTER TABLE order_items ADD COLUMN variant_flavor VARCHAR(120) NULL AFTER product_image_url'
  )
);
PREPARE stmt FROM @add_order_item_variant_flavor;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_order_item_variant_size = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'order_items'
        AND COLUMN_NAME = 'variant_size'
    ),
    'SELECT 1',
    'ALTER TABLE order_items ADD COLUMN variant_size VARCHAR(120) NULL AFTER variant_flavor'
  )
);
PREPARE stmt FROM @add_order_item_variant_size;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @previous_sql_safe_updates = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

INSERT INTO product_variants (
  product_id,
  flavor_label,
  size_label,
  price,
  original_price,
  stock_quantity,
  image_url,
  is_active,
  sort_order
)
SELECT
  p.id,
  '',
  '',
  COALESCE(p.sale_price, p.price),
  CASE
    WHEN p.sale_price IS NOT NULL AND p.sale_price < p.price THEN p.price
    ELSE NULL
  END,
  p.stock_quantity,
  p.image_url,
  p.is_active,
  0
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE pv.id IS NULL;

UPDATE cart_items ci
INNER JOIN product_variants pv
  ON pv.product_id = ci.product_id
 AND pv.flavor_label = ''
 AND pv.size_label = ''
SET ci.product_variant_id = pv.id
WHERE ci.product_variant_id IS NULL;

SET @drop_old_cart_unique = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cart_items'
        AND INDEX_NAME = 'uq_cart_items_user_product'
    ),
    'ALTER TABLE cart_items DROP INDEX uq_cart_items_user_product',
    'SELECT 1'
  )
);
PREPARE stmt FROM @drop_old_cart_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_cart_variant_unique = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cart_items'
        AND INDEX_NAME = 'uq_cart_items_user_variant'
    ),
    'SELECT 1',
    'ALTER TABLE cart_items ADD CONSTRAINT uq_cart_items_user_variant UNIQUE (user_id, product_variant_id)'
  )
);
PREPARE stmt FROM @add_cart_variant_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_cart_variant_idx = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cart_items'
        AND INDEX_NAME = 'idx_cart_items_variant'
    ),
    'SELECT 1',
    'CREATE INDEX idx_cart_items_variant ON cart_items(product_variant_id)'
  )
);
PREPARE stmt FROM @add_cart_variant_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_order_item_variant_idx = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'order_items'
        AND INDEX_NAME = 'idx_order_items_variant'
    ),
    'SELECT 1',
    'CREATE INDEX idx_order_items_variant ON order_items(product_variant_id)'
  )
);
PREPARE stmt FROM @add_order_item_variant_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_cart_variant_fk = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cart_items'
        AND CONSTRAINT_NAME = 'fk_cart_items_variant'
    ),
    'SELECT 1',
    'ALTER TABLE cart_items ADD CONSTRAINT fk_cart_items_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE'
  )
);
PREPARE stmt FROM @add_cart_variant_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_order_item_variant_fk = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'order_items'
        AND CONSTRAINT_NAME = 'fk_order_items_variant'
    ),
    'SELECT 1',
    'ALTER TABLE order_items ADD CONSTRAINT fk_order_items_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL'
  )
);
PREPARE stmt FROM @add_order_item_variant_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE products p
SET p.stock_quantity = (
  SELECT COALESCE(SUM(CASE WHEN pv.is_active = 1 THEN pv.stock_quantity ELSE 0 END), 0)
  FROM product_variants pv
  WHERE pv.product_id = p.id
);

SET SQL_SAFE_UPDATES = @previous_sql_safe_updates;
