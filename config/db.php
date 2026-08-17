<?php
/**
 * db.php
 * Core Database & Security Configuration for CakeShop
 */

// Define Application Environment Constants
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'cakeshop_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

/**
 * Start Secure Session
 */
function startAppSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 86400, // 24 hours
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_start();
    }
}

/**
 * Get PDO Database Connection (Singleton)
 */
function getDBConnection(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    // Try targeted databases and credentials
    $databasesToTry = [DB_NAME, 'phpmyadmin'];
    $credentialsToTry = [
        ['user' => DB_USER, 'pass' => DB_PASS],
        ['user' => 'phpmyadmin', 'pass' => 'root'],
        ['user' => 'root', 'pass' => 'root']
    ];

    $lastException = null;

    foreach ($databasesToTry as $dbName) {
        foreach ($credentialsToTry as $cred) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . $dbName . ";charset=utf8mb4";
                $pdo = new PDO($dsn, $cred['user'], $cred['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]);
                return $pdo;
            } catch (PDOException $e) {
                $lastException = $e;
            }
        }
    }

    error_log("Database Connection Error: " . ($lastException ? $lastException->getMessage() : 'Unknown error'));
    jsonResponse([
        'success' => false,
        'message' => 'Database connection failed. Please ensure MySQL service is running.'
    ], 500);
    exit;
}

/**
 * Standard JSON Response Helper
 */
function jsonResponse(array $data, int $statusCode = 200): void {
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Security Guard: Require Active Authenticated Session
 */
function requireAuth(): array {
    startAppSession();
    if (empty($_SESSION['user_id']) || empty($_SESSION['username'])) {
        jsonResponse([
            'success' => false,
            'message' => 'Unauthorized access. Please log in to continue.'
        ], 401);
    }
    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'full_name' => $_SESSION['full_name'] ?? 'Administrator',
        'role' => $_SESSION['role'] ?? 'admin'
    ];
}

/**
 * Helper: Sanitize Single String
 */
function cleanString(?string $str): string {
    if ($str === null) return '';
    return strip_tags(trim($str));
}

/**
 * Helper: Fetch all key-value settings as key => value map
 */
function getAllSettings(PDO $pdo): array {
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM general_settings");
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        return $settings;
    } catch (Exception $e) {
        error_log("Error reading settings: " . $e->getMessage());
        return [];
    }
}
