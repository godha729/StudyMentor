/* ==========================================
   AETHER STUDY SUITE - FLASHCARD CONTROLLER
   ========================================== */

class FlashcardSuite {
  constructor() {
    this.decks = [];
    this.selectedDeck = null;
    this.studySessionQueue = [];
    this.currentStudyIndex = 0;
    this.sessionReviewsCompleted = 0;

    this.init();
  }

  init() {
    this.loadDecks();

    // Event listeners
    const btnShowCreate = document.getElementById('btn-show-create-deck');
    const btnEmptyCreate = document.getElementById('btn-empty-create-deck');
    if (btnShowCreate) btnShowCreate.addEventListener('click', () => this.showCreateDeckModal());
    if (btnEmptyCreate) btnEmptyCreate.addEventListener('click', () => this.showCreateDeckModal());

    const createForm = document.getElementById('create-deck-form');
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createDeck();
      });
    }

    const backToDecksBtn = document.getElementById('btn-back-to-decks');
    if (backToDecksBtn) {
      backToDecksBtn.addEventListener('click', () => this.exitStudyMode());
    }

    const backManageBtn = document.getElementById('btn-manage-back');
    if (backManageBtn) {
      backManageBtn.addEventListener('click', () => this.exitManageMode());
    }

    const deleteDeckBtn = document.getElementById('btn-delete-deck');
    if (deleteDeckBtn) {
      deleteDeckBtn.addEventListener('click', () => this.deleteSelectedDeck());
    }

    const addCardForm = document.getElementById('add-card-form');
    if (addCardForm) {
      addCardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addCardToDeck();
      });
    }

    // Card flipper click interaction
    const cardContainer = document.getElementById('flashcard-3d-container');
    if (cardContainer) {
      cardContainer.addEventListener('click', () => this.flipCard());
    }

    const flipBtn = document.getElementById('btn-flip-card');
    if (flipBtn) {
      flipBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent double flip trigger on container click
        this.flipCard();
      });
    }

    // SRS Grading options listeners
    const srsButtons = document.querySelectorAll('#card-srs-actions button');
    srsButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent flip trigger
        const grade = btn.getAttribute('data-srs');
        this.processSRSRating(grade);
      });
    });
  }

  loadDecks() {
    this.decks = db.load('flashcard_decks') || [
      {
        id: 1,
        name: 'Computer Science: Web Dev Terminology',
        cards: [
          { front: 'API', back: 'Application Programming Interface - a set of protocols for building and integrating software applications.' },
          { front: 'DOM', back: 'Document Object Model - an programming API for HTML and XML documents.' },
          { front: 'CSS Glassmorphism', back: 'A design style utilizing opacity, glass blur (backdrop-filter), border-radius, and thin light borders.' },
          { front: 'LocalStorage Limit', back: 'Generally 5MB per origin in modern browsers.' }
        ]
      },
      {
        id: 2,
        name: 'General Science: Physiology',
        cards: [
          { front: 'Powerhouse of the Cell', back: 'Mitochondria' },
          { front: 'Red Blood Cells function', back: 'Transports oxygen throughout the body using hemoglobin molecules.' },
          { front: 'Synapse', back: 'The gap/junction across which nerve impulses pass from one neuron to another.' }
        ]
      }
    ];
    this.renderDecks();
  }

  saveDecks() {
    db.save('flashcard_decks', this.decks);
    appRouter.updateDashboardStats();
  }

  renderDecks() {
    const decksContainer = document.getElementById('decks-container');
    if (!decksContainer) return;

    if (this.decks.length === 0) {
      decksContainer.innerHTML = `<li class="text-secondary" style="font-size:12px; padding:10px 8px; text-align:center;">No decks. Click + to add.</li>`;
      return;
    }

    decksContainer.innerHTML = this.decks.map(deck => `
      <li class="deck-list-item ${this.selectedDeck && this.selectedDeck.id === deck.id ? 'active' : ''}" onclick="flashcardsApp.selectDeck(${deck.id})">
        <div class="deck-title-row">
          <span class="deck-title" title="${appRouter.escapeHTML(deck.name)}">${appRouter.escapeHTML(deck.name)}</span>
          <span class="deck-count">${deck.cards.length} cards</span>
        </div>
        <div class="deck-action-buttons">
          <button class="btn btn-primary btn-xs" onclick="event.stopPropagation(); flashcardsApp.startStudyMode(${deck.id})">
            <i data-lucide="play" style="width:10px; height:10px; margin-right:2px;"></i> Study
          </button>
          <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); flashcardsApp.startManageMode(${deck.id})">
            <i data-lucide="edit" style="width:10px; height:10px; margin-right:2px;"></i> Manage
          </button>
        </div>
      </li>
    `).join('');

    setTimeout(() => lucide.createIcons(), 10);
  }

  selectDeck(deckId) {
    this.selectedDeck = this.decks.find(d => d.id === deckId);
    this.renderDecks();
  }

  showCreateDeckModal() {
    const modal = document.getElementById('create-deck-modal');
    if (modal) modal.classList.add('active');
  }

  closeCreateDeckModal() {
    const modal = document.getElementById('create-deck-modal');
    if (modal) modal.classList.remove('active');
    const input = document.getElementById('new-deck-name');
    if (input) input.value = '';
  }

  createDeck() {
    const input = document.getElementById('new-deck-name');
    if (!input || !input.value.trim()) return;

    const newDeck = {
      id: Date.now(),
      name: input.value.trim(),
      cards: []
    };

    this.decks.push(newDeck);
    this.saveDecks();
    this.renderDecks();
    this.closeCreateDeckModal();
  }

  deleteSelectedDeck() {
    if (!this.selectedDeck) return;
    if (confirm(`Are you sure you want to delete the deck "${this.selectedDeck.name}"?`)) {
      this.decks = this.decks.filter(d => d.id !== this.selectedDeck.id);
      this.selectedDeck = null;
      this.saveDecks();
      this.renderDecks();
      this.showSubView('empty');
    }
  }

  showSubView(view) {
    const emptyView = document.getElementById('deck-empty-view');
    const studyView = document.getElementById('deck-study-view');
    const manageView = document.getElementById('deck-manage-view');

    emptyView.classList.remove('active');
    studyView.classList.remove('active');
    manageView.classList.remove('active');

    if (view === 'empty') emptyView.classList.add('active');
    else if (view === 'study') studyView.classList.add('active');
    else if (view === 'manage') manageView.classList.add('active');
  }

  /* ==========================================
     STUDY MODE ENGINE
     ========================================== */
  startStudyMode(deckId) {
    const deck = this.decks.find(d => d.id === deckId);
    if (!deck) return;
    
    if (deck.cards.length === 0) {
      alert("This deck has no cards! Add some cards in 'Manage' mode first.");
      this.startManageMode(deckId);
      return;
    }

    this.selectedDeck = deck;
    this.studySessionQueue = [...deck.cards]; // clone cards for session
    this.currentStudyIndex = 0;
    this.sessionReviewsCompleted = 0;

    this.showSubView('study');
    
    // Set Header titles
    document.getElementById('study-deck-name').textContent = deck.name;
    
    this.renderCurrentStudyCard();
  }

  renderCurrentStudyCard() {
    if (this.studySessionQueue.length === 0 || this.currentStudyIndex >= this.studySessionQueue.length) {
      // Completed current batch
      this.finishStudySession();
      return;
    }

    const card = this.studySessionQueue[this.currentStudyIndex];
    
    // Reset flip animation
    const cardEl = document.querySelector('.flashcard-card');
    if (cardEl) cardEl.classList.remove('flipped');

    // Toggle actions back to Reveal mode
    document.getElementById('card-srs-actions').classList.add('hidden');
    document.getElementById('card-flip-prompt').classList.remove('hidden');

    // Populate contents
    document.getElementById('card-front-content').textContent = card.front;
    document.getElementById('card-back-content').textContent = card.back;

    // Update progress bars & text
    const total = this.studySessionQueue.length;
    const progressPct = (this.currentStudyIndex / total) * 100;
    document.getElementById('study-progress-bar-fill').style.width = `${progressPct}%`;
    document.getElementById('study-card-counter').textContent = `Card ${this.currentStudyIndex + 1} of ${total}`;

    setTimeout(() => lucide.createIcons(), 10);
  }

  flipCard() {
    const cardEl = document.querySelector('.flashcard-card');
    if (!cardEl) return;

    if (!cardEl.classList.contains('flipped')) {
      cardEl.classList.add('flipped');
      // Show SRS choices, hide reveal hint
      document.getElementById('card-srs-actions').classList.remove('hidden');
      document.getElementById('card-flip-prompt').classList.add('hidden');
    } else {
      cardEl.classList.remove('flipped');
      document.getElementById('card-srs-actions').classList.add('hidden');
      document.getElementById('card-flip-prompt').classList.remove('hidden');
    }
  }

  processSRSRating(grade) {
    const currentCard = this.studySessionQueue[this.currentStudyIndex];
    this.sessionReviewsCompleted++;

    // Increment global statistics reviewed count
    const reviewedTotal = db.load('flashcards_reviewed_count') || 0;
    db.save('flashcards_reviewed_count', reviewedTotal + 1);

    if (grade === 'easy') {
      // Remove card from current queue (user knows it)
      this.currentStudyIndex++;
    } else if (grade === 'medium') {
      // Requeue card in the middle of current session
      const offset = Math.ceil((this.studySessionQueue.length - this.currentStudyIndex) / 2);
      this.studySessionQueue.splice(this.currentStudyIndex + offset, 0, currentCard);
      this.currentStudyIndex++;
    } else if (grade === 'hard') {
      // Requeue card near the immediate end of current session
      this.studySessionQueue.push(currentCard);
      this.currentStudyIndex++;
    }

    this.renderCurrentStudyCard();
  }

  finishStudySession() {
    alert(`Study session completed!\nYou reviewed ${this.sessionReviewsCompleted} cards in this session.`);
    appRouter.updateDashboardStats();
    this.exitStudyMode();
  }

  exitStudyMode() {
    this.showSubView('empty');
    this.renderDecks();
  }

  /* ==========================================
     MANAGE CARD DETAILS MODE
     ========================================== */
  startManageMode(deckId) {
    const deck = this.decks.find(d => d.id === deckId);
    if (!deck) return;

    this.selectedDeck = deck;
    this.showSubView('manage');

    document.getElementById('manage-deck-name').textContent = `Manage: ${deck.name}`;
    this.renderManageCardsTable();
  }

  renderManageCardsTable() {
    const tableBody = document.getElementById('manage-cards-list');
    if (!tableBody) return;

    if (!this.selectedDeck || this.selectedDeck.cards.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; color: var(--text-secondary); padding: 20px;">
            No cards in this deck. Use the form above to add some cards.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = this.selectedDeck.cards.map((card, idx) => `
      <tr>
        <td style="font-weight: 500;">${appRouter.escapeHTML(card.front)}</td>
        <td style="color: var(--text-secondary);">${appRouter.escapeHTML(card.back)}</td>
        <td style="text-align: center;">
          <button class="btn-icon" onclick="flashcardsApp.deleteCard(${idx})" title="Delete card" style="color: var(--accent-red); display: inline-flex;">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
          </button>
        </td>
      </tr>
    `).join('');

    setTimeout(() => lucide.createIcons(), 10);
  }

  addCardToDeck() {
    const frontEl = document.getElementById('card-front-input');
    const backEl = document.getElementById('card-back-input');

    if (!frontEl || !backEl || !frontEl.value.trim() || !backEl.value.trim()) return;
    if (!this.selectedDeck) return;

    const newCard = {
      front: frontEl.value.trim(),
      back: backEl.value.trim()
    };

    this.selectedDeck.cards.push(newCard);
    this.saveDecks();
    this.renderManageCardsTable();
    this.renderDecks();

    frontEl.value = '';
    backEl.value = '';
    frontEl.focus();
  }

  deleteCard(cardIndex) {
    if (!this.selectedDeck) return;
    this.selectedDeck.cards.splice(cardIndex, 1);
    this.saveDecks();
    this.renderManageCardsTable();
    this.renderDecks();
  }

  exitManageMode() {
    this.showSubView('empty');
    this.renderDecks();
  }
}

// Global Instance
let flashcardsApp;
document.addEventListener("DOMContentLoaded", () => {
  flashcardsApp = new FlashcardSuite();
});
