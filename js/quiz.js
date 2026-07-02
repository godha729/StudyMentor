/* ==========================================
   AETHER STUDY SUITE - QUIZ HUB & REMINDERS
   ========================================== */

class QuizSuite {
  constructor() {
    this.quizzes = [];
    this.activeQuiz = null;
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
    this.score = 0;
    this.hasAnswered = false; // block multiple submissions per question

    // Reminder timer configuration
    this.reminderEnabled = true;
    this.reminderIntervalMins = 10;
    this.secondsRemaining = this.reminderIntervalMins * 60;
    this.reminderTimerId = null;

    this.init();
  }

  init() {
    this.loadQuizzes();
    this.initReminderTimer();

    // Event listeners
    const btnShowCreate = document.getElementById('btn-show-create-quiz');
    if (btnShowCreate) btnShowCreate.addEventListener('click', () => this.showSubView('creator'));

    const btnCancelCreate = document.getElementById('btn-cancel-quiz-create');
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', () => this.showSubView('default'));

    const creatorForm = document.getElementById('quiz-create-form');
    if (creatorForm) {
      creatorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveCustomQuiz();
      });
    }

    const btnAddQuestionBuilder = document.getElementById('btn-add-builder-question');
    if (btnAddQuestionBuilder) {
      btnAddQuestionBuilder.addEventListener('click', () => this.addQuestionToBuilder());
    }

    // Quiz player control listeners
    const quitBtn = document.getElementById('player-quit-btn');
    if (quitBtn) quitBtn.addEventListener('click', () => this.quitQuiz());

    const nextBtn = document.getElementById('player-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', () => this.advanceQuestion());

    // Quiz results listeners
    const closeResultsBtn = document.getElementById('results-close-btn');
    if (closeResultsBtn) closeResultsBtn.addEventListener('click', () => this.showSubView('default'));

    const retryResultsBtn = document.getElementById('results-retry-btn');
    if (retryResultsBtn) {
      retryResultsBtn.addEventListener('click', () => {
        if (this.activeQuiz) this.startQuiz(this.activeQuiz.id);
      });
    }

    // Reminder setting controls
    const toggleReminder = document.getElementById('quiz-reminder-toggle');
    if (toggleReminder) {
      toggleReminder.addEventListener('change', (e) => {
        this.reminderEnabled = e.target.checked;
        const panel = document.querySelector('.reminder-status-box');
        const desc = document.getElementById('reminder-status-desc');
        const title = document.getElementById('reminder-status-title');
        
        if (this.reminderEnabled) {
          if (panel) panel.style.opacity = '1';
          if (title) title.textContent = 'Quiz Reminder Active';
          if (desc) desc.textContent = `Take a quick quiz every ${this.reminderIntervalMins} mins of study time.`;
        } else {
          if (panel) panel.style.opacity = '0.4';
          if (title) title.textContent = 'Quiz Reminders Paused';
          if (desc) desc.textContent = 'Enable reminders in the Quiz Hub tab.';
        }
      });
    }

    const intervalSlider = document.getElementById('quiz-reminder-interval');
    if (intervalSlider) {
      intervalSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        this.reminderIntervalMins = parseInt(val);
        document.getElementById('reminder-interval-val').textContent = `${val} min`;
        this.secondsRemaining = this.reminderIntervalMins * 60;
        this.updateDashboardCountdown();

        const desc = document.getElementById('reminder-status-desc');
        if (this.reminderEnabled && desc) {
          desc.textContent = `Take a quick quiz every ${val} mins of study time.`;
        }
      });
    }

    // Reminder modal overlay action buttons
    const acceptBtn = document.getElementById('reminder-accept-btn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        this.closeReminderModal();
        appRouter.switchTab('quiz');
        // Start default quiz or random quiz
        if (this.quizzes.length > 0) {
          this.startQuiz(this.quizzes[0].id);
        }
      });
    }

    const snoozeBtn = document.getElementById('reminder-snooze-btn');
    if (snoozeBtn) {
      snoozeBtn.addEventListener('click', () => {
        this.closeReminderModal();
        this.snoozeReminder(5);
      });
    }
  }

  loadQuizzes() {
    this.quizzes = db.load('quizzes') || [
      {
        id: 101,
        title: 'Cognitive Science & Spaced Study Habits',
        questions: [
          {
            q: "Which study technique involves testing yourself on material instead of just re-reading it?",
            options: ["Active Recall", "Passive Highlighting", "Text Summarization", "Auditory Lecture Listening"],
            correct: 0
          },
          {
            q: "What does the Spaced Repetition method prevent by reinforcing memories over lengthening intervals?",
            options: ["Attentional Blinking", "Memory Overload", "The Forgetting Curve", "Cognitive Dissonance"],
            correct: 2
          },
          {
            q: "Under the Pomodoro Technique, what is the typical length of a standard focus interval?",
            options: ["10 minutes", "25 minutes", "50 minutes", "90 minutes"],
            correct: 1
          },
          {
            q: "Who is widely considered the pioneer of modern memory spacing research?",
            options: ["Ivan Pavlov", "Hermann Ebbinghaus", "B.F. Skinner", "Sigmund Freud"],
            correct: 1
          },
          {
            q: "What is the primary benefit of chunking information during study?",
            options: ["Reduces cognitive load on working memory", "Increases reading speed", "Automates physical motor skills", "Enhances long-term auditory storage"],
            correct: 0
          },
          {
            q: "Which CSS property is crucial to achieving glassmorphism visual styles?",
            options: ["filter", "backdrop-filter", "clip-path", "mix-blend-mode"],
            correct: 1
          },
          {
            q: "In JavaScript, what mechanism allows you to save user data locally that persists even after closing the browser?",
            options: ["sessionStorage", "cookieJar", "volatileStorage", "localStorage"],
            correct: 3
          },
          {
            q: "Which HTML5 semantic tag is most appropriate for enclosing independent self-contained content like a forum post?",
            options: ["<section>", "<article>", "<aside>", "<details>"],
            correct: 1
          },
          {
            q: "What does 'DRY' stand for in software engineering principles?",
            options: ["Don't Repeat Yourself", "Do Repeat Yearly", "Debugging Resolves Yesterday", "Database Relational Yield"],
            correct: 0
          },
          {
            q: "In Web Development, which HTTP status code represents a resource 'Not Found' error?",
            options: ["200", "403", "404", "500"],
            correct: 2
          }
        ]
      }
    ];

    this.renderQuizList();
  }

  saveQuizzes() {
    db.save('quizzes', this.quizzes);
    this.renderQuizList();
  }

  renderQuizList() {
    const listEl = document.getElementById('quizzes-container');
    if (!listEl) return;

    listEl.innerHTML = this.quizzes.map(quiz => `
      <div class="quiz-list-card">
        <div class="quiz-card-head">
          <h4>${appRouter.escapeHTML(quiz.title)}</h4>
          <span class="quiz-q-count">${quiz.questions.length} Qs</span>
        </div>
        <div class="quiz-card-desc">Practice multiple choice questions with active analytics feedback.</div>
        <div class="quiz-card-actions">
          <button class="btn btn-primary btn-sm" onclick="quizApp.startQuiz(${quiz.id})">
            <i data-lucide="play" style="width:12px; height:12px; margin-right:4px;"></i> Take Quiz
          </button>
          <button class="btn btn-secondary btn-sm" onclick="quizApp.deleteQuiz(${quiz.id})" style="color: var(--accent-red)">
            Delete
          </button>
        </div>
      </div>
    `).join('');

    setTimeout(() => lucide.createIcons(), 10);
  }

  showSubView(view) {
    const defaultEl = document.getElementById('quiz-default-info-panel');
    const creatorEl = document.getElementById('quiz-creator-panel');
    const playerEl = document.getElementById('quiz-player-panel');
    const resultsEl = document.getElementById('quiz-results-panel');

    defaultEl.classList.add('hidden');
    creatorEl.classList.add('hidden');
    playerEl.classList.add('hidden');
    resultsEl.classList.add('hidden');

    if (view === 'default') {
      defaultEl.classList.remove('hidden');
      this.renderQuizList();
    } else if (view === 'creator') {
      creatorEl.classList.remove('hidden');
      this.resetQuestionBuilder();
    } else if (view === 'player') {
      playerEl.classList.remove('hidden');
    } else if (view === 'results') {
      resultsEl.classList.remove('hidden');
    }
  }

  /* ==========================================
     QUIZ CREATOR SYSTEM
     ========================================== */
  resetQuestionBuilder() {
    const list = document.getElementById('builder-questions-list');
    if (list) list.innerHTML = '';
    
    // Start with 1 question input
    this.addQuestionToBuilder();
    document.getElementById('quiz-title').value = '';
  }

  addQuestionToBuilder() {
    const list = document.getElementById('builder-questions-list');
    if (!list) return;

    const qCount = list.children.length;
    const card = document.createElement('div');
    card.className = 'builder-q-card';
    card.innerHTML = `
      <h5>Question ${qCount + 1}</h5>
      <button type="button" class="btn-icon btn-delete-q" onclick="this.parentElement.remove(); quizApp.renumberBuilderQuestions();" title="Remove question" style="color: var(--accent-red);">
        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
      </button>
      <div class="form-group">
        <label>Question text</label>
        <input type="text" class="q-text" placeholder="e.g. What is the value of Pi?" required>
      </div>
      <div class="form-row" style="margin-bottom: 8px;">
        <div class="form-group">
          <label>Option A</label>
          <input type="text" class="q-opt-0" placeholder="Option A" required>
        </div>
        <div class="form-group">
          <label>Option B</label>
          <input type="text" class="q-opt-1" placeholder="Option B" required>
        </div>
      </div>
      <div class="form-row" style="margin-bottom: 8px;">
        <div class="form-group">
          <label>Option C</label>
          <input type="text" class="q-opt-2" placeholder="Option C" required>
        </div>
        <div class="form-group">
          <label>Option D</label>
          <input type="text" class="q-opt-3" placeholder="Option D" required>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Correct Option</label>
        <select class="q-correct">
          <option value="0">Option A</option>
          <option value="1">Option B</option>
          <option value="2">Option C</option>
          <option value="3">Option D</option>
        </select>
      </div>
    `;
    list.appendChild(card);
    setTimeout(() => lucide.createIcons(), 10);
  }

  renumberBuilderQuestions() {
    const list = document.getElementById('builder-questions-list');
    if (!list) return;
    Array.from(list.children).forEach((card, idx) => {
      card.querySelector('h5').textContent = `Question ${idx + 1}`;
    });
  }

  saveCustomQuiz() {
    const titleEl = document.getElementById('quiz-title');
    if (!titleEl || !titleEl.value.trim()) return;

    const cards = document.querySelectorAll('.builder-questions-list .builder-q-card');
    if (cards.length === 0) {
      alert("Please add at least 1 question before saving.");
      return;
    }

    const quizQuestions = [];
    let isValid = true;

    cards.forEach(card => {
      const questionText = card.querySelector('.q-text').value.trim();
      const o0 = card.querySelector('.q-opt-0').value.trim();
      const o1 = card.querySelector('.q-opt-1').value.trim();
      const o2 = card.querySelector('.q-opt-2').value.trim();
      const o3 = card.querySelector('.q-opt-3').value.trim();
      const correctIdx = parseInt(card.querySelector('.q-correct').value);

      if (!questionText || !o0 || !o1 || !o2 || !o3) {
        isValid = false;
        return;
      }

      quizQuestions.push({
        q: questionText,
        options: [o0, o1, o2, o3],
        correct: correctIdx
      });
    });

    if (!isValid) {
      alert("Please fill out all fields on all questions.");
      return;
    }

    const newQuiz = {
      id: Date.now(),
      title: titleEl.value.trim(),
      questions: quizQuestions
    };

    this.quizzes.push(newQuiz);
    this.saveQuizzes();
    this.showSubView('default');
  }

  deleteQuiz(quizId) {
    if (quizId === 101) {
      alert("You cannot delete the default learning habits quiz!");
      return;
    }
    if (confirm("Are you sure you want to delete this quiz?")) {
      this.quizzes = this.quizzes.filter(q => q.id !== quizId);
      this.saveQuizzes();
    }
  }

  /* ==========================================
     ACTIVE QUIZ RUNNER / PLAYER
     ========================================== */
  startQuiz(quizId) {
    const quiz = this.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    this.activeQuiz = quiz;
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
    this.score = 0;
    this.hasAnswered = false;

    this.showSubView('player');
    document.getElementById('player-quiz-title').textContent = quiz.title;
    this.renderQuestion();
  }

  renderQuestion() {
    this.hasAnswered = false;
    const questions = this.activeQuiz.questions;
    const question = questions[this.currentQuestionIndex];

    // Hide feedback box
    document.getElementById('player-feedback-box').className = 'quiz-feedback-box hidden';
    
    // Hide Next button until answer selected
    document.getElementById('player-next-btn').classList.add('hidden');

    // Update Counter & Progress Bar
    document.getElementById('player-question-counter').textContent = `Question ${this.currentQuestionIndex + 1}/${questions.length}`;
    const progressPct = ((this.currentQuestionIndex) / questions.length) * 100;
    document.getElementById('player-progress-bar-fill').style.width = `${progressPct}%`;

    // Populate question text
    document.getElementById('player-question-text').textContent = question.q;

    // Render Options
    const optionsContainer = document.getElementById('player-options-container');
    optionsContainer.innerHTML = question.options.map((opt, idx) => `
      <button class="btn-quiz-option" onclick="quizApp.selectAnswer(${idx})">
        <span style="font-weight:700; margin-right:8px;">${String.fromCharCode(65 + idx)}.</span>
        <span>${appRouter.escapeHTML(opt)}</span>
      </button>
    `).join('');
  }

  selectAnswer(selectedOptionIndex) {
    if (this.hasAnswered) return;
    this.hasAnswered = true;

    const question = this.activeQuiz.questions[this.currentQuestionIndex];
    const optionButtons = document.querySelectorAll('#player-options-container .btn-quiz-option');
    
    // Disable all options
    optionButtons.forEach(btn => btn.disabled = true);

    const isCorrect = (selectedOptionIndex === question.correct);
    
    // Apply styling classes to correct and incorrect options
    optionButtons[question.correct].classList.add('correct');
    if (!isCorrect) {
      optionButtons[selectedOptionIndex].classList.add('incorrect');
      this.playIncorrectChime();
    } else {
      this.score++;
      this.playCorrectChime();
    }

    // Reveal Feedback box
    const feedbackBox = document.getElementById('player-feedback-box');
    const feedbackText = document.getElementById('player-feedback-text');
    const feedbackIcon = document.getElementById('player-feedback-icon');

    feedbackBox.classList.remove('hidden');
    if (isCorrect) {
      feedbackBox.className = 'quiz-feedback-box correct';
      feedbackIcon.innerHTML = `<i data-lucide="check-circle" style="color:var(--accent-green)"></i>`;
      feedbackText.textContent = "Correct Answer! Excellent job.";
    } else {
      feedbackBox.className = 'quiz-feedback-box incorrect';
      feedbackIcon.innerHTML = `<i data-lucide="x-circle" style="color:var(--accent-red)"></i>`;
      feedbackText.textContent = `Incorrect. The correct answer was: "${question.options[question.correct]}".`;
    }

    document.getElementById('player-next-btn').classList.remove('hidden');
    lucide.createIcons();
  }

  advanceQuestion() {
    this.currentQuestionIndex++;
    const questions = this.activeQuiz.questions;

    if (this.currentQuestionIndex >= questions.length) {
      this.finishQuiz();
    } else {
      this.renderQuestion();
    }
  }

  finishQuiz() {
    this.showSubView('results');

    const total = this.activeQuiz.questions.length;
    const scorePct = Math.round((this.score / total) * 100);

    // Save score to history
    const quizStats = db.load('quiz_scores_history') || [];
    quizStats.push({
      quizId: this.activeQuiz.id,
      title: this.activeQuiz.title,
      score: this.score,
      total: total,
      percentage: scorePct,
      date: new Date().toISOString()
    });
    db.save('quiz_scores_history', quizStats);
    
    // Update displays
    appRouter.updateDashboardStats();

    // Render results layout contents
    document.getElementById('results-score-pct').textContent = `${scorePct}%`;
    document.getElementById('results-score-fraction').textContent = `You scored ${this.score} out of ${total} questions.`;

    const msgEl = document.getElementById('results-message-text');
    if (scorePct >= 90) {
      msgEl.textContent = "Absolute mastery! You've nailed every concept perfectly. Keep up this incredible performance!";
    } else if (scorePct >= 70) {
      msgEl.textContent = "Great score! You understand the core details. Review missed cards for a perfect 100% next time.";
    } else if (scorePct >= 50) {
      msgEl.textContent = "Passed! There's room for improvement. Try studying your flashcards again before re-attempting.";
    } else {
      msgEl.textContent = "Needs revision. Do not get discouraged! Reset and use the Pomodoro tool to focus on the study decks.";
    }
  }

  quitQuiz() {
    if (confirm("Are you sure you want to quit? Your current progress will not be saved.")) {
      this.showSubView('default');
      this.activeQuiz = null;
    }
  }

  /* ==========================================
     REMINDER SCHEDULER LOGIC
     ========================================== */
  initReminderTimer() {
    // Check ticker every second. Run locally without relying on active Pomodoro timer loop
    setInterval(() => {
      if (this.reminderEnabled) {
        this.secondsRemaining--;
        this.updateDashboardCountdown();

        if (this.secondsRemaining <= 0) {
          this.triggerReminderQuiz();
        }
      }
    }, 1000);
  }

  tickTimer() {
    // Hook called from Pomodoro to sync up countdown if desired, but our direct setInterval already ticks it safely
  }

  updateDashboardCountdown() {
    const mins = Math.floor(this.secondsRemaining / 60);
    const secs = this.secondsRemaining % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    const countEl = document.getElementById('dashboard-quiz-countdown');
    if (countEl) {
      countEl.textContent = formatted;
    }
  }

  triggerReminderQuiz() {
    this.secondsRemaining = this.reminderIntervalMins * 60; // reset
    this.updateDashboardCountdown();

    const notifCheck = document.getElementById('pomo-desktop-notifications')?.checked;
    if (notifCheck && Notification.permission === 'granted') {
      new Notification("Knowledge Check!", {
        body: "Time for a quick study review quiz to reinforce your learning."
      });
    }

    // Reveal custom overlay modal in page
    const modal = document.getElementById('quiz-reminder-modal');
    if (modal) modal.classList.add('active');
  }

  closeReminderModal() {
    const modal = document.getElementById('quiz-reminder-modal');
    if (modal) modal.classList.remove('active');
  }

  snoozeReminder(minutes) {
    this.secondsRemaining = minutes * 60;
    this.updateDashboardCountdown();
  }

  /* ==========================================
     AUDIO FEEDBACK CHIMES
     ========================================== */
  playCorrectChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  playIncorrectChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220.00, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(196.00, ctx.currentTime + 0.12); // G3

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {}
  }
}

// Global Instance
let quizApp;
document.addEventListener("DOMContentLoaded", () => {
  quizApp = new QuizSuite();
});
