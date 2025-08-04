// dashboard-admin.js - Professional Admin Dashboard JavaScript

/* ========================================
   Global Variables & Configuration
======================================== */
let currentUser = null;
let currentSection = 'dashboard';
let charts = {};
let notifications = [];
let activityData = [];
let requestsData = [];
let usersData = [];
let areasData = [];
let careersData = [];
let messagesData = [];

const API_BASE = '/api';
const ENDPOINTS = {
    auth: '/auth.php',
    users: '/users.php',
    profiles: '/profiles.php',
    requests: '/account-requests.php',
    config: '/config.php',
    messages: '/messages.php',
    areas: '/areas.php',
    careers: '/careers.php'
};

/* ========================================
   Utility Functions
======================================== */
function getAuthToken() {
    return localStorage.getItem('token');
}

function setAuthToken(token) {
    localStorage.setItem('token', token);
}

function removeAuthToken() {
    localStorage.removeItem('token');
}

async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        }
    };

    const requestOptions = { ...defaultOptions, ...options };
    if (requestOptions.headers) {
        requestOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    try {
        showLoading();
        const response = await fetch(API_BASE + endpoint, requestOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        showToast('Error de conexión: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Hace unos segundos';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return formatDate(dateString);
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/* ========================================
   Authentication & Initialization
======================================== */
async function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        redirectToLogin();
        return false;
    }

    try {
        const response = await apiRequest('/auth.php/verify');
        if (response.success && response.data.user) {
            currentUser = response.data.user;
            updateUserInterface();
            return true;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
    
    redirectToLogin();
    return false;
}

function redirectToLogin() {
    removeAuthToken();
    window.location.href = 'login.html';
}

function updateUserInterface() {
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.email.split('@')[0];
        document.getElementById('adminEmail').textContent = currentUser.email;
    }
}

async function logout() {
    try {
        await apiRequest('/auth.php/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        removeAuthToken();
        redirectToLogin();
    }
}

/* ========================================
   UI Management
======================================== */
function showSection(sectionName) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');

    // Update page title and breadcrumb
    const titles = {
        dashboard: 'Dashboard',
        requests: 'Gestión de Solicitudes',
        users: 'Gestión de Usuarios',
        messages: 'Centro de Mensajes',
        'research-areas': 'Áreas de Investigación',
        careers: 'Gestión de Carreras',
        config: 'Configuración del Sistema'
    };

    document.getElementById('pageTitle').textContent = titles[sectionName];
    document.getElementById('breadcrumb').innerHTML = `<span>Inicio</span><span>${titles[sectionName]}</span>`;

    currentSection = sectionName;

    // Load section data
    loadSectionData(sectionName);
}

async function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'requests':
            await loadRequestsData();
            break;
        case 'users':
            await loadUsersData();
            break;
        case 'messages':
            await loadMessagesData();
            break;
        case 'research-areas':
            await loadAreasData();
            break;
        case 'careers':
            await loadCareersData();
            break;
        case 'config':
            await loadConfigData();
            break;
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    
    // Save state
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme toggle icon
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = generateId();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = toastId;
    
    const titles = {
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información'
    };
    
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-title">${titles[type]}</div>
            <button class="toast-close" onclick="closeToast('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-body">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-remove
    setTimeout(() => closeToast(toastId), duration);
    
    return toastId;
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalBody').textContent = message;
    
    document.getElementById('confirmAction').onclick = () => {
        onConfirm();
        hideModal('confirmModal');
    };
    
    showModal('confirmModal');
}

/* ========================================
   Dashboard Functions
======================================== */
async function loadDashboardData() {
    try {
        // Load statistics
        await loadStatistics();
        
        // Load charts
        await loadCharts();
        
        // Load recent activity
        await loadRecentActivity();
        
        // Load notifications
        await loadNotifications();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error al cargar los datos del dashboard', 'error');
    }
}

async function loadStatistics() {
    try {
        // This would normally come from API
        const stats = {
            pendingRequests: 12,
            totalUsers: 45,
            activeUsers: 38,
            completedProfiles: 29
        };
        
        document.getElementById('pendingRequests').textContent = stats.pendingRequests;
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('activeUsers').textContent = stats.activeUsers;
        document.getElementById('completedProfiles').textContent = stats.completedProfiles;
        
        // Update badge
        document.getElementById('requestsBadge').textContent = stats.pendingRequests;
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadCharts() {
    // Activity Chart
    const activityCtx = document.getElementById('activityChart');
    if (activityCtx && !charts.activity) {
        charts.activity = new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Usuarios Activos',
                    data: [12, 19, 15, 25, 22, 8, 14],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Roles Chart
    const rolesCtx = document.getElementById('rolesChart');
    if (rolesCtx && !charts.roles) {
        charts.roles = new Chart(rolesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Profesores', 'Estudiantes', 'Investigadores', 'Revisores'],
                datasets: [{
                    data: [15, 20, 8, 2],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    
    // Mock data - would come from API
    const activities = [
        {
            icon: 'fas fa-user-plus',
            description: 'Nuevo usuario registrado: juan.perez@uach.cl',
            time: new Date(Date.now() - 300000) // 5 minutes ago
        },
        {
            icon: 'fas fa-file-alt',
            description: 'Perfil actualizado por ana.martinez@uach.cl',
            time: new Date(Date.now() - 900000) // 15 minutes ago
        },
        {
            icon: 'fas fa-envelope',
            description: 'Mensaje enviado a todos los profesores',
            time: new Date(Date.now() - 1800000) // 30 minutes ago
        }
    ];
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${formatRelativeTime(activity.time)}</div>
            </div>
        </div>
    `).join('');
}

async function loadNotifications() {
    // Mock notifications
    notifications = [
        {
            id: 1,
            title: 'Nueva solicitud de cuenta',
            message: 'Juan Pérez ha solicitado acceso como profesor',
            time: new Date(Date.now() - 600000),
            read: false
        },
        {
            id: 2,
            title: 'Sistema actualizado',
            message: 'El sistema ha sido actualizado a la versión 2.1',
            time: new Date(Date.now() - 3600000),
            read: false
        },
        {
            id: 3,
            title: 'Backup completado',
            message: 'El backup diario se ha completado exitosamente',
            time: new Date(Date.now() - 7200000),
            read: true
        }
    ];
    
    updateNotificationUI();
}

function updateNotificationUI() {
    const unreadCount = notifications.filter(n => !n.read).length;
    document.getElementById('notificationCount').textContent = unreadCount;
    
    const notificationList = document.getElementById('notificationList');
    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${formatRelativeTime(notification.time)}</div>
            </div>
        </div>
    `).join('');
}

/* ========================================
   Requests Management
======================================== */
async function loadRequestsData() {
    try {
        const response = await apiRequest('/account-requests.php');
        requestsData = response.data || [];
        renderRequestsTable();
    } catch (error) {
        console.error('Error loading requests:', error);
        requestsData = getMockRequests();
        renderRequestsTable();
    }
}

function getMockRequests() {
    return [
        {
            requestId: 'REQ_20250630_A1B2C3',
            fullName: 'Juan Carlos Pérez González',
            email: 'juan.perez@uach.cl',
            rut: '12.345.678-9',
            role: 'professor',
            career: 'ETMP',
            requestDate: '2025-06-30T10:00:00Z',
            status: 'pending'
        },
        {
            requestId: 'REQ_20250629_D4E5F6',
            fullName: 'María José Silva Castro',
            email: 'maria.silva@uach.cl',
            rut: '98.765.432-1',
            role: 'student',
            career: 'ETMP',
            requestDate: '2025-06-29T15:30:00Z',
            status: 'approved'
        }
    ];
}

function renderRequestsTable() {
    const tbody = document.getElementById('requestsTableBody');
    
    if (requestsData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center p-6">
                    No hay solicitudes disponibles
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = requestsData.map(request => `
        <tr>
            <td>${request.fullName}</td>
            <td>${request.email}</td>
            <td>${request.rut}</td>
            <td>
                <span class="tag">${getRoleLabel(request.role)}</span>
            </td>
            <td>${formatDate(request.requestDate)}</td>
            <td>
                <span class="status-badge status-${request.status}">
                    ${getStatusLabel(request.status)}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewRequest('${request.requestId}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${request.status === 'pending' ? `
                        <button class="action-btn edit" onclick="approveRequest('${request.requestId}')" title="Aprobar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn delete" onclick="rejectRequest('${request.requestId}')" title="Rechazar">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function getRoleLabel(role) {
    const labels = {
        'student': 'Estudiante',
        'professor': 'Profesor',
        'researcher': 'Investigador',
        'reviewer': 'Revisor'
    };
    return labels[role] || role;
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Pendiente',
        'approved': 'Aprobada',
        'rejected': 'Rechazada'
    };
    return labels[status] || status;
}

function viewRequest(requestId) {
    const request = requestsData.find(r => r.requestId === requestId);
    if (!request) return;
    
    document.getElementById('requestModalTitle').textContent = `Solicitud ${requestId}`;
    document.getElementById('requestModalBody').innerHTML = `
        <div class="request-details">
            <div class="detail-row">
                <strong>Fecha de Solicitud:</strong> ${formatDate(request.requestDate)}
            </div>
            <div class="detail-row">
                <strong>Estado:</strong> 
                <span class="status-badge status-${request.status}">
                    ${getStatusLabel(request.status)}
                </span>
            </div>
            ${request.comments ? `
                <div class="detail-row">
                    <strong>Comentarios:</strong> ${request.comments}
                </div>
            ` : ''}
            ${request.phone ? `
                <div class="detail-row">
                    <strong>Teléfono:</strong> ${request.phone}
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('requestModalFooter').innerHTML = request.status === 'pending' ? `
        <button class="btn btn-success" onclick="approveRequest('${requestId}')">
            <i class="fas fa-check"></i> Aprobar
        </button>
        <button class="btn btn-danger" onclick="rejectRequest('${requestId}')">
            <i class="fas fa-times"></i> Rechazar
        </button>
        <button class="btn btn-secondary" data-modal="requestModal">Cerrar</button>
    ` : `
        <button class="btn btn-secondary" data-modal="requestModal">Cerrar</button>
    `;
    
    showModal('requestModal');
}

async function approveRequest(requestId) {
    showConfirmModal(
        'Aprobar Solicitud',
        '¿Estás seguro de que deseas aprobar esta solicitud? Se creará el usuario y se enviará un email de confirmación.',
        async () => {
            try {
                // Here would be the actual API call
                // await apiRequest(`/account-requests.php/${requestId}/approve`, { method: 'POST' });
                
                // Mock approval
                const requestIndex = requestsData.findIndex(r => r.requestId === requestId);
                if (requestIndex !== -1) {
                    requestsData[requestIndex].status = 'approved';
                    renderRequestsTable();
                    hideModal('requestModal');
                    showToast('Solicitud aprobada exitosamente', 'success');
                }
            } catch (error) {
                showToast('Error al aprobar la solicitud', 'error');
            }
        }
    );
}

async function rejectRequest(requestId) {
    showConfirmModal(
        'Rechazar Solicitud',
        '¿Estás seguro de que deseas rechazar esta solicitud? Se enviará un email de notificación al solicitante.',
        async () => {
            try {
                // Here would be the actual API call
                // await apiRequest(`/account-requests.php/${requestId}/reject`, { method: 'POST' });
                
                // Mock rejection
                const requestIndex = requestsData.findIndex(r => r.requestId === requestId);
                if (requestIndex !== -1) {
                    requestsData[requestIndex].status = 'rejected';
                    renderRequestsTable();
                    hideModal('requestModal');
                    showToast('Solicitud rechazada', 'warning');
                }
            } catch (error) {
                showToast('Error al rechazar la solicitud', 'error');
            }
        }
    );
}

/* ========================================
   Users Management
======================================== */
async function loadUsersData() {
    try {
        // This would normally come from API
        // const response = await apiRequest('/users.php');
        // usersData = response.data || [];
        
        usersData = getMockUsers();
        renderUsersTable();
    } catch (error) {
        console.error('Error loading users:', error);
        usersData = getMockUsers();
        renderUsersTable();
    }
}

function getMockUsers() {
    return [
        {
            email: 'juan.perez@uach.cl',
            role: 'professor',
            status: 'active',
            lastLogin: '2025-06-30T09:15:00Z',
            profileCompleted: true,
            createdAt: '2025-06-15T10:00:00Z'
        },
        {
            email: 'ana.martinez@uach.cl',
            role: 'professor',
            status: 'active',
            lastLogin: '2025-06-29T14:30:00Z',
            profileCompleted: true,
            createdAt: '2025-06-10T08:00:00Z'
        },
        {
            email: 'carlos.rodriguez@uach.cl',
            role: 'professor',
            status: 'suspended',
            lastLogin: '2025-06-25T11:20:00Z',
            profileCompleted: false,
            createdAt: '2025-06-05T16:30:00Z'
        }
    ];
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    
    if (usersData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center p-6">
                    No hay usuarios disponibles
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = usersData.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <div class="user-name">${user.email.split('@')[0]}</div>
                    <div class="user-email">${user.email}</div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="tag">${getRoleLabel(user.role)}</span>
            </td>
            <td>
                <span class="status-badge status-${user.status}">
                    ${user.status === 'active' ? 'Activo' : 'Suspendido'}
                </span>
            </td>
            <td>${formatDate(user.lastLogin)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewUser('${user.email}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editUser('${user.email}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn impersonate" onclick="impersonateUser('${user.email}')" title="Actuar como">
                        <i class="fas fa-user-secret"></i>
                    </button>
                    ${user.status === 'active' ? `
                        <button class="action-btn delete" onclick="suspendUser('${user.email}')" title="Suspender">
                            <i class="fas fa-user-slash"></i>
                        </button>
                    ` : `
                        <button class="action-btn edit" onclick="activateUser('${user.email}')" title="Activar">
                            <i class="fas fa-user-check"></i>
                        </button>
                    `}
                    <button class="action-btn delete" onclick="deleteUser('${user.email}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewUser(email) {
    const user = usersData.find(u => u.email === email);
    if (!user) return;
    
    document.getElementById('userModalTitle').textContent = `Usuario: ${email}`;
    document.getElementById('userModalBody').innerHTML = `
        <div class="user-details">
            <div class="detail-row">
                <strong>Email:</strong> ${user.email}
            </div>
            <div class="detail-row">
                <strong>Rol:</strong> ${getRoleLabel(user.role)}
            </div>
            <div class="detail-row">
                <strong>Estado:</strong> 
                <span class="status-badge status-${user.status}">
                    ${user.status === 'active' ? 'Activo' : 'Suspendido'}
                </span>
            </div>
            <div class="detail-row">
                <strong>Último Login:</strong> ${formatDate(user.lastLogin)}
            </div>
            <div class="detail-row">
                <strong>Perfil Completado:</strong> ${user.profileCompleted ? 'Sí' : 'No'}
            </div>
            <div class="detail-row">
                <strong>Fecha de Creación:</strong> ${formatDate(user.createdAt)}
            </div>
        </div>
    `;
    
    document.getElementById('userModalFooter').innerHTML = `
        <button class="btn btn-primary" onclick="editUser('${email}')">
            <i class="fas fa-edit"></i> Editar
        </button>
        <button class="btn btn-info" onclick="impersonateUser('${email}')">
            <i class="fas fa-user-secret"></i> Actuar como
        </button>
        <button class="btn btn-secondary" data-modal="userModal">Cerrar</button>
    `;
    
    showModal('userModal');
}

function editUser(email) {
    const user = usersData.find(u => u.email === email);
    if (!user) return;
    
    document.getElementById('userModalTitle').textContent = `Editar Usuario: ${email}`;
    document.getElementById('userModalBody').innerHTML = `
        <form id="editUserForm">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="editUserEmail" value="${user.email}" readonly>
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select id="editUserRole" required>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                    <option value="professor" ${user.role === 'professor' ? 'selected' : ''}>Profesor</option>
                    <option value="student" ${user.role === 'student' ? 'selected' : ''}>Estudiante</option>
                    <option value="researcher" ${user.role === 'researcher' ? 'selected' : ''}>Investigador</option>
                    <option value="reviewer" ${user.role === 'reviewer' ? 'selected' : ''}>Revisor</option>
                </select>
            </div>
            <div class="form-group">
                <label>Estado</label>
                <select id="editUserStatus" required>
                    <option value="active" ${user.status === 'active' ? 'selected' : ''}>Activo</option>
                    <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspendido</option>
                </select>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="resetPassword"> Resetear contraseña a la por defecto
                </label>
            </div>
        </form>
    `;
    
    document.getElementById('userModalFooter').innerHTML = `
        <button class="btn btn-primary" onclick="saveUserChanges('${email}')">
            <i class="fas fa-save"></i> Guardar Cambios
        </button>
        <button class="btn btn-secondary" data-modal="userModal">Cancelar</button>
    `;
    
    showModal('userModal');
}

async function saveUserChanges(email) {
    const role = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;
    const resetPassword = document.getElementById('resetPassword').checked;
    
    try {
        // Here would be the actual API call
        // await apiRequest(`/users.php/${email}`, {
        //     method: 'PUT',
        //     body: JSON.stringify({ role, status, resetPassword })
        // });
        
        // Mock update
        const userIndex = usersData.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            usersData[userIndex].role = role;
            usersData[userIndex].status = status;
            renderUsersTable();
            hideModal('userModal');
            showToast('Usuario actualizado exitosamente', 'success');
        }
    } catch (error) {
        showToast('Error al actualizar el usuario', 'error');
    }
}

function createUser() {
    document.getElementById('userModalTitle').textContent = 'Crear Nuevo Usuario';
    document.getElementById('userModalBody').innerHTML = `
        <form id="createUserForm">
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="newUserEmail" required placeholder="usuario@uach.cl">
            </div>
            <div class="form-group">
                <label>Rol *</label>
                <select id="newUserRole" required>
                    <option value="">Seleccionar rol</option>
                    <option value="professor">Profesor</option>
                    <option value="student">Estudiante</option>
                    <option value="researcher">Investigador</option>
                    <option value="reviewer">Revisor</option>
                    <option value="admin">Administrador</option>
                </select>
            </div>
            <div class="form-group">
                <label>Contraseña Inicial</label>
                <input type="text" id="newUserPassword" placeholder="Se usará la contraseña por defecto si se deja vacío">
                <small>Si no se especifica, se usará la contraseña por defecto del sistema</small>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="sendWelcomeEmail" checked> Enviar email de bienvenida
                </label>
            </div>
        </form>
    `;
    
    document.getElementById('userModalFooter').innerHTML = `
        <button class="btn btn-primary" onclick="saveNewUser()">
            <i class="fas fa-plus"></i> Crear Usuario
        </button>
        <button class="btn btn-secondary" data-modal="userModal">Cancelar</button>
    `;
    
    showModal('userModal');
}

async function saveNewUser() {
    const email = document.getElementById('newUserEmail').value;
    const role = document.getElementById('newUserRole').value;
    const password = document.getElementById('newUserPassword').value;
    const sendEmail = document.getElementById('sendWelcomeEmail').checked;
    
    if (!email || !role) {
        showToast('Por favor completa todos los campos requeridos', 'warning');
        return;
    }
    
    try {
        // Here would be the actual API call
        // await apiRequest('/users.php', {
        //     method: 'POST',
        //     body: JSON.stringify({ email, role, password, sendEmail })
        // });
        
        // Mock creation
        const newUser = {
            email,
            role,
            status: 'active',
            lastLogin: null,
            profileCompleted: false,
            createdAt: new Date().toISOString()
        };
        
        usersData.push(newUser);
        renderUsersTable();
        hideModal('userModal');
        showToast('Usuario creado exitosamente', 'success');
        
    } catch (error) {
        showToast('Error al crear el usuario', 'error');
    }
}

async function impersonateUser(email) {
    showConfirmModal(
        'Actuar como Usuario',
        `¿Estás seguro de que deseas actuar como ${email}? Serás redirigido a su dashboard correspondiente.`,
        async () => {
            try {
                // Here would be the actual API call to generate impersonation token
                // const response = await apiRequest(`/auth.php/impersonate`, {
                //     method: 'POST',
                //     body: JSON.stringify({ email })
                // });
                
                showToast(`Actuando como ${email}...`, 'info');
                
                // Mock redirection - in real implementation, this would redirect to the appropriate dashboard
                setTimeout(() => {
                    showToast('Funcionalidad de suplantación implementada', 'success');
                }, 2000);
                
            } catch (error) {
                showToast('Error al actuar como usuario', 'error');
            }
        }
    );
}

async function suspendUser(email) {
    showConfirmModal(
        'Suspender Usuario',
        `¿Estás seguro de que deseas suspender a ${email}? El usuario no podrá acceder al sistema.`,
        async () => {
            try {
                const userIndex = usersData.findIndex(u => u.email === email);
                if (userIndex !== -1) {
                    usersData[userIndex].status = 'suspended';
                    renderUsersTable();
                    showToast('Usuario suspendido exitosamente', 'warning');
                }
            } catch (error) {
                showToast('Error al suspender el usuario', 'error');
            }
        }
    );
}

async function activateUser(email) {
    try {
        const userIndex = usersData.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            usersData[userIndex].status = 'active';
            renderUsersTable();
            showToast('Usuario activado exitosamente', 'success');
        }
    } catch (error) {
        showToast('Error al activar el usuario', 'error');
    }
}

async function deleteUser(email) {
    showConfirmModal(
        'Eliminar Usuario',
        `¿Estás seguro de que deseas eliminar permanentemente a ${email}? Esta acción no se puede deshacer.`,
        async () => {
            try {
                const userIndex = usersData.findIndex(u => u.email === email);
                if (userIndex !== -1) {
                    usersData.splice(userIndex, 1);
                    renderUsersTable();
                    showToast('Usuario eliminado exitosamente', 'success');
                }
            } catch (error) {
                showToast('Error al eliminar el usuario', 'error');
            }
        }
    );
}

/* ========================================
   Messages Management
======================================== */
async function loadMessagesData() {
    try {
        // Mock messages data
        messagesData = [
            {
                id: 1,
                subject: 'Bienvenida al nuevo semestre',
                recipients: ['all'],
                body: 'Estimados usuarios, les damos la bienvenida al nuevo semestre académico...',
                sentAt: '2025-06-25T10:00:00Z',
                sentBy: 'admin@uach.cl',
                urgent: false
            },
            {
                id: 2,
                subject: 'Actualización del sistema',
                recipients: ['professors'],
                body: 'Se ha realizado una actualización del sistema que incluye nuevas funcionalidades...',
                sentAt: '2025-06-20T15:30:00Z',
                sentBy: 'admin@uach.cl',
                urgent: true
            }
        ];
        
        renderMessageHistory();
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function showMessageComposer() {
    document.getElementById('messageComposer').style.display = 'block';
    document.getElementById('messageForm').reset();
}

function hideMessageComposer() {
    document.getElementById('messageComposer').style.display = 'none';
}

async function sendMessage() {
    const recipients = Array.from(document.getElementById('messageRecipients').selectedOptions).map(o => o.value);
    const subject = document.getElementById('messageSubject').value;
    const body = document.getElementById('messageBody').value;
    const urgent = document.getElementById('messageUrgent').checked;
    
    if (!subject || !body || recipients.length === 0) {
        showToast('Por favor completa todos los campos requeridos', 'warning');
        return;
    }
    
    try {
        // Here would be the actual API call
        // await apiRequest('/messages.php', {
        //     method: 'POST',
        //     body: JSON.stringify({ recipients, subject, body, urgent })
        // });
        
        // Mock send
        const newMessage = {
            id: messagesData.length + 1,
            subject,
            recipients,
            body,
            sentAt: new Date().toISOString(),
            sentBy: currentUser.email,
            urgent
        };
        
        messagesData.unshift(newMessage);
        renderMessageHistory();
        hideMessageComposer();
        showToast('Mensaje enviado exitosamente', 'success');
        
    } catch (error) {
        showToast('Error al enviar el mensaje', 'error');
    }
}

function renderMessageHistory() {
    const messageList = document.getElementById('messageList');
    
    if (messagesData.length === 0) {
        messageList.innerHTML = '<div class="text-center p-6">No hay mensajes enviados</div>';
        return;
    }
    
    messageList.innerHTML = messagesData.map(message => `
        <div class="message-item">
            <div class="message-header">
                <div class="message-subject">
                    ${message.urgent ? '<i class="fas fa-exclamation-triangle text-warning"></i> ' : ''}
                    ${message.subject}
                </div>
                <div class="message-date">${formatDate(message.sentAt)}</div>
            </div>
            <div class="message-recipients">
                <strong>Para:</strong> ${getRecipientsLabel(message.recipients)}
            </div>
            <div class="message-preview">
                ${message.body.substring(0, 150)}${message.body.length > 150 ? '...' : ''}
            </div>
        </div>
    `).join('');
}

function getRecipientsLabel(recipients) {
    const labels = {
        'all': 'Todos los usuarios',
        'professors': 'Todos los profesores',
        'students': 'Todos los estudiantes',
        'researchers': 'Todos los investigadores',
        'reviewers': 'Todos los revisores'
    };
    
    return recipients.map(r => labels[r] || r).join(', ');
}

/* ========================================
   Research Areas Management
======================================== */
async function loadAreasData() {
    try {
        // Mock areas data
        areasData = [
            {
                id: 'oftalmologia-optometria',
                name: 'Oftalmología y Optometría',
                description: 'Área enfocada en el estudio y tratamiento de enfermedades oculares y la corrección de defectos refractivos.',
                professorCount: 5,
                projectCount: 12,
                active: true
            },
            {
                id: 'otorrinolaringologia',
                name: 'Otorrinolaringología',
                description: 'Especialidad médica que se ocupa del diagnóstico y tratamiento de las enfermedades del oído, nariz y garganta.',
                professorCount: 3,
                projectCount: 8,
                active: true
            },
            {
                id: 'fonoaudiologia',
                name: 'Fonoaudiología',
                description: 'Disciplina que se encarga del estudio, prevención, evaluación, diagnóstico y tratamiento de los trastornos de la comunicación humana.',
                professorCount: 4,
                projectCount: 6,
                active: true
            }
        ];
        
        renderAreasGrid();
    } catch (error) {
        console.error('Error loading areas:', error);
    }
}

function renderAreasGrid() {
    const areasGrid = document.getElementById('areasGrid');
    
    areasGrid.innerHTML = areasData.map(area => `
        <div class="area-card">
            <div class="area-header">
                <h3 class="area-title">${area.name}</h3>
                <div class="area-actions">
                    <button class="action-btn edit" onclick="editArea('${area.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn ${area.active ? 'delete' : 'edit'}" 
                            onclick="${area.active ? 'deactivateArea' : 'activateArea'}('${area.id}')" 
                            title="${area.active ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${area.active ? 'eye-slash' : 'eye'}"></i>
                    </button>
                </div>
            </div>
            <div class="area-description">${area.description}</div>
            <div class="area-stats">
                <span><i class="fas fa-user"></i> ${area.professorCount} profesores</span>
                <span><i class="fas fa-project-diagram"></i> ${area.projectCount} proyectos</span>
            </div>
        </div>
    `).join('');
}

function addArea() {
    showModal('areaModal');
    // This would show a modal for adding a new area
    // Implementation would be similar to user creation
}

function editArea(areaId) {
    const area = areasData.find(a => a.id === areaId);
    if (!area) return;
    
    // This would show a modal for editing the area
    showToast(`Editando área: ${area.name}`, 'info');
}

/* ========================================
   Careers Management
======================================== */
async function loadCareersData() {
    try {
        // Mock careers data
        careersData = [
            {
                id: 'etmp',
                name: 'Escuela de Tecnología Médica de Puerto Montt',
                code: 'ETMP',
                description: 'Carrera enfocada en la formación de tecnólogos médicos especializados en diversas áreas de la salud.',
                studentCount: 120,
                professorCount: 15,
                active: true
            },
            {
                id: 'fonoaudiologia',
                name: 'Fonoaudiología',
                code: 'FONO',
                description: 'Carrera que forma profesionales especialistas en comunicación humana y sus trastornos.',
                studentCount: 80,
                professorCount: 8,
                active: true
            }
        ];
        
        renderCareersGrid();
    } catch (error) {
        console.error('Error loading careers:', error);
    }
}

function renderCareersGrid() {
    const careersGrid = document.getElementById('careersGrid');
    
    careersGrid.innerHTML = careersData.map(career => `
        <div class="career-card">
            <div class="career-header">
                <h3 class="career-title">${career.name}</h3>
                <div class="career-actions">
                    <button class="action-btn edit" onclick="editCareer('${career.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn ${career.active ? 'delete' : 'edit'}" 
                            onclick="${career.active ? 'deactivateCareer' : 'activateCareer'}('${career.id}')" 
                            title="${career.active ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${career.active ? 'eye-slash' : 'eye'}"></i>
                    </button>
                </div>
            </div>
            <div class="career-description">${career.description}</div>
            <div class="career-stats">
                <span><i class="fas fa-users"></i> ${career.studentCount} estudiantes</span>
                <span><i class="fas fa-chalkboard-teacher"></i> ${career.professorCount} profesores</span>
            </div>
        </div>
    `).join('');
}

/* ========================================
   Configuration Management
======================================== */
async function loadConfigData() {
    try {
        // Mock config data - in real implementation, this would come from API
        const config = {
            APP_NAME: 'Portal de Investigación UACH',
            APP_URL: 'https://tmeduca.org/linescope',
            DEBUG_MODE: 'false',
            ADMIN_EMAIL: 'linescope@tmeduca.org',
            SYSTEM_EMAIL: 'noreply@tmeduca.org',
            DEFAULT_PASSWORD: 'etmp2026',
            JWT_EXPIRATION: '86400',
            ALLOWED_ORIGINS: 'https://tmeduca.org,http://localhost:3000'
        };
        
        populateConfigForms(config);
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

function populateConfigForms(config) {
    // General Config
    document.getElementById('appName').value = config.APP_NAME || '';
    document.getElementById('appUrl').value = config.APP_URL || '';
    document.getElementById('debugMode').value = config.DEBUG_MODE || 'false';
    
    // Email Config
    document.getElementById('adminEmail').value = config.ADMIN_EMAIL || '';
    document.getElementById('systemEmail').value = config.SYSTEM_EMAIL || '';
    
    // Security Config
    document.getElementById('defaultPassword').value = config.DEFAULT_PASSWORD || '';
    document.getElementById('jwtExpiration').value = config.JWT_EXPIRATION || '86400';
    
    // CORS Config
    document.getElementById('allowedOrigins').value = config.ALLOWED_ORIGINS || '';
}

async function saveConfig() {
    const configData = {
        APP_NAME: document.getElementById('appName').value,
        APP_URL: document.getElementById('appUrl').value,
        DEBUG_MODE: document.getElementById('debugMode').value,
        ADMIN_EMAIL: document.getElementById('adminEmail').value,
        SYSTEM_EMAIL: document.getElementById('systemEmail').value,
        DEFAULT_PASSWORD: document.getElementById('defaultPassword').value,
        JWT_EXPIRATION: document.getElementById('jwtExpiration').value,
        ALLOWED_ORIGINS: document.getElementById('allowedOrigins').value
    };
    
    try {
        // Here would be the actual API call
        // await apiRequest('/config.php', {
        //     method: 'PUT',
        //     body: JSON.stringify(configData)
        // });
        
        showToast('Configuración guardada exitosamente', 'success');
    } catch (error) {
        showToast('Error al guardar la configuración', 'error');
    }
}

function regenerateJwtSecret() {
    showConfirmModal(
        'Regenerar Clave JWT',
        '¿Estás seguro? Esto invalidará todas las sesiones activas y los usuarios tendrán que volver a iniciar sesión.',
        async () => {
            try {
                // Here would be the actual API call
                // await apiRequest('/config.php/regenerate-jwt', { method: 'POST' });
                
                showToast('Clave JWT regenerada exitosamente. Todas las sesiones han sido invalidadas.', 'success');
            } catch (error) {
                showToast('Error al regenerar la clave JWT', 'error');
            }
        }
    );
}

/* ========================================
   Search and Filter Functions
======================================== */
function setupSearchAndFilters() {
    // Requests filters
    const searchRequests = debounce((query) => {
        filterRequests();
    }, 300);
    
    document.getElementById('searchRequests')?.addEventListener('input', (e) => {
        searchRequests(e.target.value);
    });
    
    document.getElementById('statusFilter')?.addEventListener('change', filterRequests);
    document.getElementById('roleFilter')?.addEventListener('change', filterRequests);
    
    // Users filters
    const searchUsers = debounce((query) => {
        filterUsers();
    }, 300);
    
    document.getElementById('searchUsers')?.addEventListener('input', (e) => {
        searchUsers(e.target.value);
    });
    
    document.getElementById('userRoleFilter')?.addEventListener('change', filterUsers);
    document.getElementById('userStatusFilter')?.addEventListener('change', filterUsers);
}

function filterRequests() {
    const searchQuery = document.getElementById('searchRequests')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    
    const filteredRequests = requestsData.filter(request => {
        const matchesSearch = !searchQuery || 
            request.fullName.toLowerCase().includes(searchQuery) ||
            request.email.toLowerCase().includes(searchQuery);
        
        const matchesStatus = !statusFilter || request.status === statusFilter;
        const matchesRole = !roleFilter || request.role === roleFilter;
        
        return matchesSearch && matchesStatus && matchesRole;
    });
    
    renderFilteredRequestsTable(filteredRequests);
}

function filterUsers() {
    const searchQuery = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('userRoleFilter')?.value || '';
    const statusFilter = document.getElementById('userStatusFilter')?.value || '';
    
    const filteredUsers = usersData.filter(user => {
        const matchesSearch = !searchQuery || 
            user.email.toLowerCase().includes(searchQuery);
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus = !statusFilter || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    renderFilteredUsersTable(filteredUsers);
}

function renderFilteredRequestsTable(filteredData) {
    const originalData = requestsData;
    requestsData = filteredData;
    renderRequestsTable();
    requestsData = originalData;
}

function renderFilteredUsersTable(filteredData) {
    const originalData = usersData;
    usersData = filteredData;
    renderUsersTable();
    usersData = originalData;
}

/* ========================================
   Event Listeners and Initialization
======================================== */
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;
    
    // Initialize UI state
    initializeUIState();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup search and filters
    setupSearchAndFilters();
    
    // Load initial data
    await loadDashboardData();
    
    // Show initial section
    showSection('dashboard');
});

function initializeUIState() {
    // Restore sidebar state
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        document.getElementById('sidebar').classList.add('collapsed');
    }
    
    // Restore theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = item.dataset.section;
            showSection(sectionName);
        });
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = btn.dataset.modal || btn.closest('.modal').id;
            hideModal(modalId);
        });
    });
    
    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });
    
    // Notifications dropdown
    document.querySelector('.notification-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('notificationDropdown');
        dropdown.classList.toggle('show');
    });
    
    // Close notifications dropdown when clicking outside
    document.addEventListener('click', () => {
        document.getElementById('notificationDropdown')?.classList.remove('show');
    });
    
    // Button event listeners
    document.getElementById('refreshRequests')?.addEventListener('click', loadRequestsData);
    document.getElementById('refreshUsers')?.addEventListener('click', loadUsersData);
    document.getElementById('createUserBtn')?.addEventListener('click', createUser);
    document.getElementById('composeMessageBtn')?.addEventListener('click', showMessageComposer);
    document.getElementById('closeComposer')?.addEventListener('click', hideMessageComposer);
    document.getElementById('addAreaBtn')?.addEventListener('click', addArea);
    document.getElementById('addCareerBtn')?.addEventListener('click', addCareer);
    document.getElementById('saveConfigBtn')?.addEventListener('click', saveConfig);
    document.getElementById('regenerateJwtSecret')?.addEventListener('click', regenerateJwtSecret);
    document.getElementById('refreshActivity')?.addEventListener('click', loadRecentActivity);
    
    // Form submissions
    document.getElementById('messageForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });
    
    // Activity filter
    document.getElementById('activityFilter')?.addEventListener('change', (e) => {
        // Reload chart data based on selected period
        loadCharts();
    });
    
    // Mark all notifications as read
    document.querySelector('.mark-all-read')?.addEventListener('click', () => {
        notifications.forEach(n => n.read = true);
        updateNotificationUI();
        showToast('Todas las notificaciones marcadas como leídas', 'success');
    });
}

/* ========================================
   Keyboard Shortcuts
======================================== */
document.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            hideModal(modal.id);
        });
        hideMessageComposer();
    }
    
    // Ctrl/Cmd + shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                if (currentSection === 'config') {
                    saveConfig();
                }
                break;
            case 'n':
                e.preventDefault();
                if (currentSection === 'users') {
                    createUser();
                } else if (currentSection === 'messages') {
                    showMessageComposer();
                }
                break;
            case 'r':
                e.preventDefault();
                loadSectionData(currentSection);
                break;
        }
    }
    
    // Number keys for quick navigation
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        const sections = ['dashboard', 'requests', 'users', 'messages', 'research-areas', 'careers', 'config'];
        const keyNum = parseInt(e.key);
        if (keyNum >= 1 && keyNum <= sections.length) {
            showSection(sections[keyNum - 1]);
        }
    }
});

/* ========================================
   Auto-refresh functionality
======================================== */
function startAutoRefresh() {
    // Refresh dashboard data every 5 minutes
    setInterval(async () => {
        if (currentSection === 'dashboard') {
            await loadStatistics();
            await loadRecentActivity();
            await loadNotifications();
        }
    }, 5 * 60 * 1000);
    
    // Refresh requests every 2 minutes
    setInterval(async () => {
        if (currentSection === 'requests') {
            await loadRequestsData();
        }
    }, 2 * 60 * 1000);
}

/* ========================================
   Error Handling
======================================== */
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('Ha ocurrido un error inesperado', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('Error de conexión', 'error');
});

/* ========================================
   Responsive behavior
======================================== */
function handleResize() {
    const sidebar = document.getElementById('sidebar');
    const width = window.innerWidth;
    
    if (width <= 1024) {
        sidebar.classList.remove('show');
    }
}

window.addEventListener('resize', debounce(handleResize, 250));

/* ========================================
   Performance optimization
======================================== */
function optimizePerformance() {
    // Lazy load charts only when dashboard is visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.target.id === 'dashboard-section') {
                loadCharts();
                observer.unobserve(entry.target);
            }
        });
    });
    
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        observer.observe(dashboardSection);
    }
    
    // Preload critical sections
    setTimeout(() => {
        loadRequestsData();
        loadUsersData();
    }, 2000);
}

// Start optimizations
document.addEventListener('DOMContentLoaded', () => {
    optimizePerformance();
    startAutoRefresh();
});

/* ========================================
   Export/Import functionality
======================================== */
function exportData(type) {
    let data;
    let filename;
    
    switch (type) {
        case 'users':
            data = usersData;
            filename = 'usuarios_export.json';
            break;
        case 'requests':
            data = requestsData;
            filename = 'solicitudes_export.json';
            break;
        case 'areas':
            data = areasData;
            filename = 'areas_export.json';
            break;
        case 'careers':
            data = careersData;
            filename = 'carreras_export.json';
            break;
        default:
            showToast('Tipo de exportación no válido', 'error');
            return;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Datos exportados: ${filename}`, 'success');
}

/* ========================================
   Accessibility enhancements
======================================== */
function enhanceAccessibility() {
    // Add ARIA labels to interactive elements
    document.querySelectorAll('.action-btn').forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon && !btn.getAttribute('aria-label')) {
            const action = btn.className.includes('view') ? 'Ver' :
                          btn.className.includes('edit') ? 'Editar' :
                          btn.className.includes('delete') ? 'Eliminar' :
                          btn.className.includes('impersonate') ? 'Actuar como' : 'Acción';
            btn.setAttribute('aria-label', action);
        }
    });
    
    // Ensure modals are properly announced
    document.querySelectorAll('.modal').forEach(modal => {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
    });
    
    // Add skip links for better keyboard navigation
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Ir al contenido principal';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 9999;
    `;
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
}

// Initialize accessibility enhancements
document.addEventListener('DOMContentLoaded', enhanceAccessibility);

/* ========================================
   Console logging for development
======================================== */
if (localStorage.getItem('debug') === 'true') {
    console.log('🚀 Admin Dashboard loaded successfully');
    console.log('📊 Available sections:', ['dashboard', 'requests', 'users', 'messages', 'research-areas', 'careers', 'config']);
    console.log('⌨️ Keyboard shortcuts:');
    console.log('  - Escape: Close modals');
    console.log('  - Ctrl+S: Save (in config section)');
    console.log('  - Ctrl+N: New item (context-sensitive)');
    console.log('  - Ctrl+R: Refresh current section');
    console.log('  - 1-7: Quick section navigation');
