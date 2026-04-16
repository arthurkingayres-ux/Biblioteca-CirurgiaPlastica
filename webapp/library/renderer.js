// renderer.js — Renders atomic cards as HTML (Atlas edition)
const Renderer = (() => {
  const TOPIC_IMAGE_BASE = '../../assets/images/';

  function _imgSrc(topic, filename) {
    return TOPIC_IMAGE_BASE + topic + '/' + filename;
  }

  function _section(title, content, className) {
    if (!content) return '';
    const body = typeof content === 'string' && !content.startsWith('<') ? _formatText(content) : content;
    const titleHtml = title ? `<h3 class="section-title">${title}</h3>` : '';
    return `<div class="card-section ${className || ''}">
      ${titleHtml}
      <div class="section-body">${body}</div>
    </div>`;
  }

  function _formatText(html) {
    if (!html || typeof html !== 'string') return html || '';
    return html
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/([\d.,]+\s*[–-]\s*[\d.,]+\s*(?:mm|cm|%|°|mg|mL|kg|anos|meses|semanas|dias|horas))/g, '<span class="measure">$1</span>')
      .replace(/((?:[≥≤><~]\s*)?[\d.,]+\s*(?:mm|cm|%|°|mg|mL|kg|anos|meses|semanas|dias|horas))/g, '<span class="measure">$1</span>')
      .replace(/\(([^)]*(?:Neligan|Grabb|Core Procedures|Operative Dictations|PRS|ASJ|JPRAS)[^)]*)\)/g, '<cite class="inline-cite">($1)</cite>');
  }

  function _list(items) {
    if (!items || items.length === 0) return '';
    return '<ul>' + items.map(i => `<li>${_formatText(i)}</li>`).join('') + '</ul>';
  }

  function _images(topic, images) {
    if (!images || images.length === 0) return '';
    return images.map(img => {
      const file = typeof img === 'string' ? img : img.file;
      const caption = typeof img === 'string' ? '' : (img.caption || '');
      const credit = typeof img === 'string' ? '' : (img.credit || '');
      return `<figure class="card-figure">
      <img src="${_imgSrc(topic, file)}" alt="${caption}" loading="lazy">
      <figcaption>
        <span class="caption">${caption}</span>
        <span class="credit">${credit}</span>
      </figcaption>
    </figure>`;
    }).join('');
  }

  function _citations(cites) {
    if (!cites || cites.length === 0) return '';
    return `<div class="card-citations">${cites.map(c => `<span class="cite">${c}</span>`).join(' · ')}</div>`;
  }

  function _updates(updates) {
    if (!updates || updates.length === 0) return '';
    return updates.map(u => {
      const colorClass = u.color === 'red' ? 'update-red' : u.color === 'green' ? 'update-green' : 'update-blue';
      const label = u.color === 'red' ? 'MUDANÇA DE CONDUTA' : u.color === 'green' ? 'DICA PRÁTICA' : 'ATUALIZAÇÃO';
      return `<div class="card-update ${colorClass}">
        <div class="update-label">${label}</div>
        <strong>${u.title}</strong>
        ${_list(u.content)}
        <div class="update-cite">${u.citation}</div>
      </div>`;
    }).join('');
  }

  function _badge(type) {
    const labels = { technique: 'Técnica', anatomy: 'Anatomia', decision: 'Decisão', note: 'Nota', flashcard: 'Flashcard', update: 'Atualização' };
    return `<span class="card-badge badge-${type}">${labels[type] || type}</span>`;
  }

  function technique(card) {
    return `<article class="card card-technique">
      ${_badge('technique')}
      <h2>${card.title}</h2>
      ${card.aliases ? `<div class="card-aliases">${card.aliases.join(' · ')}</div>` : ''}
      ${_section('Indicação', card.indication)}
      ${_section('Contraindicação', card.contraindication, 'warning')}
      ${_section('Passo a Passo', _list(card.steps), 'steps')}
      ${_section('Complicações', _list(card.complications), 'warning')}
      ${_images(card.topic, card.images)}
      ${_updates(card.updates)}
      ${_citations(card.citations)}
    </article>`;
  }

  function anatomy(card) {
    return `<article class="card card-anatomy">
      ${_badge('anatomy')}
      <h2>${card.title}</h2>
      ${card.aliases ? `<div class="card-aliases">${card.aliases.join(' · ')}</div>` : ''}
      ${_section('Definição', card.definition)}
      ${_section('Localização', card.location)}
      ${_section('Relações', _list(card.relations))}
      ${_section('Relevância Cirúrgica', card.surgical_relevance, 'highlight')}
      ${_section('Como Identificar', card.how_to_identify, 'highlight')}
      ${_images(card.topic, card.images)}
      ${_updates(card.updates)}
      ${_citations(card.citations)}
    </article>`;
  }

  function decision(card) {
    const stepsHtml = card.steps.map(step => {
      const opts = step.options.map(o =>
        `<div class="decision-option"><span class="decision-answer">${o.answer}</span><span class="decision-arrow">\u2192</span><span class="decision-next">${o.next}</span></div>`
      ).join('');
      return `<div class="decision-step"><h4>${step.question}</h4>${opts}</div>`;
    }).join('');

    return `<article class="card card-decision">
      ${_badge('decision')}
      <h2>${card.title}</h2>
      ${_section('Quando Usar', card.trigger)}
      <div class="decision-tree">${stepsHtml}</div>
      ${_images(card.topic, card.images)}
      ${_updates(card.updates)}
      ${_citations(card.citations)}
    </article>`;
  }

  function note(card) {
    return `<article class="card card-note">
      ${_badge('note')}
      <h2>${card.title}</h2>
      ${card.section ? `<div class="card-section-label role-label">${card.section}</div>` : ''}
      ${_section('', _list(card.content))}
      ${_images(card.topic, card.images)}
      ${_updates(card.updates)}
      ${_citations(card.citations)}
    </article>`;
  }

  function render(card) {
    switch (card.type) {
      case 'technique': return technique(card);
      case 'anatomy': return anatomy(card);
      case 'decision': return decision(card);
      case 'note': return note(card);
      default: return `<div class="card"><pre>${JSON.stringify(card, null, 2)}</pre></div>`;
    }
  }

  function searchResult(entry) {
    return `<div class="search-result" data-id="${entry.id}">
      <span class="result-icon" data-icon="chevron-right" data-icon-size="14"></span>
      <div class="result-text">
        <div class="result-title">${entry.title}</div>
        <div class="result-meta">${_badge(entry.type)} · ${entry.topic}</div>
      </div>
    </div>`;
  }

  return { render, searchResult, technique, anatomy, decision, note };
})();
