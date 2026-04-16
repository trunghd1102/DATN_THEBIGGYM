USE biggym;

CREATE TABLE IF NOT EXISTS pt_trainers (
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

CREATE TABLE IF NOT EXISTS pt_booking_slots (
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

CREATE TABLE IF NOT EXISTS pt_bookings (
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

CREATE INDEX idx_pt_trainers_active_sort ON pt_trainers(is_active, sort_order, full_name);
CREATE INDEX idx_pt_booking_slots_trainer_start ON pt_booking_slots(trainer_id, slot_start, is_active);
CREATE INDEX idx_pt_booking_slots_start ON pt_booking_slots(slot_start, is_active);
CREATE INDEX idx_pt_bookings_status_created ON pt_bookings(status, created_at);
CREATE INDEX idx_pt_bookings_slot_status ON pt_bookings(slot_id, status);
CREATE INDEX idx_pt_bookings_user_created ON pt_bookings(user_id, created_at);

INSERT INTO pt_trainers (
  user_id,
  slug,
  full_name,
  role_title,
  expertise_label,
  experience_years,
  short_bio,
  full_bio,
  portrait_image_url,
  hero_image_url,
  specialty_tags_json,
  feature_points_json,
  accent_color,
  is_featured,
  is_active,
  sort_order
)
SELECT
  NULL,
  'minh-hoang',
  'Minh Hoang',
  'Bodybuilding Specialist',
  'Hypertrophy & physique development',
  8,
  'Tap trung vao ky thuat nen tang, tang co sach va lo trinh phat trien ben vung cho nguoi tap nghiem tuc.',
  'Minh Hoang phu hop cho hoi vien muon xay nen tang ky thuat vung, tap co he thong va theo sat tien do theo tung giai doan. Lo trinh huan luyen uu tien tinh ky luat, su ro rang trong bai tap va kha nang duy tri hieu suat lau dai.',
  '/assets/images/customer-review-1.jpg',
  '/assets/images/hero-training.jpg',
  '["Hypertrophy", "Body recomposition", "Ky thuat nen tang"]',
  '["Danh gia form tap chi tiet", "Theo doi tien do hang tuan", "Lo trinh 1:1 theo muc tieu"]',
  '#f2ca50',
  1,
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM pt_trainers WHERE slug = 'minh-hoang'
);

INSERT INTO pt_trainers (
  user_id,
  slug,
  full_name,
  role_title,
  expertise_label,
  experience_years,
  short_bio,
  full_bio,
  portrait_image_url,
  hero_image_url,
  specialty_tags_json,
  feature_points_json,
  accent_color,
  is_featured,
  is_active,
  sort_order
)
SELECT
  NULL,
  'linh-dan',
  'Linh Dan',
  'Yoga & Pilates Master',
  'Mobility, posture & mindful movement',
  12,
  'Huong dan cac buoi tap chuyen sau ve mobility, yoga flow va phuc hoi than kinh co.',
  'Linh Dan phu hop cho nguoi can cai thien tu the, giam cang co va tang do nhan biet co the trong qua trinh tap luyen. Cac buoi huan luyen can bang giua ky thuat, hoi tho va kha nang duy tri nhan thuc trong tung chuyen dong.',
  '/assets/images/customer-review-2.jpg',
  '/assets/images/yoga-studio.jpg',
  '["Yoga", "Pilates", "Mobility"]',
  '["Flow theo the trang ca nhan", "Chinh posture va hoi tho", "Phuc hoi sau strength"]',
  '#b8d9ff',
  0,
  1,
  2
WHERE NOT EXISTS (
  SELECT 1 FROM pt_trainers WHERE slug = 'linh-dan'
);

INSERT INTO pt_trainers (
  user_id,
  slug,
  full_name,
  role_title,
  expertise_label,
  experience_years,
  short_bio,
  full_bio,
  portrait_image_url,
  hero_image_url,
  specialty_tags_json,
  feature_points_json,
  accent_color,
  is_featured,
  is_active,
  sort_order
)
SELECT
  NULL,
  'anh-quan',
  'Anh Quan',
  'Nutrition & Strength',
  'Strength coaching with nutrition support',
  6,
  'Ket hop lap lich tap suc manh voi chien luoc an uong de toi uu hieu suat va giam mo.',
  'Anh Quan phu hop voi hoi vien muon theo duoi muc tieu giam mo, tang co va can mot lo trinh ro rang giua lich tap, phuc hoi va dinh duong. Phong cach huan luyen truc dien, de do luong va tap trung vao ket qua thuc te.',
  '/assets/images/customer-review-3.jpg',
  '/assets/images/weight-room.jpg',
  '["Strength", "Nutrition coaching", "Fat loss"]',
  '["Lap lich tap theo muc tieu", "Can doi volume va recovery", "Theo doi ket qua bang chi so"]',
  '#ffb693',
  0,
  1,
  3
WHERE NOT EXISTS (
  SELECT 1 FROM pt_trainers WHERE slug = 'anh-quan'
);

INSERT INTO pt_trainers (
  user_id,
  slug,
  full_name,
  role_title,
  expertise_label,
  experience_years,
  short_bio,
  full_bio,
  portrait_image_url,
  hero_image_url,
  specialty_tags_json,
  feature_points_json,
  accent_color,
  is_featured,
  is_active,
  sort_order
)
SELECT
  NULL,
  'bao-tram',
  'Bao Tram',
  'Performance Coach',
  'Conditioning & athletic performance',
  10,
  'Tap trung vao suc ben, conditioning, nang luc van dong va kha nang duy tri phong do.',
  'Bao Tram phu hop voi hoi vien can tang suc ben, cai thien the luc tong quat va muon giu nhiep tap nang dong. Chuong trinh tap tap trung vao conditioning, kha nang phoi hop van dong va su on dinh hieu suat trong ca tuan.',
  '/assets/images/hero-training.jpg',
  '/assets/images/hero-training.jpg',
  '["Conditioning", "Performance", "General fitness"]',
  '["Buoi tap dong nhung co kiem soat", "Theo doi muc tai va hieu suat", "Phu hop cho lich ban ron"]',
  '#f2ca50',
  0,
  1,
  4
WHERE NOT EXISTS (
  SELECT 1 FROM pt_trainers WHERE slug = 'bao-tram'
);

INSERT INTO pt_booking_slots (trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note)
SELECT t.id, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '07:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00:00'), 'Private Gym Area', '1:1 Coaching', 1, 1, NULL
FROM pt_trainers t
WHERE t.slug = 'minh-hoang'
  AND NOT EXISTS (
    SELECT 1
    FROM pt_booking_slots s
    WHERE s.trainer_id = t.id
      AND s.slot_start = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '07:00:00')
  );

INSERT INTO pt_booking_slots (trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note)
SELECT t.id, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '18:30:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '19:30:00'), 'Private Gym Area', 'Bodybuilding Session', 1, 1, NULL
FROM pt_trainers t
WHERE t.slug = 'minh-hoang'
  AND NOT EXISTS (
    SELECT 1
    FROM pt_booking_slots s
    WHERE s.trainer_id = t.id
      AND s.slot_start = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '18:30:00')
  );

INSERT INTO pt_booking_slots (trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note)
SELECT t.id, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00'), 'Yoga Sanctuary', 'Mobility Flow', 1, 1, NULL
FROM pt_trainers t
WHERE t.slug = 'linh-dan'
  AND NOT EXISTS (
    SELECT 1
    FROM pt_booking_slots s
    WHERE s.trainer_id = t.id
      AND s.slot_start = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00')
  );

INSERT INTO pt_booking_slots (trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note)
SELECT t.id, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '17:30:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '18:30:00'), 'Yoga Sanctuary', 'Pilates Reset', 1, 1, NULL
FROM pt_trainers t
WHERE t.slug = 'linh-dan'
  AND NOT EXISTS (
    SELECT 1
    FROM pt_booking_slots s
    WHERE s.trainer_id = t.id
      AND s.slot_start = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '17:30:00')
  );

INSERT INTO pt_booking_slots (trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note)
SELECT t.id, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '06:30:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '07:30:00'), 'Strength Floor', 'Strength & Nutrition', 1, 1, NULL
FROM pt_trainers t
WHERE t.slug = 'anh-quan'
  AND NOT EXISTS (
    SELECT 1
    FROM pt_booking_slots s
    WHERE s.trainer_id = t.id
      AND s.slot_start = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '06:30:00')
  );

INSERT INTO pt_booking_slots (trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note)
SELECT t.id, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '19:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '20:00:00'), 'Strength Floor', 'Fat Loss Coaching', 1, 1, NULL
FROM pt_trainers t
WHERE t.slug = 'anh-quan'
  AND NOT EXISTS (
    SELECT 1
    FROM pt_booking_slots s
    WHERE s.trainer_id = t.id
      AND s.slot_start = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '19:00:00')
  );

INSERT INTO pt_booking_slots (trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note)
SELECT t.id, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '20:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '21:00:00'), 'Performance Zone', 'Conditioning Session', 1, 1, NULL
FROM pt_trainers t
WHERE t.slug = 'bao-tram'
  AND NOT EXISTS (
    SELECT 1
    FROM pt_booking_slots s
    WHERE s.trainer_id = t.id
      AND s.slot_start = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '20:00:00')
  );

INSERT INTO pt_booking_slots (trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note)
SELECT t.id, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '08:00:00'), TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '09:00:00'), 'Performance Zone', 'Athletic Reboot', 1, 1, NULL
FROM pt_trainers t
WHERE t.slug = 'bao-tram'
  AND NOT EXISTS (
    SELECT 1
    FROM pt_booking_slots s
    WHERE s.trainer_id = t.id
      AND s.slot_start = TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '08:00:00')
  );
