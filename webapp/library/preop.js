// preop.js — Pre-operative briefing assembly
const PreOp = (() => {

  function buildBriefing(topic) {
    const anatomyCards = SearchEngine.getByType('anatomy', topic);
    const techniqueCards = SearchEngine.getByType('technique', topic);
    const decisionCards = SearchEngine.getByType('decision', topic);
    const noteCards = SearchEngine.getByType('note', topic);

    // Separate complication notes (normalize accents for matching)
    const _compKeywords = ['complicacao', 'complicacoes', 'emergencia', 'hematoma'];
    const complicationNotes = noteCards.filter(c =>
      c.tags && c.tags.some(t => {
        const tn = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return _compKeywords.some(k => tn.includes(k));
      })
    );
    const otherNotes = noteCards.filter(c => !complicationNotes.includes(c));

    // Collect flashcard parameters
    const flashcardCards = SearchEngine.getByType('flashcard', topic);
    const allFlashcards = flashcardCards.flatMap(fc => fc.cards || []);

    let html = `<div class="briefing">`;
    html += `<h2 class="briefing-title">Briefing Pre-Op: ${topic}</h2>`;

    // Clinical notes (non-complication) — overview, assessment, physiology
    if (otherNotes.length > 0) {
      html += `<details class="briefing-section">
        <summary class="briefing-section-title">Notas Clínicas (${otherNotes.length})</summary>
        <div class="briefing-section-body">
          ${otherNotes.map(c => `
            <details class="briefing-item">
              <summary class="briefing-item-title">${c.title}</summary>
              <div class="briefing-item-body">${Renderer.note(c)}</div>
            </details>
          `).join('')}
        </div>
      </details>`;
    }

    // Anatomy (each card is a toggle)
    if (anatomyCards.length > 0) {
      html += `<details class="briefing-section">
        <summary class="briefing-section-title">Anatomia Relevante (${anatomyCards.length})</summary>
        <div class="briefing-section-body">
          ${anatomyCards.map(c => `
            <details class="briefing-item">
              <summary class="briefing-item-title">${c.title}</summary>
              <div class="briefing-item-body">${Renderer.anatomy(c)}</div>
            </details>
          `).join('')}
        </div>
      </details>`;
    }

    // Decision trees (each card is a toggle)
    if (decisionCards.length > 0) {
      html += `<details class="briefing-section">
        <summary class="briefing-section-title">Decisões Clínicas (${decisionCards.length})</summary>
        <div class="briefing-section-body">
          ${decisionCards.map(c => `
            <details class="briefing-item">
              <summary class="briefing-item-title">${c.title}</summary>
              <div class="briefing-item-body">${Renderer.decision(c)}</div>
            </details>
          `).join('')}
        </div>
      </details>`;
    }

    // Techniques (each card is a toggle)
    if (techniqueCards.length > 0) {
      html += `<details class="briefing-section">
        <summary class="briefing-section-title">Técnicas (${techniqueCards.length})</summary>
        <div class="briefing-section-body">
          ${techniqueCards.map(c => `
            <details class="briefing-item">
              <summary class="briefing-item-title">${c.title}</summary>
              <div class="briefing-item-body">${Renderer.technique(c)}</div>
            </details>
          `).join('')}
        </div>
      </details>`;
    }

    // Complications
    if (complicationNotes.length > 0) {
      html += `<details class="briefing-section">
        <summary class="briefing-section-title">Complicações</summary>
        <div class="briefing-section-body">
          ${complicationNotes.map(c => Renderer.note(c)).join('')}
        </div>
      </details>`;
    }

    // Flashcard parameters (grouped by domain, collapsed by default)
    if (allFlashcards.length > 0) {
      const domains = {};
      allFlashcards.forEach(fc => {
        const d = fc.domain || 'geral';
        if (!domains[d]) domains[d] = [];
        domains[d].push(fc);
      });

      html += `<details class="briefing-section">
        <summary class="briefing-section-title">Parâmetros (${allFlashcards.length})</summary>
        <div class="briefing-section-body">
          ${Object.entries(domains).map(([domain, cards]) => `
            <div class="params-domain">
              <div class="params-domain-title">${domain}</div>
              ${cards.map(fc => `
                <div class="param-row">
                  <span class="param-front">${fc.front}</span>
                  <span class="param-back">${fc.back}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </details>`;
    }

    html += `</div>`;
    return html;
  }

  return { buildBriefing };
})();
