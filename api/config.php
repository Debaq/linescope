<?php
// config.php - Configuración central del sistema

// Función para cargar variables de entorno
function loadEnv($file = '../.env') {
    if (!file_exists($file)) {
        // Valores por defecto si no existe .env
        return;
    }
    
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            
            if (!array_key_exists($name, $_ENV)) {
                $_ENV[$name] = $value;
            }
        }
    }
}

// Cargar variables de entorno
loadEnv();

// Configuración desde .env o valores por defecto
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'clave_secreta_fuerte_cambiar_en_produccion');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', intval($_ENV['JWT_EXPIRATION'] ?? 86400));

// Configuración de archivos
define('USERS_DIR', $_ENV['USERS_DIR'] ?? '../data/users/');
define('PROFILES_DIR', $_ENV['PROFILES_DIR'] ?? '../data/profiles/');
define('REQUESTS_DIR', $_ENV['REQUESTS_DIR'] ?? '../data/account-requests/');

// Configuración de la aplicación
define('APP_NAME', $_ENV['APP_NAME'] ?? 'Portal de Investigación UACH');
define('APP_URL', $_ENV['APP_URL'] ?? 'https://tmeduca.org/linescope');
define('DEBUG_MODE', filter_var($_ENV['DEBUG_MODE'] ?? false, FILTER_VALIDATE_BOOLEAN));

// Configuración de email
define('ADMIN_EMAIL', $_ENV['ADMIN_EMAIL'] ?? 'linescope@tmeduca.org');
define('SYSTEM_EMAIL', $_ENV['SYSTEM_EMAIL'] ?? $_ENV['ADMIN_EMAIL'] ?? 'linescope@tmeduca.org');

// Contraseña temporal por defecto
define('DEFAULT_PASSWORD', $_ENV['DEFAULT_PASSWORD'] ?? 'etmp2026');

// Configuración CORS
$cors_origins = $_ENV['ALLOWED_ORIGINS'] ?? 'https://tmeduca.org,http://localhost:3000';
$allowed_origins = array_map('trim', explode(',', $cors_origins));

// Función para crear directorios si no existen
function ensureDirectoryExists($dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Crear directorios necesarios
ensureDirectoryExists(USERS_DIR);
ensureDirectoryExists(PROFILES_DIR);
ensureDirectoryExists(REQUESTS_DIR);

// Función para logging de errores
function logError($message, $context = []) {
    if (DEBUG_MODE) {
        error_log(date('Y-m-d H:i:s') . " - $message - " . json_encode($context));
    }
}

// Función para respuestas JSON estandarizadas
function jsonResponse($data, $status = 200, $message = null) {
    http_response_code($status);

    $response = [
        'success' => $status >= 200 && $status < 300,
        'timestamp' => date('c'),
        'data' => $data
    ];

    if ($message) {
        $response['message'] = $message;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

// Función para respuestas de error
function errorResponse($message, $status = 400, $details = null) {
    http_response_code($status);

    $response = [
        'success' => false,
        'timestamp' => date('c'),
        'error' => $message
    ];

    if ($details && DEBUG_MODE) {
        $response['details'] = $details;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

// Validar que las extensiones necesarias estén disponibles
$required_extensions = ['json', 'openssl'];
foreach ($required_extensions as $ext) {
    if (!extension_loaded($ext)) {
        logError("Extensión PHP requerida no encontrada: $ext");
        errorResponse("Error de configuración del servidor", 500);
    }
}

// Headers CORS solo si se llama desde HTTP
if (!empty($_SERVER['HTTP_HOST'])) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    // Verificar origen y establecer CORS
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header('Access-Control-Allow-Origin: *'); // Para desarrollo
    }

    // Manejar preflight OPTIONS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}
?>