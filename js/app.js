/**
 * LLBwithMe Question Bank - Main Application
 * Version 2.0.0
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
    semesters: [],
    subjects: [],
    questions: [],
    filteredQuestions: [],
    bookmarks: new Set(),
    studied: new Set(),
    filters: {
      subject: '',
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
    
    // Render initial UI
    this.renderSemesterTabs();
    this.renderSubjectsGrid();
    this.renderStatistics();
    this.renderRoadmap();
    this.renderCharts();
    this.populateFilters();
    this.updateProgressStats();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('✅ LLBwithMe initialized successfully!');
  },

  // ============================================
  // Data Loading
  // ============================================

  async loadData() {
    try {
      // Load semesters
      const semestersResponse = await fetch('data/semesters.json');
      const semestersData = await semestersResponse.json();
      this.state.semesters = semestersData.semesters;

      // Load subjects
      const subjectsResponse = await fetch('data/subjects.json');
      const subjectsData = await subjectsResponse.json();
      this.state.subjects = subjectsData.subjects;

      // Load questions for each subject
      const questionFiles = ['crim_psych', 'const_law', 'contract_law', 'family_law', 'crimes', 'ipr'];
      const questionPromises = questionFiles.map(subject => 
        fetch(`data/questions/${subject}.json`).then(res => res.json())
      );
      
      const questionsData = await Promise.all(questionPromises);
      this.state.questions = questionsData.flatMap(data => data.questions);
      this.state.filteredQuestions = [...this.state.questions];
      this.state.pagination.total = this.state.questions.length;

    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Failed to load question data. Please refresh the page.', 'error');
    }
  },

  // ============================================
  // Storage Management
  // ============================================

  loadFromStorage() {
    try {
      // Load bookmarks
      const savedBookmarks = localStorage.getItem(this.config.storageKeys.bookmarks);
      if (savedBookmarks) {
        this.state.bookmarks = new Set(JSON.parse(savedBookmarks));
      }

      // Load studied questions
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
    
    // Update charts for new theme
    this.updateChartsTheme();
  },

  updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (theme === 'dark') {
      icon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
    } else {
      icon.innerHTML = `
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2"></path>
        <path d="M12 20v2"></path>
        <path d="m4.93 4.93 1.41 1.41"></path>
        <path d="m17.66 17.66 1.41 1.41"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
        <path d="m6.34 17.66-1.41 1.41"></path>
        <path d="m19.07 4.93-1.41 1.41"></path>
      `;
    }
  },

  // ============================================
  // Navigation
  // ============================================

  navigate(page) {
    // Hide all pages
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    
    // Show requested page
    const pageEl = document.getElementById(`page${page.charAt(0).toUpperCase() + page.slice(1)}`);
    if (pageEl) {
      pageEl.classList.add('active');
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    
    this.state.currentPage = page;
    
    // Render page-specific content
    switch(page) {
      case 'questions':
        this.renderQuestions();
        break;
      case 'bookmarks':
        this.renderBookmarks();
        break;
      case 'progress':
        this.renderProgressPage();
        break;
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
  },

  // ============================================
  // Render Functions
  // ============================================

  renderSemesterTabs() {
    const container = document.getElementById('semesterTabs');
    if (!container) return;

    container.innerHTML = this.state.semesters.map(sem => `
      <button 
        class="semester-tab ${sem.active ? 'active' : 'disabled'}"
        onclick="${sem.active ? `App.selectSemester('${sem.id}')` : ''}"
        ${!sem.active ? 'disabled' : ''}
      >
        <span class="semester-tab-name">${sem.name}</span>
        <span class="semester-tab-status">
          ${sem.active ? '✓ Active' : this.formatDate(sem.launchDate)}
        </span>
      </button>
    `).join('');
  },

  renderSubjectsGrid() {
    const container = document.getElementById('subjectsGrid');
    if (!container) return;

    container.innerHTML = this.state.subjects.map(subject => `
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

    const stats = [
      { value: 284, label: 'Total Questions', icon: 'file-text' },
      { value: 88, label: '15-Mark Questions', icon: 'star', color: 'var(--color-marks-15)' },
      { value: 106, label: '10-Mark Questions', icon: 'star', color: 'var(--color-marks-10)' },
      { value: 90, label: '5-Mark Questions', icon: 'star', color: 'var(--color-marks-5)' }
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

    // Update studied count in hero
    document.getElementById('studiedCount').textContent = this.state.studied.size;
  },

  renderRoadmap() {
    const container = document.getElementById('roadmap');
    if (!container) return;

    container.innerHTML = this.state.semesters.map(sem => `
      <div class="roadmap-item ${sem.active ? 'active' : sem.status || ''}">
        <div class="roadmap-marker"></div>
        <div class="roadmap-content">
          <div class="roadmap-title">
            ${sem.displayName}
            ${sem.active ? '<span class="badge badge-active">Active</span>' : ''}
            ${sem.status === 'coming_soon' ? '<span class="badge badge-coming-soon">Coming Soon</span>' : ''}
            ${sem.status === 'planned' ? '<span class="badge badge-planned">Planned</span>' : ''}
          </div>
          <div class="roadmap-date">
            ${sem.active ? `${this.state.subjects.length} subjects • ${this.state.questions.length} questions` : `Launch: ${this.formatDate(sem.launchDate)}`}
          </div>
          ${sem.description ? `<p class="text-sm text-muted" style="margin-top: var(--space-2); margin-bottom: 0;">${sem.description}</p>` : ''}
        </div>
      </div>
    `).join('');
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

    if (this.state.charts.subject) {
      this.state.charts.subject.destroy();
    }

    this.state.charts.subject = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.state.subjects.map(s => s.shortName || s.name),
        datasets: [{
          data: this.state.subjects.map(s => s.questionCount),
          backgroundColor: this.state.subjects.map(s => s.color),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textColor,
              padding: 12,
              usePointStyle: true,
              font: { size: 11 }
            }
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

    if (this.state.charts.marks) {
      this.state.charts.marks.destroy();
    }

    this.state.charts.marks = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['15 Marks', '10 Marks', '5 Marks'],
        datasets: [{
          label: 'Questions',
          data: [88, 106, 90],
          backgroundColor: ['#3498db', '#27ae60', '#f39c12'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor }
          }
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
    const subject = this.state.subjects.find(s => s.id === question.subject);
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

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
      </button>
      ${pages.map(p => p === '...' 
        ? '<span class="pagination-btn" style="cursor: default;">...</span>'
        : `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" onclick="App.goToPage(${p})">${p}</button>`
      ).join('')}
      <button class="pagination-btn" onclick="App.goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    `;
  },

  goToPage(page) {
    const totalPages = Math.ceil(this.state.filteredQuestions.length / this.state.pagination.perPage);
    if (page < 1 || page > totalPages) return;
    
    this.state.pagination.page = page;
    this.renderQuestions();
    
    // Scroll to top of question list
    document.getElementById('questionList')?.scrollIntoView({ behavior: 'smooth' });
  },

  // ============================================
  // Filtering
  // ============================================

  populateFilters() {
    const subjectSelect = document.getElementById('filterSubject');
    if (subjectSelect) {
      subjectSelect.innerHTML = `
        <option value="">All Subjects</option>
        ${this.state.subjects.map(s => `
          <option value="${s.id}">${s.name}</option>
        `).join('')}
      `;
    }
  },

  applyFilters() {
    const filters = {
      subject: document.getElementById('filterSubject')?.value || '',
      marks: document.getElementById('filterMarks')?.value || '',
      difficulty: document.getElementById('filterDifficulty')?.value || '',
      type: document.getElementById('filterType')?.value || '',
      status: document.getElementById('filterStatus')?.value || ''
    };

    this.state.filters = filters;
    this.state.filteredQuestions = this.state.questions.filter(q => {
      if (filters.subject && q.subject !== filters.subject) return false;
      if (filters.marks && q.marks !== parseInt(filters.marks)) return false;
      if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
      if (filters.type && q.type !== filters.type) return false;
      if (filters.status === 'studied' && !this.state.studied.has(q.id)) return false;
      if (filters.status === 'not-studied' && this.state.studied.has(q.id)) return false;
      if (filters.status === 'bookmarked' && !this.state.bookmarks.has(q.id)) return false;
      return true;
    });

    // Apply search if active
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
    // Update result count
    const countEl = document.getElementById('filterResultCount');
    if (countEl) {
      countEl.textContent = `Showing ${this.state.filteredQuestions.length} question${this.state.filteredQuestions.length !== 1 ? 's' : ''}`;
    }

    // Update active filters display
    const activeFiltersEl = document.getElementById('activeFilters');
    if (activeFiltersEl) {
      const activeFilters = [];
      if (this.state.filters.subject) {
        const subject = this.state.subjects.find(s => s.id === this.state.filters.subject);
        activeFilters.push({ key: 'subject', label: subject?.shortName || this.state.filters.subject });
      }
      if (this.state.filters.marks) {
        activeFilters.push({ key: 'marks', label: `${this.state.filters.marks} Marks` });
      }
      if (this.state.filters.difficulty) {
        activeFilters.push({ key: 'difficulty', label: this.capitalize(this.state.filters.difficulty) });
      }
      if (this.state.filters.type) {
        activeFilters.push({ key: 'type', label: this.formatType(this.state.filters.type) });
      }
      if (this.state.filters.status) {
        activeFilters.push({ key: 'status', label: this.capitalize(this.state.filters.status) });
      }
      if (this.state.searchQuery) {
        activeFilters.push({ key: 'search', label: `Search: "${this.state.searchQuery}"` });
      }

      activeFiltersEl.innerHTML = activeFilters.map(f => `
        <span class="active-filter">
          ${f.label}
          <button class="active-filter-remove" onclick="App.removeFilter('${f.key}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
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
    }
    this.applyFilters();
  },

  clearFilters() {
    document.getElementById('filterSubject').value = '';
    document.getElementById('filterMarks').value = '';
    document.getElementById('filterDifficulty').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('searchInput').value = '';
    
    this.state.searchQuery = '';
    this.state.filters = { subject: '', marks: '', difficulty: '', type: '', status: '' };
    this.state.filteredQuestions = [...this.state.questions];
    this.state.pagination.page = 1;
    
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
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('change', () => this.toggleTheme());
    
    // Search input
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

    // Search clear
    document.getElementById('searchClear')?.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      this.state.searchQuery = '';
      document.getElementById('searchResults')?.classList.remove('active');
      this.applyFilters();
    });

    // Close search results on click outside
    document.addEventListener('click', (e) => {
      const searchContainer = document.getElementById('searchContainer');
      if (searchContainer && !searchContainer.contains(e.target)) {
        document.getElementById('searchResults')?.classList.remove('active');
      }
    });

    // Mobile menu
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      document.getElementById('navMain')?.classList.toggle('open');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape to close modal
      if (e.key === 'Escape') {
        this.closeModal();
      }
      // Ctrl/Cmd + K to focus search
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
      container.innerHTML = `
        <div class="search-no-results">
          No questions found for "${query}"
        </div>
      `;
    } else {
      container.innerHTML = results.map(q => {
        const subject = this.state.subjects.find(s => s.id === q.subject);
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
    
    // Update UI
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

    const bookmarkedQuestions = this.state.questions.filter(q => 
      this.state.bookmarks.has(q.id)
    );

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

    // Update hero stat
    const heroStudied = document.getElementById('studiedCount');
    if (heroStudied) heroStudied.textContent = studiedCount;

    // Update progress page stats
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
            <div class="progress-text">
              <span>${percentage}% complete</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
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
    const question = this.state.questions.find(q => q.id === questionId);
    if (!question) return;

    const subject = this.state.subjects.find(s => s.id === question.subject);
    const text = `[${question.marks} Marks - ${subject?.name || question.subject}]\n\n${question.text}`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Question copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Failed to copy question', 'error');
    });
  },

  showQuestionDetails(questionId) {
    const question = this.state.questions.find(q => q.id === questionId);
    if (!question) return;

    const subject = this.state.subjects.find(s => s.id === question.subject);
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
        <span class="question-meta-item">
          <strong>Source:</strong> ${question.source || 'Exam Question'}
        </span>
        ${question.keywords ? `
          <span class="question-meta-item">
            <strong>Keywords:</strong> ${question.keywords.join(', ')}
          </span>
        ` : ''}
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
      <span class="toast-icon">
        ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
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

  exportPDF() {
    window.print();
  },

  printQuestions() {
    window.print();
  },

  exportData(format) {
    let data, filename, type;

    if (format === 'json') {
      data = JSON.stringify(this.state.questions, null, 2);
      filename = 'llb_questions.json';
      type = 'application/json';
    } else if (format === 'csv') {
      const headers = ['ID', 'Subject', 'Marks', 'Difficulty', 'Type', 'Question'];
      const rows = this.state.questions.map(q => [
        q.id,
        q.subject,
        q.marks,
        q.difficulty,
        q.type,
        `"${q.text.replace(/"/g, '""')}"`
      ]);
      data = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      filename = 'llb_questions.csv';
      type = 'text/csv';
    }

    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
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
    a.href = url;
    a.download = 'llb_progress.json';
    a.click();
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
    document.querySelectorAll('#adminPanel > div[id^="admin"]').forEach(el => {
      el.classList.add('hidden');
    });
    
    document.getElementById(`admin${this.capitalize(tab)}`)?.classList.remove('hidden');
    
    document.querySelectorAll('#adminPanel .view-tab').forEach(el => {
      el.classList.remove('active');
    });
    event.target.classList.add('active');
  },

  addQuestion() {
    const subject = document.getElementById('newQuestionSubject')?.value;
    const marks = parseInt(document.getElementById('newQuestionMarks')?.value);
    const difficulty = document.getElementById('newQuestionDifficulty')?.value;
    const type = document.getElementById('newQuestionType')?.value;
    const text = document.getElementById('newQuestionText')?.value;

    if (!text?.trim()) {
      this.showToast('Please enter question text', 'error');
      return;
    }

    const newQuestion = {
      id: `q_sem1_${subject}_${Date.now()}`,
      semester: 'sem1',
      subject,
      marks,
      category: marks === 15 ? 'Long Question' : marks === 10 ? 'Medium Question' : 'Short Question',
      type,
      difficulty,
      text: text.trim(),
      keywords: [],
      source: 'Admin Added',
      verified: false
    };

    this.state.questions.push(newQuestion);
    this.state.filteredQuestions = [...this.state.questions];
    
    // Clear form
    document.getElementById('newQuestionText').value = '';
    
    this.showToast('Question added successfully!', 'success');
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
      definition: 'Definition',
      analytical: 'Analytical',
      comparative: 'Comparative',
      statutory: 'Statutory',
      case_law: 'Case Law',
      problem: 'Problem-Based'
    };
    return types[type] || type;
  },

  getSubjectIcon(subjectId) {
    const icons = {
      crim_psych: '🧠',
      const_law: '⚖️',
      contract_law: '📝',
      family_law: '👨‍👩‍👧',
      crimes: '⚔️',
      ipr: '💡'
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

  selectSemester(semesterId) {
    this.state.currentSemester = semesterId;
    this.renderSemesterTabs();
    this.renderSubjectsGrid();
    this.applyFilters();
  }
};

// ============================================
// Initialize Application
// ============================================

document.addEventListener('DOMContentLoaded', () => App.init());

