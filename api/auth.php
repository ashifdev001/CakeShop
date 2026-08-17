<?php
/**
 * api/auth.php
 * Authentication Controller: Login, Session Check, Logout
 */

require_once __DIR__ . '/../config/db.php';

startAppSession();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? ($_POST['action'] ?? 'check');

$pdo = getDBConnection();

switch ($action) {
    case 'login':
        if ($method !== 'POST') {
            jsonResponse(['success' => false, 'message' => 'Method Not Allowed. POST required.'], 405);
        }

        // Support both application/json and form-urlencoded
        $input = json_decode(file_get_contents('php://input'), true);
        $username = cleanString($input['username'] ?? ($_POST['username'] ?? ''));
        $password = trim($input['password'] ?? ($_POST['password'] ?? ''));

        if (empty($username) || empty($password)) {
            jsonResponse(['success' => false, 'message' => 'Username and Password are required.'], 400);
        }

        try {
            $stmt = $pdo->prepare("SELECT id, username, password_hash, full_name, role FROM users WHERE username = :username LIMIT 1");
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['full_name'] = $user['full_name'];
                $_SESSION['role'] = $user['role'];

                jsonResponse([
                    'success' => true,
                    'message' => 'Login successful.',
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'full_name' => $user['full_name'],
                        'role' => $user['role']
                    ]
                ]);
            } else {
                jsonResponse(['success' => false, 'message' => 'Invalid Username or Password.'], 401);
            }
        } catch (Exception $e) {
            error_log("Login Error: " . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'An error occurred during login. Please try again.'], 500);
        }
        break;

    case 'check':
        if (!empty($_SESSION['user_id']) && !empty($_SESSION['username'])) {
            jsonResponse([
                'success' => true,
                'logged_in' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'full_name' => $_SESSION['full_name'] ?? 'Administrator',
                    'role' => $_SESSION['role'] ?? 'admin'
                ]
            ]);
        } else {
            jsonResponse([
                'success' => true,
                'logged_in' => false
            ]);
        }
        break;

    case 'logout':
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();

        jsonResponse([
            'success' => true,
            'message' => 'Logged out successfully.'
        ]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Invalid auth action specified.'], 400);
}
