-- ==========================================================
-- CakeShop Database Initial Seed Data
-- ==========================================================

-- 1. Default Admin User (username: admin / password: admin123)
INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `role`)
VALUES (
    1,
    'admin',
    '$2y$12$VPxpBrGMPqnFJOi7.E.QtejqsLjA0KTWyWq1j6QcJFcEAyVHc/vbO',
    'Administrator',
    'admin'
)
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 2. General Settings
INSERT INTO `general_settings` (`setting_key`, `setting_value`) VALUES
    ('site_name', 'Cakino'),
    ('tagline', 'The Cake Art'),
    ('address', 'Hirdaypur station road hirdaypur, Madhyamgram, Kolkata, West Bengal 700127'),
    ('phone', '+91 093301 21219'),
    ('email', 'faizulislam0087@gmail.com'),
    ('tax_rate', '5'),
    ('currency_symbol', '₹'),
    ('receipt_footer', 'Freshly baked with love. Goods once sold cannot be returned. Thank You!')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 3. Initial Products Catalog
INSERT INTO `products` (`code`, `name`, `price`) VALUES
    ('CK-001', 'Chocolate Truffle Cake (1 Kg)', 650.00),
    ('CK-002', 'Black Forest Cake (1 Kg)', 550.00),
    ('CK-003', 'Red Velvet Cake (1 Kg)', 750.00),
    ('CK-004', 'Pineapple Cake (500g)', 320.00),
    ('CK-005', 'Butterscotch Cake (500g)', 350.00),
    ('CK-006', 'Blueberry Cheesecake Slice', 180.00),
    ('CK-007', 'Choco Lava Cake', 90.00),
    ('CK-008', 'Vanilla Celebration Cake (1 Kg)', 500.00)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`);
