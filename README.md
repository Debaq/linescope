# LineScope

Portal web para conectar estudiantes con líneas de investigación y oportunidades de tesis académicas.

## 🎯 Descripción

LineScope facilita la conexión entre estudiantes de pregrado y profesores investigadores, permitiendo explorar líneas de investigación disponibles, filtrar por criterios específicos y acceder a recursos multimedia para una mejor comprensión de las oportunidades de tesis.

## ✨ Características

- **Portal público** - Exploración de perfiles de investigadores con filtros avanzados
- **Panel de gestión** - Interfaz segura para profesores con autenticación JWT
- **Contenido multimedia** - Videos explicativos y documentos de referencia
- **Responsive design** - Optimizado para dispositivos móviles
- **Arquitectura escalable** - Preparado para migración a base de datos

## 🛠️ Stack Tecnológico

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** PHP 8+ con JWT
- **Almacenamiento:** JSON (migración a MySQL planificada)
- **Autenticación:** JSON Web Tokens
- **Servidor:** Apache/Nginx con SSL

## 📦 Instalación

```bash
# Clonar repositorio
git clone https://github.com/usuario/linescope.git
cd linescope

# Configurar permisos
chmod 755 data/
chmod 644 config/settings.json

# Instalar dependencias PHP
composer install

# Configurar variables de entorno
cp config/settings.example.json config/settings.json
```

## 🚀 Uso

1. **Portal público:** Accede a `/index.html` para explorar líneas de investigación
2. **Login profesores:** Ingresa en `/login.html` con credenciales institucionales
3. **Panel de gestión:** Crear y editar perfiles en `/dashboard.html`

### Credenciales por defecto
- **Usuario:** profesor@universidad.cl
- **Contraseña:** etmp2026 (cambio obligatorio en primer acceso)

## 📁 Estructura del Proyecto

```
/
├── index.html              # Portal público
├── login.html             # Autenticación
├── dashboard.html         # Panel profesor
├── /api/                  # Backend PHP
├── /assets/               # CSS, JS, imágenes
├── /data/                 # Almacenamiento JSON
├── /components/           # Módulos JavaScript
└── /config/               # Configuración
```

## 🔧 Configuración

Edita `config/settings.json`:

```json
{
  "app": {
    "name": "LineScope",
    "url": "https://tudominio.org/linescope"
  },
  "jwt": {
    "secret": "tu_clave_secreta",
    "expiration": 86400
  }
}
```

## 🚦 API Endpoints

- `POST /api/auth/login` - Autenticación
- `GET /api/profile/{email}` - Obtener perfil
- `POST /api/profile` - Crear/actualizar perfil
- `GET /api/profiles` - Listar perfiles públicos

## 🎨 Personalización

LineScope está diseñado para ser fácilmente adaptable:

- Modifica colores en `/assets/css/styles.css`
- Ajusta campos del formulario en `/components/profile-form.js`
- Personaliza áreas de investigación en la configuración

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración
- Validación de datos server-side
- HTTPS obligatorio en producción

## 🗺️ Roadmap

- [ ] Migración a base de datos MySQL
- [ ] Sistema de notificaciones
- [ ] Dashboard de estadísticas
- [ ] API REST completa
- [ ] Panel de administración

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Para dudas o sugerencias, contacta a través de [Issues](https://github.com/usuario/linescope/issues).

---

**LineScope** - Conectando estudiantes con oportunidades de investigación académica 🎓
