<?php
// profiles.php - Endpoint para obtener perfiles públicos

// Configuración JWT
define('JWT_SECRET', 'clave_secreta_fuerte_cambiar_en_produccion');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 86400);

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

// Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Verificar origen y establecer CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: *'); // Para desarrollo
}

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Función para respuestas JSON
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

// Función para errores
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

// Solo permitir GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Método no permitido', 405);
}

try {
    $profiles = [];
    $profilesDir = PROFILES_DIR;

    // Verificar que el directorio existe
    if (!is_dir($profilesDir)) {
        errorResponse('Directorio de perfiles no encontrado: ' . $profilesDir, 500);
    }

    // Leer todos los archivos JSON del directorio
    $files = glob($profilesDir . '*.json');

    if (empty($files)) {
        // No hay archivos, devolver array vacío
        jsonResponse([], 200, 'No hay perfiles disponibles');
    }

    foreach ($files as $file) {
        $content = file_get_contents($file);
        if ($content !== false) {
            $profile = json_decode($content, true);
            
            if ($profile !== null) {
                // Solo incluir perfiles publicados, o todos si no está definido el status
                if (!isset($profile['metadata']['status']) || $profile['metadata']['status'] === 'published') {
                    $profiles[] = $profile;
                }
            } else {
                error_log("Error al decodificar JSON en archivo: $file");
            }
        }
    }

    // Ordenar por nombre
    usort($profiles, function($a, $b) {
        $nameA = $a['personal_info']['nombre'] ?? '';
        $nameB = $b['personal_info']['nombre'] ?? '';
        return strcmp($nameA, $nameB);
    });

    jsonResponse($profiles, 200, 'Perfiles obtenidos exitosamente');

} catch (Exception $e) {
    error_log("Error en profiles.php: " . $e->getMessage());
    errorResponse('Error interno del servidor', 500, DEBUG_MODE ? $e->getMessage() : null);
}
?>