<?php
// config.php - Configuración del sistema de autenticación

// Configuración JWT
define('JWT_SECRET', 'clave_secreta_fuerte_cambiar_en_produccion');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 86400); // 24 horas en segundos

// Configuración de archivos
define('USERS_DIR', '../data/users/');
define('PROFILES_DIR', '../data/profiles/');

// Configuración de la aplicación
define('APP_NAME', 'Portal de Investigación UACH');
define('APP_URL', 'https://tmeduca.org/investigacion');
define('DEBUG_MODE', false);

// Contraseña temporal por defecto
define('DEFAULT_PASSWORD', 'etmp2026');

// Configuración CORS
$allowed_origins = [
    'https://tmeduca.org',
'http://localhost:3000',
'http://127.0.0.1:3000'
];

// Headers CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Verificar origen y establecer CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Función para crear directorios si no existen
function ensureDirectoryExists($dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Crear directorios necesarios
ensureDirectoryExists(USERS_DIR);
ensureDirectoryExists(PROFILES_DIR);

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
?>
