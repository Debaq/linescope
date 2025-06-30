// Portal Público - JavaScript
class PortalPublic {
    constructor() {
        this.profesores = [];
        this.filteredProfesores = [];
        this.currentTheme = localStorage.getItem('theme') || 'light';

        this.init();
    }

    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.loadProfiles();
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

        // Filtros
        const areaFilter = document.getElementById('areaFilter');
        const searchInput = document.getElementById('searchInput');
        const semestreFilter = document.getElementById('semestreFilter');
        const humanosFilter = document.getElementById('humanosFilter');

        if (areaFilter) areaFilter.addEventListener('change', () => this.filterProfiles());
        if (searchInput) searchInput.addEventListener('input', () => this.filterProfiles());
        if (semestreFilter) semestreFilter.addEventListener('change', () => this.filterProfiles());
        if (humanosFilter) humanosFilter.addEventListener('change', () => this.filterProfiles());

        // Botones de acción
        const retryBtn = document.getElementById('retryBtn');
        const clearFilters = document.getElementById('clearFilters');

        if (retryBtn) retryBtn.addEventListener('click', () => this.loadProfiles());
        if (clearFilters) clearFilters.addEventListener('click', () => this.clearAllFilters());
    }

    // Carga de perfiles desde la API
    async loadProfiles() {
        this.showLoading();

        try {
            const response = await fetch('/api/profiles');

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.profesores = data.data || [];
                this.filteredProfesores = [...this.profesores];
                this.renderProfiles();
                this.hideLoading();
            } else {
                throw new Error(data.error || 'Error al cargar perfiles');
            }

        } catch (error) {
            console.error('Error cargando perfiles:', error);
            this.showError(error.message);
        }
    }

    // Estados de UI
    showLoading() {
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profilesContainer').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'flex';
        document.getElementById('profilesContainer').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';

        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }

    showNoResults() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profilesContainer').style.display = 'none';
        document.getElementById('noResults').style.display = 'flex';
    }

    showProfiles() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profilesContainer').style.display = 'grid';
        document.getElementById('noResults').style.display = 'none';
    }

    // Utilidades
    getAreaName(area) {
        const areas = {
            'oftalmologia-optometria': 'Oftalmología y Optometría',
            'otorrinolaringologia': 'Otorrinolaringología',
            'otra': 'Otra área'
        };
        return areas[area] || area;
    }

    getSemestreName(semestre) {
        const semestres = {
            'primer': 'Primer semestre',
            'segundo': 'Segundo semestre',
            'indistinto': 'Indistinto'
        };
        return semestres[semestre] || semestre;
    }

    // Filtrado de perfiles
    filterProfiles() {
        const areaFilter = document.getElementById('areaFilter')?.value || '';
        const searchFilter = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const semestreFilter = document.getElementById('semestreFilter')?.value || '';
        const humanosFilter = document.getElementById('humanosFilter')?.value || '';

        this.filteredProfesores = this.profesores.filter(profesor => {
            // Filtro por área
            const matchArea = !areaFilter || profesor.personal_info?.area === areaFilter;

            // Filtro por búsqueda de nombre
            const matchSearch = !searchFilter ||
            profesor.personal_info?.nombre.toLowerCase().includes(searchFilter);

            // Filtro por semestre
            const matchSemestre = !semestreFilter ||
            profesor.timing?.semestre_requerido === semestreFilter;

            // Filtro por involucra humanos
            const matchHumanos = !humanosFilter ||
            profesor.ethics?.involucra_humanos?.toString() === humanosFilter;

            return matchArea && matchSearch && matchSemestre && matchHumanos;
        });

        this.renderProfiles();
    }

    clearAllFilters() {
        document.getElementById('areaFilter').value = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('semestreFilter').value = '';
        document.getElementById('humanosFilter').value = '';

        this.filteredProfesores = [...this.profesores];
        this.renderProfiles();
    }

    // Renderizado
    renderProfiles() {
        if (this.filteredProfesores.length === 0) {
            this.showNoResults();
            return;
        }

        this.showProfiles();
        const container = document.getElementById('profilesContainer');
        container.innerHTML = this.filteredProfesores.map(profesor => this.createProfileCard(profesor)).join('');
    }

    createProfileCard(profesor) {
        const personalInfo = profesor.personal_info || {};
        const researchLines = profesor.research_lines || {};
        const currentWork = profesor.current_work || {};
        const thesisProjections = profesor.thesis_projections || {};
        const timing = profesor.timing || {};
        const ethics = profesor.ethics || {};
        const thesisProposals = profesor.thesis_proposals || [];
        const background = profesor.background || {};
        const previousThesis = profesor.previous_thesis || [];
        const multimedia = profesor.multimedia || {};
        const videos = multimedia.videos || [];

        return `
        <div class="profile-card">
        <div class="profile-header">
        <div class="profile-name">${personalInfo.nombre || 'Nombre no disponible'}</div>
        <div class="profile-area">${this.getAreaName(personalInfo.area)}</div>
        </div>
        <div class="profile-body">
        ${researchLines.linea_principal ? `
            <div class="section">
            <div class="section-title">Línea Principal</div>
            <div class="section-content">${researchLines.linea_principal}</div>
            ${researchLines.lineas_secundarias?.length > 0 ? `
                <div class="tags">
                ${researchLines.lineas_secundarias.map(linea => `<span class="tag">${linea}</span>`).join('')}
                </div>
                ` : ''}
                </div>
                ` : ''}

                ${currentWork.proyectos ? `
                    <div class="section">
                    <div class="section-title">Trabajo Actual</div>
                    <div class="section-content">
                    <strong>Proyecto:</strong> ${currentWork.proyectos}<br>
                    ${currentWork.metodologia ? `<strong>Metodología:</strong> ${currentWork.metodologia}<br>` : ''}
                    ${currentWork.objetivos ? `<strong>Objetivos:</strong> ${currentWork.objetivos}` : ''}
                    </div>
                    </div>
                    ` : ''}

                    <div class="section">
                    <div class="section-title">Información para Tesis</div>
                    <div class="section-content">
                    ${timing.semestre_requerido ? `<strong>Semestre requerido:</strong> ${this.getSemestreName(timing.semestre_requerido)}<br>` : ''}
                    <strong>Involucra humanos:</strong> ${ethics.involucra_humanos ? 'Sí' : 'No'}<br>
                    ${thesisProjections.viabilidad ? `<strong>Viabilidad:</strong> ${thesisProjections.viabilidad}<br>` : ''}
                    ${timing.justificacion ? `<strong>Justificación:</strong> ${timing.justificacion}` : ''}
                    </div>
                    </div>

                    ${thesisProjections.desarrollo ? `
                        <div class="section">
                        <div class="section-title">Proyecciones de Tesis</div>
                        <div class="section-content">
                        ${thesisProjections.desarrollo}<br>
                        ${thesisProjections.recursos ? `<strong>Recursos:</strong> ${thesisProjections.recursos}` : ''}
                        </div>
                        </div>
                        ` : ''}

                        ${thesisProposals.length > 0 ? `
                            <div class="section">
                            <div class="section-title">Propuestas de Temas</div>
                            <div class="section-content">
                            <ul>
                            ${thesisProposals.map(tema => `<li>${tema}</li>`).join('')}
                            </ul>
                            </div>
                            </div>
                            ` : ''}

                            ${background.publicaciones?.length > 0 || background.colaboraciones?.length > 0 || background.financiamiento ? `
                                <div class="section">
                                <div class="section-title">Antecedentes</div>
                                <div class="section-content">
                                ${background.publicaciones?.length > 0 ? `
                                    <strong>Publicaciones:</strong><br>
                                    <ul>
                                    ${background.publicaciones.map(pub => `<li>${pub}</li>`).join('')}
                                    </ul>
                                    ` : ''}
                                    ${background.colaboraciones?.length > 0 ? `
                                        <strong>Colaboraciones:</strong> ${background.colaboraciones.join(', ')}<br>
                                        ` : ''}
                                        ${background.financiamiento ? `<strong>Financiamiento:</strong> ${background.financiamiento}` : ''}
                                        </div>
                                        </div>
                                        ` : ''}

                                        ${videos.length > 0 ? `
                                            <div class="videos-section">
                                            <div class="section-title">Videos Explicativos</div>
                                            ${videos.map(video => `
                                                <div class="video-item">
                                                <div>
                                                <strong>${video.titulo}</strong><br>
                                                <small>Duración: ${video.duracion}</small>
                                                </div>
                                                <button class="btn" onclick="window.open('${video.url}', '_blank')">Ver</button>
                                                </div>
                                                `).join('')}
                                                </div>
                                                ` : ''}

                                                ${previousThesis.length > 0 ? `
                                                    <div class="tesis-section">
                                                    <div class="section-title">Tesis Previas</div>
                                                    ${previousThesis.map(tesis => `
                                                        <div class="tesis-item">
                                                        <div>
                                                        <strong>${tesis.titulo}</strong><br>
                                                        <small>${tesis.estudiante} (${tesis.año})</small>
                                                        </div>
                                                        ${tesis.disponible ? `
                                                            <button class="btn btn-download" onclick="window.open('downloads/${tesis.titulo.toLowerCase().replace(/\s+/g, '_')}_${tesis.año}.pdf', '_blank')">Descargar</button>
                                                            ` : `
                                                            <span class="btn" style="opacity: 0.5; cursor: not-allowed;">No disponible</span>
                                                            `}
                                                            </div>
                                                            `).join('')}
                                                            </div>
                                                            ` : ''}
                                                            </div>
                                                            <div class="contact-info">
                                                            📧 ${personalInfo.email || 'Email no disponible'}
                                                            </div>
                                                            </div>
                                                            `;
    }

    // Manejo de videos externos
    openVideo(url) {
        window.open(url, '_blank');
    }

    // Manejo de descargas
    downloadFile(filename) {
        window.open(`downloads/${filename}`, '_blank');
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PortalPublic();
});

// Exportar para uso global si es necesario
window.PortalPublic = PortalPublic;
