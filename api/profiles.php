<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . implode(', ', $allowed_origins));
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Solo permitir GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Método no permitido', 405);
}

try {
    $profiles = [];
    $profilesDir = '../data/profiles/';

    // Verificar que el directorio existe
    if (!is_dir($profilesDir)) {
        errorResponse('Directorio de perfiles no encontrado', 500);
    }

    // Leer todos los archivos JSON del directorio
    $files = glob($profilesDir . '*.json');

    foreach ($files as $file) {
        $content = file_get_contents($file);
        if ($content !== false) {
            $profile = json_decode($content, true);
            if ($profile !== null && isset($profile['metadata']['status']) && $profile['metadata']['status'] === 'published') {
                $profiles[] = $profile;
            }
        }
    }

    // Ordenar por nombre
    usort($profiles, function($a, $b) {
        return strcmp($a['personal_info']['nombre'] ?? '', $b['personal_info']['nombre'] ?? '');
    });

    successResponse('Perfiles obtenidos exitosamente', $profiles);

} catch (Exception $e) {
    error_log("Error en profiles.php: " . $e->getMessage());
    errorResponse('Error interno del servidor', 500);
}
?>
