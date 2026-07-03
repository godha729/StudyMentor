/* ==========================================
   AETHER STUDY SUITE - MAIN APPLICATION DRIVER
   ========================================== */

class AppRouter {
  constructor() {
    this.currentTab = 'dashboard';
    this.theme = 'dark';
    this.init();
  }

  init() {
    // Tab switching event listeners
    const navButtons = document.querySelectorAll('.nav-menu .nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        this.switchTab(tabName);
        // Auto-close sidebar on mobile
        this.closeSidebar();
      });
    });

    // Theme toggler listener
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Initialize date and time display
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 60000); // update every minute

    // Load theme from store
    const storedTheme = db.load('theme') || 'dark';
    this.setTheme(storedTheme);

    // Mobile hamburger menu
    this.initMobileSidebar();

    // Global keyboard shortcuts
    this.initKeyboardShortcuts();
  }

  /* ==========================================
     MOBILE SIDEBAR HANDLING
     ========================================== */
  initMobileSidebar() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const overlay = document.getElementById('sidebar-overlay');

    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', () => this.toggleSidebar());
    }
    if (overlay) {
      overlay.addEventListener('click', () => this.closeSidebar());
    }
  }

  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
  }

  closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  /* ==========================================
     KEYBOARD SHORTCUT SYSTEM
     ========================================== */
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore shortcuts when typing in an input field
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          // Toggle Pomodoro Play/Pause
          if (typeof pomoTimer !== 'undefined') {
            pomoTimer.toggleTimer();
            const isRunning = !!pomoTimer.timerId;
            this.showToast(`<kbd>P</kbd> Pomodoro ${isRunning ? 'Started ▶' : 'Paused ⏸'}`);
          }
          break;

        case 'r':
          // Reset Pomodoro (only on pomodoro tab)
          if (this.currentTab === 'pomodoro' && typeof pomoTimer !== 'undefined') {
            pomoTimer.resetTimer();
            this.showToast('<kbd>R</kbd> Timer Reset');
          }
          break;

        case ' ':
          // Flip current flashcard
          if (this.currentTab === 'flashcards' && typeof flashcardsApp !== 'undefined') {
            e.preventDefault();
            const studyView = document.getElementById('deck-study-view');
            if (studyView && !studyView.classList.contains('hidden')) {
              flashcardsApp.flipCard();
              this.showToast('<kbd>Space</kbd> Card Flipped');
            }
          }
          break;

        case '1':
          // SRS: Rate Hard
          if (this.currentTab === 'flashcards' && typeof flashcardsApp !== 'undefined') {
            const srsActions = document.getElementById('card-srs-actions');
            if (srsActions && !srsActions.classList.contains('hidden')) {
              flashcardsApp.rateCard('hard');
              this.showToast('<kbd>1</kbd> Rated: Hard 🔴');
            }
          }
          break;

        case '2':
          // SRS: Rate Medium
          if (this.currentTab === 'flashcards' && typeof flashcardsApp !== 'undefined') {
            const srsActions = document.getElementById('card-srs-actions');
            if (srsActions && !srsActions.classList.contains('hidden')) {
              flashcardsApp.rateCard('medium');
              this.showToast('<kbd>2</kbd> Rated: Medium 🟡');
            }
          }
          break;

        case '3':
          // SRS: Rate Easy
          if (this.currentTab === 'flashcards' && typeof flashcardsApp !== 'undefined') {
            const srsActions = document.getElementById('card-srs-actions');
            if (srsActions && !srsActions.classList.contains('hidden')) {
              flashcardsApp.rateCard('easy');
              this.showToast('<kbd>3</kbd> Rated: Easy 🟢');
            }
          }
          break;

        case 'd':
          this.switchTab('dashboard');
          this.showToast('<kbd>D</kbd> Dashboard');
          break;

        case 't':
          this.switchTab('todo');
          this.showToast('<kbd>T</kbd> Tasks');
          break;

        case 'f':
          this.switchTab('flashcards');
          this.showToast('<kbd>F</kbd> Flashcards');
          break;

        case 'q':
          this.switchTab('quiz');
          this.showToast('<kbd>Q</kbd> Quiz Hub');
          break;
      }
    });
  }

  showToast(htmlContent) {
    const toast = document.getElementById('kb-toast');
    const msg = document.getElementById('kb-toast-msg');
    if (!toast || !msg) return;

    msg.innerHTML = htmlContent;
    toast.classList.add('show');

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  switchTab(tabId) {
    if (!tabId) return;
    this.currentTab = tabId;

    // Toggle active classes on nav buttons
    const navButtons = document.querySelectorAll('.nav-menu .nav-btn');
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle active panels
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Update Topbar Page Title
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    
    const pageMeta = {
      dashboard: { title: 'Dashboard', desc: 'Welcome back! Ready to supercharge your learning today?' },
      todo: { title: 'Tasks Planner', desc: 'Organize your subjects, set priority deadlines, and build a productive workflow.' },
      pomodoro: { title: 'Focus Timer', desc: 'Block out distractions using the Pomodoro technique. Work hard, rest well.' },
      flashcards: { title: 'Flashcards Suite', desc: 'Master new terms and formulas using systematic Spaced Repetition reviews.' },
      quiz: { title: 'Quiz Hub', desc: 'Assess your progress, create custom questionnaires, and set scheduled quizzes.' }
    };

    if (pageMeta[tabId]) {
      titleEl.textContent = pageMeta[tabId].title;
      subtitleEl.textContent = pageMeta[tabId].desc;
    }

    // Module-specific visibility triggers (e.g. refresh views when switching tabs)
    if (tabId === 'todo') {
      if (typeof todoApp !== 'undefined') todoApp.renderTasks();
    } else if (tabId === 'flashcards') {
      if (typeof flashcardsApp !== 'undefined') flashcardsApp.renderDecks();
    } else if (tabId === 'quiz') {
      if (typeof quizApp !== 'undefined') {
        quizApp.renderQuizList();
        quizApp.showSubView('default');
      }
    } else if (tabId === 'dashboard') {
      this.updateDashboardStats();
    }
  }

  toggleTheme() {
    const newTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  setTheme(themeName) {
    this.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    db.save('theme', themeName);

    // Update sidebar text button
    const label = document.querySelector('#theme-toggle-btn span');
    if (label) {
      label.textContent = themeName === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
  }

  updateDateTime() {
    const dateEl = document.getElementById('current-date-time');
    if (dateEl) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
  }

  /* ==========================================
     WEEKLY STREAK HEATMAP
     ========================================== */
  renderWeeklyStreak() {
    const grid = document.getElementById('streak-grid');
    const streakDaysEl = document.getElementById('streak-days');
    if (!grid) return;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const todayIdx = today.getDay();

    // Load streak data (daily pomo sessions per day-of-week)
    const streakData = db.load('weekly_streak') || {};

    // Count consecutive streak days (starting from today going back)
    let streakCount = 0;
    for (let i = 0; i < 7; i++) {
      const checkDay = ((todayIdx - i) + 7) % 7;
      if ((streakData[days[checkDay]] || 0) > 0) {
        streakCount++;
      } else {
        break;
      }
    }
    if (streakDaysEl) streakDaysEl.textContent = streakCount;

    // Build bars: order Sun → Sat, highlight today
    grid.innerHTML = days.map((day, idx) => {
      const sessions = streakData[day] || 0;
      const isToday = idx === todayIdx;
      const hasActivity = sessions > 0;
      const barHeight = Math.max(20, Math.min(80, 20 + sessions * 15));

      return `
        <div class="streak-day">
          <span class="streak-day-sessions">${sessions > 0 ? sessions : ''}</span>
          <div class="streak-day-bar ${hasActivity ? 'active' : ''} ${isToday ? 'today' : ''}"
               style="height: ${barHeight}px;"
               title="${day}: ${sessions} session${sessions !== 1 ? 's' : ''}"></div>
          <span class="streak-day-label">${day}</span>
        </div>
      `;
    }).join('');

    setTimeout(() => lucide.createIcons(), 10);
  }

  /* ==========================================
     DAILY GOAL PROGRESS BAR
     ========================================== */
  updateGoalProgress() {
    const DAILY_GOAL = 4; // 4 Pomodoro sessions = 100%
    const pomoSessions = db.load('pomo_sessions_count') || 0;
    const pct = Math.min(100, Math.round((pomoSessions / DAILY_GOAL) * 100));

    const fillEl = document.getElementById('goal-bar-fill');
    const pctEl = document.getElementById('goal-pct-text');

    if (fillEl) fillEl.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
  }

  updateDashboardStats() {
    // Tasks Stats
    const tasks = db.load('tasks') || [];
    const completedTasksCount = tasks.filter(t => t.completed).length;
    const taskStatEl = document.getElementById('stats-tasks-completed');
    if (taskStatEl) taskStatEl.textContent = completedTasksCount;

    // Pomodoro Stats
    const pomoStats = db.load('pomo_sessions_count') || 0;
    const pomoStatEl = document.getElementById('stats-pomo-sessions');
    if (pomoStatEl) pomoStatEl.textContent = pomoStats;

    // Flashcard Stats
    const reviewedCount = db.load('flashcards_reviewed_count') || 0;
    const cardStatEl = document.getElementById('stats-flashcard-reviews');
    if (cardStatEl) cardStatEl.textContent = reviewedCount;

    // Quiz Stats
    const quizStats = db.load('quiz_scores_history') || [];
    let avgScore = 0;
    if (quizStats.length > 0) {
      const sum = quizStats.reduce((acc, curr) => acc + curr.percentage, 0);
      avgScore = Math.round(sum / quizStats.length);
    }
    const quizStatEl = document.getElementById('stats-quiz-score');
    if (quizStatEl) quizStatEl.textContent = `${avgScore}%`;

    // Render dashboard task preview list (show top 4 high/medium pending tasks)
    const taskPreviewList = document.getElementById('dashboard-tasks-preview');
    if (taskPreviewList) {
      const today = new Date().toISOString().split('T')[0];
      const pendingTasks = tasks.filter(t => !t.completed);
      // Sort: high priority first, then medium, then low
      const sortedTasks = pendingTasks.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }).slice(0, 4);

      if (sortedTasks.length === 0) {
        taskPreviewList.innerHTML = `
          <li class="empty-state-list text-secondary" style="font-size:13px; text-align:center; padding:10px 0;">
            No pending tasks for today. Click below to add!
          </li>
        `;
      } else {
        taskPreviewList.innerHTML = sortedTasks.map(task => {
          const isOverdue = task.due && task.due < today;
          return `
          <li class="dashboard-task-item">
            <span class="task-dot ${task.priority}"></span>
            <span class="task-name">${this.escapeHTML(task.title)}</span>
            ${isOverdue
              ? `<span class="badge badge-overdue" style="font-size:10px;">Overdue</span>`
              : `<span class="badge badge-tag" style="font-size:10px;">${this.escapeHTML(task.category || 'Study')}</span>`
            }
          </li>
        `}).join('');
      }
    }

    // Update streak heatmap and goal progress
    this.renderWeeklyStreak();
    this.updateGoalProgress();
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

/* ==========================================
   DATABASE CONTROLLER (LOCAL STORAGE LAYER)
   ========================================== */
class LocalDB {
  save(key, value) {
    try {
      localStorage.setItem(`aether_study_${key}`, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Local storage write error:", e);
      return false;
    }
  }

  load(key) {
    try {
      const item = localStorage.getItem(`aether_study_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error("Local storage read error:", e);
      return null;
    }
  }
}

// Global Instances
const db = new LocalDB();
const appRouter = new AppRouter();

// Initialize stats on load
document.addEventListener("DOMContentLoaded", () => {
  appRouter.updateDashboardStats();
});
