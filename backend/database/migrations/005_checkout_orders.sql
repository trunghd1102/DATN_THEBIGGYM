USE biggym;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  order_code BIGINT NOT NULL UNIQUE,
  payment_provider ENUM('payos') NOT NULL DEFAULT 'payos',
  payment_status ENUM('PENDING', 'PROCESSING', 'PAID', 'CANCELLED', 'FAILED', 'EXPIRED', 'UNDERPAID') NOT NULL DEFAULT 'PENDING',
  checkout_url VARCHAR(255) NULL,
  payment_link_id VARCHAR(100) NULL,
  qr_code TEXT NULL,
  buyer_name VARCHAR(150) NOT NULL,
  buyer_email VARCHAR(150) NULL,
  buyer_phone VARCHAR(30) NOT NULL,
  shipping_address VARCHAR(255) NOT NULL,
  note TEXT NULL,
  subtotal_amount INT NOT NULL,
  shipping_fee INT NOT NULL DEFAULT 0,
  discount_amount INT NOT NULL DEFAULT 0,
  total_amount INT NOT NULL,
  reference_code VARCHAR(100) NULL,
  return_status VARCHAR(50) NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NULL,
  product_name VARCHAR(180) NOT NULL,
  product_slug VARCHAR(190) NULL,
  product_image_url VARCHAR(255) NULL,
  unit_price INT NOT NULL,
  quantity INT NOT NULL,
  line_total INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(payment_status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
