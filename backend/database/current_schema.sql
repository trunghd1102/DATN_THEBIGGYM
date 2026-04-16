CREATE DATABASE IF NOT EXISTS biggym
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE biggym;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS pt_bookings;
DROP TABLE IF EXISTS pt_booking_slots;
DROP TABLE IF EXISTS pt_trainers;
DROP TABLE IF EXISTS product_reviews;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS shop_settings;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS workout_plan_items;
DROP TABLE IF EXISTS workout_plans;
DROP TABLE IF EXISTS tdee_logs;
DROP TABLE IF EXISTS body_metrics;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- Core users and training content
-- ============================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  role ENUM('admin', 'coach', 'member') NOT NULL DEFAULT 'member',
  auth_provider ENUM('local', 'google') NOT NULL DEFAULT 'local',
  google_id VARCHAR(255) NULL UNIQUE,
  avatar_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  category_slug VARCHAR(100) NOT NULL,
  level_name VARCHAR(100) NOT NULL,
  level_slug VARCHAR(100) NOT NULL,
  focus_label VARCHAR(180) NULL,
  equipment VARCHAR(255) NULL,
  primary_muscles VARCHAR(255) NULL,
  calorie_burn_text VARCHAR(120) NULL,
  hero_image VARCHAR(255) NULL,
  short_description TEXT NULL,
  long_description TEXT NULL,
  video_url VARCHAR(255) NULL,
  expert_tip TEXT NULL,
  execution_steps_json LONGTEXT NULL,
  common_mistakes_json LONGTEXT NULL,
  muscle_tags_json LONGTEXT NULL,
  recommended_sets_json LONGTEXT NULL,
  related_exercises_json LONGTEXT NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE body_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  height_cm DECIMAL(5,2) NOT NULL,
  body_fat_percent DECIMAL(5,2) NULL,
  bmi DECIMAL(5,2) NULL,
  recorded_at DATETIME NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_body_metrics_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE tdee_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  gender ENUM('male', 'female') NOT NULL,
  age INT NOT NULL,
  height_cm DECIMAL(5,2) NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  activity_factor DECIMAL(4,3) NOT NULL,
  bmi DECIMAL(5,2) NULL,
  body_fat_percent DECIMAL(5,2) NULL,
  bmr DECIMAL(8,2) NULL,
  tdee DECIMAL(8,2) NOT NULL,
  cut_calories DECIMAL(8,2) NOT NULL,
  bulk_calories DECIMAL(8,2) NOT NULL,
  protein_grams DECIMAL(8,2) NULL,
  carbs_grams DECIMAL(8,2) NULL,
  fats_grams DECIMAL(8,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tdee_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE workout_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  title VARCHAR(150) NOT NULL,
  goal VARCHAR(100) NOT NULL,
  level VARCHAR(100) NOT NULL,
  duration_weeks INT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workout_plans_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE workout_plan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workout_plan_id INT NOT NULL,
  day_label VARCHAR(100) NOT NULL,
  exercise_id INT NOT NULL,
  sets_count INT NULL,
  reps_text VARCHAR(100) NULL,
  rest_seconds INT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_workout_plan_items_plan
    FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_workout_plan_items_exercise
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    ON DELETE CASCADE
);

-- ============================================
-- Contact messages
-- ============================================

CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  subject VARCHAR(150) NULL,
  message TEXT NOT NULL,
  reply_message TEXT NULL,
  replied_by INT NULL,
  replied_at TIMESTAMP NULL DEFAULT NULL,
  status ENUM('new', 'processing', 'closed') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contact_messages_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_contact_messages_replied_by
    FOREIGN KEY (replied_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ============================================
-- Shop and checkout
-- ============================================

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(190) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  category_slug VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  image_url VARCHAR(255) NULL,
  gallery_images_json LONGTEXT NULL,
  flavors_json LONGTEXT NULL,
  sizes_json LONGTEXT NULL,
  feature_cards_json LONGTEXT NULL,
  quick_info_json LONGTEXT NULL,
  highlights_json LONGTEXT NULL,
  usage_guide_json LONGTEXT NULL,
  notes_json LONGTEXT NULL,
  purchase_panel_title VARCHAR(180) NULL,
  purchase_panel_body TEXT NULL,
  badge_label VARCHAR(80) NULL,
  short_description TEXT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE product_variants (
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

CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  product_variant_id INT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_items_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
    ON DELETE CASCADE,
  CONSTRAINT uq_cart_items_user_variant
    UNIQUE (user_id, product_variant_id)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  order_code BIGINT NOT NULL UNIQUE,
  payment_provider ENUM('payos') NOT NULL DEFAULT 'payos',
  payment_status ENUM('PENDING', 'PROCESSING', 'PAID', 'CANCELLED', 'FAILED', 'EXPIRED', 'UNDERPAID') NOT NULL DEFAULT 'PENDING',
  fulfillment_status ENUM('pending', 'shipping', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
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
  inventory_reserved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NULL,
  product_variant_id INT NULL,
  product_name VARCHAR(180) NOT NULL,
  product_slug VARCHAR(190) NULL,
  product_image_url VARCHAR(255) NULL,
  variant_flavor VARCHAR(120) NULL,
  variant_size VARCHAR(120) NULL,
  unit_price INT NOT NULL,
  quantity INT NOT NULL,
  line_total INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_order_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
    ON DELETE SET NULL
);

CREATE TABLE shop_settings (
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

CREATE TABLE product_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_reviews_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT uq_product_reviews_product_user
    UNIQUE (product_id, user_id)
);

-- ============================================
-- Personal trainer booking
-- ============================================

CREATE TABLE pt_trainers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  role_title VARCHAR(150) NOT NULL,
  expertise_label VARCHAR(150) NOT NULL,
  experience_years INT NOT NULL DEFAULT 0,
  short_bio TEXT NULL,
  full_bio TEXT NULL,
  portrait_image_url VARCHAR(255) NULL,
  hero_image_url VARCHAR(255) NULL,
  specialty_tags_json LONGTEXT NULL,
  feature_points_json LONGTEXT NULL,
  accent_color VARCHAR(20) NULL,
  is_featured TINYINT NOT NULL DEFAULT 0,
  is_active TINYINT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pt_trainers_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE pt_booking_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  slot_start DATETIME NOT NULL,
  slot_end DATETIME NOT NULL,
  location_label VARCHAR(150) NULL,
  session_label VARCHAR(150) NULL,
  capacity INT NOT NULL DEFAULT 1,
  is_active TINYINT NOT NULL DEFAULT 1,
  admin_note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pt_booking_slots_trainer
    FOREIGN KEY (trainer_id) REFERENCES pt_trainers(id)
    ON DELETE CASCADE
);

CREATE TABLE pt_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(24) NOT NULL UNIQUE,
  trainer_id INT NOT NULL,
  slot_id INT NOT NULL,
  user_id INT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  goal_label VARCHAR(150) NOT NULL,
  fitness_level VARCHAR(100) NULL,
  preferred_focus VARCHAR(150) NULL,
  note TEXT NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'no_show') NOT NULL DEFAULT 'pending',
  admin_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status_updated_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_pt_bookings_trainer
    FOREIGN KEY (trainer_id) REFERENCES pt_trainers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pt_bookings_slot
    FOREIGN KEY (slot_id) REFERENCES pt_booking_slots(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pt_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ============================================
-- Secondary indexes
-- ============================================

CREATE INDEX idx_exercises_active_sort
  ON exercises(is_active, sort_order, title);

CREATE INDEX idx_contact_messages_status_created
  ON contact_messages(status, created_at);

CREATE INDEX idx_contact_messages_user_id
  ON contact_messages(user_id);

CREATE INDEX idx_contact_messages_replied_by
  ON contact_messages(replied_by);

CREATE INDEX idx_products_category
  ON products(category_slug);

CREATE INDEX idx_products_featured
  ON products(is_featured, is_active, sort_order);

CREATE INDEX idx_product_variants_product_id
  ON product_variants(product_id);

CREATE INDEX idx_product_variants_stock
  ON product_variants(product_id, is_active, stock_quantity);

CREATE INDEX idx_cart_items_user
  ON cart_items(user_id);

CREATE INDEX idx_cart_items_variant
  ON cart_items(product_variant_id);

CREATE INDEX idx_orders_user_id
  ON orders(user_id);

CREATE INDEX idx_orders_status
  ON orders(payment_status);

CREATE INDEX idx_orders_fulfillment_status
  ON orders(fulfillment_status);

CREATE INDEX idx_order_items_order_id
  ON order_items(order_id);

CREATE INDEX idx_order_items_variant
  ON order_items(product_variant_id);

CREATE INDEX idx_product_reviews_product_id
  ON product_reviews(product_id);

CREATE INDEX idx_product_reviews_user_id
  ON product_reviews(user_id);

CREATE INDEX idx_pt_trainers_active_sort
  ON pt_trainers(is_active, sort_order, full_name);

CREATE INDEX idx_pt_booking_slots_trainer_start
  ON pt_booking_slots(trainer_id, slot_start, is_active);

CREATE INDEX idx_pt_booking_slots_start
  ON pt_booking_slots(slot_start, is_active);

CREATE INDEX idx_pt_bookings_status_created
  ON pt_bookings(status, created_at);

CREATE INDEX idx_pt_bookings_slot_status
  ON pt_bookings(slot_id, status);

CREATE INDEX idx_pt_bookings_user_created
  ON pt_bookings(user_id, created_at);


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
  '219 Ho Sen, Phuong Le Chan, TP. Hai Phong',
  'Bang dieu khien quan tri',
  'Theo doi van hanh, don hang va tang truong toan he thong BigGym.',
  5
)
ON DUPLICATE KEY UPDATE
  shop_name = VALUES(shop_name),
  contact_email = VALUES(contact_email),
  contact_phone = VALUES(contact_phone),
  address = VALUES(address),
  hero_title = VALUES(hero_title),
  hero_subtitle = VALUES(hero_subtitle),
  low_stock_threshold = VALUES(low_stock_threshold);
