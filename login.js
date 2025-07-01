// Login JavaScript
class LoginManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    // Configuración del tema
    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeIcon();
    }

    // Event Listeners
    setupEventListeners() {
        // Toggle de tema
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Toggle de contraseña
        const passwordToggle = document.getElementById('passwordToggle');
        const passwordInput = document.getElementById('password');
        if (passwordToggle && passwordInput) {
            passwordToggle.addEventListener('click', () => {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                
                const icon = passwordToggle.querySelector('.password-icon');
                icon.textContent = type === 'password' ? '👁️' : '🙈';
            });
        }

        // Formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Validación en tiempo real
        const emailInput = document.getElementById('email');
        const passwordInputField = document.getElementById('password');
        
        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail());
            emailInput.addEventListener('input', () => this.clearError('email'));
        }
        
        if (passwordInputField) {
            passwordInputField.addEventListener('input', () => this.clearError('password'));
        }
    }

    // Verificar si ya está autenticado
    async checkExistingAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch('./api/auth.php/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                if (data.success) {
                    // Ya está autenticado, redirigir
                    window.location.href = 'dashboard.html';
                    return;
                }
            } catch (error) {
                // Token inválido, continuar con login normal
                localStorage.removeItem('token');
            }
        }
    }

    // Validaciones
    validateEmail() {
        const email = document.getElementById('email').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.showError('email', 'El email es requerido');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.showError('email', 'Formato de email inválido');
            return false;
        }

        // Validar dominio institucional (opcional)
        if (!email.includes('@uach.cl')) {
            this.showError('email', 'Debe usar email institucional (@uach.cl)');
            return false;
        }
        
        this.clearError('email');
        return true;
    }

    validatePassword() {
        const password = document.getElementById('password').value;
        
        if (!password) {
            this.showError('password', 'La contraseña es requerida');
            return false;
        }
        
        if (password.length < 3) {
            this.showError('password', 'La contraseña debe tener al menos 3 caracteres');
            return false;
        }
        
        this.clearError('password');
        return true;
    }

    // Manejo del formulario
    async handleLogin(event) {
        event.preventDefault();
        
        // Validar campos
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        
        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnSpinner = loginBtn.querySelector('.btn-spinner');
        
        // Mostrar loading
        this.setLoading(true);
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';
        loginBtn.disabled = true;

        try {
            // Obtener valores directamente de los inputs
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            
            const loginData = {
                email: (emailInput.value || '').trim().toLowerCase(),
                password: passwordInput.value || ''
            };

            // Debug: ver qué datos se están enviando
            console.log('Datos a enviar:', loginData);

            const response = await fetch('./api/auth.php/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            // Debug: ver la respuesta completa
            const responseText = await response.text();
            console.log('Respuesta del servidor:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Error parseando JSON:', responseText);
                throw new Error('Respuesta del servidor no es JSON válido');
            }

            if (data.success) {
                // Login exitoso
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data.user));
                
                this.showMessage('✅ Login exitoso. Redirigiendo...', 'success');
                
                // Redirigir después de un momento
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } else {
                // Error en login
                this.showMessage(`❌ ${data.error}`, 'error');
            }

        } catch (error) {
            console.error('Error en login:', error);
            this.showMessage('❌ Error de conexión. Intenta nuevamente.', 'error');
        } finally {
            // Restaurar botón
            this.setLoading(false);
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            loginBtn.disabled = false;
        }
    }

    // Utilidades UI
    showMessage(message, type) {
        const messageElement = document.getElementById('loginMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `message ${type}`;
            messageElement.style.display = 'block';

            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }
    }

    showError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        const inputElement = document.getElementById(fieldName);
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    clearError(fieldName) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        const inputElement = document.getElementById(fieldName);
        
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    setLoading(loading) {
        const form = document.getElementById('loginForm');
        const inputs = form.querySelectorAll('input');
        
        inputs.forEach(input => {
            input.disabled = loading;
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

// Exportar para uso global si es necesario
window.LoginManager = LoginManager;