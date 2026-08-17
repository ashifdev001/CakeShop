<?php
/**
 * database/init.php
 * Automated Database & Tables Setup Script
 */

require_once __DIR__ . '/../config/db.php';

try {
    $pdo = getDBConnection();

    // 1. Run schema.sql
    $schemaSql = file_get_contents(__DIR__ . '/schema.sql');
    $pdo->exec($schemaSql);

    // 2. Run seed.sql
    $seedSql = file_get_contents(__DIR__ . '/seed.sql');
    $pdo->exec($seedSql);

    echo "SUCCESS: All CakeShop tables created and seeded successfully.\n";
} catch (Exception $e) {
    echo "ERROR during database initialization: " . $e->getMessage() . "\n";
    exit(1);
}
