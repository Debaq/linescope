// dashboard-layout.js - Sidebar, Header, Navegación y Gestión de Layout

/* ========================================
   Layout State Management
======================================== */
const LayoutManager = {
    // Layout state
    sidebarCollapsed: false,
    currentSection: 'dashboard',
    currentTheme: 'light',
    
    // Mobile state
    isMobile: false,
    sidebarVisible: false,
    
    // Navigation history
    navigationHistory: [],
    maxHistoryLength: 10,
    
    // Theme configuration
    themes: {
        light: {
            name: 'Claro',
            icon: 'fas fa-sun',
            class: 'light'
        },
        dark: {
            name: 'Oscuro',
            icon: 'fas fa-moon',
            class: 'dark'
        }
    },
    
    // Section configuration
    sections: {
        dashboard: {
            title: 'Dashboard',
            icon: 'fas fa-chart-pie',
            breadcrumb: ['Inicio', 'Dashboard']
        },
        requests: {
            title: 'Gestión de Solicitudes',
            icon: 'fas fa-user-clock',
            breadcrumb: ['Inicio', 'Solicitudes']
        },
        users: {
            title: 'Gestión de Usuarios',
            icon: 'fas fa-users',
            breadcrumb: ['Inicio', 'Usuarios']
        },
        messages: {
            title: 'Centro de Mensajes',
            icon: 'fas fa-envelope',
            breadcrumb: ['Inicio', 'Mensajes']
        },
        'research-areas': {
            title: 'Áreas de Investigación',
            icon: 'fas fa-microscope',
            breadcrumb: ['Inicio', 'Áreas de Investigación']
        },
        careers: {
            title: 'Gestión de Carreras',
            icon: 'fas fa-graduation-cap',
            breadcrumb: ['Inicio', 'Carreras']
        },
        config: {
            title: 'Configuración del Sistema',
            icon: 'fas fa-cogs',
            breadcrumb: ['Inicio', 'Configuración']
        }
    }
};

/* ========================================
   User Interface Updates
======================================== */

/**
 * Update user information in the interface
 */
function updateUserInterface(user = DashboardCore.currentUser) {
    if (!user) return;
    
    debugLog('Updating user interface for:', user.email);
    
    // Update admin profile section
    const adminName = document.getElementById('adminName');
    const adminEmail = document.getElementById('adminEmail');
    
    if (adminName) {
        adminName.textContent = user.name || user.email.split('@')[0];
    }
    
    if (adminEmail) {
        adminEmail.textContent = user.email;
    }
    
    // Update user avatar if exists
    const userAvatar = document.querySelector('.admin-avatar');
    if (userAvatar && user.avatar) {
        userAvatar.style.backgroundImage = `url(${user.avatar})`;
    }
    
    // Update role-specific elements
    updateRoleSpecificUI(user.role);
    
    // Emit event for other components
    EventEmitter.emit('userInterfaceUpdated', user);
}

/**
 * Update interface based on user role
 */
function updateRoleSpecificUI(role) {
    const body = document.body;
    
    // Remove existing role classes
    body.classList.remove('admin-dashboard', 'professor-dashboard', 'student-dashboard');
    
    // Add appropriate role class
    switch (role) {
        case 'admin':
            body.classList.add('admin-dashboard');
            break;
        case 'professor':
            body.classList.add('professor-dashboard');
            break;
        case 'student':
            body.classList.add('student-dashboard');
            break;
    }
    
    // Show/hide role-specific menu items
    updateMenuVisibility(role);
}

/**
 * Update menu visibility based on role
 */
function updateMenuVisibility(role) {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        const section = item.dataset.section;
        const allowedRoles = item.dataset.roles?.split(',') || ['admin', 'professor', 'student'];
        
        if (allowedRoles.includes(role)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

/* ========================================
   Sidebar Management
======================================== */

/**
 * Toggle sidebar collapsed state
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar) return;
    
    LayoutManager.sidebarCollapsed = !LayoutManager.sidebarCollapsed;
    
    if (LayoutManager.sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
    }
    
    // Save state
    Storage.set('sidebarCollapsed', LayoutManager.sidebarCollapsed);
    
    // Emit event
    EventEmitter.emit('sidebarToggled', LayoutManager.sidebarCollapsed);
    
    debugLog('Sidebar toggled:', LayoutManager.sidebarCollapsed ? 'collapsed' : 'expanded');
}

/**
 * Show/hide sidebar on mobile
 */
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (!sidebar) return;
    
    LayoutManager.sidebarVisible = !LayoutManager.sidebarVisible;
    
    if (LayoutManager.sidebarVisible) {
        sidebar.classList.add('show');
        if (overlay) overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    debugLog('Mobile sidebar toggled:', LayoutManager.sidebarVisible ? 'visible' : 'hidden');
}

/**
 * Hide mobile sidebar
 */
function hideMobileSidebar() {
    if (LayoutManager.isMobile && LayoutManager.sidebarVisible) {
        toggleMobileSidebar();
    }
}

/**
 * Initialize sidebar state
 */
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    // Restore collapsed state
    const savedCollapsed = Storage.get('sidebarCollapsed', false);
    LayoutManager.sidebarCollapsed = savedCollapsed;
    
    if (savedCollapsed) {
        sidebar.classList.add('collapsed');
    }
    
    // Set up toggle button
    const toggleButton = document.getElementById('sidebarToggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            if (LayoutManager.isMobile) {
                toggleMobileSidebar();
            } else {
                toggleSidebar();
            }
        });
    }
    
    // Create mobile overlay if it doesn't exist
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', hideMobileSidebar);
        document.body.appendChild(overlay);
    }
    
    debugLog('Sidebar initialized');
}

/* ========================================
   Navigation Management
======================================== */

/**
 * Navigate to a section
 */
function navigateToSection(sectionName, addToHistory = true) {
    if (!LayoutManager.sections[sectionName]) {
        console.error('Unknown section:', sectionName);
        return false;
    }
    
    debugLog('Navigating to section:', sectionName);
    
    // Add to history
    if (addToHistory && LayoutManager.currentSection !== sectionName) {
        addToNavigationHistory(LayoutManager.currentSection);
    }
    
    // Update current section
    const previousSection = LayoutManager.currentSection;
    LayoutManager.currentSection = sectionName;
    
    // Update active menu item
    updateActiveMenuItem(sectionName);
    
    // Update content sections
    updateContentSections(sectionName);
    
    // Update page title and breadcrumb
    updatePageHeader(sectionName);
    
    // Hide mobile sidebar if shown
    hideMobileSidebar();
    
    // Emit navigation event
    EventEmitter.emit('navigationChanged', {
        from: previousSection,
        to: sectionName,
        section: LayoutManager.sections[sectionName]
    });
    
    // Update URL without page reload
    updateURL(sectionName);
    
    return true;
}

/**
 * Update active menu item
 */
function updateActiveMenuItem(sectionName) {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current section
    const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

/**
 * Update content sections visibility
 */
function updateContentSections(sectionName) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show current section
    const currentSection = document.getElementById(`${sectionName}-section`);
    if (currentSection) {
        currentSection.classList.add('active');
        
        // Add fade in animation
        currentSection.style.animation = 'fadeIn 0.3s ease-out';
        setTimeout(() => {
            currentSection.style.animation = '';
        }, 300);
    }
}

/**
 * Update page header (title and breadcrumb)
 */
function updatePageHeader(sectionName) {
    const section = LayoutManager.sections[sectionName];
    if (!section) return;
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = section.title;
    }
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb && section.breadcrumb) {
        breadcrumb.innerHTML = section.breadcrumb
            .map(crumb => `<span>${crumb}</span>`)
            .join('');
    }
    
    // Update document title
    document.title = `${section.title} - Portal UACH`;
}

/**
 * Update URL without page reload
 */
function updateURL(sectionName) {
    if (history.pushState) {
        const url = new URL(window.location);
        url.searchParams.set('section', sectionName);
        history.pushState({ section: sectionName }, '', url);
    }
}

/**
 * Add to navigation history
 */
function addToNavigationHistory(sectionName) {
    LayoutManager.navigationHistory.push({
        section: sectionName,
        timestamp: Date.now()
    });
    
    // Limit history length
    if (LayoutManager.navigationHistory.length > LayoutManager.maxHistoryLength) {
        LayoutManager.navigationHistory.shift();
    }
}

/**
 * Go back to previous section
 */
function goBack() {
    if (LayoutManager.navigationHistory.length > 0) {
        const previousNav = LayoutManager.navigationHistory.pop();
        navigateToSection(previousNav.section, false);
        return true;
    }
    return false;
}

/**
 * Initialize navigation
 */
function initializeNavigation() {
    // Set up menu item click handlers
    document.querySelectorAll('.menu-item').forEach(item => {
        const link = item.querySelector('.menu-link');
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionName = item.dataset.section;
                if (sectionName) {
                    navigateToSection(sectionName);
                }
            });
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.section) {
            navigateToSection(event.state.section, false);
        }
    });
    
    // Initialize from URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialSection = urlParams.get('section') || 'dashboard';
    navigateToSection(initialSection, false);
    
    debugLog('Navigation initialized');
}

/* ========================================
   Theme Management
======================================== */

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const newTheme = LayoutManager.currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

/**
 * Set specific theme
 */
function setTheme(themeName) {
    if (!LayoutManager.themes[themeName]) {
        console.error('Unknown theme:', themeName);
        return false;
    }
    
    const previousTheme = LayoutManager.currentTheme;
    LayoutManager.currentTheme = themeName;
    
    // Update document attribute
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Update theme toggle button
    updateThemeToggleButton(themeName);
    
    // Save preference
    Storage.set('theme', themeName);
    
    // Emit theme change event
    EventEmitter.emit('themeChanged', {
        from: previousTheme,
        to: themeName,
        theme: LayoutManager.themes[themeName]
    });
    
    debugLog('Theme changed to:', themeName);
    return true;
}

/**
 * Update theme toggle button
 */
function updateThemeToggleButton(themeName) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const theme = LayoutManager.themes[themeName];
    const icon = themeName === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    themeToggle.innerHTML = `<i class="${icon}"></i>`;
    themeToggle.title = `Cambiar a tema ${themeName === 'dark' ? 'claro' : 'oscuro'}`;
}

/**
 * Initialize theme
 */
function initializeTheme() {
    // Get saved theme or detect system preference
    const savedTheme = Storage.get('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    
    setTheme(initialTheme);
    
    // Set up theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!Storage.exists('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
    
    debugLog('Theme initialized:', initialTheme);
}

/* ========================================
   Responsive Management
======================================== */

/**
 * Check if device is mobile
 */
function checkIfMobile() {
    return window.innerWidth <= 1024;
}

/**
 * Handle responsive changes
 */
function handleResponsiveChange() {
    const wasMobile = LayoutManager.isMobile;
    LayoutManager.isMobile = checkIfMobile();
    
    if (wasMobile !== LayoutManager.isMobile) {
        debugLog('Responsive state changed:', LayoutManager.isMobile ? 'mobile' : 'desktop');
        
        if (!LayoutManager.isMobile) {
            // Switched to desktop - hide mobile sidebar
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            
            if (sidebar) sidebar.classList.remove('show');
            if (overlay) overlay.classList.remove('show');
            document.body.style.overflow = '';
            
            LayoutManager.sidebarVisible = false;
        }
        
        // Emit responsive change event
        EventEmitter.emit('responsiveChanged', {
            isMobile: LayoutManager.isMobile,
            wasMobile: wasMobile
        });
    }
}

/**
 * Initialize responsive behavior
 */
function initializeResponsive() {
    LayoutManager.isMobile = checkIfMobile();
    
    // Set up resize handler with debounce
    const debouncedResize = debounce(handleResponsiveChange, 250);
    window.addEventListener('resize', debouncedResize);
    
    // Set up orientation change handler
    window.addEventListener('orientationchange', () => {
        setTimeout(handleResponsiveChange, 100);
    });
    
    debugLog('Responsive management initialized');
}

/* ========================================
   Header Management
======================================== */

/**
 * Update header actions
 */
function updateHeaderActions() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    
    // Update notification count
    updateNotificationCount();
    
    // Update any role-specific header elements
    EventEmitter.emit('headerActionsUpdated');
}

/**
 * Update notification count
 */
function updateNotificationCount(count = 0) {
    const notificationCount = document.getElementById('notificationCount');
    if (notificationCount) {
        notificationCount.textContent = count;
        notificationCount.style.display = count > 0 ? '' : 'none';
    }
}

/**
 * Initialize header
 */
function initializeHeader() {
    // Set up notification dropdown
    const notificationBtn = document.querySelector('.notification-btn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
                notificationDropdown.classList.remove('show');
            }
        });
    }
    
    debugLog('Header initialized');
}

/* ========================================
   Loading Management
======================================== */

/**
 * Show loading overlay
 */
function showLoading(message = 'Cargando...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        const loadingText = loadingOverlay.querySelector('.loading-spinner span');
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingOverlay.classList.add('show');
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

/**
 * Show loading for a specific element
 */
function showElementLoading(element, message = 'Cargando...') {
    if (!element) return;
    
    const loader = document.createElement('div');
    loader.className = 'element-loader';
    loader.innerHTML = `
        <div class="element-loader-content">
            <i class="fas fa-spinner fa-spin"></i>
            <span>${message}</span>
        </div>
    `;
    
    element.style.position = 'relative';
    element.appendChild(loader);
}

/**
 * Hide loading for a specific element
 */
function hideElementLoading(element) {
    if (!element) return;
    
    const loader = element.querySelector('.element-loader');
    if (loader) {
        loader.remove();
    }
}

/* ========================================
   Keyboard Shortcuts
======================================== */

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
    // Escape key closes modals and dropdowns
    if (event.key === 'Escape') {
        // Close modals
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
        
        // Close dropdowns
        document.querySelectorAll('.notification-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
        
        // Hide mobile sidebar
        hideMobileSidebar();
    }
    
    // Ctrl/Cmd + shortcuts
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 'k':
                event.preventDefault();
                // Focus search (if exists)
                const searchInput = document.querySelector('input[type="search"], input[placeholder*="buscar"], input[placeholder*="Buscar"]');
                if (searchInput) {
                    searchInput.focus();
                }
                break;
                
            case 'm':
                event.preventDefault();
                toggleMobileSidebar();
                break;
                
            case 'd':
                event.preventDefault();
                toggleTheme();
                break;
                
            case 'h':
                event.preventDefault();
                navigateToSection('dashboard');
                break;
        }
    }
    
    // Number keys for quick navigation (without modifiers)
    if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        const sections = Object.keys(LayoutManager.sections);
        const keyNum = parseInt(event.key);
        
        if (keyNum >= 1 && keyNum <= sections.length) {
            event.preventDefault();
            navigateToSection(sections[keyNum - 1]);
        }
    }
}

/**
 * Initialize keyboard shortcuts
 */
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    debugLog('Keyboard shortcuts initialized');
}

/* ========================================
   Authentication Check
======================================== */

/**
 * Check authentication status
 */
async function checkAuthentication() {
    const token = getAuthToken();
    if (!token) {
        redirectToLogin();
        return false;
    }
    
    try {
        showLoading('Verificando sesión...');
        const response = await apiRequest('/auth.php/verify');
        
        if (response.success && response.data.user) {
            DashboardCore.currentUser = response.data.user;
            DashboardCore.isAuthenticated = true;
            updateUserInterface();
            return true;
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
    } finally {
        hideLoading();
    }
    
    redirectToLogin();
    return false;
}

/* ========================================
   Layout Initialization
======================================== */

/**
 * Initialize all layout components
 */
async function initializeLayout() {
    debugLog('Initializing layout...');
    
    try {
        // Check authentication first
        const isAuth = await checkAuthentication();
        if (!isAuth) return;
        
        // Initialize layout components
        initializeSidebar();
        initializeNavigation();
        initializeTheme();
        initializeResponsive();
        initializeHeader();
        initializeKeyboardShortcuts();
        
        // Update header actions
        updateHeaderActions();
        
        // Emit layout ready event
        EventEmitter.emit('layoutReady');
        
        debugLog('Layout initialized successfully');
        
    } catch (error) {
        console.error('Error initializing layout:', error);
        handleError(error, 'Layout Initialization');
    }
}

/* ========================================
   Public API Export
======================================== */

// Make functions available globally
window.LayoutManager = LayoutManager;
window.updateUserInterface = updateUserInterface;
window.updateRoleSpecificUI = updateRoleSpecificUI;
window.toggleSidebar = toggleSidebar;
window.toggleMobileSidebar = toggleMobileSidebar;
window.hideMobileSidebar = hideMobileSidebar;
window.navigateToSection = navigateToSection;
window.goBack = goBack;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showElementLoading = showElementLoading;
window.hideElementLoading = hideElementLoading;
window.updateNotificationCount = updateNotificationCount;
window.checkAuthentication = checkAuthentication;
window.initializeLayout = initializeLayout;

// Auto-initialize when core is ready
EventEmitter.on('coreReady', initializeLayout);

// Initialize immediately if core is already ready
if (window.DashboardCore) {
    document.addEventListener('DOMContentLoaded', initializeLayout);
}