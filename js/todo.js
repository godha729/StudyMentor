/* ==========================================
   AETHER STUDY SUITE - TODO / TASK CONTROLLER
   ========================================== */

class TodoApp {
  constructor() {
    this.tasks = [];
    this.filter = 'all';
    this.init();
  }

  init() {
    this.loadTasks();

    // Form submission listener
    const form = document.getElementById('todo-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addTask();
      });
    }

    // Filter buttons listeners
    const filterBtns = document.querySelectorAll('.filter-group .btn-filter');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setFilter(btn.getAttribute('data-filter'));
      });
    });

    // Set default date picker to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('task-due');
    if (dateInput) {
      dateInput.value = tomorrow.toISOString().split('T')[0];
    }
  }

  loadTasks() {
    this.tasks = db.load('tasks') || [
      { id: 1, title: 'Revise Spaced Repetition lecture notes', priority: 'high', category: 'Cognition', due: new Date().toISOString().split('T')[0], completed: false },
      { id: 2, title: 'Solve 10 algebra Practice Questions', priority: 'medium', category: 'Math', due: new Date().toISOString().split('T')[0], completed: true },
      { id: 3, title: 'Draft React JS structure mapping', priority: 'low', category: 'WebDev', due: new Date().toISOString().split('T')[0], completed: false }
    ];
    this.renderTasks();
  }

  saveTasks() {
    db.save('tasks', this.tasks);
    appRouter.updateDashboardStats();
  }

  addTask() {
    const titleEl = document.getElementById('task-title');
    const priorityEl = document.getElementById('task-priority');
    const categoryEl = document.getElementById('task-category');
    const dueEl = document.getElementById('task-due');

    if (!titleEl || !titleEl.value.trim()) return;

    const newTask = {
      id: Date.now(),
      title: titleEl.value.trim(),
      priority: priorityEl.value,
      category: categoryEl.value.trim() || 'General',
      due: dueEl.value || new Date().toISOString().split('T')[0],
      completed: false
    };

    this.tasks.push(newTask);
    this.saveTasks();
    this.renderTasks();

    // Reset input fields
    titleEl.value = '';
    categoryEl.value = '';
    
    // Re-initialize Lucide Icons for dynamic content
    setTimeout(() => lucide.createIcons(), 10);
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.saveTasks();
    this.renderTasks();
    setTimeout(() => lucide.createIcons(), 10);
  }

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      this.renderTasks();
      setTimeout(() => lucide.createIcons(), 10);
    }
  }

  setFilter(filterValue) {
    this.filter = filterValue;
    this.renderTasks();
    setTimeout(() => lucide.createIcons(), 10);
  }

  updateTaskProgress() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const progressBadge = document.getElementById('task-progress-percentage');
    if (progressBadge) {
      progressBadge.textContent = `${pct}% Completed`;
    }
  }

  renderTasks() {
    const listContainer = document.getElementById('tasks-list-container');
    if (!listContainer) return;

    this.updateTaskProgress();

    // Filter tasks
    let filteredTasks = this.tasks;
    if (this.filter === 'pending') {
      filteredTasks = this.tasks.filter(t => !t.completed);
    } else if (this.filter === 'completed') {
      filteredTasks = this.tasks.filter(t => t.completed);
    }

    if (filteredTasks.length === 0) {
      listContainer.innerHTML = `
        <div class="glass-panel" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <i data-lucide="check-square" style="width: 48px; height: 48px; margin-bottom: 12px; color: var(--text-muted);"></i>
          <h3>No tasks found</h3>
          <p style="font-size:13px; margin-top:6px;">Create a new task on the left panel to populate your board.</p>
        </div>
      `;
      return;
    }

    // Sort tasks: pending first, then by priority (high, medium, low)
    const sorted = [...filteredTasks].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      const pWeights = { high: 3, medium: 2, low: 1 };
      return pWeights[b.priority] - pWeights[a.priority];
    });

    listContainer.innerHTML = sorted.map(task => {
      const escapedTitle = appRouter.escapeHTML(task.title);
      const escapedCategory = appRouter.escapeHTML(task.category);
      const dueFormatted = task.due ? this.formatDate(task.due) : 'No due date';
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = task.due && task.due < today && !task.completed;
      
      return `
        <div class="task-card ${task.completed ? 'completed' : ''}" id="task-${task.id}">
          <label class="task-checkbox-container">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="todoApp.toggleTask(${task.id})">
            <span class="checkmark"></span>
          </label>
          
          <div class="task-details-col">
            <div class="task-card-title">${escapedTitle}</div>
            <div class="task-meta-row">
              <span class="badge badge-priority-${task.priority}">${task.priority}</span>
              <span class="badge badge-tag">${escapedCategory}</span>
              <span class="task-due-date ${isOverdue ? 'overdue-text' : ''}">
                <i data-lucide="calendar"></i>
                <span>${dueFormatted}</span>
              </span>
              ${isOverdue ? '<span class="badge badge-overdue">Overdue!</span>' : ''}
            </div>
          </div>

          <button class="btn-icon" onclick="todoApp.deleteTask(${task.id})" title="Delete Task" style="color: var(--accent-red)">
            <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00'); // append time to avoid timezone offset issue
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// Global Instance
let todoApp;
document.addEventListener("DOMContentLoaded", () => {
  todoApp = new TodoApp();
});
