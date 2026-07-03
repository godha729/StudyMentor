/* ==========================================
   AETHER STUDY SUITE - POMODORO TIMER DRIVER
   ========================================== */

class PomodoroTimer {
  constructor() {
    this.modes = {
      work: 25 * 60, // 25 mins
      short: 5 * 60,  // 5 mins
      long: 15 * 60   // 15 mins
    };
    this.currentMode = 'work';
    this.timeLeft = this.modes[this.currentMode];
    this.timerId = null;
    this.isMuted = false;
    this.isTicking = false;
    
    // Circle math
    this.circleRadius = 130;
    this.circumference = 2 * Math.PI * this.circleRadius; // ~816.8
    
    this.init();
  }

  init() {
    // Mode button event listeners
    const modeBtns = document.querySelectorAll('.pomo-modes .btn-pomo-mode');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchMode(btn.getAttribute('data-mode'));
      });
    });

    // Control buttons listeners
    const toggleBtn = document.getElementById('pomo-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleTimer());
    }

    const resetBtn = document.getElementById('pomo-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetTimer());
    }

    const soundBtn = document.getElementById('pomo-sound-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => this.toggleMute());
    }

    // Settings listeners
    const tickingCheck = document.getElementById('pomo-sound-ticking');
    if (tickingCheck) {
      tickingCheck.addEventListener('change', (e) => {
        this.isTicking = e.target.checked;
      });
    }

    // Set SVG stroke variables
    const circleBar = document.getElementById('pomo-progress-circle');
    if (circleBar) {
      circleBar.style.strokeDasharray = `${this.circumference}`;
      circleBar.style.strokeDashoffset = '0';
    }

    // Request notification permission early
    const notifCheck = document.getElementById('pomo-desktop-notifications');
    if (notifCheck) {
      notifCheck.addEventListener('change', (e) => {
        if (e.target.checked && Notification.permission !== 'granted') {
          Notification.requestPermission();
        }
      });
    }

    this.updateDisplay();
  }

  switchMode(mode) {
    this.pauseTimer();
    this.currentMode = mode;
    this.timeLeft = this.modes[mode];
    
    // Update SVG stroke color based on mode
    const circleBar = document.getElementById('pomo-progress-circle');
    if (circleBar) {
      if (mode === 'work') {
        circleBar.style.stroke = '#a855f7'; // Purple
      } else if (mode === 'short') {
        circleBar.style.stroke = '#0ea5e9'; // Cyan
      } else {
        circleBar.style.stroke = '#10b981'; // Green
      }
    }

    const phaseText = document.getElementById('pomo-phase-text');
    if (phaseText) {
      if (mode === 'work') phaseText.textContent = 'Focus Time';
      else if (mode === 'short') phaseText.textContent = 'Short Break';
      else phaseText.textContent = 'Long Break';
    }

    this.updateDisplay();
  }

  toggleTimer() {
    if (this.timerId) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    if (this.timerId) return;

    // Switch Icon to Pause
    const icon = document.getElementById('pomo-toggle-icon');
    if (icon) {
      icon.setAttribute('data-lucide', 'pause');
      lucide.createIcons();
    }

    this.timerId = setInterval(() => {
      this.timeLeft--;
      
      // Update global quiz countdown inside quiz module if counting down focus time
      if (this.currentMode === 'work' && typeof quizApp !== 'undefined') {
        quizApp.tickTimer();
      }

      if (this.isTicking && !this.isMuted) {
        this.playTickSound();
      }

      if (this.timeLeft <= 0) {
        this.completeSession();
      }

      this.updateDisplay();
    }, 1000);
  }

  pauseTimer() {
    if (!this.timerId) return;
    clearInterval(this.timerId);
    this.timerId = null;

    // Switch Icon to Play
    const icon = document.getElementById('pomo-toggle-icon');
    if (icon) {
      icon.setAttribute('data-lucide', 'play');
      lucide.createIcons();
    }
  }

  resetTimer() {
    this.pauseTimer();
    this.timeLeft = this.modes[this.currentMode];
    this.updateDisplay();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const icon = document.getElementById('pomo-sound-icon');
    if (icon) {
      icon.setAttribute('data-lucide', this.isMuted ? 'volume-x' : 'volume-2');
      lucide.createIcons();
    }
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Update digital text
    const digits = document.getElementById('pomo-digits');
    if (digits) {
      digits.textContent = formattedTime;
    }

    // Update browser title bar
    const phaseLabel = this.currentMode === 'work' ? 'Focus' : 'Break';
    document.title = `(${formattedTime}) ${phaseLabel} | Aether Study`;

    // Update Progress Circular Dash Offset
    const circleBar = document.getElementById('pomo-progress-circle');
    if (circleBar) {
      const maxTime = this.modes[this.currentMode];
      const ratio = this.timeLeft / maxTime;
      const offset = this.circumference * (1 - ratio);
      circleBar.style.strokeDashoffset = `${offset}`;
    }
  }

  completeSession() {
    this.pauseTimer();
    
    // Play completion sound chime
    if (!this.isMuted) {
      this.playChimeSound();
    }

    // Trigger local storage save stats
    if (this.currentMode === 'work') {
      const currentStats = db.load('pomo_sessions_count') || 0;
      db.save('pomo_sessions_count', currentStats + 1);

      // Record in weekly streak heatmap (keyed by day name)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayName = dayNames[new Date().getDay()];
      const streakData = db.load('weekly_streak') || {};
      streakData[todayName] = (streakData[todayName] || 0) + 1;
      db.save('weekly_streak', streakData);

      appRouter.updateDashboardStats();
    }

    // Desktop/Browser Notification trigger
    const enabledNotifications = document.getElementById('pomo-desktop-notifications')?.checked;
    const title = this.currentMode === 'work' ? 'Focus Session Completed!' : 'Break Completed!';
    const message = this.currentMode === 'work' ? 'Great work! Take a short break.' : 'Time to get back to studying!';

    if (enabledNotifications && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }

    // Alert fallbacks
    alert(`${title}\n${message}`);

    // Autotoggle to break/work mode
    if (this.currentMode === 'work') {
      const modeBtns = document.querySelectorAll('.pomo-modes .btn-pomo-mode');
      modeBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-mode') === 'short') {
          btn.classList.add('active');
        }
      });
      this.switchMode('short');
    } else {
      const modeBtns = document.querySelectorAll('.pomo-modes .btn-pomo-mode');
      modeBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-mode') === 'work') {
          btn.classList.add('active');
        }
      });
      this.switchMode('work');
    }
  }

  /* ==========================================
     SYNTHESIZED WEB AUDIO API SYSTEM
     ========================================== */
  playTickSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime); // quick high frequency click
      
      gain.gain.setValueAtTime(0.015, ctx.currentTime); // soft tick
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  }

  playChimeSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Beautiful retro melody chime (3 ascending notes)
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);
        
        gain.gain.setValueAtTime(0.0, ctx.currentTime + index * 0.15);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + index * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.15 + 0.6);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + index * 0.15);
        osc.stop(ctx.currentTime + index * 0.15 + 0.7);
      });
    } catch (e) {
      console.warn("Audio Context failed:", e);
    }
  }
}

// Global Instance
let pomoTimer;
document.addEventListener("DOMContentLoaded", () => {
  pomoTimer = new PomodoroTimer();
});
