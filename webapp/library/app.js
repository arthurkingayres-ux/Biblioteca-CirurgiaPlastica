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
  let _testQuestions = {}; // { topic: { area, questions[] } }

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

  async function loadTestQuestions() {
    for (const { area, topic } of CARD_MANIFEST) {
      try {
        const questions = await TestEngine.loadQuestions(area, topic);
        _testQuestions[topic] = { area, questions };
      } catch (e) {
        console.warn(`Failed to load test questions for ${topic}:`, e.message);
        _testQuestions[topic] = { area, questions: [] };
      }
    }
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

  // --- Test Mode ---

  function showTestView(view) {
    ['test-view-topics', 'test-view-question', 'test-view-results'].forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(`test-view-${view}`).classList.remove('hidden');
  }

  function renderTestTopicList() {
    const container = document.getElementById('test-topic-list');
    const entries = Object.entries(_testQuestions);
    const hasAny = entries.some(([, t]) => t.questions.length > 0);

    if (!hasAny) {
      container.innerHTML = '<div class="no-results">Nenhuma questão disponível.<br>Execute: node tools/generate_questions.js --topic blefaroplastia</div>';
      return;
    }

    container.innerHTML = entries.map(([topic, { questions }]) => {
      if (questions.length === 0) return '';
      const profile = TestEngine.getTopicProfile(topic);
      const lastTested = profile?.lastTested ? `Último: ${profile.lastTested}` : 'Nunca testado';
      const sessions = profile?.sessions || 0;
      return `<div class="test-topic-item" data-topic="${topic}">
        <div>
          <div class="test-topic-name">${topic}</div>
          <div class="test-topic-meta">${questions.length} questões · ${lastTested} · ${sessions} sessão(ões)</div>
        </div>
        <div class="test-topic-arrow">&#8250;</div>
      </div>`;
    }).join('');
  }

  function startTestSession(topic) {
    const { area, questions } = _testQuestions[topic] || { area: '', questions: [] };
    if (questions.length === 0) return;
    const firstQ = TestEngine.startSession(topic, area, questions);
    if (!firstQ) return;
    showTestView('question');
    _renderTestQuestion(firstQ);
  }

  function _renderTestQuestion(q) {
    const prog = TestEngine.progress();
    const pct = prog.total > 0 ? (prog.current / prog.total) * 100 : 0;
    document.getElementById('test-progress-fill').style.width = `${pct}%`;
    document.getElementById('test-domain-badge').textContent = q.domain;
    document.getElementById('test-question-text').textContent = q.question;
    // Reset answer state
    document.getElementById('test-view-answer').classList.add('hidden');
    document.getElementById('btn-show-answer').classList.remove('hidden');
  }

  function _showTestAnswer() {
    const q = TestEngine.currentQuestion();
    if (!q) return;
    document.getElementById('test-answer-text').textContent = q.expected;
    document.getElementById('test-view-answer').classList.remove('hidden');
    document.getElementById('btn-show-answer').classList.add('hidden');
  }

  function _rateAnswer(correct) {
    const next = TestEngine.rate(correct); // returns next question or null when done
    if (TestEngine.isDone()) {
      _showTestResults();
    } else {
      _renderTestQuestion(next);
    }
  }

  function _showTestResults() {
    const result = TestEngine.finishSession();
    showTestView('results');

    const pct = Math.round((result.correct / result.total) * 100);
    const scoreColor = pct >= 70 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';

    const domainsHtml = Object.entries(result.domainResults)
      .map(([domain, { correct, total }]) => {
        const dp = Math.round((correct / total) * 100);
        const cls = dp >= 70 ? 'domain-score-good' : dp >= 50 ? 'domain-score-mid' : 'domain-score-bad';
        return `<div class="test-domain-row"><span>${domain}</span><span class="${cls}">${correct}/${total} (${dp}%)</span></div>`;
      }).join('');

    const weakHtml = result.weakCards.length > 0
      ? result.weakCards.map(id => {
          const card = SearchEngine.getById(id);
          return card ? Renderer.searchResult({ id: card.id, type: card.type, title: card.title, topic: card.topic }) : '';
        }).join('')
      : '';

    document.getElementById('test-view-results').innerHTML = `
      <div class="test-results-header">
        <div class="test-score" style="color:${scoreColor}">${result.correct}/${result.total}</div>
        <div class="test-score-pct">${pct}%</div>
      </div>
      <div>${domainsHtml}</div>
      ${result.weakCards.length > 0 ? '<p class="test-weak-title">Revisar</p>' : ''}
      <div>${weakHtml}</div>
      <button id="btn-test-again" class="btn-primary" style="margin-top:20px">Testar Novamente</button>
    `;
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

    // Test button
    document.getElementById('btn-test').addEventListener('click', () => {
      navigateTo('screen-test', 'Teste');
      showTestView('topics');
      renderTestTopicList();
    });

    // Delegated clicks
    document.addEventListener('click', e => {
      const result = e.target.closest('.search-result');
      if (result) { showCard(result.dataset.id); return; }

      const topicItem = e.target.closest('.topic-item');
      if (topicItem) { showTopicCards(topicItem.dataset.topic); return; }

      const preopTopic = e.target.closest('.preop-topic-item');
      if (preopTopic) { showPreOpForTopic(preopTopic.dataset.topic); return; }

      const testTopic = e.target.closest('.test-topic-item');
      if (testTopic) { startTestSession(testTopic.dataset.topic); return; }

      if (e.target.closest('#btn-show-answer')) { _showTestAnswer(); return; }
      if (e.target.closest('#btn-errei'))       { _rateAnswer(false); return; }
      if (e.target.closest('#btn-acertei'))     { _rateAnswer(true);  return; }
      if (e.target.closest('#btn-test-again'))  { showTestView('topics'); renderTestTopicList(); return; }
    });

    // Load data then render
    loadAllCards().then(async () => {
      await loadTestQuestions();
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
