<?php
// users.php - Gestión de usuarios con archivos JSON

// Evitar acceso directo
if (!defined('USERS_DIR')) {
    http_response_code(403);
    die('Acceso directo no permitido');
}

class UserManager {

    private function getUserFilePath($email) {
        return USERS_DIR . $email . '.json';
    }

    public function createUser($email, $password = null) {
        if ($this->userExists($email)) {
            return false;
        }

        $user = [
            'email' => $email,
            'password_hash' => password_hash($password ?? DEFAULT_PASSWORD, PASSWORD_BCRYPT),
            'first_login' => true,
            'last_login' => null,
            'profile_completed' => false,
            'role' => 'professor',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ];

        $filePath = $this->getUserFilePath($email);

        if (file_put_contents($filePath, json_encode($user, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
            logError("Usuario creado exitosamente: $email");
            return true;
        }

        logError("Error al crear usuario: $email");
        return false;
    }

    public function getUser($email) {
        $filePath = $this->getUserFilePath($email);

        if (!file_exists($filePath)) {
            return null;
        }

        $content = file_get_contents($filePath);
        $user = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            logError("Error al decodificar JSON del usuario: $email", ['error' => json_last_error_msg()]);
            return null;
        }

        return $user;
    }

    public function updateUser($email, $data) {
        $user = $this->getUser($email);
        if (!$user) {
            return false;
        }

        // Actualizar campos permitidos
        $allowedFields = ['password_hash', 'first_login', 'last_login', 'profile_completed'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $user[$field] = $data[$field];
            }
        }

        $user['updated_at'] = date('c');

        $filePath = $this->getUserFilePath($email);

        if (file_put_contents($filePath, json_encode($user, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
            return true;
        }

        return false;
    }

    public function userExists($email) {
        return file_exists($this->getUserFilePath($email));
    }

    public function validatePassword($email, $password) {
        $user = $this->getUser($email);

        if (!$user) {
            return false;
        }

        return password_verify($password, $user['password_hash']);
    }

    public function changePassword($email, $newPassword) {
        $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);

        return $this->updateUser($email, [
            'password_hash' => $passwordHash,
            'first_login' => false
        ]);
    }

    public function updateLastLogin($email) {
        return $this->updateUser($email, [
            'last_login' => date('c')
        ]);
    }

    public function getAllUsers() {
        $users = [];
        $files = glob(USERS_DIR . '*.json');

        foreach ($files as $file) {
            $content = file_get_contents($file);
            $user = json_decode($content, true);

            if ($user && json_last_error() === JSON_ERROR_NONE) {
                // No incluir información sensible
                unset($user['password_hash']);
                $users[] = $user;
            }
        }

        return $users;
    }

    public function deleteUser($email) {
        $filePath = $this->getUserFilePath($email);

        if (file_exists($filePath)) {
            return unlink($filePath);
        }

        return false;
    }
}

// Función para validar formato de email
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Función para validar contraseña
function validatePassword($password) {
    // Mínimo 8 caracteres, al menos una letra y un número
    return strlen($password) >= 8 &&
           preg_match('/[A-Za-z]/', $password) &&
           preg_match('/[0-9]/', $password);
}

// Crear usuarios por defecto si no existen
function createDefaultUsers() {
    $userManager = new UserManager();

    $defaultUsers = [
        'juan.perez@uach.cl',
        'ana.martinez@uach.cl',
        'carlos.rodriguez@uach.cl'
    ];

    foreach ($defaultUsers as $email) {
        if (!$userManager->userExists($email)) {
            $userManager->createUser($email);
            logError("Usuario por defecto creado: $email");
        }
    }
}

// Crear usuarios por defecto si estamos en modo desarrollo
if (DEBUG_MODE) {
    createDefaultUsers();
}
?>