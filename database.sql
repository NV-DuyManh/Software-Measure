-- ============================================
-- DATABASE: SM
-- Run this in Navicat against the SM database
-- ============================================

CREATE DATABASE IF NOT EXISTS SM CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE SM;

-- ─── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(80)  NOT NULL UNIQUE,
    email       VARCHAR(120) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- bcrypt hash
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── FP HISTORY ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_history (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT          NOT NULL,
    filename         VARCHAR(255) NOT NULL,
    ei               INT          NOT NULL DEFAULT 0,
    eo               INT          NOT NULL DEFAULT 0,
    eq               INT          NOT NULL DEFAULT 0,
    ilf              INT          NOT NULL DEFAULT 0,
    eif              INT          NOT NULL DEFAULT 0,
    ufc              INT          NOT NULL DEFAULT 0,
    vaf              FLOAT        NOT NULL DEFAULT 1.0,
    fp               FLOAT        NOT NULL DEFAULT 0,
    effort           FLOAT        NOT NULL DEFAULT 0,
    time_months      FLOAT        NOT NULL DEFAULT 0,
    cost             FLOAT        NOT NULL DEFAULT 0,
    chunks_processed INT          NOT NULL DEFAULT 0,
    chunks_failed    INT          NOT NULL DEFAULT 0,
    analyzed_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── PRODUCTS (Lazada scraper) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(500) NOT NULL,
    price       VARCHAR(100) NOT NULL,
    scraped_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
