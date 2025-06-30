# Sistema de Autenticación PHP + JWT

Un sistema completo de autenticación en PHP con JWT (JSON Web Tokens) y almacenamiento en archivos JSON. Ideal para proyectos que necesitan autenticación rápida sin base de datos.

## 🚀 Características

- ✅ **Autenticación JWT** - Tokens seguros con expiración configurable
- ✅ **Sin base de datos** - Almacenamiento en archivos JSON
- ✅ **Logout seguro** - Invalidación real de tokens
- ✅ **Cambio de contraseña** - Con validación de contraseña actual
- ✅ **Refresh de tokens** - Renovación automática de sesiones
- ✅ **Primer login obligatorio** - Cambio de contraseña temporal
- ✅ **Validaciones robustas** - Email, contraseña y datos de entrada
- ✅ **CORS configurado** - Listo para SPAs
- ✅ **Logging integrado** - Para debugging y monitoreo
- ✅ **Respuestas estandarizadas** - JSON consistente en toda la API

## 📁 Estructura de Archivos

```
/api/
├── auth.php          # Endpoints de autenticación
├── config.php        # Configuración central
├── users.php         # Gestión de usuarios
└── /data/
    └── /users/        # Almacenamiento de usuarios JSON
```

## 🛠️ Instalación

1. **Subir archivos** al servidor web
2. **Configurar permisos** de escritura en `/data/users/`
3. **Editar configuración** en `config.php`
4. **Probar endpoints** con tu cliente favorito

### Requisitos del Servidor

- PHP 8.0+ 
- Extensiones: `json`, `openssl`
- Permisos de escritura en directorio `data/`

## ⚙️ Configuración

Edita las constantes en `config.php`:

```php
// JWT Configuration
define('JWT_SECRET', 'tu_clave_secreta_super_fuerte');
define('JWT_EXPIRATION', 86400); // 24 horas

// Default password
define('DEFAULT_PASSWORD', 'tu_password_temporal');

// CORS origins
$allowed_origins = [
    'https://tudominio.com',
    'http://localhost:3000'
];
```

## 📚 API Endpoints

### Base URL
```
POST /api/auth/{endpoint}
```

### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "password123"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "timestamp": "2025-06-30T10:30:00+00:00",
  "message": "Login exitoso",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "email": "usuario@email.com",
      "first_login": false,
      "profile_completed": true,
      "last_login": "2025-06-30T09:15:00+00:00"
    }
  }
}
```

### 2. Verificar Token
```http
GET /api/auth/verify
Authorization: Bearer {token}
```

### 3. Cambiar Contraseña
```http
POST /api/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "current_password": "password_actual",
  "new_password": "nueva_password123"
}
```

### 4. Renovar Token
```http
POST /api/auth/refresh
Authorization: Bearer {token}
```

### 5. Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

## 🔧 Uso en Frontend

### JavaScript/Fetch

```javascript
// Login
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('token', data.data.token);
    return data.data.user;
  }
  
  throw new Error(data.error || 'Error en login');
}

// Hacer request autenticado
async function authenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

// Verificar si está autenticado
async function isAuthenticated() {
  try {
    const response = await authenticatedRequest('/api/auth/verify');
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}
```

### React Hook

```javascript
import { useState, useEffect } from 'react';

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.data.user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      localStorage.removeItem('token');
    }
    
    setLoading(false);
  }

  async function login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      setUser(data.data.user);
      return data.data.user;
    }
    
    throw new Error(data.error);
  }

  async function logout() {
    const token = localStorage.getItem('token');
    
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    
    localStorage.removeItem('token');
    setUser(null);
  }

  return { user, loading, login, logout, checkAuth };
}
```

## 👥 Gestión de Usuarios

### Crear Usuario Programáticamente

```php
require_once 'users.php';

$userManager = new UserManager();

// Crear usuario con contraseña por defecto
$userManager->createUser('nuevo@email.com');

// Crear usuario con contraseña específica
$userManager->createUser('otro@email.com', 'password123');
```

### Estructura del Archivo de Usuario

```json
{
  "email": "usuario@email.com",
  "password_hash": "$2y$10$...",
  "first_login": false,
  "last_login": "2025-06-30T10:30:00+00:00",
  "profile_completed": true,
  "role": "professor",
  "created_at": "2025-06-30T09:00:00+00:00",
  "updated_at": "2025-06-30T10:30:00+00:00"
}
```

## 🔒 Seguridad

### Características de Seguridad

- **Contraseñas hasheadas** con `bcrypt`
- **Tokens firmados** con HMAC-SHA256
- **Logout real** - tokens invalidados en servidor
- **Validación de entrada** en todos los endpoints
- **Rate limiting** recomendado (implementar en nginx/apache)
- **HTTPS obligatorio** en producción

### Validaciones Implementadas

- **Email válido** - RFC compliant
- **Contraseña fuerte** - Mínimo 8 caracteres, letras y números
- **Token válido** - Verificación de firma y expiración
- **Datos sanitizados** - Prevención de inyecciones

## 🐛 Debugging

### Activar Modo Debug

```php
// En config.php
define('DEBUG_MODE', true);
```

### Ver Logs

```php
// Revisar logs del servidor web
tail -f /var/log/apache2/error.log

// O en el log de PHP
tail -f /var/log/php_errors.log
```

### Respuestas de Error

```json
{
  "success": false,
  "timestamp": "2025-06-30T10:30:00+00:00",
  "error": "Descripción del error",
  "details": "Información adicional (solo en debug mode)"
}
```

## 🚀 Extensiones y Personalizaciones

### Agregar Campos Personalizados

```php
// En users.php, método createUser()
$user = [
    'email' => $email,
    'password_hash' => password_hash($password ?? DEFAULT_PASSWORD, PASSWORD_BCRYPT),
    'first_login' => true,
    // Agregar campos personalizados
    'department' => null,
    'permissions' => ['read'],
    'preferences' => []
];
```

### Middleware de Autenticación

```php
// auth_middleware.php
function requireAuth() {
    $authController = new AuthController();
    $token = getTokenFromRequest();
    
    if (!$token) {
        errorResponse('Token requerido', 401);
    }
    
    $payload = $authController->verifyToken($token);
    
    if (!$payload) {
        errorResponse('Token inválido', 401);
    }
    
    return $payload;
}

// En tus endpoints protegidos
$user = requireAuth();
// Continuar con la lógica del endpoint
```

### Roles y Permisos

```php
// Extender validación de token para roles
function requireRole($requiredRole) {
    $user = requireAuth();
    
    if ($user['role'] !== $requiredRole) {
        errorResponse('Permisos insuficientes', 403);
    }
    
    return $user;
}

// Uso
$admin = requireRole('admin');
```

## 📦 Migración a Base de Datos

Para migrar a MySQL/PostgreSQL:

1. **Crear tabla de usuarios**
2. **Modificar UserManager** para usar PDO
3. **Mantener misma interfaz** de métodos públicos
4. **Migrar datos existentes** con script

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_login BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 📝 Licencia

Este código está disponible bajo licencia MIT. Úsalo libremente en tus proyectos.

## 🤝 Contribuciones

Las mejoras y sugerencias son bienvenidas. Especialmente:

- Implementación de rate limiting
- Tests unitarios
- Documentación de endpoints con OpenAPI
- Ejemplo con diferentes frameworks frontend
