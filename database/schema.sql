-- ==========================================================
-- CakeShop Database Schema
-- Tables: users, products, general_settings, orders, order_items
-- ==========================================================

-- 1. Users Table (Staff & Admins)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL DEFAULT 'Administrator',
    `role` ENUM('admin', 'cashier') NOT NULL DEFAULT 'admin',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Products Table (Item Catalog)
CREATE TABLE IF NOT EXISTS `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(200) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_product_name` (`name`),
    INDEX `idx_product_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. General Settings Table (Key-Value Store)
CREATE TABLE IF NOT EXISTS `general_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` TEXT DEFAULT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Orders Table (Invoice & Header Metadata)
CREATE TABLE IF NOT EXISTS `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_number` VARCHAR(50) NOT NULL UNIQUE,
    `order_date` DATE NOT NULL,
    `order_time` TIME NOT NULL,
    `customer_name` VARCHAR(150) NOT NULL DEFAULT 'Walk-in Customer',
    `customer_phone` VARCHAR(20) DEFAULT NULL,
    `total_items` INT NOT NULL DEFAULT 0,
    `total_qty` INT NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `payment_type` ENUM('cash', 'online') NOT NULL DEFAULT 'cash',
    `status` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_order_date` (`order_date`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Order Items Table (Line Items Breakdown)
CREATE TABLE IF NOT EXISTS `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `product_id` INT DEFAULT NULL,
    `cake_name` VARCHAR(255) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `qty` INT NOT NULL DEFAULT 1,
    `total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
