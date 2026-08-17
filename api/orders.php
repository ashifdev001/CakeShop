<?php
/**
 * api/orders.php
 * Orders Management API: Transactional Order Creation, Search, Filter, Pagination, Details
 */

require_once __DIR__ . '/../config/db.php';

// Guard check session authentication
$currentUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

$pdo = getDBConnection();

/**
 * Generate Sequential Order ID (ORD-YYYYMMDD-0001)
 */
function generateOrderNumber(PDO $pdo, string $dateStr): string {
    $cleanDate = str_replace('-', '', $dateStr);
    $stmt = $pdo->prepare("SELECT count(*) FROM orders WHERE order_date = :order_date");
    $stmt->execute([':order_date' => $dateStr]);
    $count = intval($stmt->fetchColumn()) + 1;
    $seq = str_pad($count, 4, '0', STR_PAD_LEFT);
    return "ORD-{$cleanDate}-{$seq}";
}

switch ($action) {
    case 'preview_id':
        $dateStr = cleanString($_GET['date'] ?? date('Y-m-d'));
        $previewId = generateOrderNumber($pdo, $dateStr);
        jsonResponse([
            'success' => true,
            'order_number' => $previewId
        ]);
        break;

    case 'create':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'message' => 'POST method required to create order.'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        if (empty($input) || empty($input['items']) || !is_array($input['items'])) {
            jsonResponse(['success' => false, 'message' => 'Invalid order payload. At least one item is required.'], 400);
        }

        $now = new DateTime();
        $orderDate = !empty($input['order_date']) ? cleanString($input['order_date']) : $now->format('Y-m-d');
        $orderTime = !empty($input['order_time']) ? cleanString($input['order_time']) : $now->format('H:i:s');
        $customerName = !empty($input['customer_name']) ? cleanString($input['customer_name']) : 'Walk-in Customer';
        $customerPhone = cleanString($input['customer_phone'] ?? '');

        $items = $input['items'];
        $cleanItems = [];
        $totalItems = 0;
        $totalQty = 0;
        $calculatedSubtotal = 0.0;

        foreach ($items as $item) {
            $cakeName = cleanString($item['cake_name'] ?? '');
            $price = max(0, floatval($item['price'] ?? 0));
            $qty = max(1, intval($item['qty'] ?? 1));
            $productId = !empty($item['product_id']) ? intval($item['product_id']) : null;

            if (empty($cakeName) || $price <= 0) {
                continue;
            }

            $lineTotal = round($price * $qty, 2);
            $calculatedSubtotal += $lineTotal;
            $totalQty += $qty;
            $totalItems++;

            $cleanItems[] = [
                'product_id' => $productId,
                'cake_name' => $cakeName,
                'price' => $price,
                'qty' => $qty,
                'total' => $lineTotal
            ];
        }

        if (empty($cleanItems)) {
            jsonResponse(['success' => false, 'message' => 'Order must contain valid items with price > 0.'], 400);
        }

        $subtotal = round(floatval($input['subtotal'] ?? $calculatedSubtotal), 2);
        $discount = max(0, round(floatval($input['discount'] ?? 0), 2));
        $taxRate = max(0, round(floatval($input['tax_rate'] ?? 5), 2));
        $subAfterDiscount = max(0, $subtotal - $discount);
        $taxAmount = round($subAfterDiscount * ($taxRate / 100), 2);
        $grandTotal = round($subAfterDiscount + $taxAmount, 2);

        try {
            $pdo->beginTransaction();

            $orderNumber = generateOrderNumber($pdo, $orderDate);

            // 1. Insert into orders table
            $stmtOrder = $pdo->prepare("
                INSERT INTO orders (
                    order_number, order_date, order_time, customer_name, customer_phone,
                    total_items, total_qty, subtotal, discount, tax_rate, tax_amount, grand_total, status
                ) VALUES (
                    :order_number, :order_date, :order_time, :customer_name, :customer_phone,
                    :total_items, :total_qty, :subtotal, :discount, :tax_rate, :tax_amount, :grand_total, 'completed'
                )
            ");

            $stmtOrder->execute([
                ':order_number' => $orderNumber,
                ':order_date' => $orderDate,
                ':order_time' => $orderTime,
                ':customer_name' => $customerName,
                ':customer_phone' => $customerPhone,
                ':total_items' => $totalItems,
                ':total_qty' => $totalQty,
                ':subtotal' => $subtotal,
                ':discount' => $discount,
                ':tax_rate' => $taxRate,
                ':tax_amount' => $taxAmount,
                ':grand_total' => $grandTotal
            ]);

            $orderId = $pdo->lastInsertId();

            // 2. Bulk insert into order_items
            $stmtItem = $pdo->prepare("
                INSERT INTO order_items (order_id, product_id, cake_name, price, qty, total)
                VALUES (:order_id, :product_id, :cake_name, :price, :qty, :total)
            ");

            foreach ($cleanItems as $ci) {
                $stmtItem->execute([
                    ':order_id' => $orderId,
                    ':product_id' => $ci['product_id'],
                    ':cake_name' => $ci['cake_name'],
                    ':price' => $ci['price'],
                    ':qty' => $ci['qty'],
                    ':total' => $ci['total']
                ]);
            }

            $pdo->commit();

            jsonResponse([
                'success' => true,
                'message' => "Order {$orderNumber} saved successfully.",
                'order' => [
                    'id' => $orderId,
                    'order_id' => $orderNumber,
                    'order_number' => $orderNumber,
                    'order_date' => $orderDate,
                    'order_time' => $orderTime,
                    'customer_name' => $customerName,
                    'customer_phone' => $customerPhone,
                    'total_items' => $totalItems,
                    'total_qty' => $totalQty,
                    'subtotal' => $subtotal,
                    'discount' => $discount,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'grand_total' => $grandTotal,
                    'items' => $cleanItems
                ]
            ], 201);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("Order CREATE Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to save order: ' . $e->getMessage()], 500);
        }
        break;

    case 'list':
        $search = cleanString($_GET['q'] ?? ($_GET['search'] ?? ''));
        $fromDate = cleanString($_GET['from_date'] ?? '');
        $toDate = cleanString($_GET['to_date'] ?? '');
        $sortBy = cleanString($_GET['sort'] ?? 'date_desc');
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = max(1, min(100, intval($_GET['limit'] ?? 15)));
        $offset = ($page - 1) * $limit;

        $whereClauses = ["1=1"];
        $params = [];

        if (!empty($search)) {
            $whereClauses[] = "(
                o.order_number LIKE :q1
                OR o.customer_name LIKE :q2
                OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.cake_name LIKE :q3)
            )";
            $like = "%{$search}%";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
        }

        if (!empty($fromDate)) {
            $whereClauses[] = "o.order_date >= :from_date";
            $params[':from_date'] = $fromDate;
        }

        if (!empty($toDate)) {
            $whereClauses[] = "o.order_date <= :to_date";
            $params[':to_date'] = $toDate;
        }

        $whereSql = implode(" AND ", $whereClauses);

        // Sorting
        $orderSql = "o.created_at DESC";
        switch ($sortBy) {
            case 'date_asc':
                $orderSql = "o.created_at ASC";
                break;
            case 'amount_desc':
                $orderSql = "o.grand_total DESC";
                break;
            case 'amount_asc':
                $orderSql = "o.grand_total ASC";
                break;
            case 'date_desc':
            default:
                $orderSql = "o.created_at DESC";
                break;
        }

        try {
            // Count total matching records
            $countStmt = $pdo->prepare("SELECT count(*) FROM orders o WHERE {$whereSql}");
            $countStmt->execute($params);
            $totalRecords = intval($countStmt->fetchColumn());

            // Fetch Paginated orders
            $sql = "
                SELECT
                    o.id,
                    o.order_number,
                    o.order_number AS order_id,
                    o.order_date,
                    o.order_time,
                    o.customer_name,
                    o.customer_phone,
                    o.total_items,
                    o.total_qty,
                    o.subtotal,
                    o.discount,
                    o.tax_rate,
                    o.tax_amount,
                    o.grand_total,
                    o.status,
                    o.created_at
                FROM orders o
                WHERE {$whereSql}
                ORDER BY {$orderSql}
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $pdo->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $orders = $stmt->fetchAll();

            $totalPages = ceil($totalRecords / $limit);

            jsonResponse([
                'success' => true,
                'total' => $totalRecords,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => $totalPages,
                'orders' => $orders
            ]);
        } catch (Exception $e) {
            error_log("Orders LIST Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to retrieve orders.'], 500);
        }
        break;

    case 'details':
        $id = cleanString($_GET['id'] ?? ($_GET['order_id'] ?? ''));
        if (empty($id)) {
            jsonResponse(['success' => false, 'message' => 'Order ID is required.'], 400);
        }

        try {
            $stmt = $pdo->prepare("
                SELECT
                    id, order_number, order_number AS order_id, order_date, order_time,
                    customer_name, customer_phone, total_items, total_qty,
                    subtotal, discount, tax_rate, tax_amount, grand_total, status, created_at
                FROM orders
                WHERE id = :id_num OR order_number = :ord_num
                LIMIT 1
            ");
            $stmt->execute([':id_num' => is_numeric($id) ? intval($id) : 0, ':ord_num' => $id]);
            $order = $stmt->fetch();

            if (!$order) {
                jsonResponse(['success' => false, 'message' => 'Order not found.'], 404);
            }

            // Fetch order items
            $stmtItems = $pdo->prepare("
                SELECT id, product_id, cake_name, price, qty, total
                FROM order_items
                WHERE order_id = :order_id
                ORDER BY id ASC
            ");
            $stmtItems->execute([':order_id' => $order['id']]);
            $order['items'] = $stmtItems->fetchAll();

            jsonResponse([
                'success' => true,
                'order' => $order
            ]);
        } catch (Exception $e) {
            error_log("Order DETAILS Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to fetch order details.'], 500);
        }
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Invalid order action specified.'], 400);
}
