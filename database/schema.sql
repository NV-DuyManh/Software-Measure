-- ============================================================
--  FP ESTIMATOR — Database Schema
--  Chạy file này 1 lần trong Navicat Query Editor
--  Ctrl+Shift+R để chạy toàn bộ
-- ============================================================

CREATE DATABASE IF NOT EXISTS fp_estimator_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fp_estimator_db;

-- ─── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(80)  NOT NULL,
  email       VARCHAR(191) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── UPLOADS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploads (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size     INT UNSIGNED,
  uploaded_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── FP RESULTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_results (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  upload_id        INT UNSIGNED NOT NULL UNIQUE,
  ei_count         INT UNSIGNED NOT NULL DEFAULT 0,
  eo_count         INT UNSIGNED NOT NULL DEFAULT 0,
  eq_count         INT UNSIGNED NOT NULL DEFAULT 0,
  ilf_count        INT UNSIGNED NOT NULL DEFAULT 0,
  eif_count        INT UNSIGNED NOT NULL DEFAULT 0,
  ufc              INT UNSIGNED NOT NULL DEFAULT 0,
  vaf              DECIMAL(5,3) NOT NULL DEFAULT 1.000,
  fp               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  effort           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  time_months      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  chunks_processed INT UNSIGNED DEFAULT 0,
  chunks_failed    INT UNSIGNED DEFAULT 0,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── VAF FACTORS (14 GSC — mỗi giá trị từ 0 đến 5) ───────────────
CREATE TABLE IF NOT EXISTS vaf_factors (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  result_id  INT UNSIGNED NOT NULL UNIQUE,
  f1         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Data communications',
  f2         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Distributed data processing',
  f3         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Performance',
  f4         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Heavily used configuration',
  f5         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Transaction rate',
  f6         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Online data entry',
  f7         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'End-user efficiency',
  f8         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Online update',
  f9         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Complex processing',
  f10        TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Reusability',
  f11        TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Installation ease',
  f12        TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Operational ease',
  f13        TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Multiple sites',
  f14        TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Facilitate change',
  FOREIGN KEY (result_id) REFERENCES fp_results(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── UPLOAD HISTORY (Task 1: file upload tracking with SHA-256) ───
CREATE TABLE IF NOT EXISTS upload_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_hash   CHAR(64)     NOT NULL COMMENT 'SHA-256 hex digest',
  upload_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  result      TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── INDEXES ──────────────────────────────────────────────────────
CREATE INDEX idx_uploads_user        ON uploads(user_id);
CREATE INDEX idx_uploads_date        ON uploads(uploaded_at DESC);
CREATE INDEX idx_results_upload      ON fp_results(upload_id);
CREATE INDEX idx_upload_history_user ON upload_history(user_id);
