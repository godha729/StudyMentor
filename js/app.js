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
        taskPreviewList.innerHTML = sortedTasks.map(task => `
          <li class="dashboard-task-item">
            <span class="task-dot ${task.priority}"></span>
            <span class="task-name">${this.escapeHTML(task.title)}</span>
            <span class="badge badge-tag" style="font-size:10px;">${this.escapeHTML(task.category || 'Study')}</span>
          </li>
        `).join('');
      }
    }
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
