// renderer.js — Renders atomic cards as HTML
const Renderer = (() => {
  const TOPIC_IMAGE_BASE = '../../assets/images/';

  function _imgSrc(topic, filename) {
    return TOPIC_IMAGE_BASE + topic + '/' + filename;
  }

  function _section(title, content, className) {
    if (!content) return '';
    return `<div class="card-section ${className || ''}">
      <h3 class="section-title">${title}</h3>
      <div class="section-body">${content}</div>
    </div>`;
  }

  function _list(items) {
    if (!items || items.length === 0) return '';
    return '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
  }

  function _images(topic, filenames) {
    if (!filenames || filenames.length === 0) return '';
    return filenames.map(f =>
      `<div class="card-image"><img src="${_imgSrc(topic, f)}" alt="${f}" loading="lazy"></div>`
    ).join('');
  }

  function _citations(cites) {
    if (!cites || cites.length === 0) return '';
    return `<div class="card-citations">${cites.map(c => `<span class="cite">${c}</span>`).join(' · ')}</div>`;
  }

  function _updates(updates) {
    if (!updates || updates.length === 0) return '';
    return updates.map(u => {
      const colorClass = u.color === 'red' ? 'update-red' : u.color === 'green' ? 'update-green' : 'update-blue';
      return `<div class="card-update ${colorClass}">
        <strong>${u.title}</strong>
        ${_list(u.content)}
        <div class="update-cite">${u.citation}</div>
      </div>`;
    }).join('');
  }

  function _badge(type) {
    const labels = { technique: 'Tecnica', anatomy: 'Anatomia', decision: 'Decisao', note: 'Nota', flashcard: 'Flashcard' };
    return `<span class="card-badge badge-${type}">${labels[type] || type}</span>`;
  }

  function technique(card) {
    return `<article class="card card-technique">
      ${_badge('technique')}
      <h2>${card.title}</h2>
      ${card.aliases ? `<div class="card-aliases">${card.aliases.join(' · ')}</div>` : ''}
      ${_section('Indicacao', card.indication)}
      ${_section('Contraindicacao', card.contraindication, 'warning')}
      ${_section('Passo a Passo', _list(card.steps), 'steps')}
      ${_section('Complicacoes', _list(card.complications), 'warning')}
      ${_section('Pearls', _list(card.pearls), 'pearls')}
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
      ${_section('Definicao', card.definition)}
      ${_section('Localizacao', card.location)}
      ${_section('Relacoes', _list(card.relations))}
      ${_section('Relevancia Cirurgica', card.surgical_relevance, 'highlight')}
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
      ${_section('Quando usar', card.trigger)}
      <div class="decision-tree">${stepsHtml}</div>
      ${_updates(card.updates)}
      ${_citations(card.citations)}
    </article>`;
  }

  function note(card) {
    return `<article class="card card-note">
      ${_badge('note')}
      <h2>${card.title}</h2>
      ${card.section ? `<div class="card-section-label">${card.section}</div>` : ''}
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
    const icons = { technique: '&#9986;', anatomy: '&#9874;', decision: '&#9670;', note: '&#9998;', flashcard: '&#9733;' };
    return `<div class="search-result" data-id="${entry.id}">
      <span class="result-icon">${icons[entry.type] || ''}</span>
      <div class="result-text">
        <div class="result-title">${entry.title}</div>
        <div class="result-meta">${_badge(entry.type)} · ${entry.topic}</div>
      </div>
    </div>`;
  }

  return { render, searchResult, technique, anatomy, decision, note };
})();
