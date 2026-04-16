// app.js — Briefing Pré-Op application logic
const App = (() => {
  const CARD_TYPES = ['anatomia', 'tecnicas', 'decisoes', 'notas', 'flashcards'];
  const CARDS_BASE = '../../content/cards/';
  const MANIFEST_URL = CARDS_BASE + 'manifest.json';

  let _allCards = [];
  let _manifest = [];

  // --- Helpers ---
  function toTitleCase(slug) {
    return String(slug || '')
      .split(/[-_]/)
      .map(w => w ? w[0].toUpperCase() + w.slice(1) : '')
      .join(' ');
  }

  // --- Data Loading ---
  async function loadAllCards() {
    _allCards = [];
    try {
      const resp = await fetch(MANIFEST_URL);
      if (resp.ok) _manifest = await resp.json();
    } catch (e) {
      console.warn('Failed to load manifest.json, using empty manifest:', e.message);
      _manifest = [];
    }

    for (const { area, topic } of _manifest) {
      for (const type of CARD_TYPES) {
        try {
          const url = `${CARDS_BASE}${area}/${topic}/${type}.json`;
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const cards = await resp.json();
          if (Array.isArray(cards)) _allCards.push(...cards);
          else if (cards && cards.id) _allCards.push(cards);
        } catch (e) {
          console.warn(`Failed to load ${area}/${topic}/${type}:`, e.message);
        }
      }
    }
    SearchEngine.buildIndex(_allCards, _manifest);
    console.log(`Loaded ${_allCards.length} cards from ${_manifest.length} topics`);
  }

  // --- Navigation ---
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');

    const backBtn = document.getElementById('btn-back');
    if (id === 'screen-home') {
      backBtn.classList.add('hidden');
      document.getElementById('nav-title').textContent = 'Briefing Pré-Op';
    } else {
      backBtn.classList.remove('hidden');
    }
  }

  function goBack() {
    // If leaving chat, reset conversation and show chat button again
    if (!document.getElementById('screen-chat').classList.contains('hidden')) {
      Chat.reset();
      document.getElementById('chat-messages').innerHTML = '';
      document.getElementById('btn-chat').classList.remove('hidden');
    }
    showScreen('screen-home');
  }

  // --- Procedure List ---
  function renderProcedureList(filter) {
    const topics = SearchEngine.getTopics();
    const displayMap = {};
    for (const m of _manifest) displayMap[m.topic] = m.displayName;
    const container = document.getElementById('procedure-list');

    const filtered = filter
      ? topics.filter(t => {
          const dn = displayMap[t.topic] || toTitleCase(t.topic);
          return SearchEngine.topicMatches(t.topic, dn, filter);
        })
      : topics;

    if (filtered.length === 0) {
      container.innerHTML = '<div class="no-results">Nenhum procedimento encontrado</div>';
      return;
    }

    container.innerHTML = filtered.map(t => {
      const dn = displayMap[t.topic] || toTitleCase(t.topic);
      return `<div class="topic-item" data-topic="${t.topic}">
        <span class="topic-name">${dn}</span>
        <span class="topic-count">${t.count} fichas</span>
      </div>`;
    }).join('');
  }

  // --- Briefing ---
  function openBriefing(topic) {
    const screen = document.getElementById('screen-briefing');
    const entry = _manifest.find(m => m.topic === topic);
    const displayName = (entry && entry.displayName) || toTitleCase(topic);
    screen.innerHTML = PreOp.buildBriefing(topic, displayName);
    if (window.LucideIcons) window.LucideIcons.hydrateIcons(screen);
    showScreen('screen-briefing');
    document.getElementById('nav-title').textContent = displayName;
    screen.scrollTop = 0;
  }

  // --- Chat ---
  const SUGGESTIONS = [
    'Quais enxertos usar numa rinoplastia secundária com septo insuficiente?',
    'Como manejar hematoma retrobulbar na blefaroplastia?',
    'Diferenças entre deep plane e SMAS plication?'
  ];

  function openChat() {
    showScreen('screen-chat');
    document.getElementById('nav-title').textContent = 'Chat IA';
    document.getElementById('btn-chat').classList.add('hidden');
    _updateOnlineStatus();
    const msgs = document.getElementById('chat-messages');
    if (Chat.getMessages().length === 0) {
      msgs.innerHTML = _renderEmpty();
      if (window.LucideIcons) window.LucideIcons.hydrateIcons(msgs);
    }
    document.getElementById('chat-input').focus();
  }

  function _renderEmpty() {
    const roman = ['I.', 'II.', 'III.'];
    const items = SUGGESTIONS.map((s, i) => `
      <li class="chat-suggestion-item" data-text="${s.replace(/"/g, '&quot;')}">
        <span class="chat-suggestion-index">${roman[i]}</span>
        <span class="chat-suggestion-text">${s}</span>
      </li>`).join('');

    return `<div class="chat-empty">
      <span class="fleuron">· · ·</span>
      <h2 class="role-hero">Consulta aberta.</h2>
      <span class="gold-rule"></span>
      <p class="role-meta">Pergunte sobre anatomia, técnicas ou decisões clínicas — respondo com base no acervo.</p>
      <div class="chat-label">Começar por</div>
      <ul class="chat-suggestions-list">${items}</ul>
    </div>`;
  }

  function _renderMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg-${role}`;
    if (role === 'assistant') {
      // Convert [Title] to highlighted citations and **bold** to <strong>
      let html = text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]/g, '<span class="chat-cite">[$1]</span>')
        .replace(/\n/g, '<br>');
      div.innerHTML = html;
    } else {
      div.textContent = text;
    }
    return div;
  }

  function _renderError(msg) {
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg-error';
    div.textContent = msg;
    return div;
  }

  function _showTyping() {
    const msgs = document.getElementById('chat-messages');
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.id = 'chat-typing';
    typing.innerHTML = '<div class="chat-typing-dot"></div><div class="chat-typing-dot"></div><div class="chat-typing-dot"></div>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _hideTyping() {
    const el = document.getElementById('chat-typing');
    if (el) el.remove();
  }

  async function handleSend(text) {
    const input = document.getElementById('chat-input');
    const msg = text || input.value.trim();
    if (!msg || Chat.isLoading()) return;

    input.value = '';
    const msgs = document.getElementById('chat-messages');

    // Clear empty state
    const empty = msgs.querySelector('.chat-empty');
    if (empty) empty.remove();

    msgs.appendChild(_renderMessage('user', msg));
    msgs.scrollTop = msgs.scrollHeight;

    _showTyping();
    input.disabled = true;
    document.getElementById('btn-send').disabled = true;

    try {
      const response = await Chat.send(msg);
      _hideTyping();
      msgs.appendChild(_renderMessage('assistant', response));
    } catch (err) {
      _hideTyping();
      msgs.appendChild(_renderError(err.message || 'Erro ao enviar mensagem'));
    }

    input.disabled = false;
    document.getElementById('btn-send').disabled = false;
    input.focus();
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _updateOnlineStatus() {
    const offline = document.getElementById('chat-offline');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('btn-send');
    if (!offline) return;
    if (navigator.onLine) {
      offline.classList.add('hidden');
      input.disabled = false;
      send.disabled = false;
    } else {
      offline.classList.remove('hidden');
      input.disabled = true;
      send.disabled = true;
    }
  }

  // --- Event Wiring ---
  function init() {
    // Filter input
    const filterInput = document.getElementById('procedure-filter');
    filterInput.addEventListener('input', () => renderProcedureList(filterInput.value));

    // Back button
    document.getElementById('btn-back').addEventListener('click', goBack);

    // Chat button
    document.getElementById('btn-chat').addEventListener('click', openChat);

    // Chat send
    document.getElementById('btn-send').addEventListener('click', () => handleSend());
    document.getElementById('chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Online/offline
    window.addEventListener('online', _updateOnlineStatus);
    window.addEventListener('offline', _updateOnlineStatus);

    // Delegated clicks
    document.addEventListener('click', e => {
      const topicItem = e.target.closest('.topic-item');
      if (topicItem) { openBriefing(topicItem.dataset.topic); return; }

      const suggestion = e.target.closest('.chat-suggestion-item');
      if (suggestion) { handleSend(suggestion.dataset.text); return; }

      const themeBtn = e.target.closest('#btn-theme');
      if (themeBtn) { window.AtlasTheme && window.AtlasTheme.toggle(); return; }
    });

    // Load data then render
    loadAllCards().then(() => {
      renderProcedureList();
      showScreen('screen-home');
    });

    // Hydrate Lucide icons (initial + on theme change for moon/sun swap)
    const refreshThemeIcon = () => {
      const btn = document.getElementById('btn-theme');
      if (!btn) return;
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      const iconEl = btn.querySelector('[data-icon]');
      iconEl.setAttribute('data-icon', theme === 'dark' ? 'sun' : 'moon');
      iconEl.removeAttribute('data-icon-hydrated');
      if (window.LucideIcons) window.LucideIcons.hydrateIcons(btn);
    };
    if (window.LucideIcons) window.LucideIcons.hydrateIcons();
    refreshThemeIcon();
    window.addEventListener('atlas:themechange', refreshThemeIcon);


    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js');
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
