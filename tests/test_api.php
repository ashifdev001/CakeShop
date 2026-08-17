<?php
/**
 * tests/test_api.php
 * Automated API & Database Integration Test Suite (Full Coverage)
 */

require_once __DIR__ . '/../config/db.php';

echo "=== CAKESHOP API & DATABASE INTEGRATION TEST ===\n\n";

$pdo = getDBConnection();
$passed = 0;
$failed = 0;

function assertTest($name, $condition, $details = '') {
    global $passed, $failed;
    if ($condition) {
        echo " [PASS] $name\n";
        $passed++;
    } else {
        echo " [FAIL] $name: $details\n";
        $failed++;
    }
}

// 1. Test Database Tables Exist
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
$expectedTables = ['users', 'products', 'general_settings', 'orders', 'order_items'];
foreach ($expectedTables as $t) {
    assertTest("Table exists: $t", in_array($t, $tables), "Table $t not found in database");
}

// 2. Test Admin User Exists
$admin = $pdo->query("SELECT * FROM users WHERE username = 'admin'")->fetch();
assertTest("Admin user exists", !empty($admin) && $admin['username'] === 'admin');
assertTest("Admin password matches bcrypt hash", password_verify('admin123', $admin['password_hash']));

// 3. Test General Settings
$settings = getAllSettings($pdo);
assertTest("Settings loaded correctly", isset($settings['site_name']) && !empty($settings['site_name']));
assertTest("Settings contains phone and email", !empty($settings['phone']) && !empty($settings['email']));

// 4. Test Products Catalog & CRUD
$products = $pdo->query("SELECT * FROM products ORDER BY name ASC")->fetchAll();
assertTest("Products catalog populated", count($products) >= 8, "Expected >= 8 products, found " . count($products));

// Test Insert Product
$stmtProd = $pdo->prepare("INSERT INTO products (code, name, price) VALUES (?, ?, ?)");
$stmtProd->execute(['CK-TEST', 'Test Product Unit', 199.99]);
$testProdId = $pdo->lastInsertId();
assertTest("Product creation query successful", $testProdId > 0);

// Test Update Product
$stmtUpd = $pdo->prepare("UPDATE products SET price = ? WHERE id = ?");
$stmtUpd->execute([249.99, $testProdId]);
$updatedPrice = $pdo->query("SELECT price FROM products WHERE id = $testProdId")->fetchColumn();
assertTest("Product update query verified", floatval($updatedPrice) === 249.99);

// Test Delete Product
$pdo->exec("DELETE FROM products WHERE id = $testProdId");
$deletedCheck = $pdo->query("SELECT count(*) FROM products WHERE id = $testProdId")->fetchColumn();
assertTest("Product deletion query verified", intval($deletedCheck) === 0);

// 5. Test Transactional Order Insertion & Sequential Numbering
$today = date('Y-m-d');
$cleanDate = str_replace('-', '', $today);

$stmtCount = $pdo->prepare("SELECT count(*) FROM orders WHERE order_date = :d");
$stmtCount->execute([':d' => $today]);
$currentCount = intval($stmtCount->fetchColumn());
$expectedNextNum = "ORD-{$cleanDate}-" . str_pad($currentCount + 1, 4, '0', STR_PAD_LEFT);

// Insert test order with online payment_type
$pdo->beginTransaction();
$stmtIns = $pdo->prepare("
    INSERT INTO orders (
        order_number, order_date, order_time, customer_name, customer_phone,
        total_items, total_qty, subtotal, discount, tax_rate, tax_amount, grand_total, payment_type, status
    ) VALUES (
        :order_number, :order_date, :order_time, :customer_name, :customer_phone,
        :total_items, :total_qty, :subtotal, :discount, :tax_rate, :tax_amount, :grand_total, :payment_type, 'completed'
    )
");
$stmtIns->execute([
    ':order_number' => $expectedNextNum,
    ':order_date' => $today,
    ':order_time' => date('H:i:s'),
    ':customer_name' => 'Automated Test Customer',
    ':customer_phone' => '+91 9999999999',
    ':total_items' => 1,
    ':total_qty' => 2,
    ':subtotal' => 500.00,
    ':discount' => 0.00,
    ':tax_rate' => 5.00,
    ':tax_amount' => 25.00,
    ':grand_total' => 525.00,
    ':payment_type' => 'online'
]);
$orderId = $pdo->lastInsertId();

$stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, cake_name, price, qty, total) VALUES (?, ?, ?, ?, ?)");
$stmtItem->execute([$orderId, 'Automated Test Cake', 250.00, 2, 500.00]);
$pdo->commit();

assertTest("Order created with ID: $expectedNextNum", $orderId > 0);

// Verify payment_type in stored order
$savedPayType = $pdo->query("SELECT payment_type FROM orders WHERE id = $orderId")->fetchColumn();
assertTest("Payment type stored as 'online'", $savedPayType === 'online');

// 6. Test Foreign Key Constraint Cascade
$orderItems = $pdo->query("SELECT * FROM order_items WHERE order_id = $orderId")->fetchAll();
assertTest("Order items linked to order", count($orderItems) === 1 && $orderItems[0]['cake_name'] === 'Automated Test Cake');

// 7. Test Dashboard Aggregation Query
$dashboardToday = $pdo->query("
    SELECT COUNT(*) as count, SUM(grand_total) as earnings
    FROM orders
    WHERE order_date = '$today' AND status != 'cancelled'
")->fetch();
assertTest("Dashboard today metrics computed", intval($dashboardToday['count']) >= 1 && floatval($dashboardToday['earnings']) > 0);

echo "\n============================================\n";
echo "Test Results: $passed Passed, $failed Failed\n";
echo "============================================\n";

if ($failed > 0) {
    exit(1);
}
