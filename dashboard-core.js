// dashboard-core.js - Utilidades Base, API Calls y Autenticación

/* ========================================
   Global Configuration & Variables
======================================== */
const DashboardCore = {
    // API Configuration
    API_BASE: '/api',
    ENDPOINTS: {
        auth: '/auth.php',
        users: '/users.php',
        profiles: '/profiles.php',
        requests: '/account-requests.php',
        config: '/config.php',
        messages: '/messages.php',
        areas: '/areas.php',
        careers: '/careers.php'
    },
    
    // Global State
    currentUser: null,
    currentSection: 'dashboard',
    isAuthenticated: false,
    
    // Cache
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    
    // Event listeners
    listeners: new Map(),
    
    // Debug mode
    debug: localStorage.getItem('debug') === 'true'
};

/* ========================================
   Utility Functions
======================================== */

/**
 * Generate unique ID
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Debounce function calls
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle function calls
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Validate email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Chilean RUT
 */
function validateRUT(rut) {
    // Clean format
    const cleanRUT = rut.replace(/[^0-9kK]/g, '');
    
    if (cleanRUT.length < 8) return false;
    
    const body = cleanRUT.slice(0, -1);
    const dv = cleanRUT.slice(-1).toLowerCase();
    
    let sum = 0;
    let multiplier = 2;
    
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const remainder = sum % 11;
    const calculatedDV = remainder < 2 ? remainder.toString() : 
                        remainder === 10 ? 'k' : (11 - remainder).toString();
    
    return dv === calculatedDV;
}

/**
 * Format RUT with dots and dash
 */
function formatRUT(rut) {
    const cleaned = rut.replace(/[^0-9kK]/g, '');
    if (cleaned.length < 2) return cleaned;
    
    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);
    
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return formatted + '-' + dv;
}

/**
 * Sanitize HTML input
 */
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * Escape SQL-like strings (for JSON queries)
 */
function escapeString(str) {
    return str.replace(/'/g, "''").replace(/"/g, '""');
}

/* ========================================
   Date & Time Utilities
======================================== */

/**
 * Format date to human readable
 */
function formatDate(dateString, options = {}) {
    if (!dateString) return 'N/A';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return date.toLocaleDateString('es-CL', formatOptions);
}

/**
 * Format relative time (e.g., "hace 5 minutos")
 */
function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 0) return 'En el futuro';
    if (diffInSeconds < 60) return 'Hace unos segundos';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `Hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `Hace ${diffInMonths} mes${diffInMonths !== 1 ? 'es' : ''}`;
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `Hace ${diffInYears} año${diffInYears !== 1 ? 's' : ''}`;
}

/**
 * Get current timestamp in ISO format
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Check if date is today
 */
function isToday(dateString) {
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
}

/**
 * Check if date is this week
 */
function isThisWeek(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return date >= weekStart && date < weekEnd;
}

/* ========================================
   Storage Utilities
======================================== */

/**
 * Local Storage wrapper with JSON support
 */
const Storage = {
    set(key, value, expiry = null) {
        try {
            const item = {
                value: value,
                timestamp: Date.now(),
                expiry: expiry ? Date.now() + expiry : null
            };
            localStorage.setItem(key, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return defaultValue;
            
            const item = JSON.parse(itemStr);
            
            // Check expiry
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return defaultValue;
            }
            
            return item.value;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    },
    
    exists(key) {
        return localStorage.getItem(key) !== null;
    }
};

/* ========================================
   Authentication Management
======================================== */

/**
 * Get authentication token
 */
function getAuthToken() {
    return Storage.get('auth_token');
}

/**
 * Set authentication token
 */
function setAuthToken(token, remember = false) {
    const expiry = remember ? 30 * 24 * 60 * 60 * 1000 : null; // 30 days or session
    return Storage.set('auth_token', token, expiry);
}

/**
 * Remove authentication token
 */
function removeAuthToken() {
    return Storage.remove('auth_token');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    const token = getAuthToken();
    return token !== null && token !== undefined;
}

/**
 * Redirect to login page
 */
function redirectToLogin(returnUrl = null) {
    removeAuthToken();
    DashboardCore.currentUser = null;
    DashboardCore.isAuthenticated = false;
    
    const loginUrl = returnUrl ? 
        `login.html?return=${encodeURIComponent(returnUrl)}` : 
        'login.html';
    
    window.location.href = loginUrl;
}

/**
 * Get return URL from query params
 */
function getReturnUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('return') || 'dashboard.html';
}

/* ========================================
   API Communication
======================================== */

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    // Add authorization header if token exists
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Merge options
    const requestOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        debugLog('API Request:', { endpoint, options: requestOptions });
        
        const response = await fetch(DashboardCore.API_BASE + endpoint, requestOptions);
        const data = await response.json();
        
        debugLog('API Response:', { endpoint, status: response.status, data });
        
        // Handle authentication errors
        if (response.status === 401) {
            removeAuthToken();
            redirectToLogin(window.location.pathname);
            throw new Error('Session expired');
        }
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
        
    } catch (error) {
        console.error('API Request Error:', error);
        
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Error de conexión. Verifica tu conexión a internet.');
        }
        
        throw error;
    }
}

/**
 * Upload file via API
 */
async function uploadFile(endpoint, file, additionalData = {}) {
    const token = getAuthToken();
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data
    Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
    });
    
    const options = {
        method: 'POST',
        headers: {}
    };
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    options.body = formData;
    
    try {
        const response = await fetch(DashboardCore.API_BASE + endpoint, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Upload failed: ${response.status}`);
        }
        
        return data;
        
    } catch (error) {
        console.error('Upload Error:', error);
        throw error;
    }
}

/* ========================================
   Cache Management
======================================== */

/**
 * Set cache with expiry
 */
function setCache(key, data, timeout = DashboardCore.cacheTimeout) {
    DashboardCore.cache.set(key, {
        data: data,
        timestamp: Date.now(),
        expiry: Date.now() + timeout
    });
}

/**
 * Get from cache
 */
function getCache(key) {
    const cached = DashboardCore.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() > cached.expiry) {
        DashboardCore.cache.delete(key);
        return null;
    }
    
    return cached.data;
}

/**
 * Clear cache
 */
function clearCache(pattern = null) {
    if (pattern) {
        // Clear cache entries matching pattern
        for (const [key] of DashboardCore.cache) {
            if (key.includes(pattern)) {
                DashboardCore.cache.delete(key);
            }
        }
    } else {
        // Clear all cache
        DashboardCore.cache.clear();
    }
}

/**
 * Get cached or fetch data
 */
async function getCachedData(key, fetchFunction, timeout = DashboardCore.cacheTimeout) {
    // Try to get from cache first
    const cached = getCache(key);
    if (cached) {
        debugLog('Cache hit:', key);
        return cached;
    }
    
    // Fetch fresh data
    debugLog('Cache miss, fetching:', key);
    try {
        const data = await fetchFunction();
        setCache(key, data, timeout);
        return data;
    } catch (error) {
        console.error('Error fetching data for cache:', error);
        throw error;
    }
}

/* ========================================
   Event Management
======================================== */

/**
 * Custom event emitter
 */
const EventEmitter = {
    on(event, callback) {
        if (!DashboardCore.listeners.has(event)) {
            DashboardCore.listeners.set(event, []);
        }
        DashboardCore.listeners.get(event).push(callback);
    },
    
    off(event, callback) {
        const listeners = DashboardCore.listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    },
    
    emit(event, data = null) {
        const listeners = DashboardCore.listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    },
    
    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
};

/* ========================================
   Error Handling
======================================== */

/**
 * Global error handler
 */
function handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    // Log to external service if configured
    if (typeof window.errorLogger === 'function') {
        window.errorLogger(error, context);
    }
    
    // Emit error event
    EventEmitter.emit('error', { error, context });
    
    // Show user-friendly message based on error type
    let userMessage = 'Ha ocurrido un error inesperado.';
    
    if (error.message.includes('conexión') || error.message.includes('network')) {
        userMessage = 'Error de conexión. Verifica tu conexión a internet.';
    } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        userMessage = 'Tu sesión ha expirado. Serás redirigido al login.';
        setTimeout(() => redirectToLogin(), 2000);
    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        userMessage = 'No tienes permisos para realizar esta acción.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
        userMessage = 'El recurso solicitado no fue encontrado.';
    } else if (error.message.includes('500') || error.message.includes('server')) {
        userMessage = 'Error en el servidor. Inténtalo más tarde.';
    }
    
    return userMessage;
}

/**
 * Retry function with exponential backoff
 */
async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            debugLog(`Retry attempt ${attempt} failed, waiting ${delay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/* ========================================
   Performance Monitoring
======================================== */

/**
 * Performance timer
 */
const PerformanceTimer = {
    timers: new Map(),
    
    start(label) {
        this.timers.set(label, performance.now());
    },
    
    end(label) {
        const startTime = this.timers.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.timers.delete(label);
            debugLog(`Performance [${label}]:`, `${duration.toFixed(2)}ms`);
            return duration;
        }
        return null;
    },
    
    measure(label, fn) {
        this.start(label);
        const result = fn();
        this.end(label);
        return result;
    },
    
    async measureAsync(label, fn) {
        this.start(label);
        const result = await fn();
        this.end(label);
        return result;
    }
};

/* ========================================
   Debug Utilities
======================================== */

/**
 * Debug logging
 */
function debugLog(...args) {
    if (DashboardCore.debug) {
        console.log(`[${formatDate(new Date())}]`, ...args);
    }
}

/**
 * Toggle debug mode
 */
function toggleDebug() {
    DashboardCore.debug = !DashboardCore.debug;
    Storage.set('debug', DashboardCore.debug.toString());
    console.log('Debug mode:', DashboardCore.debug ? 'enabled' : 'disabled');
}

/* ========================================
   Initialization
======================================== */

/**
 * Initialize core functionality
 */
function initializeCore() {
    debugLog('Initializing Dashboard Core...');
    
    // Set up global error handlers
    window.addEventListener('error', (event) => {
        handleError(event.error, 'Global Error Handler');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        handleError(event.reason, 'Unhandled Promise Rejection');
    });
    
    // Set up performance monitoring for critical operations
    EventEmitter.on('apiRequest', (data) => {
        debugLog('API Request initiated:', data);
    });
    
    EventEmitter.on('apiResponse', (data) => {
        debugLog('API Response received:', data);
    });
    
    // Clean up expired cache periodically
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of DashboardCore.cache) {
            if (now > value.expiry) {
                DashboardCore.cache.delete(key);
                debugLog('Expired cache entry removed:', key);
            }
        }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    debugLog('Dashboard Core initialized successfully');
}

/* ========================================
   Public API Export
======================================== */

// Make functions available globally
window.DashboardCore = DashboardCore;
window.generateId = generateId;
window.debounce = debounce;
window.throttle = throttle;
window.deepClone = deepClone;
window.formatBytes = formatBytes;
window.validateEmail = validateEmail;
window.validateRUT = validateRUT;
window.formatRUT = formatRUT;
window.sanitizeHTML = sanitizeHTML;
window.escapeString = escapeString;
window.formatDate = formatDate;
window.formatRelativeTime = formatRelativeTime;
window.getCurrentTimestamp = getCurrentTimestamp;
window.isToday = isToday;
window.isThisWeek = isThisWeek;
window.Storage = Storage;
window.getAuthToken = getAuthToken;
window.setAuthToken = setAuthToken;
window.removeAuthToken = removeAuthToken;
window.isAuthenticated = isAuthenticated;
window.redirectToLogin = redirectToLogin;
window.getReturnUrl = getReturnUrl;
window.apiRequest = apiRequest;
window.uploadFile = uploadFile;
window.setCache = setCache;
window.getCache = getCache;
window.clearCache = clearCache;
window.getCachedData = getCachedData;
window.EventEmitter = EventEmitter;
window.handleError = handleError;
window.retry = retry;
window.PerformanceTimer = PerformanceTimer;
window.debugLog = debugLog;
window.toggleDebug = toggleDebug;
window.initializeCore = initializeCore;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCore);
} else {
    initializeCore();
}