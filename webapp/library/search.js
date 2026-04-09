// search.js — Offline search index for atomic cards
const SearchEngine = (() => {
  let _index = [];  // [{id, type, title, topic, area, text, card}]

  // Aliases de topic: termos coloquiais e radicais que o Dr. Arthur pode digitar
  // e que devem casar com o slug canonico do tema. Expande o corpus indexado.
  const TOPIC_ALIASES = {
    'abdominoplastia': ['abdome', 'abdomen', 'abdominal', 'abdominoplastia'],
    'blefaroplastia': ['blefaro', 'palpebra', 'palpebral', 'blefaroplastia'],
    'contorno-pos-bariatrico': ['bariatrico', 'pos-bariatrico', 'contorno corporal', 'contorno pos bariatrico', 'massive weight loss', 'mwl'],
    'gluteoplastia': ['gluteo', 'gluteos', 'bbl', 'brazilian butt lift', 'gluteoplastia'],
    'rinoplastia': ['nariz', 'nasal', 'rinoplastia', 'septo', 'septal'],
    'ritidoplastia': ['facelift', 'face lift', 'lifting facial', 'ritidoplastia', 'rejuvenescimento facial']
  };

  function _normalize(s) {
    return s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip accents
      .replace(/[^a-z0-9\s]/g, ' ').trim();
  }

  function _extractText(card) {
    const parts = [card.title || ''];
    if (card.aliases) parts.push(...card.aliases);
    if (card.tags) parts.push(...card.tags);
    if (card.definition) parts.push(card.definition);
    if (card.location) parts.push(card.location);
    if (card.surgical_relevance) parts.push(card.surgical_relevance);
    if (card.indication) parts.push(card.indication);
    if (card.trigger) parts.push(card.trigger);
    if (card.steps && typeof card.steps[0] === 'string') parts.push(...card.steps);
    if (card.content) parts.push(...card.content);
    if (card.pearls) parts.push(...card.pearls);
    return _normalize(parts.join(' '));
  }

  function buildIndex(allCards, manifest) {
    // Constroi lookup de displayName por topic a partir do manifest (opcional).
    // Retrocompativel: se manifest nao for passado, apenas os aliases inline sao usados.
    const manifestByTopic = {};
    if (manifest && Array.isArray(manifest)) {
      for (const m of manifest) {
        if (m && m.topic) manifestByTopic[m.topic] = m;
      }
    }

    _index = allCards.map(card => {
      const aliases = TOPIC_ALIASES[card.topic] || [];
      const manifestEntry = manifestByTopic[card.topic];
      const displayName = manifestEntry && manifestEntry.displayName ? manifestEntry.displayName : '';
      const topicCorpus = _normalize([card.topic || '', displayName, ...aliases].join(' '));
      return {
        id: card.id,
        type: card.type,
        title: card.title || '',
        topic: card.topic,
        area: card.area,
        text: _extractText(card) + ' ' + topicCorpus,
        card
      };
    });
  }

  function search(query) {
    if (!query || !query.trim()) return [];
    const terms = _normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    return _index
      .map(entry => {
        let score = 0;
        const titleNorm = _normalize(entry.title);
        for (const term of terms) {
          if (titleNorm.includes(term)) score += 10;
          if (titleNorm.startsWith(term)) score += 5;
          if (entry.text.includes(term)) score += 1;
          else return null;  // all terms must match
        }
        return { ...entry, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  function getByTopic(topic) {
    return _index.filter(e => e.topic === topic).map(e => e.card);
  }

  function getByType(type, topic) {
    return _index
      .filter(e => e.type === type && (!topic || e.topic === topic))
      .map(e => e.card);
  }

  function getById(id) {
    const entry = _index.find(e => e.id === id);
    return entry ? entry.card : null;
  }

  function getTopics() {
    const topics = new Map();
    for (const entry of _index) {
      if (!topics.has(entry.topic)) {
        topics.set(entry.topic, { topic: entry.topic, area: entry.area, count: 0 });
      }
      topics.get(entry.topic).count++;
    }
    return [...topics.values()];
  }

  return { buildIndex, search, getByTopic, getByType, getById, getTopics };
})();
