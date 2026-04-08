// chat.js — Chat module for AI-powered surgical Q&A
const Chat = (() => {
  // Dr. Arthur: replace with your Cloudflare Worker URL after deploy
  const WORKER_URL = 'https://biblioteca-chat-proxy.YOUR_SUBDOMAIN.workers.dev/chat';
  const MAX_HISTORY = 10; // 5 turnos (user + assistant)

  let _messages = [];
  let _isLoading = false;

  function _selectContext(userMessage) {
    const results = SearchEngine.search(userMessage);
    const topicsFound = [...new Set(results.map(r => r.topic))];

    if (topicsFound.length === 1) {
      return SearchEngine.getByTopic(topicsFound[0]);
    }
    // Send all cards from all topics (trivial for Gemini's 1M context)
    const allTopics = SearchEngine.getTopics();
    let cards = [];
    for (const t of allTopics) {
      cards.push(...SearchEngine.getByTopic(t.topic));
    }
    return cards;
  }

  function _serializeCards(cards) {
    return cards.map(c => {
      const slim = { ...c };
      delete slim.images;
      return slim;
    });
  }

  async function send(userMessage) {
    if (_isLoading) return null;
    _isLoading = true;

    _messages.push({ role: 'user', content: userMessage });

    // Trim to sliding window
    if (_messages.length > MAX_HISTORY) {
      _messages = _messages.slice(_messages.length - MAX_HISTORY);
    }

    const context = _serializeCards(_selectContext(userMessage));

    try {
      const resp = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: _messages, context }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const assistantText = data.text || 'Sem resposta.';

      _messages.push({ role: 'assistant', content: assistantText });
      if (_messages.length > MAX_HISTORY) {
        _messages = _messages.slice(_messages.length - MAX_HISTORY);
      }

      _isLoading = false;
      return assistantText;
    } catch (err) {
      _isLoading = false;
      throw err;
    }
  }

  function reset() {
    _messages = [];
    _isLoading = false;
  }

  function isLoading() {
    return _isLoading;
  }

  function getMessages() {
    return [..._messages];
  }

  return { send, reset, isLoading, getMessages };
})();
