<?php
// auth.php - API de autenticación con JWT

require_once 'config.php';
require_once 'users.php';

class JWTManager {

    public function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public function base64UrlDecode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }

    public function generateToken($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => JWT_ALGORITHM]);

        $payload['iat'] = time();
        $payload['exp'] = time() + JWT_EXPIRATION;
        $payload['iss'] = APP_URL;

        $base64Header = $this->base64UrlEncode($header);
        $base64Payload = $this->base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, JWT_SECRET, true);
        $base64Signature = $this->base64UrlEncode($signature);

        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }

    public function validateToken($token) {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return false;
        }

        list($base64Header, $base64Payload, $base64Signature) = $parts;

        $signature = $this->base64UrlDecode($base64Signature);
        $expectedSignature = hash_hmac('sha256', $base64Header . "." . $base64Payload, JWT_SECRET, true);

        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }

        $payload = json_decode($this->base64UrlDecode($base64Payload), true);

        if (!$payload || $payload['exp'] < time()) {
            return false;
        }

        return $payload;
    }

    public function refreshToken($token) {
        $payload = $this->validateToken($token);

        if (!$payload) {
            return false;
        }

        // Crear nuevo token con la misma información pero nueva expiración
        unset($payload['iat'], $payload['exp']);
        return $this->generateToken($payload);
    }
}

class AuthController {

    private $userManager;
    private $jwtManager;
    private $invalidatedTokens = [];

    public function __construct() {
        $this->userManager = new UserManager();
        $this->jwtManager = new JWTManager();
        $this->loadInvalidatedTokens();
    }

    private function loadInvalidatedTokens() {
        $tokenFile = USERS_DIR . 'invalidated_tokens.json';
        if (file_exists($tokenFile)) {
            $content = file_get_contents($tokenFile);
            $this->invalidatedTokens = json_decode($content, true) ?: [];
        }
    }

    private function saveInvalidatedTokens() {
        $tokenFile = USERS_DIR . 'invalidated_tokens.json';
        file_put_contents($tokenFile, json_encode($this->invalidatedTokens, JSON_PRETTY_PRINT));
    }

    private function addInvalidatedToken($token) {
        $tokenHash = hash('sha256', $token);
        $this->invalidatedTokens[$tokenHash] = time();

        // Limpiar tokens expirados (más de 24 horas)
        $cutoff = time() - JWT_EXPIRATION;
        $this->invalidatedTokens = array_filter($this->invalidatedTokens, function($timestamp) use ($cutoff) {
            return $timestamp > $cutoff;
        });

        $this->saveInvalidatedTokens();
    }

    private function isTokenInvalidated($token) {
        $tokenHash = hash('sha256', $token);
        return isset($this->invalidatedTokens[$tokenHash]);
    }

    public function login() {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['email']) || !isset($input['password'])) {
            errorResponse('Email y contraseña son requeridos', 400);
        }

        $email = trim(strtolower($input['email']));
        $password = $input['password'];

        if (!validateEmail($email)) {
            errorResponse('Formato de email inválido', 400);
        }

        if (!$this->userManager->validatePassword($email, $password)) {
            logError("Intento de login fallido para: $email");
            errorResponse('Credenciales inválidas', 401);
        }

        $user = $this->userManager->getUser($email);

        if (!$user) {
            errorResponse('Usuario no encontrado', 404);
        }

        // Actualizar último login
        $this->userManager->updateLastLogin($email);

        // Generar token
        $tokenPayload = [
            'email' => $email,
            'role' => $user['role'],
            'first_login' => $user['first_login']
        ];

        $token = $this->jwtManager->generateToken($tokenPayload);

        logError("Login exitoso para: $email");

        jsonResponse([
            'token' => $token,
            'user' => [
                'email' => $email,
                'first_login' => $user['first_login'],
                'profile_completed' => $user['profile_completed'],
                'last_login' => $user['last_login']
            ]
        ], 200, 'Login exitoso');
    }

    public function logout() {
        $token = $this->getTokenFromRequest();

        if (!$token) {
            errorResponse('Token no proporcionado', 400);
        }

        $payload = $this->jwtManager->validateToken($token);

        if (!$payload) {
            errorResponse('Token inválido', 401);
        }

        // Agregar token a lista de invalidados
        $this->addInvalidatedToken($token);

        logError("Logout exitoso para: " . ($payload['email'] ?? 'unknown'));

        jsonResponse(null, 200, 'Logout exitoso');
    }

    public function changePassword() {
        $token = $this->getTokenFromRequest();

        if (!$token) {
            errorResponse('Token no proporcionado', 400);
        }

        $payload = $this->jwtManager->validateToken($token);

        if (!$payload || $this->isTokenInvalidated($token)) {
            errorResponse('Token inválido', 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['current_password']) || !isset($input['new_password'])) {
            errorResponse('Contraseña actual y nueva son requeridas', 400);
        }

        $email = $payload['email'];
        $currentPassword = $input['current_password'];
        $newPassword = $input['new_password'];

        // Validar contraseña actual
        if (!$this->userManager->validatePassword($email, $currentPassword)) {
            errorResponse('Contraseña actual incorrecta', 400);
        }

        // Validar nueva contraseña
        if (!validatePassword($newPassword)) {
            errorResponse('La nueva contraseña debe tener al menos 8 caracteres, incluyendo letras y números', 400);
        }

        // Cambiar contraseña
        if ($this->userManager->changePassword($email, $newPassword)) {
            logError("Contraseña cambiada exitosamente para: $email");
            jsonResponse(null, 200, 'Contraseña cambiada exitosamente');
        } else {
            errorResponse('Error al cambiar contraseña', 500);
        }
    }

    public function verifyToken() {
        $token = $this->getTokenFromRequest();

        if (!$token) {
            errorResponse('Token no proporcionado', 400);
        }

        $payload = $this->jwtManager->validateToken($token);

        if (!$payload || $this->isTokenInvalidated($token)) {
            errorResponse('Token inválido o expirado', 401);
        }

        $user = $this->userManager->getUser($payload['email']);

        if (!$user) {
            errorResponse('Usuario no encontrado', 404);
        }

        jsonResponse([
            'valid' => true,
            'user' => [
                'email' => $user['email'],
                'first_login' => $user['first_login'],
                'profile_completed' => $user['profile_completed'],
                'role' => $user['role']
            ],
            'expires_at' => date('c', $payload['exp'])
        ]);
    }

    public function refreshToken() {
        $token = $this->getTokenFromRequest();

        if (!$token) {
            errorResponse('Token no proporcionado', 400);
        }

        if ($this->isTokenInvalidated($token)) {
            errorResponse('Token inválido', 401);
        }

        $newToken = $this->jwtManager->refreshToken($token);

        if (!$newToken) {
            errorResponse('No se pudo renovar el token', 400);
        }

        // Invalidar token anterior
        $this->addInvalidatedToken($token);

        jsonResponse([
            'token' => $newToken
        ], 200, 'Token renovado exitosamente');
    }

    private function getTokenFromRequest() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }
}

// Manejo de rutas
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Obtener la acción de la URL
$action = end($pathParts);

$authController = new AuthController();

try {
    switch ($method) {
        case 'POST':
            switch ($action) {
                case 'login':
                    $authController->login();
                    break;
                case 'logout':
                    $authController->logout();
                    break;
                case 'change-password':
                    $authController->changePassword();
                    break;
                case 'refresh':
                    $authController->refreshToken();
                    break;
                default:
                    errorResponse('Endpoint no encontrado', 404);
            }
            break;

                case 'GET':
                    switch ($action) {
                        case 'verify':
                            $authController->verifyToken();
                            break;
                        default:
                            errorResponse('Endpoint no encontrado', 404);
                    }
                    break;

                        default:
                            errorResponse('Método no permitido', 405);
    }
} catch (Exception $e) {
    logError("Error en auth.php: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
    errorResponse('Error interno del servidor', 500);
}
?>
