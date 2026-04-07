// app.js — Main application logic
const App = (() => {
  // Card data paths — add new topics here as they are migrated
  const CARD_MANIFEST = [
    { area: 'estetica-facial', topic: 'blefaroplastia' },
    { area: 'estetica-facial', topic: 'rinoplastia' }
  ];

  const CARD_TYPES = ['anatomia', 'tecnicas', 'decisoes', 'notas'];
  const CARDS_BASE = '../../content/cards/';

  let _allCards = [];
  let _history = [];

  // --- Data Loading ---
  async function loadAllCards() {
    _allCards = [];
    for (const { area, topic } of CARD_MANIFEST) {
      for (const type of CARD_TYPES) {
        try {
          const url = `${CARDS_BASE}${area}/${topic}/${type}.json`;
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const cards = await resp.json();
          if (Array.isArray(cards)) _allCards.push(...cards);
        } catch (e) {
          console.warn(`Failed to load ${area}/${topic}/${type}:`, e.message);
        }
      }
    }
    SearchEngine.buildIndex(_allCards);
    console.log(`Loaded ${_allCards.length} cards from ${CARD_MANIFEST.length} topics`);
  }

  // --- Navigation ---
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');

    const backBtn = document.getElementById('btn-back');
    if (id === 'screen-search') {
      backBtn.classList.add('hidden');
      document.getElementById('nav-title').textContent = 'Biblioteca CP';
    } else {
      backBtn.classList.remove('hidden');
    }
  }

  function navigateTo(screenId, title) {
    _history.push('screen-search');
    showScreen(screenId);
    if (title) document.getElementById('nav-title').textContent = title;
  }

  function goBack() {
    const prev = _history.pop() || 'screen-search';
    showScreen(prev);
  }

  // --- Search ---
  function handleSearch(query) {
    const container = document.getElementById('search-results');
    const browser = document.getElementById('topic-browser');

    if (!query.trim()) {
      container.innerHTML = '';
      browser.classList.remove('hidden');
      return;
    }

    browser.classList.add('hidden');
    const results = SearchEngine.search(query);

    if (results.length === 0) {
      container.innerHTML = '<div class="no-results">Nenhum resultado</div>';
      return;
    }

    container.innerHTML = results.slice(0, 30).map(r => Renderer.searchResult(r)).join('');
  }

  function showCard(id) {
    const card = SearchEngine.getById(id);
    if (!card) return;
    const screen = document.getElementById('screen-card');
    screen.innerHTML = Renderer.render(card);
    navigateTo('screen-card', card.title);
  }

  // --- Topic Browser (shown when search is empty) ---
  function renderTopicBrowser() {
    const topics = SearchEngine.getTopics();
    const container = document.getElementById('topic-browser');
    container.innerHTML = `<h3 class="browser-title">Temas</h3>` +
      topics.map(t =>
        `<div class="topic-item" data-topic="${t.topic}">
          <span class="topic-name">${t.topic}</span>
          <span class="topic-count">${t.count} fichas</span>
        </div>`
      ).join('');
  }

  function showTopicCards(topic) {
    const cards = SearchEngine.getByTopic(topic);
    const container = document.getElementById('search-results');
    const browser = document.getElementById('topic-browser');
    browser.classList.add('hidden');
    container.innerHTML = cards
      .filter(c => c.type !== 'flashcard')
      .map(c => Renderer.searchResult({ id: c.id, type: c.type, title: c.title || c.id, topic: c.topic }))
      .join('');
  }

  // --- Pre-Op ---
  function handlePreOp(query) {
    const resultsEl = document.getElementById('preop-results');
    const briefingEl = document.getElementById('preop-briefing');

    if (!query.trim()) {
      // Show topic list for pre-op
      const topics = SearchEngine.getTopics();
      resultsEl.innerHTML = topics.map(t =>
        `<div class="preop-topic-item" data-topic="${t.topic}">${t.topic}</div>`
      ).join('');
      briefingEl.innerHTML = '';
      return;
    }

    // Find matching topic
    const topics = SearchEngine.getTopics();
    const match = topics.find(t => t.topic.includes(query.toLowerCase()));
    if (match) {
      resultsEl.innerHTML = '';
      briefingEl.innerHTML = PreOp.buildBriefing(match.topic);
    }
  }

  function showPreOpForTopic(topic) {
    document.getElementById('preop-results').innerHTML = '';
    document.getElementById('preop-briefing').innerHTML = PreOp.buildBriefing(topic);
  }

  // --- Event Wiring ---
  function init() {
    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => handleSearch(searchInput.value));

    // Back button
    document.getElementById('btn-back').addEventListener('click', goBack);

    // Pre-op button
    document.getElementById('btn-preop').addEventListener('click', () => {
      navigateTo('screen-preop', 'Briefing Pre-Op');
      handlePreOp('');
    });

    // Pre-op input
    const preopInput = document.getElementById('preop-input');
    preopInput.addEventListener('input', () => handlePreOp(preopInput.value));

    // Delegated clicks
    document.addEventListener('click', e => {
      const result = e.target.closest('.search-result');
      if (result) { showCard(result.dataset.id); return; }

      const topicItem = e.target.closest('.topic-item');
      if (topicItem) { showTopicCards(topicItem.dataset.topic); return; }

      const preopTopic = e.target.closest('.preop-topic-item');
      if (preopTopic) { showPreOpForTopic(preopTopic.dataset.topic); return; }
    });

    // Load data then render
    loadAllCards().then(() => {
      renderTopicBrowser();
      showScreen('screen-search');
      searchInput.focus();
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js');
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
