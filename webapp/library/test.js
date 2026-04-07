// webapp/library/test.js — Motor de Teste (Fase 3)
// Responsabilidades: perfil de conhecimento, seleção adaptativa, estado da sessão
const TestEngine = (() => {
  const PROFILE_KEY = 'cp_test_profile';
  const SESSION_SIZE = 8;
  const CARDS_BASE = '../../content/cards/';

  // ---------------------------------------------------------------------------
  // Perfil (localStorage)
  // ---------------------------------------------------------------------------

  function _loadProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function _saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function getTopicProfile(topic) {
    return _loadProfile()[topic] || null;
  }

  // ---------------------------------------------------------------------------
  // Carregamento de questões
  // ---------------------------------------------------------------------------

  async function loadQuestions(area, topic) {
    const url = `${CARDS_BASE}${area}/${topic}/_questions.json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    const data = await resp.json();
    return Array.isArray(data.questions) ? data.questions : [];
  }

  // ---------------------------------------------------------------------------
  // Seleção adaptativa
  // ---------------------------------------------------------------------------

  function _selectQuestions(questions, topicProfile) {
    // Agrupar por domínio
    const byDomain = {};
    for (const q of questions) {
      (byDomain[q.domain] = byDomain[q.domain] || []).push(q);
    }

    // Peso por domínio: nunca testado = 1.0; fraco = alto; forte = baixo (mínimo 0.2)
    const weights = {};
    for (const domain of Object.keys(byDomain)) {
      const dp = topicProfile?.domains?.[domain];
      weights[domain] = dp
        ? 0.2 + 0.8 * Math.max(0, 1 - dp.score)
        : 1.0;
    }

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const selected = [];

    for (const [domain, qs] of Object.entries(byDomain)) {
      const quota = Math.max(1, Math.round((weights[domain] / totalWeight) * SESSION_SIZE));
      const shuffled = [...qs].sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, quota));
    }

    // Embaralhar e limitar ao tamanho da sessão
    return selected.sort(() => Math.random() - 0.5).slice(0, SESSION_SIZE);
  }

  // ---------------------------------------------------------------------------
  // Estado da sessão
  // ---------------------------------------------------------------------------

  let _session = null; // { topic, area, questions[], current, results[] }

  function startSession(topic, area, questions) {
    const profile = getTopicProfile(topic);
    const selected = _selectQuestions(questions, profile);
    _session = { topic, area, questions: selected, current: 0, results: [] };
    return selected[0] || null;
  }

  function currentQuestion() {
    return _session ? (_session.questions[_session.current] || null) : null;
  }

  function isDone() {
    return _session ? _session.current >= _session.questions.length : true;
  }

  function progress() {
    return _session
      ? { current: _session.current, total: _session.questions.length }
      : { current: 0, total: 0 };
  }

  // Registra avaliação do usuário e avança para próxima questão.
  // Retorna próxima questão ou null se a sessão terminou.
  function rate(correct) {
    if (!_session) return null;
    _session.results.push({ question: _session.questions[_session.current], correct });
    _session.current++;
    return isDone() ? null : _session.questions[_session.current];
  }

  // ---------------------------------------------------------------------------
  // Finalizar sessão + atualizar perfil
  // ---------------------------------------------------------------------------

  function finishSession() {
    if (!_session) return null;
    const { topic, results } = _session;

    // Agrupar resultados por domínio
    const domainResults = {};
    for (const { question, correct } of results) {
      const d = question.domain;
      if (!domainResults[d]) domainResults[d] = { correct: 0, total: 0 };
      domainResults[d].total++;
      if (correct) domainResults[d].correct++;
    }

    const totalCorrect = results.filter(r => r.correct).length;

    // Atualizar perfil
    const profile = _loadProfile();
    if (!profile[topic]) {
      profile[topic] = { lastTested: '', sessions: 0, domains: {} };
    }
    profile[topic].lastTested = new Date().toISOString().split('T')[0];
    profile[topic].sessions = (profile[topic].sessions || 0) + 1;

    for (const [domain, { correct, total }] of Object.entries(domainResults)) {
      const prev = profile[topic].domains[domain] || { score: 0, attempts: 0 };
      const sessionScore = correct / total;
      // Atualização ponderada: histórico 70% + sessão atual 30%
      profile[topic].domains[domain] = {
        score: prev.attempts > 0 ? 0.7 * prev.score + 0.3 * sessionScore : sessionScore,
        attempts: prev.attempts + total,
      };
    }
    _saveProfile(profile);

    // Cards fracos: ids únicos das questões erradas
    const weakCards = [...new Set(results.filter(r => !r.correct).map(r => r.question.card_id))];

    const result = {
      topic,
      total: results.length,
      correct: totalCorrect,
      domainResults,
      weakCards,
      profile: profile[topic],
    };

    _session = null;
    return result;
  }

  return {
    loadQuestions,
    startSession,
    currentQuestion,
    isDone,
    progress,
    rate,
    finishSession,
    getTopicProfile,
  };
})();
