<?php
// account-requests.php - API para manejar solicitudes de cuenta

// Función para cargar variables de entorno
function loadEnv($file = '.env') {
    if (!file_exists($file)) {
        throw new Exception("Archivo .env no encontrado. Copia .env.example como .env y configura tus valores.");
    }
    
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue; // Ignorar comentarios
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, " \t\n\r\0\x0B\"'"); // Remover espacios y comillas
        
        if (!array_key_exists($name, $_ENV)) {
            $_ENV[$name] = $value;
        }
    }
}

// Cargar variables de entorno
try {
    loadEnv('../.env'); // Archivo .env en la raíz del proyecto
} catch (Exception $e) {
    // Si no existe .env, usar valores por defecto para desarrollo
    $_ENV['ADMIN_EMAIL'] = 'admin@tudominio.com';
    $_ENV['SYSTEM_EMAIL'] = 'sistema@tudominio.com';
    $_ENV['DEBUG_MODE'] = 'true';
    $_ENV['REQUESTS_DIR'] = '../data/account-requests/';
}

// Configuración desde variables de entorno
define('REQUESTS_DIR', $_ENV['REQUESTS_DIR'] ?? '../data/account-requests/');
define('ADMIN_EMAIL', $_ENV['ADMIN_EMAIL'] ?? 'admin@tudominio.com');
define('SYSTEM_EMAIL', $_ENV['SYSTEM_EMAIL'] ?? 'sistema@tudominio.com');
define('DEBUG_MODE', filter_var($_ENV['DEBUG_MODE'] ?? false, FILTER_VALIDATE_BOOLEAN));
define('APP_NAME', $_ENV['APP_NAME'] ?? 'Portal de Investigación UACH');

// Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Función para crear directorio si no existe
function ensureDirectoryExists($dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Crear directorio de solicitudes
ensureDirectoryExists(REQUESTS_DIR);

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

// Función para generar ID único de solicitud
function generateRequestId() {
    return 'REQ_' . date('Ymd') . '_' . strtoupper(substr(uniqid(), -6));
}

// Función para validar RUT chileno
function validateRUT($rut) {
    // Limpiar formato
    $cleanRUT = preg_replace('/[^0-9kK]/', '', $rut);
    
    if (strlen($cleanRUT) < 8) {
        return false;
    }
    
    $body = substr($cleanRUT, 0, -1);
    $dv = strtolower(substr($cleanRUT, -1));
    
    $sum = 0;
    $multiplier = 2;
    
    for ($i = strlen($body) - 1; $i >= 0; $i--) {
        $sum += intval($body[$i]) * $multiplier;
        $multiplier = $multiplier == 7 ? 2 : $multiplier + 1;
    }
    
    $remainder = $sum % 11;
    $calculatedDV = $remainder < 2 ? (string)$remainder : ($remainder == 10 ? 'k' : (string)(11 - $remainder));
    
    return $dv === $calculatedDV;
}

// Función para validar email
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) && strpos($email, '@uach.cl') !== false;
}

// Función para enviar email de notificación
function sendAdminNotification($requestData) {
    $subject = "Nueva Solicitud de Cuenta - " . APP_NAME;
    
    $message = "
Nueva solicitud de cuenta recibida:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DETALLES DE LA SOLICITUD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: {$requestData['requestId']}
Nombre: {$requestData['fullName']}
RUT: {$requestData['rut']}
Email: {$requestData['email']}
Rol: {$requestData['role']}
Carrera: {$requestData['career']}
Teléfono: {$requestData['phone']}

Comentarios:
{$requestData['comments']}

Fecha de solicitud: " . date('d/m/Y H:i', strtotime($requestData['requestDate'])) . "

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 ACCIONES REQUERIDAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Revisa el panel de administración
2. Aprueba o rechaza esta solicitud
3. El usuario recibirá una notificación automática

Portal de Administración: " . ($_ENV['APP_URL'] ?? 'https://tudominio.com') . "/admin/
    ";
    
    $headers = "From: " . APP_NAME . " <" . SYSTEM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . ADMIN_EMAIL . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "X-Priority: 1\r\n";
    
    return mail(ADMIN_EMAIL, $subject, $message, $headers);
}

// Función para enviar confirmación al solicitante
function sendUserConfirmation($requestData) {
    $subject = "✅ Solicitud de Cuenta Recibida - " . APP_NAME;
    
    $message = "
Estimado/a {$requestData['fullName']},

¡Tu solicitud de cuenta para el " . APP_NAME . " ha sido recibida exitosamente!

📋 DETALLES DE TU SOLICITUD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ID de solicitud: {$requestData['requestId']}
• Email: {$requestData['email']}
• Rol solicitado: {$requestData['role']}
• Fecha: " . date('d/m/Y H:i', strtotime($requestData['requestDate'])) . "

🚀 PRÓXIMOS PASOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Tu solicitud será revisada por nuestro equipo administrativo
2. Recibirás una respuesta en un plazo de 1-3 días hábiles
3. Una vez aprobada, recibirás tus credenciales de acceso
4. Tu contraseña inicial será: " . ($_ENV['DEFAULT_PASSWORD'] ?? 'etmp2026') . "

⚠️ IMPORTANTE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• REVISA TU CARPETA DE SPAM - Los emails pueden llegar desde:
  - " . ADMIN_EMAIL . "
  - " . SYSTEM_EMAIL . "
• Agrega estos emails a tu lista de contactos seguros
• Si no recibes respuesta en 3 días, contacta al soporte

📞 SOPORTE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: " . ADMIN_EMAIL . "
Asunto: Consulta sobre solicitud {$requestData['requestId']}

Saludos cordiales,
Equipo " . APP_NAME . "
Escuela de Tecnología Médica - UACH
Puerto Montt, Chile
    ";
    
    $headers = "From: " . APP_NAME . " <" . SYSTEM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . ADMIN_EMAIL . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "X-Priority: 1\r\n";
    $headers .= "X-MSMail-Priority: High\r\n";
    
    return mail($requestData['email'], $subject, $message, $headers);
}

// Manejar solicitudes
switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        // Crear nueva solicitud
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            errorResponse('Datos de solicitud inválidos', 400);
        }
        
        // Validar campos requeridos
        $requiredFields = ['firstName', 'lastName', 'rut', 'email', 'career', 'role'];
        foreach ($requiredFields as $field) {
            if (empty($input[$field])) {
                errorResponse("Campo requerido faltante: $field", 400);
            }
        }
        
        // Validar RUT
        if (!validateRUT($input['rut'])) {
            errorResponse('RUT inválido', 400);
        }
        
        // Validar email
        if (!validateEmail($input['email'])) {
            errorResponse('Email debe ser institucional (@uach.cl)', 400);
        }
        
        // Validar rol
        $validRoles = ['student', 'researcher', 'reviewer', 'professor'];
        if (!in_array($input['role'], $validRoles)) {
            errorResponse('Rol inválido', 400);
        }
        
        // Verificar si ya existe una solicitud con el mismo email o RUT
        $existingFiles = glob(REQUESTS_DIR . '*.json');
        foreach ($existingFiles as $file) {
            $existingRequest = json_decode(file_get_contents($file), true);
            if ($existingRequest && 
                ($existingRequest['email'] === $input['email'] || $existingRequest['rut'] === $input['rut']) &&
                $existingRequest['status'] === 'pending') {
                errorResponse('Ya existe una solicitud pendiente con este email o RUT', 409);
            }
        }
        
        // Crear solicitud
        $requestId = generateRequestId();
        $requestData = [
            'requestId' => $requestId,
            'firstName' => trim($input['firstName']),
            'lastName' => trim($input['lastName']),
            'fullName' => trim($input['fullName'] ?? $input['firstName'] . ' ' . $input['lastName']),
            'rut' => trim($input['rut']),
            'email' => strtolower(trim($input['email'])),
            'career' => $input['career'],
            'role' => $input['role'],
            'phone' => trim($input['phone'] ?? ''),
            'comments' => trim($input['comments'] ?? ''),
            'requestDate' => $input['requestDate'] ?? date('c'),
            'status' => 'pending',
            'processedDate' => null,
            'processedBy' => null,
            'adminComments' => null
        ];
        
        // Guardar en archivo
        $filename = REQUESTS_DIR . $requestId . '.json';
        if (file_put_contents($filename, json_encode($requestData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
            
            // Enviar notificaciones por email
            $adminEmailSent = sendAdminNotification($requestData);
            $userEmailSent = sendUserConfirmation($requestData);
            
            // Log de emails
            if (!$adminEmailSent) {
                error_log("Error enviando email al administrador para solicitud $requestId");
            }
            if (!$userEmailSent) {
                error_log("Error enviando confirmación al usuario para solicitud $requestId");
            }
            
            jsonResponse([
                'requestId' => $requestId,
                'status' => 'pending',
                'emailNotifications' => [
                    'admin' => $adminEmailSent,
                    'user' => $userEmailSent
                ]
            ], 201, 'Solicitud creada exitosamente');
            
        } else {
            errorResponse('Error al guardar la solicitud', 500);
        }
        break;
        
    case 'GET':
        // Listar solicitudes (para administradores - implementar autenticación después)
        $requests = [];
        $files = glob(REQUESTS_DIR . '*.json');
        
        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content) {
                $request = json_decode($content, true);
                if ($request) {
                    $requests[] = $request;
                }
            }
        }
        
        // Ordenar por fecha más reciente
        usort($requests, function($a, $b) {
            return strcmp($b['requestDate'], $a['requestDate']);
        });
        
        jsonResponse($requests, 200, 'Solicitudes obtenidas exitosamente');
        break;
        
    default:
        errorResponse('Método no permitido', 405);
}
?>