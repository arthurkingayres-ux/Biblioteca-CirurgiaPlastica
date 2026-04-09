# Fase 3: Motor de Teste + Perfil Adaptativo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Teste" mode to the PWA where Dr. Arthur selects a topic, answers 8 questions adaptively selected based on his knowledge profile, self-rates each answer, and receives a score with domain breakdown and links to weak cards.

**Architecture:** Two-stage pipeline. Stage 1: offline script (`tools/generate_questions.js`) reads card JSON files, calls Claude Haiku to generate 2 questions per card, saves to `content/cards/<area>/<topic>/_questions.json`. Stage 2: PWA `test.js` module loads the pre-generated questions, selects 8 adaptively based on a knowledge profile stored in localStorage, presents them one-by-one with self-rating (Errei / Acertei), and saves results back to the profile. No network calls at test time — fully offline.

**Tech Stack:** Node.js + `@anthropic-ai/sdk` (generation script), Vanilla JS (PWA test engine), localStorage (profile persistence), JSON (question storage).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `tools/generate_questions.js` | Create | Reads card files, calls Claude Haiku, writes `_questions.json` |
| `webapp/library/test.js` | Create | Test engine: profile CRUD, adaptive selection, session state |
| `webapp/library/index.html` | Modify | Add ⚡ test button + `screen-test` div with 3 sub-views |
| `webapp/library/style.css` | Modify | Add test mode CSS (topic list, question card, rating buttons, results) |
| `webapp/library/app.js` | Modify | Wire test mode: load questions, navigate views, handle events |
| `package.json` | Modify | Add `@anthropic-ai/sdk` dependency |

`sw.js` needs **no changes** — the existing fetch handler already caches `/content/` URLs, which includes `_questions.json`.

---

## Task 1: Install SDK + Create Question Generation Script

**Files:**
- Modify: `package.json`
- Create: `tools/generate_questions.js`

- [ ] **Step 1: Add `@anthropic-ai/sdk` to package.json and install**

Edit `package.json`, add to `dependencies`:
```json
"@anthropic-ai/sdk": "^0.52.0"
```
Then run:
```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"
npm install
```
Expected: `node_modules/@anthropic-ai/sdk/` created, no errors.

- [ ] **Step 2: Create `tools/generate_questions.js`**

```javascript
#!/usr/bin/env node
// tools/generate_questions.js — Gera questões de teste a partir dos cards (Fase 3)
//
// Uso:
//   node tools/generate_questions.js --topic blefaroplastia
//   node tools/generate_questions.js --topic blefaroplastia --area estetica-facial
//   node tools/generate_questions.js --topic blefaroplastia --redo   # regenera mesmo se já existir
//
// Saída:
//   content/cards/<area>/<topic>/_questions.json

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';
const CARD_FILES = ['anatomia', 'tecnicas', 'decisoes', 'notas'];
const QS_PER_CARD = 2;
const DELAY_MS = 400; // entre chamadas API

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function buildPrompt(card, domain) {
  // Extrair campos relevantes sem sobrecarregar o contexto
  const excerpt = {
    id: card.id,
    type: card.type,
    title: card.title,
    ...(card.definition ? { definition: card.definition } : {}),
    ...(card.location ? { location: card.location } : {}),
    ...(card.surgical_relevance ? { surgical_relevance: card.surgical_relevance } : {}),
    ...(card.how_to_identify ? { how_to_identify: card.how_to_identify } : {}),
    ...(card.indication ? { indication: card.indication } : {}),
    ...(card.contraindication ? { contraindication: card.contraindication } : {}),
    ...(card.steps ? { steps: card.steps.slice(0, 6) } : {}),  // primeiros 6 passos
    ...(card.complications ? { complications: card.complications.slice(0, 5) } : {}),
    ...(card.pearls ? { pearls: card.pearls } : {}),
    ...(card.trigger ? { trigger: card.trigger } : {}),
  };

  return `Você é um professor de cirurgia plástica gerando questões de avaliação para residentes.

Domínio: ${domain}
Card:
${JSON.stringify(excerpt, null, 2)}

Gere exatamente ${QS_PER_CARD} questões de avaliação. Responda APENAS com JSON válido, sem texto extra:

[
  {
    "question": "Pergunta clara e objetiva (1-2 frases em português)",
    "expected": "Resposta esperada completa (2-5 frases, incluindo dados numéricos importantes)"
  }
]

Regras:
- Perguntas devem avaliar conhecimento aplicável em sala cirúrgica
- Incluir valores numéricos quando relevantes (medidas, percentuais, tempos)
- Para técnicas: focar em passos críticos, armadilhas, complicações específicas
- Para anatomia: focar em localização, relações, relevância cirúrgica, como identificar
- Para decisões: focar em critérios de seleção, indicações vs contraindicações
- Variar o foco entre as ${QS_PER_CARD} perguntas — não repetir o mesmo aspecto`;
}

async function generateForCard(client, card, domain) {
  const prompt = buildPrompt(card, domain);
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  let raw = response.content[0].text.trim();
  // Remover blocos de código se presentes
  if (raw.startsWith('```')) {
    raw = raw.split('```')[1];
    if (raw.startsWith('json')) raw = raw.slice(4);
  }
  return JSON.parse(raw.trim());
}

async function main() {
  const args = process.argv.slice(2);
  const topicIdx = args.indexOf('--topic');
  const areaIdx = args.indexOf('--area');
  const redo = args.includes('--redo');

  if (topicIdx === -1) {
    console.error('Uso: node tools/generate_questions.js --topic <topic> [--area <area>] [--redo]');
    process.exit(1);
  }

  const topic = args[topicIdx + 1];
  const area = areaIdx !== -1 ? args[areaIdx + 1] : 'estetica-facial';

  const cardsDir = path.join(ROOT, 'content', 'cards', area, topic);
  if (!fs.existsSync(cardsDir)) {
    console.error(`Erro: pasta não encontrada: ${cardsDir}`);
    process.exit(1);
  }

  const outPath = path.join(cardsDir, '_questions.json');
  if (fs.existsSync(outPath) && !redo) {
    console.log(`_questions.json já existe. Use --redo para regenerar.`);
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    console.log(`  ${existing.total} questões geradas em ${existing.generated}`);
    process.exit(0);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Erro: ANTHROPIC_API_KEY não encontrada em .env');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const questions = [];
  let cardCount = 0;
  let errorCount = 0;

  console.log(`Tópico : ${topic}`);
  console.log(`Área   : ${area}`);
  console.log(`Modelo : ${MODEL}`);
  console.log(`Questões/card: ${QS_PER_CARD}`);
  console.log();

  // --- Cards regulares (anatomia, tecnicas, decisoes, notas) ---
  for (const domain of CARD_FILES) {
    const filePath = path.join(cardsDir, `${domain}.json`);
    if (!fs.existsSync(filePath)) continue;

    let cards;
    try {
      cards = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(`  [erro] Falha ao ler ${domain}.json: ${e.message}`);
      continue;
    }
    if (!Array.isArray(cards) || cards.length === 0) continue;

    console.log(`${domain}.json (${cards.length} cards):`);

    for (const card of cards) {
      process.stdout.write(`  ${card.id} ... `);
      let retries = 0;
      while (true) {
        try {
          const qs = await generateForCard(client, card, domain);
          for (let i = 0; i < qs.length; i++) {
            questions.push({
              id: `q-${card.id}-${i + 1}`,
              card_id: card.id,
              domain,
              question: qs[i].question,
              expected: qs[i].expected,
            });
          }
          console.log(`OK (${qs.length})`);
          cardCount++;
          break;
        } catch (e) {
          if (e.status === 429 && retries < 3) {
            retries++;
            const wait = 15 * retries;
            process.stdout.write(`[rate-limit, aguardando ${wait}s] `);
            await sleep(wait * 1000);
          } else {
            console.log(`ERRO: ${e.message}`);
            errorCount++;
            break;
          }
        }
      }
      await sleep(DELAY_MS);
    }
    console.log();
  }

  // --- Flashcards (incluídos diretamente, sem chamar API) ---
  const fcPath = path.join(cardsDir, 'flashcards.json');
  if (fs.existsSync(fcPath)) {
    try {
      const fcData = JSON.parse(fs.readFileSync(fcPath, 'utf8'));
      const fcCards = fcData.cards || [];
      let fcCount = 0;
      for (let i = 0; i < fcCards.length; i++) {
        const fc = fcCards[i];
        if (!fc.front || !fc.back) continue;
        questions.push({
          id: `q-flashcard-${i + 1}`,
          card_id: fcData.id || 'flashcard',
          domain: fc.domain || 'flashcards',
          question: fc.front,
          expected: fc.back,
        });
        fcCount++;
      }
      console.log(`flashcards.json: ${fcCount} questões adicionadas diretamente`);
      console.log();
    } catch (e) {
      console.warn(`  [aviso] Falha ao ler flashcards.json: ${e.message}`);
    }
  }

  // --- Salvar ---
  const output = {
    topic,
    area,
    generated: new Date().toISOString().split('T')[0],
    total: questions.length,
    questions,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log('='.repeat(50));
  console.log(`Cards processados : ${cardCount}`);
  console.log(`Questões geradas  : ${questions.length}`);
  console.log(`Erros             : ${errorCount}`);
  console.log(`Salvo em          : ${path.relative(ROOT, outPath)}`);
  console.log();
  console.log('Próximo passo:');
  console.log('  Abrir PWA e testar o modo Teste');
}

main().catch(e => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"
git add package.json package-lock.json tools/generate_questions.js
git commit -m "feat(fase3-p1): script de geração de questões com Claude Haiku"
```

---

## Task 2: Test Engine Module (`webapp/library/test.js`)

**Files:**
- Create: `webapp/library/test.js`

- [ ] **Step 1: Create `webapp/library/test.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/test.js
git commit -m "feat(fase3-p2): test engine — seleção adaptativa e perfil de conhecimento"
```

---

## Task 3: Test UI — HTML

**Files:**
- Modify: `webapp/library/index.html`

- [ ] **Step 1: Add ⚡ test button to navbar**

In [index.html](webapp/library/index.html), after `<button id="btn-preop" ...>`, add:

```html
    <button id="btn-test" class="nav-btn" aria-label="Teste">&#9889;</button>
```

- [ ] **Step 2: Add `screen-test` div**

In `index.html`, after the `<div id="screen-preop" ...>` block (before the `<script>` tags), add:

```html
  <!-- Test screen -->
  <div id="screen-test" class="screen hidden">
    <!-- Sub-view 1: Topic selection -->
    <div id="test-view-topics">
      <h2 class="browser-title">Teste de Conhecimento</h2>
      <div id="test-topic-list"></div>
    </div>

    <!-- Sub-view 2: Question + Answer -->
    <div id="test-view-question" class="hidden">
      <div id="test-progress-bar"><div id="test-progress-fill"></div></div>
      <div id="test-domain-badge" class="test-domain-badge"></div>
      <div id="test-question-text" class="test-question"></div>
      <button id="btn-show-answer" class="btn-primary">Ver Resposta</button>
      <div id="test-view-answer" class="hidden">
        <div id="test-answer-text" class="test-answer"></div>
        <div class="test-rating-buttons">
          <button id="btn-errei" class="btn-errei">&#10007; Errei</button>
          <button id="btn-acertei" class="btn-acertei">&#10003; Acertei</button>
        </div>
      </div>
    </div>

    <!-- Sub-view 3: Results -->
    <div id="test-view-results" class="hidden"></div>
  </div>
```

- [ ] **Step 3: Add test.js to script tags**

In `index.html`, before `<script src="app.js"></script>`, add:

```html
  <script src="test.js"></script>
```

- [ ] **Step 4: Commit**

```bash
git add webapp/library/index.html
git commit -m "feat(fase3-p3): HTML — botão teste + screen-test com sub-views"
```

---

## Task 4: Test UI — CSS

**Files:**
- Modify: `webapp/library/style.css`

- [ ] **Step 1: Append test mode CSS to end of `style.css`**

```css

/* === Test Mode (Fase 3) === */

.test-topic-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  transition: background var(--transition);
}

.test-topic-item:active {
  background: var(--bg-card-hover);
}

.test-topic-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.test-topic-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.test-topic-arrow {
  color: var(--text-muted);
  font-size: 20px;
}

/* Progress bar */
#test-progress-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  margin-bottom: 20px;
}

#test-progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Domain badge */
.test-domain-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--accent-blue);
  background: rgba(67, 97, 238, 0.12);
  border-radius: 4px;
  padding: 3px 8px;
  margin-bottom: 14px;
}

/* Question */
.test-question {
  font-size: 1.1em;
  color: var(--text-primary);
  line-height: 1.55;
  margin-bottom: 24px;
  min-height: 72px;
}

/* Primary action button */
.btn-primary {
  display: block;
  width: 100%;
  padding: 14px 24px;
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition);
}

.btn-primary:active {
  opacity: 0.8;
}

/* Answer reveal */
.test-answer {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
  margin-bottom: 16px;
  color: var(--text-primary);
  line-height: 1.55;
  font-size: 0.95em;
}

/* Rating buttons */
.test-rating-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.btn-errei,
.btn-acertei {
  padding: 15px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1em;
  font-weight: 700;
  cursor: pointer;
  transition: opacity var(--transition);
}

.btn-errei {
  background: var(--accent-red);
  color: #fff;
}

.btn-acertei {
  background: var(--accent-green);
  color: #0f0f1a;
}

.btn-errei:active,
.btn-acertei:active {
  opacity: 0.8;
}

/* Results */
.test-results-header {
  text-align: center;
  margin-bottom: 24px;
}

.test-score {
  font-size: 3em;
  font-weight: 700;
  line-height: 1;
}

.test-score-pct {
  font-size: 1.1em;
  color: var(--text-secondary);
  margin-top: 4px;
}

.test-domain-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-primary);
}

.domain-score-good { color: var(--accent-green); font-weight: 700; }
.domain-score-bad  { color: var(--accent-red);   font-weight: 700; }
.domain-score-mid  { color: var(--accent-yellow); font-weight: 700; }

.test-weak-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  margin-top: 20px;
  margin-bottom: 10px;
}
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/style.css
git commit -m "feat(fase3-p4): CSS — estilos do modo teste"
```

---

## Task 5: App Integration (`app.js`)

**Files:**
- Modify: `webapp/library/app.js`

The changes are additions only — no existing lines are removed.

- [ ] **Step 1: Add `_testQuestions` variable after `_history`**

After `let _history = [];`, add:

```javascript
  let _testQuestions = {}; // { topic: { area, questions[] } }
```

- [ ] **Step 2: Add `loadTestQuestions()` after `loadAllCards()`**

After the closing `}` of `loadAllCards()`, add:

```javascript
  async function loadTestQuestions() {
    for (const { area, topic } of CARD_MANIFEST) {
      try {
        const questions = await TestEngine.loadQuestions(area, topic);
        _testQuestions[topic] = { area, questions };
      } catch (_) {
        _testQuestions[topic] = { area, questions: [] };
      }
    }
  }
```

- [ ] **Step 3: Add test mode functions before the `init()` function**

Before `function init()`, add:

```javascript
  // --- Test Mode ---

  function showTestView(view) {
    ['test-view-topics', 'test-view-question', 'test-view-results'].forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(`test-view-${view}`).classList.remove('hidden');
  }

  function renderTestTopicList() {
    const container = document.getElementById('test-topic-list');
    const entries = Object.entries(_testQuestions);
    const hasAny = entries.some(([, t]) => t.questions.length > 0);

    if (!hasAny) {
      container.innerHTML = '<div class="no-results">Nenhuma questão disponível.<br>Execute: node tools/generate_questions.js --topic blefaroplastia</div>';
      return;
    }

    container.innerHTML = entries.map(([topic, { questions }]) => {
      if (questions.length === 0) return '';
      const profile = TestEngine.getTopicProfile(topic);
      const lastTested = profile?.lastTested ? `Último: ${profile.lastTested}` : 'Nunca testado';
      const sessions = profile?.sessions || 0;
      return `<div class="test-topic-item" data-topic="${topic}">
        <div>
          <div class="test-topic-name">${topic}</div>
          <div class="test-topic-meta">${questions.length} questões · ${lastTested} · ${sessions} sessão(ões)</div>
        </div>
        <div class="test-topic-arrow">&#8250;</div>
      </div>`;
    }).join('');
  }

  function startTestSession(topic) {
    const { area, questions } = _testQuestions[topic] || { area: '', questions: [] };
    if (questions.length === 0) return;
    const firstQ = TestEngine.startSession(topic, area, questions);
    if (!firstQ) return;
    showTestView('question');
    _renderTestQuestion(firstQ);
  }

  function _renderTestQuestion(q) {
    const prog = TestEngine.progress();
    const pct = prog.total > 0 ? (prog.current / prog.total) * 100 : 0;
    document.getElementById('test-progress-fill').style.width = `${pct}%`;
    document.getElementById('test-domain-badge').textContent = q.domain;
    document.getElementById('test-question-text').textContent = q.question;
    // Reset answer state
    document.getElementById('test-view-answer').classList.add('hidden');
    document.getElementById('btn-show-answer').classList.remove('hidden');
  }

  function _showTestAnswer() {
    const q = TestEngine.currentQuestion();
    if (!q) return;
    document.getElementById('test-answer-text').textContent = q.expected;
    document.getElementById('test-view-answer').classList.remove('hidden');
    document.getElementById('btn-show-answer').classList.add('hidden');
  }

  function _rateAnswer(correct) {
    const next = TestEngine.rate(correct);
    if (TestEngine.isDone()) {
      _showTestResults();
    } else {
      _renderTestQuestion(next);
    }
  }

  function _showTestResults() {
    const result = TestEngine.finishSession();
    showTestView('results');

    const pct = Math.round((result.correct / result.total) * 100);
    const scoreColor = pct >= 70 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';

    const domainsHtml = Object.entries(result.domainResults)
      .map(([domain, { correct, total }]) => {
        const dp = Math.round((correct / total) * 100);
        const cls = dp >= 70 ? 'domain-score-good' : dp >= 50 ? 'domain-score-mid' : 'domain-score-bad';
        return `<div class="test-domain-row"><span>${domain}</span><span class="${cls}">${correct}/${total} (${dp}%)</span></div>`;
      }).join('');

    const weakHtml = result.weakCards.length > 0
      ? result.weakCards.map(id => {
          const card = SearchEngine.getById(id);
          return card ? Renderer.searchResult({ id: card.id, type: card.type, title: card.title, topic: card.topic }) : '';
        }).join('')
      : '';

    document.getElementById('test-view-results').innerHTML = `
      <div class="test-results-header">
        <div class="test-score" style="color:${scoreColor}">${result.correct}/${result.total}</div>
        <div class="test-score-pct">${pct}%</div>
      </div>
      <div>${domainsHtml}</div>
      ${result.weakCards.length > 0 ? '<p class="test-weak-title">Revisar</p>' : ''}
      <div>${weakHtml}</div>
      <button id="btn-test-again" class="btn-primary" style="margin-top:20px">Testar Novamente</button>
    `;
  }
```

- [ ] **Step 4: Wire "Teste" button in `init()` — add after `btn-preop` wiring**

After:
```javascript
    document.getElementById('btn-preop').addEventListener('click', () => { ... });
```

Add:
```javascript
    // Test button
    document.getElementById('btn-test').addEventListener('click', () => {
      navigateTo('screen-test', 'Teste');
      showTestView('topics');
      renderTestTopicList();
    });
```

- [ ] **Step 5: Wire test delegated events in `init()` — add inside `document.addEventListener('click', ...)`**

Inside the delegated click handler, after all existing `if (...)` checks, add:

```javascript
      const testTopic = e.target.closest('.test-topic-item');
      if (testTopic) { startTestSession(testTopic.dataset.topic); return; }

      if (e.target.closest('#btn-show-answer')) { _showTestAnswer(); return; }
      if (e.target.closest('#btn-errei'))       { _rateAnswer(false); return; }
      if (e.target.closest('#btn-acertei'))     { _rateAnswer(true);  return; }
      if (e.target.closest('#btn-test-again'))  { showTestView('topics'); renderTestTopicList(); return; }
```

- [ ] **Step 6: Load test questions in `init()` — update `loadAllCards().then()`**

Change:
```javascript
    loadAllCards().then(() => {
      renderTopicBrowser();
      showScreen('screen-search');
      searchInput.focus();
    });
```

To:
```javascript
    loadAllCards().then(async () => {
      await loadTestQuestions();
      renderTopicBrowser();
      showScreen('screen-search');
      searchInput.focus();
    });
```

- [ ] **Step 7: Commit**

```bash
git add webapp/library/app.js
git commit -m "feat(fase3-p5): integração do modo teste no app.js"
```

---

## Task 6: Generate Questions + End-to-End Test

**Files:**
- Create: `content/cards/estetica-facial/blefaroplastia/_questions.json` (via script)
- Create: `content/cards/estetica-facial/rinoplastia/_questions.json` (via script)

- [ ] **Step 1: Generate questions for blefaroplastia**

```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"
node tools/generate_questions.js --topic blefaroplastia
```

Expected output (approximate):
```
Tópico : blefaroplastia
Área   : estetica-facial
Modelo : claude-haiku-4-5-20251001
Questões/card: 2

anatomia.json (N cards):
  blef-anat-001 ... OK (2)
  ...
==================================================
Cards processados : XX
Questões geradas  : YY
Erros             : 0
Salvo em          : content/cards/estetica-facial/blefaroplastia/_questions.json
```

- [ ] **Step 2: Generate questions for rinoplastia**

```bash
node tools/generate_questions.js --topic rinoplastia
```

- [ ] **Step 3: Verify question files look correct**

```bash
node -e "
const data = require('./content/cards/estetica-facial/blefaroplastia/_questions.json');
console.log('Total:', data.total);
console.log('Dominios:', [...new Set(data.questions.map(q=>q.domain))]);
console.log('Sample:', JSON.stringify(data.questions[0], null, 2));
"
```

Expected: total > 30, domains include `['anatomia', 'tecnicas', 'decisoes', 'notas', 'flashcards']` (or subset), sample shows well-formed question and expected answer.

- [ ] **Step 4: Open PWA and test the full flow**

```bash
npx http-server webapp/library -p 8081 -c-1
```

Manual test checklist:
- [ ] ⚡ button appears in navbar
- [ ] Clicking ⚡ → shows topic list with blefaroplastia and rinoplastia
- [ ] Topic shows question count and "Nunca testado"
- [ ] Clicking blefaroplastia → starts session with 8 questions
- [ ] Progress bar advances correctly
- [ ] Domain badge shows correct domain
- [ ] "Ver Resposta" reveals answer + rating buttons
- [ ] Clicking "Errei" or "Acertei" advances to next question
- [ ] After question 8 → results screen with score + domain breakdown
- [ ] Results show weak card links (if any)
- [ ] "Testar Novamente" returns to topic list
- [ ] Second session shows "Último: 2026-04-07" and session count = 1
- [ ] Second session distributes more questions toward weaker domains

- [ ] **Step 5: Commit all generated files and finalize**

```bash
git add content/cards/estetica-facial/blefaroplastia/_questions.json
git add content/cards/estetica-facial/rinoplastia/_questions.json
git commit -m "feat(fase3): questões geradas para blefaroplastia e rinoplastia"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|---|---|
| "Me testa sobre blefaroplastia" | Task 3+5 (btn-test + startTestSession) |
| Perfil de conhecimento por domínio | Task 2 (test.js profile CRUD) |
| Ponderação adaptativa (fraco = mais questões) | Task 2 (_selectQuestions) |
| Score: "7/10" | Task 5 (_showTestResults) |
| Por domínio: "Anatomia 3/3, Tecnicas 2/3" | Task 5 (domainResults) |
| Links para fichas a revisar | Task 5 (weakCards → Renderer.searchResult) |
| Sem gamificação | ✓ resultados diretos, sem badges/XP |
| Offline-capable | ✓ questões em JSON, service worker já cobre /content/ |

### Placeholder scan

Nenhum "TBD", "TODO" ou "implement later" no plano.

### Type consistency

- `TestEngine.loadQuestions(area, topic)` → returns `question[]`
- `question` = `{ id, card_id, domain, question, expected }`
- `TestEngine.startSession(topic, area, questions)` → returns first `question`
- `TestEngine.rate(correct: boolean)` → returns next `question` or `null`
- `TestEngine.finishSession()` → returns `{ topic, total, correct, domainResults, weakCards, profile }`
- `SearchEngine.getById(id)` → already exists in search.js
- `Renderer.searchResult(...)` → already exists in renderer.js

All references consistent across Tasks 2, 5.
