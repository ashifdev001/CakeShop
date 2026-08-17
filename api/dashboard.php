<?php
/**
 * api/dashboard.php
 * Dashboard Analytics & Live Aggregation Controller
 */

require_once __DIR__ . '/../config/db.php';

// Guard check session authentication
$currentUser = requireAuth();

$pdo = getDBConnection();

try {
    $today = date('Y-m-d');

    // 1. Today Stats
    $stmtToday = $pdo->prepare("
        SELECT
            COUNT(*) AS order_count,
            COALESCE(SUM(grand_total), 0) AS total_earnings
        FROM orders
        WHERE order_date = :today AND status != 'cancelled'
    ");
    $stmtToday->execute([':today' => $today]);
    $todayStats = $stmtToday->fetch();

    // 2. This Week Stats (Monday to Sunday)
    $stmtWeek = $pdo->query("
        SELECT
            COUNT(*) AS order_count,
            COALESCE(SUM(grand_total), 0) AS total_earnings
        FROM orders
        WHERE YEARWEEK(order_date, 1) = YEARWEEK(CURDATE(), 1) AND status != 'cancelled'
    ");
    $weekStats = $stmtWeek->fetch();

    // 3. This Month Stats
    $stmtMonth = $pdo->query("
        SELECT
            COUNT(*) AS order_count,
            COALESCE(SUM(grand_total), 0) AS total_earnings
        FROM orders
        WHERE MONTH(order_date) = MONTH(CURDATE())
          AND YEAR(order_date) = YEAR(CURDATE())
          AND status != 'cancelled'
    ");
    $monthStats = $stmtMonth->fetch();

    // 4. Today's Top 10 Orders
    $stmtTodayTop = $pdo->prepare("
        SELECT
            o.id,
            o.order_number,
            o.order_number AS order_id,
            o.order_date,
            o.total_qty,
            o.grand_total,
            COALESCE(
                (SELECT GROUP_CONCAT(CONCAT(oi.cake_name, ' (', oi.qty, ')') SEPARATOR ', ')
                 FROM order_items oi WHERE oi.order_id = o.id),
                'N/A'
            ) AS items_summary
        FROM orders o
        WHERE o.order_date = :today AND o.status != 'cancelled'
        ORDER BY o.grand_total DESC, o.id DESC
        LIMIT 10
    ");
    $stmtTodayTop->execute([':today' => $today]);
    $todayTop = $stmtTodayTop->fetchAll();

    // 5. Current Month Top 10 Orders
    $stmtMonthTop = $pdo->query("
        SELECT
            o.id,
            o.order_number,
            o.order_number AS order_id,
            o.order_date,
            o.total_qty,
            o.grand_total,
            COALESCE(
                (SELECT GROUP_CONCAT(CONCAT(oi.cake_name, ' (', oi.qty, ')') SEPARATOR ', ')
                 FROM order_items oi WHERE oi.order_id = o.id),
                'N/A'
            ) AS items_summary
        FROM orders o
        WHERE MONTH(o.order_date) = MONTH(CURDATE())
          AND YEAR(o.order_date) = YEAR(CURDATE())
          AND o.status != 'cancelled'
        ORDER BY o.grand_total DESC, o.id DESC
        LIMIT 10
    ");
    $monthTop = $stmtMonthTop->fetchAll();

    jsonResponse([
        'success' => true,
        'today_date' => $today,
        'metrics' => [
            'today_orders' => intval($todayStats['order_count'] ?? 0),
            'today_earnings' => floatval($todayStats['total_earnings'] ?? 0),
            'week_orders' => intval($weekStats['order_count'] ?? 0),
            'week_earnings' => floatval($weekStats['total_earnings'] ?? 0),
            'month_orders' => intval($monthStats['order_count'] ?? 0),
            'month_earnings' => floatval($monthStats['total_earnings'] ?? 0)
        ],
        'today_top_orders' => $todayTop,
        'month_top_orders' => $monthTop
    ]);
} catch (Exception $e) {
    error_log("Dashboard API Error: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Failed to calculate dashboard analytics.'], 500);
}
