/**
 * LLBwithMe Question Bank - Main Application
 * Version 3.0.0
 * A comprehensive law exam question bank platform
 */

// ============================================
// Global State & Configuration
// ============================================

const App = {
  // Application State
  state: {
    currentPage: 'home',
    currentSemester: 'sem1',
    currentModule: null,
    currentModuleSubject: '',
    semesters: [],
    subjects: [],
    allSubjects: [],       // FIX: store all subjects across all semesters
    modules: {},
    questions: [],
    allQuestions: [],      // FIX: store all questions across all semesters
    filteredQuestions: [],
    bookmarks: new Set(),
    studied: new Set(),
    filters: {
      semester: '',   // NEW: questions-page semester filter (independent of home selector)
      subject: '',
      module: '',
      marks: '',
      difficulty: '',
      type: '',
      status: ''
    },
    searchQuery: '',
    pagination: {
      page: 1,
      perPage: 20,
      total: 0
    },
    isAdminLoggedIn: false,
    charts: {}
  },

  // Configuration
  config: {
    adminPassword: 'llbadmin2025',
    storageKeys: {
      bookmarks: 'llb_bookmarks',
      studied: 'llb_studied',
      theme: 'llb_theme',
      progress: 'llb_progress'
    }
  },

  // ============================================
  // Initialization
  // ============================================

  async init() {
    console.log('🎓 LLBwithMe Question Bank initializing...');
    
    // Load saved data
    this.loadFromStorage();
    
    // Initialize theme
    this.initTheme();
    
    // Load data
    await this.loadData();
    
    // Set default semester to the first active one
    const firstActive = this.state.semesters.find(s => s.active);
    if (firstActive) {
      this.state.currentSemester = firstActive.id;
    }

    // Filter subjects/questions for default semester
    this.applyCurrentSemester();
    
    // Render initial UI
    this.renderSemesterTabs();
    this.renderSubjectsGrid();
    this.renderStatistics();
    this.renderRoadmap();
    this.renderCharts();
    this.populateFilters();
    this.updateProgressStats();
    this.updateHeroStats();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('✅ LLBwithMe initialized successfully!');
  },

  // ============================================
  // Data Loading
  // ============================================

  async loadData() {
    try {
      // ── Single source of truth: curriculum.json ──────────────────────────
      // Supports both file:// (local) and http:// (server/Vercel) protocols.
      const cacheBuster = Date.now();
      const isFileProtocol = location.protocol === 'file:';

      // Resolve base path so relative fetches work whether index.html is in
      // the root or opened from any directory depth on file://
      const basePath = isFileProtocol
        ? location.href.substring(0, location.href.lastIndexOf('/') + 1)
        : '';

      const fetchData = (path) =>
        fetch(isFileProtocol ? `${basePath}${path}` : `${path}?v=${cacheBuster}`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`); return r.json(); });

      const curriculum = await fetchData('data/curriculum.json');

      // ── Populate semesters ───────────────────────────────────────────────
      // Map the nested curriculum shape back to the flat arrays the rest of
      // the app already expects, so zero other code needs to change.
      this.state.semesters = curriculum.semesters.map(sem => ({
        id:          sem.id,
        name:        sem.name,
        displayName: sem.displayName,
        year:        sem.year,
        sequence:    sem.sequence,
        active:      sem.status === 'active',
        status:      sem.status,
        launchDate:  sem.launchDate,
        endDate:     sem.endDate,
        color:       sem.color,
        icon:        sem.icon,
        description: sem.description,
        stats:       sem.stats,
        // keep the flat subject-id list that applyCurrentSemester() uses
        subjects:    sem.subjects.map(s => s.id),
      }));

      // ── Populate allSubjects (flat list, same shape as old subjects.json) ─
      this.state.allSubjects = curriculum.semesters.flatMap(sem =>
        sem.subjects.map(s => ({
          id:            s.id,
          semesterId:    sem.id,
          semester:      sem.id,   // legacy field still used in applyCurrentSemester
          name:          s.name,
          shortName:     s.shortName,
          code:          s.code,
          color:         s.color,
          icon:          s.icon,
          questionCount: s.questionCount,
          description:   s.description,
          questionFile:  s.questionFile,
        }))
      );

      // ── Populate modules (keyed by subjectId, same shape as old loadModules) ─
      curriculum.semesters.forEach(sem => {
        sem.subjects.forEach(s => {
          if (s.modules && s.modules.length > 0) {
            this.state.modules[s.id] = s.modules;
          }
        });
      });
      console.log('📦 Modules loaded for:', Object.keys(this.state.modules));

      // ── Lazy-load question files (one per subject, unchanged) ────────────
      const allSubjectIds = this.state.allSubjects
        .filter(s => s.questionFile)   // skip subjects with no file yet (future sems)
        .map(s => s.id);

      const questionPromises = allSubjectIds.map(subjectId =>
        fetchData(`data/questions/${subjectId}.json`)
          .then(data => data.questions || [])
          .catch(err => {
            console.warn(`Could not load questions for ${subjectId}:`, err.message);
            return [];
          })
      );

      const questionsData = await Promise.all(questionPromises);
      this.state.allQuestions = questionsData.flat();

      console.log(`✅ Loaded ${this.state.allQuestions.length} total questions across ${allSubjectIds.length} subjects`);

    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Failed to load question data. Please refresh the page.', 'error');
    }
  },

  applyCurrentSemester() {
    const semId = this.state.currentSemester;
    const semester = this.state.semesters.find(s => s.id === semId);

    if (semester && semester.subjects && semester.subjects.length > 0) {
      // Filter subjects to only those belonging to this semester
      this.state.subjects = this.state.allSubjects.filter(s => semester.subjects.includes(s.id));
    } else {
      // Fallback: filter by semester field on subject object (both 'semester' and 'semesterId' supported)
      this.state.subjects = this.state.allSubjects.filter(s => (s.semester || s.semesterId) === semId);
    }

    // Filter questions to this semester
    this.state.questions = this.state.allQuestions.filter(q => q.semester === semId);
    this.state.filteredQuestions = [...this.state.questions];
    this.state.pagination.total = this.state.questions.length;
    this.state.pagination.page = 1;

    console.log(`📚 Semester ${semId}: ${this.state.subjects.length} subjects, ${this.state.questions.length} questions`);
  },


  // Show GLOBAL totals (all active semesters) in the landing-page hero
  updateHeroStats() {
    const activeSemesters = this.state.semesters.filter(s => s.active);
    const totalQ    = this.state.allQuestions.length;
    const totalS    = this.state.allSubjects.length;
    const totalSems = activeSemesters.length;
    const totalSessions = [...new Set(
      this.state.allQuestions.map(q => q.source).filter(Boolean)
    )].length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('heroTotalQuestions', totalQ.toLocaleString());
    set('heroTotalSubjects',  totalS);
    set('heroActiveSems',     totalSems);
    set('studiedCount',       this.state.studied.size);

    // Subject count label under section header
    const semSubjects = this.state.subjects.length;
    set('subjectCount', `${semSubjects} subject${semSubjects !== 1 ? 's' : ''}`);

    // Admin panel stats
    set('adminTotalQuestions', totalQ.toLocaleString());
    set('adminTotalSubjects',  totalS);
    set('adminActiveSems',     totalSems);
  },

  // loadModules() removed in v3.0.0 — modules are now embedded in curriculum.json
  // and populated directly inside loadData(). No separate fetch needed.

  // ============================================
  // Storage Management
  // ============================================

  loadFromStorage() {
    try {
      const savedBookmarks = localStorage.getItem(this.config.storageKeys.bookmarks);
      if (savedBookmarks) {
        this.state.bookmarks = new Set(JSON.parse(savedBookmarks));
      }

      const savedStudied = localStorage.getItem(this.config.storageKeys.studied);
      if (savedStudied) {
        this.state.studied = new Set(JSON.parse(savedStudied));
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem(
        this.config.storageKeys.bookmarks, 
        JSON.stringify([...this.state.bookmarks])
      );
      localStorage.setItem(
        this.config.storageKeys.studied, 
        JSON.stringify([...this.state.studied])
      );
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },

  // ============================================
  // Theme Management
  // ============================================

  initTheme() {
    const savedTheme = localStorage.getItem(this.config.storageKeys.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').checked = theme === 'dark';
    this.updateThemeIcon(theme);
  },

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(this.config.storageKeys.theme, newTheme);
    this.updateThemeIcon(newTheme);
    
    this.updateChartsTheme();
  },

  updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (theme === 'dark') {
      icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    } else {
      icon.innerHTML = `
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2"></path><path d="M12 20v2"></path>
        <path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path>
        <path d="M2 12h2"></path><path d="M20 12h2"></path>
        <path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>
      `;
    }
  },

  // ============================================
  // Navigation
  // ============================================

  navigate(page) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    
    let pageId = page;
    if (page === 'moduleDetail') pageId = 'ModuleDetail';
    
    const pageEl = document.getElementById(`page${pageId.charAt(0).toUpperCase() + pageId.slice(1)}`);
    if (pageEl) pageEl.classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page || (page === 'moduleDetail' && el.dataset.page === 'modules'));
    });
    
    this.state.currentPage = page;
    
    switch(page) {
      case 'questions':
        this.updateModuleFilter();
        this.renderQuestions();
        break;
      case 'bookmarks':
        this.renderBookmarks();
        break;
      case 'progress':
        this.renderProgressPage();
        break;
      case 'modules':
        this.renderModulesPage();
        break;
      case 'moduleDetail':
        this.renderModuleDetail();
        break;
    }
    
    window.scrollTo(0, 0);
  },

  // ============================================
  // Render Functions
  // ============================================

  renderSemesterTabs() {
    const container = document.getElementById('semesterTabs');
    if (!container) return;

    container.innerHTML = this.state.semesters.map(sem => {
      const isActive   = sem.active;   // true only for 'active' status
      const isSelected = sem.id === this.state.currentSemester;
      return `
        <button 
          class="semester-tab ${isActive ? (isSelected ? 'active selected' : 'active') : 'disabled'}"
          onclick="${isActive ? `App.selectSemester('${sem.id}')` : ''}"
          ${!isActive ? 'disabled' : ''}
          style="${isSelected ? `border-bottom: 3px solid ${sem.color || 'var(--color-primary)'}` : ''}"
        >
          <span class="semester-tab-name">${sem.name}</span>
          <span class="semester-tab-status">
            ${isActive ? (isSelected ? '● Active' : '✓ Available') : this.formatDate(sem.launchDate)}
          </span>
        </button>
      `;
    }).join('');
  },

  renderSubjectsGrid() {
    const container = document.getElementById('subjectsGrid');
    if (!container) return;

    // FIX: show subjects for current semester only
    const semesterSubjects = this.state.subjects;

    if (semesterSubjects.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-state-icon">📚</div>
          <h3 class="empty-state-title">No subjects yet</h3>
          <p class="empty-state-text">Content for this semester is coming soon.</p>
        </div>`;
      return;
    }

    container.innerHTML = semesterSubjects.map(subject => `
      <div 
        class="card subject-card" 
        style="--subject-color: ${subject.color}"
        onclick="App.filterBySubject('${subject.id}')"
      >
        <div class="card-body">
          <div class="subject-card-icon" style="background: ${subject.color}">
            ${this.getSubjectIcon(subject.id)}
          </div>
          <h3 class="subject-card-name">${subject.shortName || subject.name}</h3>
          <p class="subject-card-count">${subject.questionCount} questions</p>
          <div class="progress-bar" style="margin-top: var(--space-3); height: 4px;">
            <div class="progress-bar-fill" style="width: ${this.getSubjectProgress(subject.id)}%"></div>
          </div>
        </div>
      </div>
    `).join('');
  },

  renderStatistics() {
    const container = document.getElementById('statsGrid');
    if (!container) return;

    // FIX: compute stats dynamically from current semester questions
    const qs = this.state.questions;
    const total = qs.length;
    const by15 = qs.filter(q => q.marks === 15).length;
    const by10 = qs.filter(q => q.marks === 10).length;
    const by5  = qs.filter(q => q.marks === 5).length;

    const stats = [
      { value: total, label: 'Total Questions', icon: 'file-text' },
      { value: by15, label: '15-Mark Questions', icon: 'star', color: 'var(--color-marks-15)' },
      { value: by10, label: '10-Mark Questions', icon: 'star', color: 'var(--color-marks-10)' },
      { value: by5,  label: '5-Mark Questions',  icon: 'star', color: 'var(--color-marks-5)' }
    ];

    container.innerHTML = stats.map(stat => `
      <div class="card stat-card">
        <div class="stat-card-icon" ${stat.color ? `style="color: ${stat.color}"` : ''}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${this.getIconPath(stat.icon)}
          </svg>
        </div>
        <div class="stat-card-value">${stat.value}</div>
        <div class="stat-card-label">${stat.label}</div>
      </div>
    `).join('');

    document.getElementById('studiedCount').textContent = this.state.studied.size;
  },

  renderRoadmap() {
    const container = document.getElementById('roadmap');
    if (!container) return;

    container.innerHTML = this.state.semesters.map(sem => {
      const semSubjects  = this.state.allSubjects.filter(s =>
        sem.subjects?.includes(s.id) || (s.semester || s.semesterId) === sem.id
      );
      const semQuestions = this.state.allQuestions.filter(q => q.semester === sem.id);
      const isCurrent    = sem.id === this.state.currentSemester;
      const isActive     = sem.active;

      return `
        <div class="roadmap-item ${isActive ? 'active' : sem.status || ''} ${isCurrent ? 'current' : ''}">
          <div class="roadmap-marker"></div>
          <div class="roadmap-content">
            <div class="roadmap-title">
              ${sem.displayName}
              ${isCurrent ? '<span class="badge badge-active">Current</span>' : ''}
              ${isActive && !isCurrent ? '<span class="badge badge-active">Active</span>' : ''}
              ${sem.status === 'coming_soon' ? '<span class="badge badge-coming-soon">Coming Soon</span>' : ''}
              ${sem.status === 'planned' ? '<span class="badge badge-planned">Planned</span>' : ''}
            </div>
            <div class="roadmap-date">
              ${isActive
                ? `${semSubjects.length} subjects • ${semQuestions.length} questions`
                : `Launch: ${this.formatDate(sem.launchDate)}`}
            </div>
            ${sem.description ? `<p class="text-sm text-muted" style="margin-top: var(--space-2); margin-bottom: 0;">${sem.description}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  renderCharts() {
    this.renderSubjectChart();
    this.renderMarksChart();
  },

  renderSubjectChart() {
    const ctx = document.getElementById('subjectChart');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f5f5f5' : '#1a1a1a';

    if (this.state.charts.subject) this.state.charts.subject.destroy();

    // FIX: use current semester subjects only
    const subjects = this.state.subjects;

    this.state.charts.subject = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: subjects.map(s => s.shortName || s.name),
        datasets: [{
          data: subjects.map(s => s.questionCount),
          backgroundColor: subjects.map(s => s.color),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, padding: 12, usePointStyle: true, font: { size: 11 } }
          }
        }
      }
    });
  },

  renderMarksChart() {
    const ctx = document.getElementById('marksChart');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f5f5f5' : '#1a1a1a';
    const gridColor = isDark ? '#333' : '#e0e0e0';

    if (this.state.charts.marks) this.state.charts.marks.destroy();

    // FIX: compute dynamically from current semester questions
    const qs = this.state.questions;
    const by15 = qs.filter(q => q.marks === 15).length;
    const by10 = qs.filter(q => q.marks === 10).length;
    const by5  = qs.filter(q => q.marks === 5).length;

    this.state.charts.marks = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['15 Marks', '10 Marks', '5 Marks'],
        datasets: [{
          label: 'Questions',
          data: [by15, by10, by5],
          backgroundColor: ['#3498db', '#27ae60', '#f39c12'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
          x: { grid: { display: false }, ticks: { color: textColor } }
        }
      }
    });
  },

  updateChartsTheme() {
    this.renderSubjectChart();
    this.renderMarksChart();
  },

  // ============================================
  // Questions Rendering
  // ============================================

  renderQuestions() {
    const container = document.getElementById('questionList');
    if (!container) return;

    const start = (this.state.pagination.page - 1) * this.state.pagination.perPage;
    const end = start + this.state.pagination.perPage;
    const questionsToShow = this.state.filteredQuestions.slice(start, end);

    if (questionsToShow.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </div>
          <h3 class="empty-state-title">No Questions Found</h3>
          <p class="empty-state-text">Try adjusting your filters or search query.</p>
          <button class="btn btn-primary" onclick="App.clearFilters()">Clear Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = questionsToShow.map(q => this.renderQuestionCard(q)).join('');
    this.renderPagination();
  },

  renderQuestionCard(question) {
    const subject = this.state.allSubjects.find(s => s.id === question.subject);
    const isBookmarked = this.state.bookmarks.has(question.id);
    const isStudied = this.state.studied.has(question.id);

    return `
      <div class="card question-card" data-question-id="${question.id}">
        <div class="card-body">
          <div class="question-card-header">
            <div class="question-badges">
              <span class="badge badge-marks-${question.marks}">${question.marks} Marks</span>
              <span class="badge badge-${question.difficulty}">${this.capitalize(question.difficulty)}</span>
              <span class="badge badge-type">${this.formatType(question.type)}</span>
              <span class="badge badge-subject" style="background: ${subject?.color}15; color: ${subject?.color}">
                ${subject?.shortName || question.subject}
              </span>
              ${question.module ? `<span class="badge badge-module" title="${question.moduleName || ''}">M${question.moduleCode || question.module.replace('module_', '')}</span>` : ''}
            </div>
            <div class="flex gap-2">
              <button 
                class="btn btn-icon btn-sm btn-ghost bookmark-btn ${isBookmarked ? 'active' : ''}"
                onclick="App.toggleBookmark('${question.id}')"
                title="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <p class="question-text" id="text-${question.id}">${question.text}</p>
          
          <div class="question-meta">
            <span class="question-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              </svg>
              ${question.source || 'Exam Question'}
            </span>
            ${question.keywords ? `
              <span class="question-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2 2 7l10 5 10-5-10-5Z"></path>
                  <path d="m2 17 10 5 10-5"></path>
                  <path d="m2 12 10 5 10-5"></path>
                </svg>
                ${question.keywords.slice(0, 3).join(', ')}
              </span>
            ` : ''}
          </div>
          
          <div class="question-actions">
            <label class="checkbox">
              <input 
                type="checkbox" 
                class="checkbox-input" 
                ${isStudied ? 'checked' : ''}
                onchange="App.toggleStudied('${question.id}')"
              >
              <span class="checkbox-box"></span>
              <span class="checkbox-label">Mark as Studied</span>
            </label>
            
            <div class="flex gap-2" style="margin-left: auto;">
              <button class="btn btn-sm btn-ghost" onclick="App.copyQuestion('${question.id}')" title="Copy to clipboard">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
              <button class="btn btn-sm btn-ghost" onclick="App.showQuestionDetails('${question.id}')" title="View details">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Details
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(this.state.filteredQuestions.length / this.state.pagination.perPage);
    const currentPage = this.state.pagination.page;

    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }

    container.innerHTML = `
      <button class="pagination-btn" onclick="App.goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"></path></svg>
      </button>
      ${pages.map(p => p === '...' 
        ? '<span class="pagination-btn" style="cursor: default;">...</span>'
        : `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" onclick="App.goToPage(${p})">${p}</button>`
      ).join('')}
      <button class="pagination-btn" onclick="App.goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"></path></svg>
      </button>
    `;
  },

  goToPage(page) {
    const totalPages = Math.ceil(this.state.filteredQuestions.length / this.state.pagination.perPage);
    if (page < 1 || page > totalPages) return;
    this.state.pagination.page = page;
    this.renderQuestions();
    document.getElementById('questionList')?.scrollIntoView({ behavior: 'smooth' });
  },

  // ============================================
  // Filtering
  // ============================================

  populateFilters() {
    // Semester selector in questions page
    const semSelect = document.getElementById('filterSemester');
    if (semSelect) {
      const activeSems = this.state.semesters.filter(s => s.active);
      semSelect.innerHTML = `
        <option value="">All Semesters</option>
        ${activeSems.map(s => `<option value="${s.id}" ${s.id === this.state.currentSemester ? 'selected' : ''}>${s.name}</option>`).join('')}
      `;
    }
    this.updateSubjectFilterForSemester();
  },

  // Populate subject dropdown based on currently selected semester filter
  updateSubjectFilterForSemester() {
    const semFilter     = document.getElementById('filterSemester')?.value || '';
    const subjectSelect = document.getElementById('filterSubject');
    if (!subjectSelect) return;

    let subjectsToShow;
    if (semFilter) {
      const sem = this.state.semesters.find(s => s.id === semFilter);
      subjectsToShow = sem?.subjects?.length
        ? this.state.allSubjects.filter(s => sem.subjects.includes(s.id))
        : this.state.allSubjects.filter(s => (s.semester || s.semesterId) === semFilter);
    } else {
      // All active-semester subjects
      const activeSemIds = this.state.semesters.filter(s => s.active).map(s => s.id);
      subjectsToShow = this.state.allSubjects.filter(s => activeSemIds.includes(s.semester || s.semesterId));
    }

    const current = subjectSelect.value;
    subjectSelect.innerHTML = `
      <option value="">All Subjects</option>
      ${subjectsToShow.map(s => `<option value="${s.id}" ${s.id === current ? 'selected' : ''}>${s.name}</option>`).join('')}
    `;
    // clear subject if no longer in list
    if (current && !subjectsToShow.find(s => s.id === current)) {
      subjectSelect.value = '';
    }
  },

  applyFilters() {
    const filters = {
      semester: document.getElementById('filterSemester')?.value || '',
      subject: document.getElementById('filterSubject')?.value || '',
      module: document.getElementById('filterModule')?.value || '',
      marks: document.getElementById('filterMarks')?.value || '',
      difficulty: document.getElementById('filterDifficulty')?.value || '',
      type: document.getElementById('filterType')?.value || '',
      status: document.getElementById('filterStatus')?.value || ''
    };

    this.state.filters = filters;

    // Determine the pool: if a semester is chosen in the filter use allQuestions,
    // otherwise use the current semester's questions (state.questions)
    const pool = filters.semester
      ? this.state.allQuestions.filter(q => q.semester === filters.semester)
      : this.state.questions;   // already scoped to currentSemester

    this.state.filteredQuestions = pool.filter(q => {
      if (filters.subject && q.subject !== filters.subject) return false;
      if (filters.module && q.module !== filters.module) return false;
      if (filters.marks && q.marks !== parseInt(filters.marks)) return false;
      if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
      if (filters.type && q.type !== filters.type) return false;
      if (filters.status === 'studied' && !this.state.studied.has(q.id)) return false;
      if (filters.status === 'not-studied' && this.state.studied.has(q.id)) return false;
      if (filters.status === 'bookmarked' && !this.state.bookmarks.has(q.id)) return false;
      return true;
    });

    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      this.state.filteredQuestions = this.state.filteredQuestions.filter(q =>
        q.text.toLowerCase().includes(query) ||
        q.keywords?.some(k => k.toLowerCase().includes(query))
      );
    }

    this.state.pagination.page = 1;
    this.updateFilterUI();
    this.renderQuestions();
  },

  updateFilterUI() {
    const countEl = document.getElementById('filterResultCount');
    if (countEl) {
      countEl.textContent = `Showing ${this.state.filteredQuestions.length} question${this.state.filteredQuestions.length !== 1 ? 's' : ''}`;
    }

    const activeFiltersEl = document.getElementById('activeFilters');
    if (activeFiltersEl) {
      const activeFilters = [];
      if (this.state.filters.semester) {
        const sem = this.state.semesters.find(s => s.id === this.state.filters.semester);
        activeFilters.push({ key: 'semester', label: sem?.name || this.state.filters.semester });
      }
      if (this.state.filters.subject) {
        const subject = this.state.subjects.find(s => s.id === this.state.filters.subject);
        activeFilters.push({ key: 'subject', label: subject?.shortName || this.state.filters.subject });
      }
      if (this.state.filters.module) {
        const modules = this.state.modules[this.state.filters.subject];
        const module = modules?.find(m => m.id === this.state.filters.module);
        activeFilters.push({ key: 'module', label: `Module ${module?.code || ''}: ${module?.name?.slice(0, 20) || this.state.filters.module}...` });
      }
      if (this.state.filters.marks) activeFilters.push({ key: 'marks', label: `${this.state.filters.marks} Marks` });
      if (this.state.filters.difficulty) activeFilters.push({ key: 'difficulty', label: this.capitalize(this.state.filters.difficulty) });
      if (this.state.filters.type) activeFilters.push({ key: 'type', label: this.formatType(this.state.filters.type) });
      if (this.state.filters.status) activeFilters.push({ key: 'status', label: this.capitalize(this.state.filters.status) });
      if (this.state.searchQuery) activeFilters.push({ key: 'search', label: `Search: "${this.state.searchQuery}"` });

      activeFiltersEl.innerHTML = activeFilters.map(f => `
        <span class="active-filter">
          ${f.label}
          <button class="active-filter-remove" onclick="App.removeFilter('${f.key}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
            </svg>
          </button>
        </span>
      `).join('');
    }
  },

  removeFilter(key) {
    if (key === 'search') {
      this.state.searchQuery = '';
      document.getElementById('searchInput').value = '';
    } else {
      const selectEl = document.getElementById(`filter${this.capitalize(key)}`);
      if (selectEl) selectEl.value = '';
      if (key === 'semester') this.updateSubjectFilterForSemester();
    }
    this.applyFilters();
  },

  clearFilters() {
    ['filterSemester','filterSubject','filterModule','filterMarks','filterDifficulty','filterType','filterStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('searchInput').value = '';
    
    this.state.searchQuery = '';
    this.state.filters = { semester: '', subject: '', module: '', marks: '', difficulty: '', type: '', status: '' };
    this.updateSubjectFilterForSemester();
    this.state.filteredQuestions = [...this.state.questions];
    this.state.pagination.page = 1;
    
    this.updateModuleFilter();
    this.updateFilterUI();
    this.renderQuestions();
  },

  filterBySubject(subjectId) {
    document.getElementById('filterSubject').value = subjectId;
    this.navigate('questions');
    this.applyFilters();
  },

  // ============================================
  // Search
  // ============================================

  setupEventListeners() {
    document.getElementById('themeToggle')?.addEventListener('change', () => this.toggleTheme());
    
    // Semester filter in questions page
    document.getElementById('filterSemester')?.addEventListener('change', () => {
      this.updateSubjectFilterForSemester();
      // reset subject & module when semester changes
      const sf = document.getElementById('filterSubject'); if (sf) sf.value = '';
      const mf = document.getElementById('filterModule');  if (mf) mf.value = '';
      this.applyFilters();
    });

    document.getElementById('filterSubject')?.addEventListener('change', () => {
      this.updateModuleFilter();
      this.applyFilters();
    });
    
    document.getElementById('filterModule')?.addEventListener('change', () => this.applyFilters());
    
    ['filterMarks', 'filterDifficulty', 'filterType', 'filterStatus'].forEach(filterId => {
      document.getElementById(filterId)?.addEventListener('change', () => this.applyFilters());
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.handleSearch(e.target.value), 300);
      });
      searchInput.addEventListener('focus', () => {
        if (this.state.searchQuery) {
          document.getElementById('searchResults')?.classList.add('active');
        }
      });
    }

    document.getElementById('searchClear')?.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      this.state.searchQuery = '';
      document.getElementById('searchResults')?.classList.remove('active');
      this.applyFilters();
    });

    document.addEventListener('click', (e) => {
      const searchContainer = document.getElementById('searchContainer');
      if (searchContainer && !searchContainer.contains(e.target)) {
        document.getElementById('searchResults')?.classList.remove('active');
      }
    });

    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      document.getElementById('navMain')?.classList.toggle('open');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    });
  },

  handleSearch(query) {
    this.state.searchQuery = query.trim();
    
    if (!query.trim()) {
      document.getElementById('searchResults')?.classList.remove('active');
      this.applyFilters();
      return;
    }

    const results = this.state.questions.filter(q =>
      q.text.toLowerCase().includes(query.toLowerCase()) ||
      q.keywords?.some(k => k.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 10);

    this.renderSearchResults(results, query);
    this.applyFilters();
  },

  renderSearchResults(results, query) {
    const container = document.getElementById('searchResults');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `<div class="search-no-results">No questions found for "${query}"</div>`;
    } else {
      container.innerHTML = results.map(q => {
        const subject = this.state.allSubjects.find(s => s.id === q.subject);
        const highlightedText = this.highlightText(q.text, query).slice(0, 100) + '...';
        return `
          <div class="search-result-item" onclick="App.showQuestionDetails('${q.id}')">
            <div class="search-result-subject">${subject?.shortName || q.subject} • ${q.marks} marks</div>
            <div class="search-result-text">${highlightedText}</div>
          </div>
        `;
      }).join('');
    }

    container.classList.add('active');
  },

  highlightText(text, query) {
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  // ============================================
  // Bookmarks & Progress
  // ============================================

  toggleBookmark(questionId) {
    if (this.state.bookmarks.has(questionId)) {
      this.state.bookmarks.delete(questionId);
      this.showToast('Removed from bookmarks', 'info');
    } else {
      this.state.bookmarks.add(questionId);
      this.showToast('Added to bookmarks', 'success');
    }
    
    this.saveToStorage();
    
    const btn = document.querySelector(`[data-question-id="${questionId}"] .bookmark-btn`);
    if (btn) {
      btn.classList.toggle('active');
      const svg = btn.querySelector('svg');
      svg.setAttribute('fill', this.state.bookmarks.has(questionId) ? 'currentColor' : 'none');
    }
    
    this.updateProgressStats();
  },

  toggleStudied(questionId) {
    if (this.state.studied.has(questionId)) {
      this.state.studied.delete(questionId);
    } else {
      this.state.studied.add(questionId);
      this.showToast('Question marked as studied!', 'success');
    }
    this.saveToStorage();
    this.updateProgressStats();
  },

  renderBookmarks() {
    const container = document.getElementById('bookmarkList');
    const emptyState = document.getElementById('bookmarksEmpty');
    const countEl = document.getElementById('bookmarkCount');
    if (!container) return;

    // FIX: search across allQuestions for bookmarks (may span semesters)
    const bookmarkedQuestions = this.state.allQuestions.filter(q => this.state.bookmarks.has(q.id));
    countEl.textContent = `${bookmarkedQuestions.length} bookmarked`;

    if (bookmarkedQuestions.length === 0) {
      container.innerHTML = '';
      emptyState?.classList.remove('hidden');
    } else {
      emptyState?.classList.add('hidden');
      container.innerHTML = bookmarkedQuestions.map(q => this.renderQuestionCard(q)).join('');
    }
  },

  updateProgressStats() {
    const studiedCount = this.state.studied.size;
    const totalQuestions = this.state.questions.length;
    const percentage = totalQuestions > 0 ? ((studiedCount / totalQuestions) * 100).toFixed(1) : 0;

    const heroStudied = document.getElementById('studiedCount');
    if (heroStudied) heroStudied.textContent = studiedCount;

    const progressStudied = document.getElementById('progressStudied');
    const progressBookmarks = document.getElementById('progressBookmarks');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressLabel = document.getElementById('progressLabel');
    const progressPercent = document.getElementById('progressPercent');
    const progressBar = document.getElementById('overallProgressBar');

    if (progressStudied) progressStudied.textContent = studiedCount;
    if (progressBookmarks) progressBookmarks.textContent = this.state.bookmarks.size;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
    if (progressLabel) progressLabel.textContent = `${studiedCount} / ${totalQuestions} questions`;
    if (progressPercent) progressPercent.textContent = `${percentage}%`;
    if (progressBar) progressBar.style.width = `${percentage}%`;
  },

  renderProgressPage() {
    this.updateProgressStats();
    
    const container = document.getElementById('subjectProgressGrid');
    if (!container) return;

    container.innerHTML = this.state.subjects.map(subject => {
      const subjectQuestions = this.state.questions.filter(q => q.subject === subject.id);
      const studiedCount = subjectQuestions.filter(q => this.state.studied.has(q.id)).length;
      const percentage = subjectQuestions.length > 0 ? ((studiedCount / subjectQuestions.length) * 100).toFixed(0) : 0;

      return `
        <div class="card">
          <div class="card-body">
            <div class="flex items-center gap-3" style="margin-bottom: var(--space-3);">
              <div class="subject-card-icon" style="background: ${subject.color}; width: 32px; height: 32px; font-size: 14px;">
                ${this.getSubjectIcon(subject.id)}
              </div>
              <div>
                <h4 style="margin: 0; font-size: var(--font-size-sm);">${subject.shortName}</h4>
                <span class="text-xs text-muted">${studiedCount} / ${subjectQuestions.length} studied</span>
              </div>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width: ${percentage}%; background: ${subject.color}"></div>
            </div>
            <div class="progress-text"><span>${percentage}% complete</span></div>
          </div>
        </div>
      `;
    }).join('');
    
    this.renderModuleProgress();
  },

  renderModuleProgress() {
    const container = document.getElementById('moduleProgressGrid');
    if (!container) return;
    
    const subjectsWithModules = Object.keys(this.state.modules).filter(
      subjectId => this.state.modules[subjectId]?.length > 0
    );
    
    if (subjectsWithModules.length === 0) {
      container.innerHTML = '<p class="text-muted">No module data available yet.</p>';
      return;
    }
    
    let html = '';
    subjectsWithModules.forEach(subjectId => {
      const subject = this.state.allSubjects.find(s => s.id === subjectId);
      const modules = this.state.modules[subjectId];
      
      html += `
        <div style="margin-bottom: var(--space-6);">
          <h3 style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-4); font-size: var(--font-size-base);">
            <span style="color: ${subject?.color || 'var(--color-primary)'};">${this.getSubjectIcon(subjectId)}</span>
            ${subject?.shortName || subjectId}
            <span class="badge badge-secondary" style="margin-left: var(--space-2);">${modules.length} modules</span>
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-3);">
            ${modules.map(module => {
              const moduleQuestions = this.state.allQuestions.filter(q => q.subject === subjectId && q.module === module.id);
              const studiedCount = moduleQuestions.filter(q => this.state.studied.has(q.id)).length;
              const percentage = moduleQuestions.length > 0 ? Math.round((studiedCount / moduleQuestions.length) * 100) : 0;
              return `
                <div class="card" style="cursor: pointer;" onclick="App.openModuleDetail('${module.id}')">
                  <div class="card-body" style="padding: var(--space-3);">
                    <div class="flex items-center gap-2" style="margin-bottom: var(--space-2);">
                      <div class="module-number" style="width: 28px; height: 28px; font-size: var(--font-size-xs);">${module.code}</div>
                      <div style="flex: 1; min-width: 0;">
                        <h4 style="margin: 0; font-size: var(--font-size-xs); line-height: 1.3;" title="${module.name}">
                          ${module.name.slice(0, 40)}${module.name.length > 40 ? '...' : ''}
                        </h4>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="progress-bar" style="flex: 1; height: 4px;">
                        <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                      </div>
                      <span class="text-xs text-muted">${studiedCount}/${moduleQuestions.length}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  },

  getSubjectProgress(subjectId) {
    const subjectQuestions = this.state.questions.filter(q => q.subject === subjectId);
    const studiedCount = subjectQuestions.filter(q => this.state.studied.has(q.id)).length;
    return subjectQuestions.length > 0 ? ((studiedCount / subjectQuestions.length) * 100).toFixed(0) : 0;
  },

  // ============================================
  // Question Actions
  // ============================================

  copyQuestion(questionId) {
    const question = this.state.allQuestions.find(q => q.id === questionId);
    if (!question) return;

    const subject = this.state.allSubjects.find(s => s.id === question.subject);
    const text = `[${question.marks} Marks - ${subject?.name || question.subject}]\n\n${question.text}`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Question copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Failed to copy question', 'error');
    });
  },

  showQuestionDetails(questionId) {
    const question = this.state.allQuestions.find(q => q.id === questionId);
    if (!question) return;

    const subject = this.state.allSubjects.find(s => s.id === question.subject);
    const isBookmarked = this.state.bookmarks.has(questionId);
    const isStudied = this.state.studied.has(questionId);

    document.getElementById('modalTitle').textContent = 'Question Details';
    document.getElementById('modalBody').innerHTML = `
      <div class="question-badges" style="margin-bottom: var(--space-4);">
        <span class="badge badge-marks-${question.marks}">${question.marks} Marks</span>
        <span class="badge badge-${question.difficulty}">${this.capitalize(question.difficulty)}</span>
        <span class="badge badge-type">${this.formatType(question.type)}</span>
        <span class="badge badge-subject" style="background: ${subject?.color}15; color: ${subject?.color}">
          ${subject?.name || question.subject}
        </span>
      </div>
      <div style="background: var(--color-bg-tertiary); padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-4);">
        <p style="margin: 0; line-height: 1.8;">${question.text}</p>
      </div>
      <div class="question-meta" style="margin-bottom: var(--space-4);">
        <span class="question-meta-item"><strong>Source:</strong> ${question.source || 'Exam Question'}</span>
        ${question.keywords ? `<span class="question-meta-item"><strong>Keywords:</strong> ${question.keywords.join(', ')}</span>` : ''}
      </div>
      <div class="flex gap-3">
        <button class="btn ${isBookmarked ? 'btn-secondary' : ''}" onclick="App.toggleBookmark('${questionId}'); App.showQuestionDetails('${questionId}');">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
        <button class="btn ${isStudied ? 'btn-primary' : ''}" onclick="App.toggleStudied('${questionId}'); App.showQuestionDetails('${questionId}');">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          ${isStudied ? 'Studied' : 'Mark as Studied'}
        </button>
        <button class="btn" onclick="App.copyQuestion('${questionId}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
      </div>
    `;

    this.openModal();
    document.getElementById('searchResults')?.classList.remove('active');
  },

  // ============================================
  // Modal
  // ============================================

  openModal() {
    document.getElementById('modalBackdrop')?.classList.add('active');
    document.getElementById('modal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    document.getElementById('modalBackdrop')?.classList.remove('active');
    document.getElementById('modal')?.classList.remove('active');
    document.body.style.overflow = '';
  },

  // ============================================
  // Toast Notifications
  // ============================================

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
        </svg>
      </button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // ============================================
  // Export Functions
  // ============================================

  exportPDF() { window.print(); },
  printQuestions() { window.print(); },

  exportData(format) {
    let data, filename, type;
    if (format === 'json') {
      data = JSON.stringify(this.state.questions, null, 2);
      filename = 'llb_questions.json';
      type = 'application/json';
    } else if (format === 'csv') {
      const headers = ['ID', 'Subject', 'Marks', 'Difficulty', 'Type', 'Question'];
      const rows = this.state.questions.map(q => [
        q.id, q.subject, q.marks, q.difficulty, q.type,
        `"${q.text.replace(/"/g, '""')}"`
      ]);
      data = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      filename = 'llb_questions.csv';
      type = 'text/csv';
    }
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    this.showToast(`Exported as ${format.toUpperCase()}`, 'success');
  },

  exportUserData() {
    const data = {
      bookmarks: [...this.state.bookmarks],
      studied: [...this.state.studied],
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'llb_progress.json'; a.click();
    URL.revokeObjectURL(url);
    this.showToast('Progress exported successfully!', 'success');
  },

  // ============================================
  // Admin Panel
  // ============================================

  adminLogin() {
    const password = document.getElementById('adminPassword')?.value;
    if (password === this.config.adminPassword) {
      this.state.isAdminLoggedIn = true;
      document.getElementById('adminLogin')?.classList.add('hidden');
      document.getElementById('adminPanel')?.classList.remove('hidden');
      this.showToast('Admin login successful', 'success');
    } else {
      this.showToast('Invalid password', 'error');
    }
  },

  showAdminTab(tab) {
    document.querySelectorAll('#adminPanel > div[id^="admin"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`admin${this.capitalize(tab)}`)?.classList.remove('hidden');
    document.querySelectorAll('#adminPanel .view-tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
  },

  addQuestion() {
    const subject = document.getElementById('newQuestionSubject')?.value;
    const marks = parseInt(document.getElementById('newQuestionMarks')?.value);
    const difficulty = document.getElementById('newQuestionDifficulty')?.value;
    const type = document.getElementById('newQuestionType')?.value;
    const text = document.getElementById('newQuestionText')?.value;

    if (!text?.trim()) { this.showToast('Please enter question text', 'error'); return; }

    const newQuestion = {
      id: `q_${this.state.currentSemester}_${subject}_${Date.now()}`,
      semester: this.state.currentSemester,
      subject,
      marks,
      category: marks === 15 ? 'Long Question' : marks === 10 ? 'Medium Question' : 'Short Question',
      type, difficulty,
      text: text.trim(),
      keywords: [],
      source: 'Admin Added',
      verified: false
    };

    this.state.allQuestions.push(newQuestion);
    this.state.questions.push(newQuestion);
    this.state.filteredQuestions = [...this.state.questions];
    document.getElementById('newQuestionText').value = '';
    this.showToast('Question added successfully!', 'success');
  },

  // ============================================
  // Module Management
  // ============================================

  updateModuleFilter() {
    const subjectFilter = document.getElementById('filterSubject')?.value;
    const moduleSelect = document.getElementById('filterModule');
    if (!moduleSelect) return;
    
    moduleSelect.innerHTML = '<option value="">All Modules</option>';
    
    if (subjectFilter && this.state.modules[subjectFilter]) {
      this.state.modules[subjectFilter].forEach(module => {
        const option = document.createElement('option');
        option.value = module.id;
        option.textContent = `Module ${module.code}: ${module.name.slice(0, 40)}${module.name.length > 40 ? '...' : ''}`;
        moduleSelect.appendChild(option);
      });
    }
  },

  renderModulesPage() {
    const container = document.getElementById('moduleGrid');
    const emptyState = document.getElementById('modulesEmpty');
    
    if (this.state.currentModuleSubject && this.state.modules[this.state.currentModuleSubject]) {
      emptyState?.classList.add('hidden');
      this.renderModuleGrid(this.state.currentModuleSubject);
    } else {
      if (container) container.innerHTML = '';
      emptyState?.classList.remove('hidden');
    }
  },

  loadModulesForSubject(subjectId) {
    this.state.currentModuleSubject = subjectId;
    if (!subjectId) {
      const container = document.getElementById('moduleGrid');
      const emptyState = document.getElementById('modulesEmpty');
      if (container) container.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }
    this.renderModuleGrid(subjectId);
  },

  renderModuleGrid(subjectId) {
    const container = document.getElementById('moduleGrid');
    const emptyState = document.getElementById('modulesEmpty');
    if (!container) return;
    
    const modules = this.state.modules[subjectId];
    
    if (!modules || modules.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3 class="empty-state-title">No Modules Available</h3>
          <p class="empty-state-text">Modules for this subject are coming soon.</p>
        </div>`;
      emptyState?.classList.add('hidden');
      return;
    }
    
    emptyState?.classList.add('hidden');
    container.innerHTML = modules.map(module => {
      const moduleQuestions = this.state.questions.filter(q => q.module === module.id);
      const studiedCount = moduleQuestions.filter(q => this.state.studied.has(q.id)).length;
      const progressPercent = moduleQuestions.length > 0 ? Math.round((studiedCount / moduleQuestions.length) * 100) : 0;
      
      return `
        <div class="module-card" onclick="App.openModuleDetail('${module.id}')">
          <div class="module-card-header">
            <div class="module-number">${module.code}</div>
            <div class="module-info">
              <h3 class="module-name">${module.name}</h3>
              <div class="module-meta">
                <span class="module-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  </svg>
                  ${moduleQuestions.length} questions
                </span>
                <span class="module-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  ~${module.estimatedHours || 2}h study
                </span>
              </div>
            </div>
          </div>
          <p class="module-description">${module.description?.slice(0, 120) || 'Study this module to master the topic.'}${module.description?.length > 120 ? '...' : ''}</p>
          <div class="module-progress-bar">
            <div class="module-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="module-stats">
            <span>${studiedCount} of ${moduleQuestions.length} studied</span>
            <span>${progressPercent}% complete</span>
          </div>
          <div class="module-action">
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); App.openModuleDetail('${module.id}')">View Module</button>
            <button class="btn btn-sm" onclick="event.stopPropagation(); App.filterByModule('${subjectId}', '${module.id}')">Filter Questions</button>
          </div>
        </div>
      `;
    }).join('');
  },

  openModuleDetail(moduleId) {
    let module = null, subjectId = null;
    for (const [subject, modules] of Object.entries(this.state.modules)) {
      const found = modules.find(m => m.id === moduleId);
      if (found) { module = found; subjectId = subject; break; }
    }
    if (!module) { this.showToast('Module not found', 'error'); return; }
    this.state.currentModule = module;
    this.state.currentModuleSubject = subjectId;
    this.navigate('moduleDetail');
  },

  renderModuleDetail() {
    const module = this.state.currentModule;
    if (!module) { this.navigate('modules'); return; }
    
    const subject = this.state.allSubjects.find(s => s.id === this.state.currentModuleSubject);
    const moduleQuestions = this.state.allQuestions.filter(q => q.module === module.id);
    const studiedCount = moduleQuestions.filter(q => this.state.studied.has(q.id)).length;
    const progressPercent = moduleQuestions.length > 0 ? Math.round((studiedCount / moduleQuestions.length) * 100) : 0;
    
    document.getElementById('breadcrumbModuleName').textContent = `Module ${module.code}`;
    
    const headerEl = document.getElementById('moduleDetailHeader');
    if (headerEl) {
      headerEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4);">
          <div class="module-number" style="background: rgba(255,255,255,0.2); width: 56px; height: 56px; font-size: var(--font-size-xl);">${module.code}</div>
          <div>
            <h1>${module.name}</h1>
            <p style="margin: 0; opacity: 0.9;">${subject?.name || ''}</p>
          </div>
        </div>
        <p>${module.description || ''}</p>
        <div class="module-detail-stats">
          <div class="module-detail-stat"><div class="module-detail-stat-value">${moduleQuestions.length}</div><div class="module-detail-stat-label">Questions</div></div>
          <div class="module-detail-stat"><div class="module-detail-stat-value">${module.subTopics?.length || 0}</div><div class="module-detail-stat-label">Sub-topics</div></div>
          <div class="module-detail-stat"><div class="module-detail-stat-value">${progressPercent}%</div><div class="module-detail-stat-label">Completed</div></div>
          <div class="module-detail-stat"><div class="module-detail-stat-value">~${module.estimatedHours || 2}h</div><div class="module-detail-stat-label">Study Time</div></div>
        </div>
      `;
    }
    
    const subtopicsEl = document.getElementById('moduleSubtopics');
    if (subtopicsEl && module.subTopics) {
      subtopicsEl.innerHTML = module.subTopics.map((subtopic, idx) => `
        <div class="subtopic-item ${idx === 0 ? 'open' : ''}" onclick="this.classList.toggle('open')">
          <div class="subtopic-header">
            <span class="subtopic-toggle"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m9 18 6-6-6-6"></path></svg></span>
            <span>${subtopic.name}</span>
          </div>
          <div class="subtopic-content">
            <ul>${subtopic.items?.map(item => `<li>${item}</li>`).join('') || '<li>No items specified</li>'}</ul>
          </div>
        </div>
      `).join('');
    }
    
    document.getElementById('moduleQuestionCount').textContent = `${moduleQuestions.length} questions`;
    
    const questionListEl = document.getElementById('moduleQuestionList');
    if (questionListEl) {
      questionListEl.innerHTML = moduleQuestions.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">📝</div><h3 class="empty-state-title">No Questions Yet</h3></div>`
        : moduleQuestions.map(q => this.renderQuestionCard(q)).join('');
    }
    
    this.updateModuleNavButtons();
  },

  updateModuleNavButtons() {
    const module = this.state.currentModule;
    if (!module) return;
    const modules = this.state.modules[this.state.currentModuleSubject] || [];
    const currentIndex = modules.findIndex(m => m.id === module.id);
    const prevBtn = document.getElementById('prevModuleBtn');
    const nextBtn = document.getElementById('nextModuleBtn');
    if (prevBtn) { prevBtn.disabled = currentIndex <= 0; prevBtn.style.opacity = currentIndex <= 0 ? '0.5' : '1'; }
    if (nextBtn) { nextBtn.disabled = currentIndex >= modules.length - 1; nextBtn.style.opacity = currentIndex >= modules.length - 1 ? '0.5' : '1'; }
  },

  goToPrevModule() {
    const modules = this.state.modules[this.state.currentModuleSubject] || [];
    const idx = modules.findIndex(m => m.id === this.state.currentModule?.id);
    if (idx > 0) this.openModuleDetail(modules[idx - 1].id);
  },

  goToNextModule() {
    const modules = this.state.modules[this.state.currentModuleSubject] || [];
    const idx = modules.findIndex(m => m.id === this.state.currentModule?.id);
    if (idx < modules.length - 1) this.openModuleDetail(modules[idx + 1].id);
  },

  studyAllInModule() {
    const module = this.state.currentModule;
    if (!module) return;
    const moduleQuestions = this.state.allQuestions.filter(q => q.module === module.id);
    moduleQuestions.forEach(q => this.state.studied.add(q.id));
    this.saveToStorage();
    this.updateProgressStats();
    this.renderModuleDetail();
    this.showToast(`All ${moduleQuestions.length} questions marked as studied!`, 'success');
  },

  filterByModule(subjectId, moduleId) {
    document.getElementById('filterSubject').value = subjectId;
    this.updateModuleFilter();
    document.getElementById('filterModule').value = moduleId;
    this.navigate('questions');
    this.applyFilters();
  },

  getModuleProgress(moduleId) {
    const moduleQuestions = this.state.allQuestions.filter(q => q.module === moduleId);
    const studiedCount = moduleQuestions.filter(q => this.state.studied.has(q.id)).length;
    return moduleQuestions.length > 0 ? Math.round((studiedCount / moduleQuestions.length) * 100) : 0;
  },

  // ============================================
  // Utility Functions
  // ============================================

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  },

  formatType(type) {
    const types = {
      definition: 'Definition', analytical: 'Analytical', comparative: 'Comparative',
      statutory: 'Statutory', case_law: 'Case Law', problem: 'Problem-Based'
    };
    return types[type] || type;
  },

  // FIX: Added icons for all Sem 2 subjects
  getSubjectIcon(subjectId) {
    const icons = {
      // Semester 1
      crim_psych:    '🧠',
      const_law:     '⚖️',
      contract_law:  '📝',
      family_law:    '👨‍👩‍👧',
      crimes:        '⚔️',
      ipr:           '💡',
      // Semester 2
      const_law_2:          '🏛️',
      contract_law_2:       '🤝',
      family_law_2:         '🏠',
      penology_victimology: '⛓️',
      jurisprudence:        '📖',
      media_law:            '📡',
    };
    return icons[subjectId] || '📚';
  },

  getIconPath(icon) {
    const paths = {
      'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line>',
      'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>'
    };
    return paths[icon] || '';
  },

  // FIX: Full semester switch — reload subjects, questions, filters, charts, stats
  selectSemester(semesterId) {
    this.state.currentSemester = semesterId;
    
    // Reset filters
    this.state.filters = { subject: '', module: '', marks: '', difficulty: '', type: '', status: '' };
    this.state.searchQuery = '';
    ['filterSubject','filterModule','filterMarks','filterDifficulty','filterType','filterStatus'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const si = document.getElementById('searchInput'); if (si) si.value = '';

    // Apply semester data
    this.applyCurrentSemester();
    
    // Re-render everything
    this.renderSemesterTabs();
    this.renderSubjectsGrid();
    this.renderStatistics();
    this.renderRoadmap();
    this.renderCharts();
    this.populateFilters();
    this.updateProgressStats();

    // If on questions page, re-render
    if (this.state.currentPage === 'questions') {
      this.updateModuleFilter();
      this.renderQuestions();
    }

    this.updateHeroStats();

    // Sync the questions-page semester filter dropdown
    const sf = document.getElementById('filterSemester');
    if (sf) sf.value = semesterId;
    this.updateSubjectFilterForSemester();

    // Subject count label
    const sc = document.getElementById('subjectCount');
    if (sc) sc.textContent = `${this.state.subjects.length} subject${this.state.subjects.length !== 1 ? 's' : ''}`;

    const sem = this.state.semesters.find(s => s.id === semesterId);
    this.showToast(`Switched to ${sem?.name || semesterId}`, 'success');
  }
};

// ============================================
// Initialize Application
// ============================================

document.addEventListener('DOMContentLoaded', () => App.init());
