CREATE DATABASE IF NOT EXISTS biggym
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE biggym;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  phone VARCHAR(30),
  role ENUM('admin', 'coach', 'member') NOT NULL DEFAULT 'member',
  auth_provider ENUM('local', 'google') NOT NULL DEFAULT 'local',
  google_id VARCHAR(255) UNIQUE,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  category_slug VARCHAR(100) NOT NULL,
  level_name VARCHAR(100) NOT NULL,
  level_slug VARCHAR(100) NOT NULL,
  equipment VARCHAR(255),
  primary_muscles VARCHAR(255),
  hero_image VARCHAR(255),
  short_description TEXT,
  long_description TEXT,
  video_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  height_cm DECIMAL(5,2) NOT NULL,
  body_fat_percent DECIMAL(5,2),
  bmi DECIMAL(5,2),
  recorded_at DATETIME NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_body_metrics_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tdee_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  gender ENUM('male', 'female') NOT NULL,
  age INT NOT NULL,
  height_cm DECIMAL(5,2) NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  activity_factor DECIMAL(4,3) NOT NULL,
  bmi DECIMAL(5,2),
  body_fat_percent DECIMAL(5,2),
  bmr DECIMAL(8,2),
  tdee DECIMAL(8,2) NOT NULL,
  cut_calories DECIMAL(8,2) NOT NULL,
  bulk_calories DECIMAL(8,2) NOT NULL,
  protein_grams DECIMAL(8,2),
  carbs_grams DECIMAL(8,2),
  fats_grams DECIMAL(8,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tdee_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  title VARCHAR(150) NOT NULL,
  goal VARCHAR(100) NOT NULL,
  level VARCHAR(100) NOT NULL,
  duration_weeks INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workout_plans_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workout_plan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workout_plan_id INT NOT NULL,
  day_label VARCHAR(100) NOT NULL,
  exercise_id INT NOT NULL,
  sets_count INT,
  reps_text VARCHAR(100),
  rest_seconds INT,
  sort_order INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_workout_plan_items_plan
    FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_workout_plan_items_exercise
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  subject VARCHAR(150),
  message TEXT NOT NULL,
  status ENUM('new', 'processing', 'closed') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
