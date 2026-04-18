// preop.js — Pre-operative briefing assembly (Atlas edition)
const PreOp = (() => {

  function _pad(n) { return String(n).padStart(2, '0'); }

  function _section(titleText, count, bodyHtml, modifier) {
    const cls = modifier ? `briefing-section ${modifier}` : 'briefing-section';
    return `<details class="${cls}">
      <summary class="briefing-section-title">
        <span>${titleText}</span>
        <span class="section-count">${_pad(count)}</span>
      </summary>
      <div class="briefing-section-body">${bodyHtml}</div>
    </details>`;
  }

  function buildBriefing(topic, displayName) {
    const anatomyCards = SearchEngine.getByType('anatomy', topic);
    const techniqueCards = SearchEngine.getByType('technique', topic);
    const decisionCards = SearchEngine.getByType('decision', topic);
    const noteCards = SearchEngine.getByType('note', topic);

    const _compKeywords = ['complicacao', 'complicacoes', 'emergencia', 'hematoma'];
    const complicationNotes = noteCards.filter(c =>
      c.tags && c.tags.some(t => {
        const tn = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return _compKeywords.some(k => tn.includes(k));
      })
    );
    const otherNotes = noteCards.filter(c => !complicationNotes.includes(c));
    const flashcardCards = SearchEngine.getByType('flashcard', topic);
    const allFlashcards = flashcardCards.flatMap(fc => fc.cards || []);

    const totalCards = anatomyCards.length + techniqueCards.length + decisionCards.length + noteCards.length;

    let html = `<div class="briefing">`;
    html += `<header class="briefing-hero">
      <span class="fleuron">· · ·</span>
      <h2 class="role-hero">${displayName || topic}</h2>
      <span class="gold-rule"></span>
      <div class="briefing-meta">
        <span class="role-meta">Briefing pré-operatória</span>
        <span class="sep">·</span>
        <span class="count">${_pad(totalCards)} fichas</span>
      </div>
    </header>`;

    if (otherNotes.length > 0) {
      const body = otherNotes.map(c => `
        <details class="briefing-item">
          <summary class="briefing-item-title">${c.title}</summary>
          <div class="briefing-item-body">${Renderer.note(c)}</div>
        </details>`).join('');
      html += _section('Notas Clínicas', otherNotes.length, body);
    }

    if (anatomyCards.length > 0) {
      const body = anatomyCards.map(c => `
        <details class="briefing-item">
          <summary class="briefing-item-title">${c.title}</summary>
          <div class="briefing-item-body">${Renderer.anatomy(c)}</div>
        </details>`).join('');
      html += _section('Anatomia Relevante', anatomyCards.length, body, 'briefing-section--anatomy');
    }

    if (decisionCards.length > 0) {
      const body = decisionCards.map(c => `
        <details class="briefing-item">
          <summary class="briefing-item-title">${c.title}</summary>
          <div class="briefing-item-body">${Renderer.decision(c)}</div>
        </details>`).join('');
      html += _section('Decisões Clínicas', decisionCards.length, body);
    }

    if (techniqueCards.length > 0) {
      const body = techniqueCards.map(c => `
        <details class="briefing-item">
          <summary class="briefing-item-title">${c.title}</summary>
          <div class="briefing-item-body">${Renderer.technique(c)}</div>
        </details>`).join('');
      html += _section('Técnicas', techniqueCards.length, body);
    }

    if (complicationNotes.length > 0) {
      const body = complicationNotes.map(c => Renderer.note(c)).join('');
      html += _section('Complicações', complicationNotes.length, body);
    }

    if (allFlashcards.length > 0) {
      const domains = {};
      allFlashcards.forEach(fc => {
        const d = fc.domain || 'geral';
        if (!domains[d]) domains[d] = [];
        domains[d].push(fc);
      });
      const body = Object.entries(domains).map(([domain, cards]) => `
        <div class="params-domain">
          <div class="params-domain-title">${domain}</div>
          ${cards.map(fc => `
            <div class="param-row">
              <span class="param-front">${fc.front}</span>
              <span class="param-back">${fc.back}</span>
            </div>`).join('')}
        </div>`).join('');
      html += _section('Parâmetros', allFlashcards.length, body);
    }

    html += `</div>`;
    return html;
  }

  return { buildBriefing };
})();
