// rag.js — BM25 search over RAG document chunks for Chat IA context
const RAG = (() => {
  let _index = null;
  const TOP_K = 15;
  const BM25_K1 = 1.5;
  const BM25_B = 0.75;

  function normalize(text) {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const STOPWORDS = new Set([
    'a', 'o', 'e', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'um', 'uma', 'uns', 'umas', 'por', 'para', 'com', 'sem', 'que', 'se', 'ou',
    'ao', 'aos', 'as', 'os', 'mais', 'menos', 'como', 'entre', 'sobre', 'ate',
    'ser', 'ter', 'estar', 'foi', 'sao', 'tem', 'pode', 'deve', 'esta', 'este',
  ]);

  function tokenize(text) {
    return normalize(text)
      .split(' ')
      .filter(w => w.length > 2 && !STOPWORDS.has(w));
  }

  async function load() {
    try {
      const resp = await fetch('./rag-index.json');
      if (!resp.ok) { console.warn('RAG index not found'); return; }
      _index = await resp.json();
      // Precompute avgDL
      let totalLen = 0;
      for (const chunk of _index.chunks) totalLen += chunk.terms.length;
      _index.avgDL = totalLen / _index.chunks.length;
      console.log(`RAG index loaded: ${_index.totalChunks} chunks`);
    } catch (e) {
      console.warn('Failed to load RAG index:', e.message);
    }
  }

  function search(query, topK) {
    if (!_index) return [];
    const k = topK || TOP_K;
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const scores = [];
    for (const chunk of _index.chunks) {
      let score = 0;
      const dl = chunk.terms.length;
      // Count term frequencies in this chunk
      const tf = {};
      for (const t of chunk.terms) tf[t] = (tf[t] || 0) + 1;

      for (const qt of queryTerms) {
        const idf = _index.idf[qt] || 0;
        const freq = tf[qt] || 0;
        if (freq === 0) continue;
        // BM25 scoring
        score += idf * (freq * (BM25_K1 + 1)) / (freq + BM25_K1 * (1 - BM25_B + BM25_B * dl / _index.avgDL));
      }

      if (score > 0) scores.push({ chunk, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k).map(s => s.chunk);
  }

  function isLoaded() { return _index !== null; }

  return { load, search, isLoaded };
})();
