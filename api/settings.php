<?php
/**
 * api/settings.php
 * General Settings API (Key-Value Store)
 */

require_once __DIR__ . '/../config/db.php';

// Guard check session authentication
$currentUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'get';

$pdo = getDBConnection();

switch ($action) {
    case 'get':
        try {
            $settings = getAllSettings($pdo);
            jsonResponse([
                'success' => true,
                'settings' => $settings
            ]);
        } catch (Exception $e) {
            error_log("Settings GET Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to fetch settings.'], 500);
        }
        break;

    case 'update':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'message' => 'POST method required to update settings.'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input)) {
            $input = $_POST;
        }

        if (empty($input)) {
            jsonResponse(['success' => false, 'message' => 'No settings payload provided.'], 400);
        }

        try {
            $stmt = $pdo->prepare("
                INSERT INTO general_settings (setting_key, setting_value)
                VALUES (:key, :val)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            ");

            $pdo->beginTransaction();
            foreach ($input as $key => $val) {
                $cleanKey = cleanString($key);
                if (!empty($cleanKey)) {
                    $cleanVal = cleanString((string)$val);
                    $stmt->execute([
                        ':key' => $cleanKey,
                        ':val' => $cleanVal
                    ]);
                }
            }
            $pdo->commit();

            jsonResponse([
                'success' => true,
                'message' => 'Settings updated successfully.',
                'settings' => getAllSettings($pdo)
            ]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("Settings UPDATE Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Failed to update settings.'], 500);
        }
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Invalid settings action.'], 400);
}
