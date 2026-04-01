/**
 * Triagem de Artigos — PWA de Aprovação
 * Biblioteca Inteligente de Cirurgia Plástica
 *
 * Lê JSONs de varredura do repositório GitHub e permite ao Dr. Arthur
 * aprovar/reprovar artigos diretamente pelo celular.
 */

// ============================================================
// Config
// ============================================================

const REPO_OWNER = 'arthurkingayres-ux';
const REPO_NAME = 'Biblioteca-CirurgiaPlastica';
const VARREDURA_PATH = '02-Artigos-Periodicos/_varredura';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const APPROVAL_FILE = `${VARREDURA_PATH}/approval_state.json`;

// ============================================================
// State
// ============================================================

let token = localStorage.getItem('github_token') || '';
let allArticles = [];       // All articles from all varreduras
let approvalState = {};     // { pmid: { status, data } }
let approvalStateSHA = null; // SHA for GitHub API update
let areas = [];             // Unique area names
let currentArea = 'todas';
let currentFilter = 'pendentes';
let saveTimer = null;       // Debounce timer for save queue
let saving = false;         // Prevent concurrent saves
let savePending = false;    // Dirty flag: another save needed after current

// ============================================================
// DOM refs
// ============================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const authScreen = $('#auth-screen');
const appScreen = $('#app-screen');
const tokenInput = $('#token-input');
const btnLogin = $('#btn-login');
const btnRefresh = $('#btn-refresh');
const btnLogout = $('#btn-logout');
const areaTabs = $('#area-tabs');
const statsBar = $('#stats-bar');
const articleList = $('#article-list');
const loadingEl = $('#loading');
const emptyState = $('#empty-state');
const emptyMessage = $('#empty-message');

// ============================================================
// GitHub API
// ============================================================

async function githubFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}/contents/${path}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    toast('Token inválido ou expirado', 'error');
    logout();
    throw new Error('Unauthorized');
  }

  if (!res.ok && res.status !== 404 && res.status !== 409) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body.slice(0, 200)}`);
  }

  if (res.status === 409) {
    throw new Error(`GitHub API error 409: SHA conflict`);
  }

  return res;
}

/**
 * List all files in the _varredura directory.
 */
async function listVarreduraFiles() {
  const res = await githubFetch(VARREDURA_PATH);
  if (res.status === 404) return [];
  const items = await res.json();
  return items.filter(f => f.name.endsWith('.json') && f.name !== 'approval_state.json');
}

/**
 * Read and parse a JSON file from the repo.
 * Files > 1 MB have encoding "none" — fetch raw via Accept header (CORS-safe).
 */
async function readJsonFile(path) {
  const res = await githubFetch(path);
  if (res.status === 404) return null;
  const data = await res.json();

  let parsed;
  if (data.content && data.encoding === 'base64') {
    const content = atob(data.content.replace(/\n/g, ''));
    const decoded = new TextDecoder('utf-8').decode(
      Uint8Array.from(content, c => c.charCodeAt(0))
    );
    parsed = JSON.parse(decoded);
  } else {
    // Large file (> 1 MB): re-fetch with raw Accept header (stays on api.github.com)
    const url = `${API_BASE}/contents/${path}`;
    const raw = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.raw',
      },
    });
    parsed = await raw.json();
  }

  return { parsed, sha: data.sha };
}

/**
 * Write JSON to a file in the repo.
 */
async function writeJsonFile(path, content, sha, message) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2) + '\n')));
  const body = {
    message,
    content: encoded,
    ...(sha ? { sha } : {}),
  };

  const res = await githubFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await res.json();
  return result.content?.sha || null;
}

// ============================================================
// Data Loading
// ============================================================

async function loadAllData() {
  showLoading(true);
  try {
    // Load varredura files and approval state in parallel
    const [files, approvalData] = await Promise.all([
      listVarreduraFiles(),
      readJsonFile(APPROVAL_FILE),
    ]);

    // Parse approval state
    if (approvalData) {
      approvalState = approvalData.parsed;
      approvalStateSHA = approvalData.sha;
    } else {
      approvalState = {};
      approvalStateSHA = null;
    }

    // Load each varredura JSON
    const varreduras = await Promise.all(
      files.map(f => readJsonFile(f.path))
    );

    // Flatten all articles, dedup by PMID (keep latest varredura)
    const articleMap = new Map();
    const areaSet = new Set();

    for (const v of varreduras) {
      if (!v || !v.parsed) continue;
      const data = v.parsed;
      areaSet.add(data.area);

      for (const art of (data.artigos || [])) {
        // Keep track of which area/scan this came from
        art._area = data.area;
        art._varredura_data = data.data_varredura;
        // Dedup: keep latest by varredura date
        const existing = articleMap.get(art.pmid);
        if (!existing || data.data_varredura > existing._varredura_data) {
          articleMap.set(art.pmid, art);
        }
      }
    }

    allArticles = Array.from(articleMap.values());
    areas = Array.from(areaSet).sort();

    // Sort: ALTA first, then MEDIA, then rest; within same relevance, newest first
    const relOrder = { 'ALTA': 0, 'MEDIA': 1, 'BAIXA': 2, 'PENDENTE': 3, 'EXCLUIR': 4 };
    allArticles.sort((a, b) => {
      const ra = relOrder[a.relevancia] ?? 3;
      const rb = relOrder[b.relevancia] ?? 3;
      if (ra !== rb) return ra - rb;
      return (b.ano || '0').localeCompare(a.ano || '0');
    });

    renderTabs();
    renderStats();
    renderArticles();
    toast(`${allArticles.length} artigos carregados`, 'success');
  } catch (err) {
    console.error('Load error:', err);
    toast('Erro ao carregar dados', 'error');
  } finally {
    showLoading(false);
  }
}

// ============================================================
// Approval State Persistence
// ============================================================

/**
 * Debounced save: batches rapid decisions into one API call.
 * If a save is in progress, sets a dirty flag to trigger a follow-up save.
 */
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => doSave(), 800);
}

async function doSave() {
  if (saving) {
    savePending = true;
    return;
  }
  saving = true;
  savePending = false;
  try {
    const newSHA = await writeJsonFile(
      APPROVAL_FILE,
      approvalState,
      approvalStateSHA,
      'Atualizar estado de aprovação de artigos'
    );
    if (newSHA) approvalStateSHA = newSHA;
  } catch (err) {
    console.error('Save error:', err);
    // Handle 409 SHA conflict: re-fetch and merge
    if (err.message && err.message.includes('409')) {
      try {
        const fresh = await readJsonFile(APPROVAL_FILE);
        if (fresh) {
          // Merge: local decisions take precedence over remote
          approvalState = { ...fresh.parsed, ...approvalState };
          approvalStateSHA = fresh.sha;
          savePending = true; // Retry with merged state
        }
      } catch (mergeErr) {
        console.error('Merge error:', mergeErr);
        toast('Erro ao sincronizar — tente atualizar', 'error');
      }
    } else {
      toast('Erro ao salvar decisão', 'error');
    }
  } finally {
    saving = false;
    if (savePending) doSave();
  }
}

function setArticleStatus(pmid, status) {
  const today = new Date().toISOString().slice(0, 10);
  approvalState[pmid] = { status, data: today };
  renderStats();
  renderArticles();
  scheduleSave();
}

function getArticleStatus(pmid) {
  return approvalState[pmid]?.status || null;
}

// ============================================================
// UI Rendering
// ============================================================

function showLoading(show) {
  loadingEl.classList.toggle('hidden', !show);
  if (show) {
    emptyState.classList.add('hidden');
    articleList.innerHTML = '';
  }
}

function showEmpty(message) {
  emptyMessage.textContent = message;
  emptyState.classList.remove('hidden');
}

function renderTabs() {
  areaTabs.innerHTML = '';

  // "Todas" tab
  const allBtn = document.createElement('button');
  allBtn.className = `tab-btn ${currentArea === 'todas' ? 'active' : ''}`;
  allBtn.innerHTML = `Todas <span class="tab-count">${allArticles.length}</span>`;
  allBtn.onclick = () => { currentArea = 'todas'; renderTabs(); renderStats(); renderArticles(); };
  areaTabs.appendChild(allBtn);

  // Per-area tabs
  for (const area of areas) {
    const count = allArticles.filter(a => a._area === area).length;
    const btn = document.createElement('button');
    btn.className = `tab-btn ${currentArea === area ? 'active' : ''}`;
    btn.innerHTML = `${formatAreaName(area)} <span class="tab-count">${count}</span>`;
    btn.onclick = () => { currentArea = area; renderTabs(); renderStats(); renderArticles(); };
    areaTabs.appendChild(btn);
  }
}

function renderStats() {
  const filtered = getFilteredBase();
  const stats = { aprovado: 0, reprovado: 0, baixado: 0, pendente: 0 };

  for (const art of filtered) {
    const st = getArticleStatus(art.pmid);
    if (st === 'baixado') stats.baixado++;
    else if (st === 'aprovado') stats.aprovado++;
    else if (st === 'reprovado') stats.reprovado++;
    else stats.pendente++;
  }

  statsBar.innerHTML = `
    <span class="stat-item"><span class="stat-dot" style="background:var(--text-muted)"></span>${filtered.length} total</span>
    <span class="stat-item"><span class="stat-dot" style="background:var(--accent-yellow)"></span>${stats.pendente} pendentes</span>
    <span class="stat-item"><span class="stat-dot" style="background:var(--accent-green)"></span>${stats.aprovado} aprovados</span>
    <span class="stat-item"><span class="stat-dot" style="background:var(--accent-blue)"></span>${stats.baixado} baixados</span>
    <span class="stat-item"><span class="stat-dot" style="background:var(--accent-red)"></span>${stats.reprovado} reprovados</span>
  `;
}

/**
 * Get articles filtered only by area (not by status filter).
 */
function getFilteredBase() {
  if (currentArea === 'todas') return allArticles;
  return allArticles.filter(a => a._area === currentArea);
}

/**
 * Get articles filtered by area AND status filter.
 */
function getFilteredArticles() {
  let list = getFilteredBase();

  if (currentFilter === 'pendentes') {
    list = list.filter(a => {
      const st = getArticleStatus(a.pmid);
      return !st; // No decision yet
    });
  } else if (currentFilter === 'aprovados') {
    list = list.filter(a => {
      const st = getArticleStatus(a.pmid);
      return st === 'aprovado' || st === 'baixado';
    });
  }
  // 'todos' shows everything

  return list;
}

function renderArticles() {
  const articles = getFilteredArticles();
  articleList.innerHTML = '';
  emptyState.classList.add('hidden');

  if (articles.length === 0) {
    const messages = {
      pendentes: 'Nenhum artigo pendente de revisão nesta área.',
      aprovados: 'Nenhum artigo aprovado nesta área.',
      todos: 'Nenhum artigo encontrado.',
    };
    showEmpty(messages[currentFilter] || 'Nenhum artigo encontrado.');
    return;
  }

  for (const art of articles) {
    articleList.appendChild(createCard(art));
  }
}

function createCard(art) {
  const status = getArticleStatus(art.pmid);
  const card = document.createElement('div');
  card.className = `article-card ${status ? 'status-' + status : ''}`;
  card.id = `card-${art.pmid}`;

  // Badges
  const relevBadge = `<span class="badge badge-${(art.relevancia || 'pendente').toLowerCase()}">${art.relevancia || 'PENDENTE'}</span>`;
  const pubTypes = (art.publication_types || [])
    .filter(pt => pt !== 'Journal Article')
    .map(pt => `<span class="badge badge-pub-type">${pt}</span>`)
    .join('');
  const statusBadge = status === 'aprovado'
    ? '<span class="badge badge-status-aprovado">Aprovado</span>'
    : status === 'baixado'
    ? '<span class="badge badge-status-baixado">Baixado</span>'
    : '';

  // Authors (short format)
  const authorsShort = formatAuthors(art.autores);

  // Abstract
  const abstractId = `abstract-${art.pmid}`;
  const hasAbstract = art.abstract && art.abstract.trim().length > 0;

  // DOI link
  const doiLink = art.doi
    ? `<a class="card-doi" href="https://doi.org/${art.doi}" target="_blank" rel="noopener">DOI: ${art.doi}</a>`
    : '';

  // Actions — use data-pmid attributes (no inline onclick)
  const pmid = art.pmid;
  let actions = '';
  if (!status) {
    actions = `
      <div class="card-actions">
        <button class="btn-approve" data-action="approve" data-pmid="${pmid}">Aprovar</button>
        <button class="btn-reject" data-action="reject" data-pmid="${pmid}">Reprovar</button>
      </div>`;
  } else if (status === 'aprovado') {
    actions = `
      <div class="card-actions">
        <button class="btn-download" data-action="download" data-pmid="${pmid}">Marcar como baixado</button>
        <button class="btn-undo" data-action="undo" data-pmid="${pmid}">Desfazer</button>
      </div>`;
  } else if (status === 'baixado' || status === 'reprovado') {
    actions = `
      <div class="card-actions">
        <button class="btn-undo" data-action="undo" data-pmid="${pmid}">Desfazer</button>
      </div>`;
  }

  card.innerHTML = `
    <div class="card-badges">${relevBadge}${pubTypes}${statusBadge}</div>
    <div class="card-title">${escapeHtml(art.titulo || '(sem título)')}</div>
    <div class="card-meta">${escapeHtml(authorsShort)}</div>
    <div class="card-meta">${escapeHtml(art.journal || '')}${art.ano ? ', ' + art.ano : ''}</div>
    ${art.justificativa ? `<div class="card-justificativa">${escapeHtml(art.justificativa)}</div>` : ''}
    ${hasAbstract ? `<button class="card-abstract-toggle" data-action="toggle-abstract" data-pmid="${pmid}">Ver abstract ▾</button>` : ''}
    ${hasAbstract ? `<div class="card-abstract" id="${abstractId}">${escapeHtml(art.abstract)}</div>` : ''}
    ${doiLink}
    ${actions}
  `;

  return card;
}

// ============================================================
// Actions
// ============================================================

function approveArticle(pmid) {
  setArticleStatus(pmid, 'aprovado');
  toast('Artigo aprovado', 'success');
}

function rejectArticle(pmid) {
  setArticleStatus(pmid, 'reprovado');
  toast('Artigo reprovado', 'info');
}

function markDownloaded(pmid) {
  setArticleStatus(pmid, 'baixado');
  toast('Marcado como baixado', 'success');
}

function undoDecision(pmid) {
  delete approvalState[pmid];
  renderStats();
  renderArticles();
  scheduleSave();
  toast('Decisão desfeita', 'info');
}

function toggleAbstract(pmid) {
  const el = document.getElementById(`abstract-${pmid}`);
  const btn = el?.previousElementSibling;
  if (el) {
    const isOpen = el.classList.toggle('open');
    if (btn) btn.textContent = isOpen ? 'Ocultar abstract ▴' : 'Ver abstract ▾';
  }
}

// ============================================================
// Auth
// ============================================================

function showAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  tokenInput.value = '';
}

function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
}

async function login() {
  const t = tokenInput.value.trim();
  if (!t) {
    toast('Insira o token', 'error');
    return;
  }

  // Validate token
  btnLogin.textContent = 'Verificando...';
  btnLogin.disabled = true;

  try {
    const res = await fetch(`${API_BASE}`, {
      headers: {
        'Authorization': `token ${t}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      toast('Token inválido ou sem acesso ao repositório', 'error');
      return;
    }

    token = t;
    localStorage.setItem('github_token', token);
    showApp();
    loadAllData();
  } catch (err) {
    toast('Erro de conexão', 'error');
  } finally {
    btnLogin.textContent = 'Entrar';
    btnLogin.disabled = false;
  }
}

function logout() {
  token = '';
  localStorage.removeItem('github_token');
  allArticles = [];
  approvalState = {};
  approvalStateSHA = null;
  // Clear cached API responses (security: removes authenticated data)
  if ('caches' in window) {
    caches.delete('triagem-cp-v1');
  }
  showAuth();
}

// ============================================================
// Helpers
// ============================================================

function formatAreaName(area) {
  return area
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatAuthors(authors) {
  if (!authors) return '';
  const parts = authors.split(',').map(a => a.trim());
  if (parts.length <= 3) return parts.join(', ');
  return `${parts[0]}, ${parts[1]} et al.`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toast(message, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  // Trigger show
  requestAnimationFrame(() => {
    el.classList.add('show');
  });

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// ============================================================
// Event Listeners
// ============================================================

btnLogin.addEventListener('click', login);
tokenInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
btnRefresh.addEventListener('click', () => loadAllData());
btnLogout.addEventListener('click', logout);

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderArticles();
  });
});

// Delegated event listener for all card actions (avoids inline onclick)
articleList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const pmid = btn.dataset.pmid;
  if (!pmid) return;

  switch (action) {
    case 'approve':
      approveArticle(pmid);
      break;
    case 'reject':
      rejectArticle(pmid);
      break;
    case 'download':
      markDownloaded(pmid);
      break;
    case 'undo':
      undoDecision(pmid);
      break;
    case 'toggle-abstract':
      toggleAbstract(pmid);
      break;
  }
});

// ============================================================
// Service Worker Registration
// ============================================================

// Unregister any existing service worker and clear caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
  caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
}

// ============================================================
// Init
// ============================================================

async function init() {
  if (token) {
    // Validate stored token before showing the app
    try {
      const res = await fetch(`${API_BASE}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (res.ok) {
        showApp();
        loadAllData();
      } else if (res.status === 401 || res.status === 403) {
        // Token definitely expired or revoked
        localStorage.removeItem('github_token');
        token = '';
        showAuth();
        toast('Token expirado — faça login novamente', 'error');
      } else {
        // Other error (rate limit, server issue) — keep token, try anyway
        showApp();
        loadAllData();
      }
    } catch {
      // Offline or network error: show app with cached data
      showApp();
      loadAllData();
    }
  } else {
    showAuth();
  }
}

init();
