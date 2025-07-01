// dashboard-components.js - Modales, Toasts, Tablas y Formularios Reutilizables

/* ========================================
   Component State Management
======================================== */
const ComponentManager = {
    // Active components
    activeModals: new Set(),
    activeToasts: new Map(),
    activeTableFilters: new Map(),
    
    // Configuration
    toastTimeout: 5000,
    modalAnimationDuration: 300,
    tableUpdateDelay: 300,
    
    // Toast types configuration
    toastTypes: {
        success: {
            icon: '✅',
            title: 'Éxito',
            className: 'success'
        },
        error: {
            icon: '❌',
            title: 'Error',
            className: 'error'
        },
        warning: {
            icon: '⚠️',
            title: 'Advertencia',
            className: 'warning'
        },
        info: {
            icon: 'ℹ️',
            title: 'Información',
            className: 'info'
        }
    }
};

/* ========================================
   Toast Notifications
======================================== */

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = ComponentManager.toastTimeout, actions = null) {
    const toastId = generateId();
    const toastConfig = ComponentManager.toastTypes[type] || ComponentManager.toastTypes.info;
    const toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) {
        console.error('Toast container not found');
        return null;
    }
    
    debugLog('Showing toast:', { message, type, duration });
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${toastConfig.className}`;
    toast.id = toastId;
    
    // Build toast content
    let actionsHTML = '';
    if (actions && Array.isArray(actions)) {
        actionsHTML = `
            <div class="toast-actions">
                ${actions.map(action => `
                    <button class="toast-action-btn" onclick="${action.callback}('${toastId}')">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-title">
                <span class="toast-icon">${toastConfig.icon}</span>
                ${toastConfig.title}
            </div>
            <button class="toast-close" onclick="closeToast('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-body">${message}</div>
        ${actionsHTML}
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Show with animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Store in active toasts
    ComponentManager.activeToasts.set(toastId, {
        element: toast,
        timeout: setTimeout(() => closeToast(toastId), duration)
    });
    
    // Auto-remove if duration is specified
    if (duration > 0) {
        setTimeout(() => closeToast(toastId), duration);
    }
    
    // Emit event
    EventEmitter.emit('toastShown', { id: toastId, type, message });
    
    return toastId;
}

/**
 * Close specific toast
 */
function closeToast(toastId) {
    const toastData = ComponentManager.activeToasts.get(toastId);
    if (!toastData) return false;
    
    const { element, timeout } = toastData;
    
    // Clear timeout
    if (timeout) clearTimeout(timeout);
    
    // Remove with animation
    element.classList.remove('show');
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, 300);
    
    // Remove from active toasts
    ComponentManager.activeToasts.delete(toastId);
    
    // Emit event
    EventEmitter.emit('toastClosed', { id: toastId });
    
    debugLog('Toast closed:', toastId);
    return true;
}

/**
 * Close all toasts
 */
function closeAllToasts() {
    const toastIds = Array.from(ComponentManager.activeToasts.keys());
    toastIds.forEach(id => closeToast(id));
}

/**
 * Show success toast
 */
function showSuccessToast(message, duration) {
    return showToast(message, 'success', duration);
}

/**
 * Show error toast
 */
function showErrorToast(message, duration) {
    return showToast(message, 'error', duration);
}

/**
 * Show warning toast
 */
function showWarningToast(message, duration) {
    return showToast(message, 'warning', duration);
}

/**
 * Show info toast
 */
function showInfoToast(message, duration) {
    return showToast(message, 'info', duration);
}

/* ========================================
   Modal Management
======================================== */

/**
 * Show modal
 */
function showModal(modalId, data = null) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return false;
    }
    
    debugLog('Showing modal:', modalId);
    
    // Add to active modals
    ComponentManager.activeModals.add(modalId);
    
    // Show modal
    modal.classList.add('show');
    
    // Focus management
    const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), ComponentManager.modalAnimationDuration);
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Emit event
    EventEmitter.emit('modalShown', { id: modalId, data });
    
    return true;
}

/**
 * Hide modal
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;
    
    debugLog('Hiding modal:', modalId);
    
    // Remove from active modals
    ComponentManager.activeModals.delete(modalId);
    
    // Hide modal
    modal.classList.remove('show');
    
    // Restore body scroll if no other modals are open
    if (ComponentManager.activeModals.size === 0) {
        document.body.style.overflow = '';
    }
    
    // Emit event
    EventEmitter.emit('modalHidden', { id: modalId });
    
    return true;
}

/**
 * Hide all modals
 */
function hideAllModals() {
    const modalIds = Array.from(ComponentManager.activeModals);
    modalIds.forEach(id => hideModal(id));
}

/**
 * Show confirmation modal
 */
function showConfirmModal(title, message, onConfirm, onCancel = null, options = {}) {
    const confirmModal = document.getElementById('confirmModal');
    if (!confirmModal) {
        console.error('Confirm modal not found');
        return false;
    }
    
    const defaultOptions = {
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        confirmClass: 'btn-danger',
        icon: null
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Update modal content
    const titleElement = document.getElementById('confirmModalTitle');
    const bodyElement = document.getElementById('confirmModalBody');
    const confirmButton = document.getElementById('confirmAction');
    
    if (titleElement) {
        titleElement.innerHTML = config.icon ? `${config.icon} ${title}` : title;
    }
    
    if (bodyElement) {
        bodyElement.textContent = message;
    }
    
    if (confirmButton) {
        confirmButton.textContent = config.confirmText;
        confirmButton.className = `btn ${config.confirmClass}`;
        
        // Remove previous event listeners
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
        
        // Add new event listener
        newConfirmButton.addEventListener('click', () => {
            hideModal('confirmModal');
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });
    }
    
    // Handle cancel
    const cancelButtons = confirmModal.querySelectorAll('[data-modal="confirmModal"], .modal-close');
    cancelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('confirmModal');
            if (typeof onCancel === 'function') {
                onCancel();
            }
        });
    });
    
    showModal('confirmModal');
    return true;
}

/**
 * Initialize modal system
 */
function initializeModals() {
    // Set up modal close handlers
    document.addEventListener('click', (e) => {
        // Close button clicks
        if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        }
        
        // Data-modal attribute clicks
        const modalTrigger = e.target.closest('[data-modal]');
        if (modalTrigger) {
            const modalId = modalTrigger.dataset.modal;
            hideModal(modalId);
        }
        
        // Backdrop clicks
        if (e.target.classList.contains('modal')) {
            hideModal(e.target.id);
        }
    });
    
    // Escape key handler is in layout.js
    debugLog('Modal system initialized');
}

/* ========================================
   Form Management
======================================== */

/**
 * Serialize form data
 */
function serializeForm(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        if (data[key]) {
            // Handle multiple values (checkboxes, multi-select)
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

/**
 * Populate form with data
 */
function populateForm(form, data) {
    if (!form || !data) return false;
    
    Object.keys(data).forEach(key => {
        const field = form.querySelector(`[name="${key}"]`);
        if (!field) return;
        
        const value = data[key];
        
        if (field.type === 'checkbox') {
            field.checked = Boolean(value);
        } else if (field.type === 'radio') {
            if (field.value === value) {
                field.checked = true;
            }
        } else if (field.tagName === 'SELECT' && field.multiple) {
            Array.from(field.options).forEach(option => {
                option.selected = Array.isArray(value) ? value.includes(option.value) : option.value === value;
            });
        } else {
            field.value = value || '';
        }
    });
    
    return true;
}

/**
 * Validate form field
 */
function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const required = field.required;
    
    // Clear previous errors
    clearFieldError(field);
    
    // Required field validation
    if (required && !value) {
        showFieldError(field, 'Este campo es requerido');
        return false;
    }
    
    // Type-specific validation
    if (value) {
        switch (type) {
            case 'email':
                if (!validateEmail(value)) {
                    showFieldError(field, 'Formato de email inválido');
                    return false;
                }
                break;
                
            case 'tel':
                const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
                if (!phoneRegex.test(value)) {
                    showFieldError(field, 'Formato de teléfono inválido');
                    return false;
                }
                break;
                
            case 'url':
                try {
                    new URL(value);
                } catch {
                    showFieldError(field, 'URL inválida');
                    return false;
                }
                break;
        }
        
        // Custom validation attributes
        const minLength = field.getAttribute('minlength');
        if (minLength && value.length < parseInt(minLength)) {
            showFieldError(field, `Mínimo ${minLength} caracteres`);
            return false;
        }
        
        const maxLength = field.getAttribute('maxlength');
        if (maxLength && value.length > parseInt(maxLength)) {
            showFieldError(field, `Máximo ${maxLength} caracteres`);
            return false;
        }
        
        const pattern = field.getAttribute('pattern');
        if (pattern && !new RegExp(pattern).test(value)) {
            const title = field.getAttribute('title') || 'Formato inválido';
            showFieldError(field, title);
            return false;
        }
        
        // RUT validation
        if (field.classList.contains('rut-field') || field.dataset.validate === 'rut') {
            if (!validateRUT(value)) {
                showFieldError(field, 'RUT inválido');
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Show field error
 */
function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    formGroup.classList.add('error');
    
    // Remove existing error message
    const existingError = formGroup.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
}

/**
 * Clear field error
 */
function clearFieldError(field) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    formGroup.classList.remove('error');
    
    const errorElement = formGroup.querySelector('.form-error');
    if (errorElement) {
        errorElement.remove();
    }
}

/**
 * Validate entire form
 */
function validateForm(form) {
    const fields = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    fields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * Initialize form validation
 */
function initializeFormValidation() {
    document.addEventListener('blur', (e) => {
        if (e.target.matches('input, select, textarea')) {
            validateField(e.target);
        }
    }, true);
    
    document.addEventListener('input', (e) => {
        if (e.target.matches('input, textarea')) {
            // Clear error on input (real-time feedback)
            clearFieldError(e.target);
            
            // Auto-format RUT fields
            if (e.target.classList.contains('rut-field')) {
                e.target.value = formatRUT(e.target.value);
            }
        }
    });
    
    debugLog('Form validation initialized');
}

/* ========================================
   Table Management
======================================== */

/**
 * Create table from data
 */
function createTable(container, data, columns, options = {}) {
    if (!container || !data || !columns) return false;
    
    const defaultOptions = {
        sortable: true,
        searchable: true,
        pagination: true,
        pageSize: 10,
        className: 'table',
        emptyMessage: 'No hay datos disponibles'
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Clear container
    container.innerHTML = '';
    
    // Create table structure
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    // Add search if enabled
    if (config.searchable) {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'table-search';
        searchContainer.innerHTML = `
            <input type="text" placeholder="Buscar..." class="table-search-input">
        `;
        tableContainer.appendChild(searchContainer);
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = config.className;
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.title;
        
        if (config.sortable && column.sortable !== false) {
            th.classList.add('sortable');
            th.dataset.column = column.field;
            th.innerHTML += ' <i class="fas fa-sort"></i>';
        }
        
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    
    tableContainer.appendChild(table);
    
    // Add pagination if enabled
    if (config.pagination) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'table-pagination';
        tableContainer.appendChild(paginationContainer);
    }
    
    container.appendChild(tableContainer);
    
    // Populate table
    updateTable(container, data, columns, config);
    
    // Set up event handlers
    setupTableEvents(container, data, columns, config);
    
    return true;
}

/**
 * Update table data
 */
function updateTable(container, data, columns, config) {
    const tbody = container.querySelector('tbody');
    if (!tbody) return false;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Handle empty data
    if (!data || data.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = columns.length;
        emptyCell.textContent = config.emptyMessage;
        emptyCell.style.textAlign = 'center';
        emptyCell.style.padding = '2rem';
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return false;
    }
    
    // Create rows
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;
        
        columns.forEach(column => {
            const cell = document.createElement('td');
            
            if (column.render) {
                // Custom render function
                if (typeof column.render === 'function') {
                    cell.innerHTML = column.render(item[column.field], item, index);
                } else {
                    cell.innerHTML = column.render;
                }
            } else {
                // Default render
                const value = getNestedValue(item, column.field);
                cell.textContent = value || '';
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    return true;
}

/**
 * Get nested object value
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
}

/**
 * Set up table event handlers
 */
function setupTableEvents(container, data, columns, config) {
    // Search functionality
    if (config.searchable) {
        const searchInput = container.querySelector('.table-search-input');
        if (searchInput) {
            const debouncedSearch = debounce((searchTerm) => {
                const filteredData = filterTableData(data, columns, searchTerm);
                updateTable(container, filteredData, columns, config);
            }, 300);
            
            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }
    }
    
    // Sort functionality
    if (config.sortable) {
        const sortableHeaders = container.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                const currentSort = header.dataset.sort || 'none';
                
                // Reset other headers
                sortableHeaders.forEach(h => {
                    if (h !== header) {
                        h.dataset.sort = 'none';
                        h.querySelector('i').className = 'fas fa-sort';
                    }
                });
                
                // Toggle current header
                let newSort;
                if (currentSort === 'none' || currentSort === 'desc') {
                    newSort = 'asc';
                    header.querySelector('i').className = 'fas fa-sort-up';
                } else {
                    newSort = 'desc';
                    header.querySelector('i').className = 'fas fa-sort-down';
                }
                
                header.dataset.sort = newSort;
                
                // Sort data
                const sortedData = sortTableData(data, column, newSort);
                updateTable(container, sortedData, columns, config);
            });
        });
    }
}

/**
 * Filter table data
 */
function filterTableData(data, columns, searchTerm) {
    if (!searchTerm) return data;
    
    const term = searchTerm.toLowerCase();
    
    return data.filter(item => {
        return columns.some(column => {
            const value = getNestedValue(item, column.field);
            return value && value.toString().toLowerCase().includes(term);
        });
    });
}

/**
 * Sort table data
 */
function sortTableData(data, field, direction) {
    return [...data].sort((a, b) => {
        const aValue = getNestedValue(a, field);
        const bValue = getNestedValue(b, field);
        
        if (aValue === bValue) return 0;
        
        let result;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            result = aValue - bValue;
        } else {
            result = String(aValue).localeCompare(String(bValue));
        }
        
        return direction === 'asc' ? result : -result;
    });
}

/* ========================================
   Status Badge Helpers
======================================== */

/**
 * Create status badge
 */
function createStatusBadge(status, labels = {}) {
    const defaultLabels = {
        pending: 'Pendiente',
        approved: 'Aprobada',
        rejected: 'Rechazada',
        active: 'Activo',
        suspended: 'Suspendido'
    };
    
    const allLabels = { ...defaultLabels, ...labels };
    const label = allLabels[status] || status;
    
    return `<span class="status-badge status-${status}">${label}</span>`;
}

/**
 * Create role tag
 */
function createRoleTag(role, labels = {}) {
    const defaultLabels = {
        admin: 'Administrador',
        professor: 'Profesor',
        student: 'Estudiante',
        researcher: 'Investigador',
        reviewer: 'Revisor'
    };
    
    const allLabels = { ...defaultLabels, ...labels };
    const label = allLabels[role] || role;
    
    return `<span class="tag">${label}</span>`;
}

/* ========================================
   Component Initialization
======================================== */

/**
 * Initialize all components
 */
function initializeComponents() {
    debugLog('Initializing components...');
    
    try {
        initializeModals();
        initializeFormValidation();
        
        // Set up global component events
        EventEmitter.on('error', (error) => {
            showErrorToast(handleError(error.error, error.context));
        });
        
        debugLog('Components initialized successfully');
        
    } catch (error) {
        console.error('Error initializing components:', error);
    }
}

/* ========================================
   Public API Export
======================================== */

// Make functions available globally
window.ComponentManager = ComponentManager;
window.showToast = showToast;
window.closeToast = closeToast;
window.closeAllToasts = closeAllToasts;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;
window.showModal = showModal;
window.hideModal = hideModal;
window.hideAllModals = hideAllModals;
window.showConfirmModal = showConfirmModal;
window.serializeForm = serializeForm;
window.populateForm = populateForm;
window.validateField = validateField;
window.validateForm = validateForm;
window.showFieldError = showFieldError;
window.clearFieldError = clearFieldError;
window.createTable = createTable;
window.updateTable = updateTable;
window.createStatusBadge = createStatusBadge;
window.createRoleTag = createRoleTag;
window.initializeComponents = initializeComponents;

// Auto-initialize when layout is ready
EventEmitter.on('layoutReady', initializeComponents);

// Initialize immediately if layout is already ready
if (window.LayoutManager) {
    document.addEventListener('DOMContentLoaded', initializeComponents);
}