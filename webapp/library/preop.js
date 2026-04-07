// preop.js — Pre-operative briefing assembly
const PreOp = (() => {

  function buildBriefing(topic) {
    const anatomyCards = SearchEngine.getByType('anatomy', topic);
    const techniqueCards = SearchEngine.getByType('technique', topic);
    const decisionCards = SearchEngine.getByType('decision', topic);
    const noteCards = SearchEngine.getByType('note', topic);

    // Separate complication notes
    const complicationNotes = noteCards.filter(c =>
      c.tags && c.tags.some(t => ['complicacao', 'complicacoes', 'emergencia', 'hematoma'].includes(t))
    );
    const otherNotes = noteCards.filter(c => !complicationNotes.includes(c));

    // Collect all pearls across techniques
    const allPearls = techniqueCards.flatMap(c => c.pearls || []);

    let html = `<div class="briefing">`;
    html += `<h2 class="briefing-title">Briefing Pre-Op: ${topic}</h2>`;

    // Anatomy (collapsible)
    if (anatomyCards.length > 0) {
      html += `<details class="briefing-section">
        <summary class="briefing-section-title">Anatomia Relevante (${anatomyCards.length})</summary>
        <div class="briefing-section-body">
          ${anatomyCards.map(c => `
            <div class="briefing-mini-card">
              <strong>${c.title}</strong>
              <p>${c.definition || ''}</p>
              ${c.surgical_relevance ? `<div class="highlight-box">${c.surgical_relevance}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </details>`;
    }

    // Decision trees
    if (decisionCards.length > 0) {
      html += `<details class="briefing-section" open>
        <summary class="briefing-section-title">Decisoes Clinicas (${decisionCards.length})</summary>
        <div class="briefing-section-body">
          ${decisionCards.map(c => Renderer.decision(c)).join('')}
        </div>
      </details>`;
    }

    // Techniques
    if (techniqueCards.length > 0) {
      html += `<details class="briefing-section" open>
        <summary class="briefing-section-title">Tecnicas (${techniqueCards.length})</summary>
        <div class="briefing-section-body">
          ${techniqueCards.map(c => Renderer.technique(c)).join('')}
        </div>
      </details>`;
    }

    // Complications
    if (complicationNotes.length > 0) {
      html += `<details class="briefing-section" open>
        <summary class="briefing-section-title">Complicacoes</summary>
        <div class="briefing-section-body">
          ${complicationNotes.map(c => Renderer.note(c)).join('')}
        </div>
      </details>`;
    }

    // Pearls
    if (allPearls.length > 0) {
      html += `<details class="briefing-section" open>
        <summary class="briefing-section-title">Pearls</summary>
        <div class="briefing-section-body">
          <ul class="pearls-list">${allPearls.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
      </details>`;
    }

    html += `</div>`;
    return html;
  }

  return { buildBriefing };
})();
