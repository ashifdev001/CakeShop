<?php
/**
 * api/products.php
 * Products Master API: List, Search, Create, Update, Delete
 */

require_once __DIR__ . '/../config/db.php';

// Guard check session authentication
$currentUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

$pdo = getDBConnection();

switch ($action) {
    case 'list':
        $query = cleanString($_GET['q'] ?? '');
        $limit = max(1, min(100, intval($_GET['limit'] ?? 25)));
        try {
            if (!empty($query)) {
                $stmt = $pdo->prepare("
                    SELECT id, code, name, price, created_at
                    FROM products
                    WHERE name LIKE :q1 OR code LIKE :q2
                    ORDER BY 
                        CASE 
                            WHEN code = :exact_code THEN 1
                            WHEN name LIKE :starts_name THEN 2
                            WHEN code LIKE :starts_code THEN 3
                            ELSE 4
                        END,
                        name ASC
                    LIMIT :limit
                ");
                $like = "%{$query}%";
                $starts = "{$query}%";
                $stmt->bindValue(':q1', $like, PDO::PARAM_STR);
                $stmt->bindValue(':q2', $like, PDO::PARAM_STR);
                $stmt->bindValue(':exact_code', $query, PDO::PARAM_STR);
                $stmt->bindValue(':starts_name', $starts, PDO::PARAM_STR);
                $stmt->bindValue(':starts_code', $starts, PDO::PARAM_STR);
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->execute();
            } else {
                $stmt = $pdo->prepare("SELECT id, code, name, price, created_at FROM products ORDER BY name ASC LIMIT :limit");
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->execute();
            }

            $products = $stmt->fetchAll();
            jsonResponse([
                'success' => true,
                'total' => count($products),
                'products' => $products
            ]);
        } catch (Exception $e) {
            error_log("Products LIST Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to fetch products.'], 500);
        }
        break;

    case 'create':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'message' => 'POST method required to add product.'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $code = strtoupper(cleanString($input['code'] ?? ''));
        $name = cleanString($input['name'] ?? '');
        $price = max(0, floatval($input['price'] ?? 0));

        if (empty($name)) {
            jsonResponse(['success' => false, 'message' => 'Product Name is required.'], 400);
        }

        if (empty($code)) {
            // Auto generate code if not provided: CK-XXXX
            $count = $pdo->query("SELECT count(*) FROM products")->fetchColumn();
            $code = 'CK-' . str_pad($count + 1, 3, '0', STR_PAD_LEFT);
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO products (code, name, price) VALUES (:code, :name, :price)");
            $stmt->execute([
                ':code' => $code,
                ':name' => $name,
                ':price' => $price
            ]);
            $newId = $pdo->lastInsertId();

            jsonResponse([
                'success' => true,
                'message' => 'Product created successfully.',
                'product' => [
                    'id' => $newId,
                    'code' => $code,
                    'name' => $name,
                    'price' => $price
                ]
            ], 201);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                jsonResponse(['success' => false, 'message' => "Product Code '{$code}' already exists."], 409);
            }
            error_log("Product CREATE Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to create product.'], 500);
        }
        break;

    case 'update':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'message' => 'POST method required to update product.'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $id = intval($input['id'] ?? 0);
        $code = strtoupper(cleanString($input['code'] ?? ''));
        $name = cleanString($input['name'] ?? '');
        $price = max(0, floatval($input['price'] ?? 0));

        if ($id <= 0 || empty($name) || empty($code)) {
            jsonResponse(['success' => false, 'message' => 'Valid ID, Code, and Name are required.'], 400);
        }

        try {
            $stmt = $pdo->prepare("UPDATE products SET code = :code, name = :name, price = :price WHERE id = :id");
            $stmt->execute([
                ':code' => $code,
                ':name' => $name,
                ':price' => $price,
                ':id' => $id
            ]);

            jsonResponse([
                'success' => true,
                'message' => 'Product updated successfully.'
            ]);
        } catch (Exception $e) {
            error_log("Product UPDATE Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to update product.'], 500);
        }
        break;

    case 'delete':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'message' => 'POST method required to delete product.'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $id = intval($input['id'] ?? 0);

        if ($id <= 0) {
            jsonResponse(['success' => false, 'message' => 'Valid Product ID is required.'], 400);
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
            $stmt->execute([':id' => $id]);

            jsonResponse([
                'success' => true,
                'message' => 'Product deleted successfully.'
            ]);
        } catch (Exception $e) {
            error_log("Product DELETE Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to delete product.'], 500);
        }
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Invalid product action.'], 400);
}
