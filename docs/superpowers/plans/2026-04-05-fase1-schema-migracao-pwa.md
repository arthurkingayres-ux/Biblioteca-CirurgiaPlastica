# Fase 1: Schema Atomico + Migracao + PWA (Busca + Fichas + Pre-Op)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a functional PWA on the user's iPhone where Dr. Arthur can search surgical cards, view detailed technique/anatomy/decision/note cards, and generate pre-op briefings — all offline.

**Architecture:** Static PWA (HTML/CSS/JS, no framework) that loads JSON card files at startup and indexes them for instant search. Cards are produced by migrating existing linear JSON documents (blefaroplastia, rinoplastia) via a Node.js migration script. The PWA follows the same patterns as the existing approval PWA (`webapp/approval/`): dark theme, mobile-first, standalone display.

**Tech Stack:** Vanilla HTML/CSS/JS (PWA), Node.js for migration script, JSON for data.

**Reference files:**
- Spec: `docs/superpowers/specs/2026-04-05-biblioteca-v2-design.md`
- Existing approval PWA (for style/pattern reference): `webapp/approval/`
- Existing linear JSONs: `content/estetica-facial/blefaroplastia.json`, `content/estetica-facial/rinoplastia.json`
- Existing images: `assets/images/blefaroplastia/`, `assets/images/rinoplastia/`

---

## File Structure

```
content/
├── cards/
│   ├── schema.json                          # JSON Schema for all 5 card types + _meta
│   ├── estetica-facial/
│   │   ├── blefaroplastia/
│   │   │   ├── _meta.json
│   │   │   ├── anatomia.json
│   │   │   ├── tecnicas.json
│   │   │   ├── decisoes.json
│   │   │   ├── notas.json
│   │   │   └── flashcards.json
│   │   └── rinoplastia/
│   │       ├── _meta.json
│   │       ├── anatomia.json
│   │       ├── tecnicas.json
│   │       ├── decisoes.json
│   │       ├── notas.json
│   │       └── flashcards.json

tools/
├── migrate_linear_to_cards.js              # Migration script (linear JSON -> cards)

webapp/
├── library/
│   ├── index.html                           # Single-page app
│   ├── style.css                            # Dark theme, mobile-first
│   ├── app.js                               # Main app logic
│   ├── search.js                            # Search index builder + query engine
│   ├── renderer.js                          # Card rendering (HTML generation)
│   ├── preop.js                             # Pre-op briefing assembly
│   ├── manifest.json                        # PWA manifest
│   ├── sw.js                                # Service worker (cache-first)
│   └── icons/                               # SVG icons (reuse from approval/)
```

---

## Task 1: Card Schema (`content/cards/schema.json`)

**Files:**
- Create: `content/cards/schema.json`

- [ ] **Step 1: Write the JSON Schema file**

This schema defines 5 card types (technique, anatomy, decision, note, flashcard) and the `_meta.json` format. All fields must match the spec exactly.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "biblioteca-cirurgia-plastica/cards-schema",
  "title": "Fichas Atomicas — Biblioteca de Cirurgia Plastica",
  "description": "Schema para fichas atomicas consumidas pela PWA Library",

  "$defs": {
    "technique": {
      "type": "object",
      "required": ["id", "type", "title", "topic", "area", "steps", "citations", "tags"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z]+-tec-" },
        "type": { "const": "technique" },
        "title": { "type": "string" },
        "aliases": { "type": "array", "items": { "type": "string" }, "default": [] },
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "indication": { "type": "string" },
        "contraindication": { "type": "string" },
        "steps": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "complications": { "type": "array", "items": { "type": "string" }, "default": [] },
        "pearls": { "type": "array", "items": { "type": "string" }, "default": [] },
        "images": { "type": "array", "items": { "type": "string" }, "default": [] },
        "citations": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "updates": { "type": "array", "items": { "$ref": "#/$defs/update" }, "default": [] },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "anatomy": {
      "type": "object",
      "required": ["id", "type", "title", "topic", "area", "definition", "location", "citations", "tags"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z]+-anat-" },
        "type": { "const": "anatomy" },
        "title": { "type": "string" },
        "aliases": { "type": "array", "items": { "type": "string" }, "default": [] },
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "definition": { "type": "string" },
        "location": { "type": "string" },
        "relations": { "type": "array", "items": { "type": "string" }, "default": [] },
        "surgical_relevance": { "type": "string" },
        "how_to_identify": { "type": "string" },
        "images": { "type": "array", "items": { "type": "string" }, "default": [] },
        "citations": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "updates": { "type": "array", "items": { "$ref": "#/$defs/update" }, "default": [] },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "decision": {
      "type": "object",
      "required": ["id", "type", "title", "topic", "area", "trigger", "steps", "citations", "tags"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z]+-dec-" },
        "type": { "const": "decision" },
        "title": { "type": "string" },
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "trigger": { "type": "string" },
        "steps": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["question", "options"],
            "properties": {
              "question": { "type": "string" },
              "options": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["answer", "next"],
                  "properties": {
                    "answer": { "type": "string" },
                    "next": { "type": "string" }
                  }
                }
              }
            }
          }
        },
        "citations": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "updates": { "type": "array", "items": { "$ref": "#/$defs/update" }, "default": [] },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "note": {
      "type": "object",
      "required": ["id", "type", "title", "topic", "area", "content", "citations", "tags"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z]+-nota-" },
        "type": { "const": "note" },
        "title": { "type": "string" },
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "section": { "type": "string" },
        "content": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "images": { "type": "array", "items": { "type": "string" }, "default": [] },
        "citations": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "updates": { "type": "array", "items": { "$ref": "#/$defs/update" }, "default": [] },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "flashcard": {
      "type": "object",
      "required": ["id", "type", "topic", "area", "cards", "tags"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z]+-fc-" },
        "type": { "const": "flashcard" },
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "cards": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["front", "back"],
            "properties": {
              "front": { "type": "string" },
              "back": { "type": "string" },
              "citation": { "type": "string" },
              "domain": { "type": "string" }
            }
          }
        },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "update": {
      "type": "object",
      "required": ["color", "title", "content", "citation"],
      "properties": {
        "color": { "enum": ["blue", "red", "green"] },
        "title": { "type": "string" },
        "content": { "type": "array", "items": { "type": "string" } },
        "citation": { "type": "string" },
        "paradigm_shift": { "type": "boolean", "default": false }
      }
    },
    "meta": {
      "type": "object",
      "required": ["topic", "area", "displayName", "version", "date", "status", "references"],
      "properties": {
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "displayName": { "type": "string" },
        "version": { "type": "string", "pattern": "^v\\d+\\.\\d+$" },
        "date": { "type": "string", "format": "date" },
        "status": { "enum": ["draft", "complete"] },
        "references": { "type": "array", "items": { "type": "string" } },
        "articles": { "type": "array", "items": { "type": "string" }, "default": [] },
        "cardCounts": {
          "type": "object",
          "properties": {
            "anatomia": { "type": "integer" },
            "tecnicas": { "type": "integer" },
            "decisoes": { "type": "integer" },
            "notas": { "type": "integer" },
            "flashcards": { "type": "integer" }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Verify the schema is valid JSON**

Run:
```bash
"/c/Program Files/nodejs/node.exe" -e "JSON.parse(require('fs').readFileSync('content/cards/schema.json','utf8')); console.log('Valid JSON')"
```
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add content/cards/schema.json
git commit -m "feat: add atomic card schema for v2 library system"
```

---

## Task 2: Migrate Blefaroplastia (linear JSON -> cards)

**Files:**
- Read: `content/estetica-facial/blefaroplastia.json` (source, 149 elements, 1245 lines)
- Create: `content/cards/estetica-facial/blefaroplastia/_meta.json`
- Create: `content/cards/estetica-facial/blefaroplastia/anatomia.json`
- Create: `content/cards/estetica-facial/blefaroplastia/tecnicas.json`
- Create: `content/cards/estetica-facial/blefaroplastia/decisoes.json`
- Create: `content/cards/estetica-facial/blefaroplastia/notas.json`
- Create: `content/cards/estetica-facial/blefaroplastia/flashcards.json`

**Context:**
The linear JSON has 149 body elements: 39 headings, 50 paragraphs, 45 figures, 10 boxes, 4 dataTables, 1 flashcards block. The H2 headings reveal the document sections:
- Section 2 (Anatomia Cirurgica): 2.1-2.12 — anatomy sections
- Section 3 (Avaliacao Pre-op): 3.1-3.4 — evaluation/diagnosis
- Section 4 (Tecnicas): 4.1-4.7 — surgical techniques
- Section 6 (Complicacoes): 6.1-6.2
- Section 7 (Complementares): 7.1-7.2

Migration is manual curation by the agent, NOT a script. The agent reads the linear JSON, understands the medical content, and produces properly structured atomic cards. This requires medical knowledge to:
- Determine which paragraphs become anatomy cards vs. notes
- Extract step-by-step technique descriptions from prose
- Create decision trees from clinical reasoning scattered across paragraphs
- Generate meaningful flashcards from the key facts
- Map existing images to the correct cards
- Preserve box updates (blue/red/green) as `updates[]` on relevant cards

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p content/cards/estetica-facial/blefaroplastia
```

- [ ] **Step 2: Read the full linear JSON and produce `anatomia.json`**

Read `content/estetica-facial/blefaroplastia.json` completely. For each anatomical structure in sections 2.1-2.12, create an anatomy card with fields: id, type, title, aliases, topic, area, definition, location, relations, surgical_relevance, how_to_identify, images, citations, tags.

Expected anatomy cards (~15-20):
- Pele palpebral
- Musculo orbicular do olho
- Septo orbital
- Gordura orbitaria (compartimentos)
- Musculo levantador da palpebra superior (MEPS)
- Musculo de Muller
- Fascia capsulopalpebral
- Ligamento de Lockwood
- Tarso (superior e inferior)
- Ligamento cantal medial
- Ligamento cantal lateral
- Ligamento de Whitnall
- Arteria e veia oftalmica (vascularizacao)
- Nervos sensoriais (V1, V2) e motor (VII)
- Sulco palpebro-malar / tear trough
- Ligamento de retencao orbicular (ORL)
- Anatomia palpebra asiatica

Map existing images from `images[]` field by matching figure content to anatomy card.

Write result to `content/cards/estetica-facial/blefaroplastia/anatomia.json` as a JSON array of anatomy card objects.

- [ ] **Step 3: Produce `tecnicas.json`**

From sections 4.1-4.7 and related content, create technique cards:
- Blefaroplastia superior (classica)
- Blefaroplastia inferior transconjuntival
- Blefaroplastia inferior transcutanea (subciliar)
- Cantopexia lateral
- Cantoplastia lateral
- Pinch blepharoplasty
- Double eyelid surgery (palpebra asiatica)
- Correcao de ptose — reinsercao da aponeurose
- Correcao de ptose — Fasanella-Servat
- Correcao de ptose — suspensao frontal
- Anchor blepharoplasty (se descrito)

Each with: id, type, title, aliases, topic, area, indication, contraindication, steps (numbered), complications, pearls, images, citations, updates, tags.

Write to `content/cards/estetica-facial/blefaroplastia/tecnicas.json`.

- [ ] **Step 4: Produce `decisoes.json`**

Create decision trees from clinical content:
- Escolha de tecnica para ptose (funcao MEPS -> tecnica)
- Blefaroplastia inferior: transconjuntival vs transcutanea (vetor orbitario, excesso de pele)
- Diagnostico diferencial da palpebra pesada (ptose vs dermatocalase vs excesso de gordura vs ptose de sobrancelha)
- Avaliacao do vetor orbitario (positivo vs negativo -> implicacoes)

Write to `content/cards/estetica-facial/blefaroplastia/decisoes.json`.

- [ ] **Step 5: Produce `notas.json`**

For content that doesn't fit other types:
- Introducao / epidemiologia
- Fisiopatologia do envelhecimento periorbital
- Avaliacao pre-operatoria sistematica (exame, testes)
- Hematoma retrobulbar — emergencia (reconhecimento + manejo)
- Complicacoes (ectropio, lagoftalmo, diplopia, etc.)
- Resurfacing periocular
- Lipoenxertia periocular

Preserve box updates (blue/red/green) as `updates[]` on the most relevant card.

Write to `content/cards/estetica-facial/blefaroplastia/notas.json`.

- [ ] **Step 6: Produce `flashcards.json`**

Generate flashcards from key facts across all cards. Each flashcard has front (question), back (answer), citation, and domain (maps to knowledge profile). Target: 40-60 flashcards covering:
- Anatomy: "O que e X? Onde fica?"
- Techniques: "Quais os passos de X?" / "Qual a tecnica para Y?"
- Numbers: medidas, angulos, distancias (ex: "distancia da margem palpebral ao sulco: 8-10mm")
- Complications: "Qual a emergencia mais temida? Como tratar?"
- Decisions: "Funcao MEPS < 4mm — qual tecnica?"

Write to `content/cards/estetica-facial/blefaroplastia/flashcards.json`.

- [ ] **Step 7: Produce `_meta.json`**

```json
{
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "displayName": "Blefaroplastia",
  "version": "v1.0",
  "date": "2026-04-05",
  "status": "complete",
  "references": [
    "Neligan 5ed vol.2 caps. 8-9",
    "Grabb & Smith 9ed caps. 34-35",
    "Core Procedures 2ed cap. 3",
    "Operative Dictations caps. 8-10"
  ],
  "articles": [
    "Stein MJ et al. PRS 2025;155(5):895-901",
    "Park NS et al. PRS 2025;156(2):189e-193e",
    "Nomoto S, Ogawa R. PRS 2026;157(4):486e-495e",
    "Chen J et al. PRS 2026;157(4):622-631",
    "Yu AY et al. PRS 2025;156(1):29-40",
    "Li X et al. PRS 2026;157(1):38e-48e",
    "Todorov D et al. ASJ 2025;45(6):554-562"
  ],
  "cardCounts": {}
}
```

After all card files are written, update `cardCounts` with the actual count of cards in each file.

- [ ] **Step 8: Validate all JSON files parse correctly**

```bash
"/c/Program Files/nodejs/node.exe" -e "
const fs = require('fs');
const dir = 'content/cards/estetica-facial/blefaroplastia';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
files.forEach(f => {
  try {
    const d = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
    const count = Array.isArray(d) ? d.length : (d.cards ? d.cards.length : 'meta');
    console.log('OK', f, '—', count, 'items');
  } catch(e) { console.error('FAIL', f, e.message); }
});
"
```

Expected: all files OK with item counts.

- [ ] **Step 9: Commit**

```bash
git add content/cards/estetica-facial/blefaroplastia/
git commit -m "feat: migrate blefaroplastia to atomic cards"
```

---

## Task 3: Migrate Rinoplastia (linear JSON -> cards)

**Files:**
- Read: `content/estetica-facial/rinoplastia.json` (source, 157 elements, 1214 lines)
- Create: `content/cards/estetica-facial/rinoplastia/` (all 6 files)

**Context:**
Same process as Task 2. Rinoplastia sections:
- Section 2 (Anatomia): 2.1-2.10 — nasal anatomy
- Section 3 (Analise): 3.1-3.5 — patient evaluation
- Section 4 (Fisiologia): 4.1-4.2 — nasal valves
- Section 5 (Tecnica Aberta): 5.1-5.14 — open technique in detail
- Section 7 (Enxertos): 7.1-7.4 — graft types
- Section 10 (Secundaria): 10.1
- Section 12 (Especiais): 12.1-12.2

- [ ] **Step 1: Create directory**

```bash
mkdir -p content/cards/estetica-facial/rinoplastia
```

- [ ] **Step 2: Read full linear JSON and produce `anatomia.json`**

Expected anatomy cards (~15-20): envelope de partes moles (SSTE), piramide ossea, cartilagens laterais superiores, cartilagens alares (medial/lateral/acessoria), septo nasal, ligamentos nasais, vascularizacao nasal, inervacao nasal, musculatura nasal, cornetos, valva nasal interna, valva nasal externa.

- [ ] **Step 3: Produce `tecnicas.json`**

Expected technique cards (~15-20): rinoplastia aberta (passos completos), rinoplastia fechada, septoplastia, reducao do dorso por componentes, spreader grafts, autospreader flaps, osteotomias (lateral, medial, transversa), manejo da ponta, sutura de ponta, alar rim graft, lateral crural strut graft, columellar strut, shield graft, cap graft, cirurgia da base alar, turbinoplastia inferior, depressor septi nasi release.

- [ ] **Step 4: Produce `decisoes.json`**

Expected: aberta vs fechada, algoritmo de osteotomias, escolha de material de enxerto (septal vs auricular vs costal), manejo do dorso (preservation vs component reduction).

- [ ] **Step 5: Produce `notas.json`**

Expected: introducao, analise nasal sistematica (frontal/lateral/basal), angulos nasais (parametros), fisiologia nasal e vias aereas, enxertos (tipos e fontes), rinoplastia secundaria (principios), rinoplastia em fissura labiopalatal, complicacoes.

- [ ] **Step 6: Produce `flashcards.json`**

Target: 50-70 flashcards covering nasal anatomy, analysis parameters (angles, ratios), technique steps, graft types, complications.

- [ ] **Step 7: Produce `_meta.json` and validate**

Same validation as Task 2 Step 8.

- [ ] **Step 8: Commit**

```bash
git add content/cards/estetica-facial/rinoplastia/
git commit -m "feat: migrate rinoplastia to atomic cards"
```

---

## Task 4: PWA Shell (`webapp/library/index.html` + `manifest.json` + `sw.js`)

**Files:**
- Create: `webapp/library/index.html`
- Create: `webapp/library/manifest.json`
- Create: `webapp/library/sw.js`
- Create: `webapp/library/icons/` (copy from `webapp/approval/icons/`)

- [ ] **Step 1: Create directory and copy icons**

```bash
mkdir -p webapp/library/icons
cp webapp/approval/icons/* webapp/library/icons/
```

- [ ] **Step 2: Write `manifest.json`**

```json
{
  "name": "Biblioteca CP — Consulta Cirurgica",
  "short_name": "Biblioteca CP",
  "description": "Consulta rapida de fichas cirurgicas — Biblioteca de Cirurgia Plastica",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1a1a2e",
  "background_color": "#0f0f1a",
  "icons": [
    {
      "src": "icons/icon-192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 3: Write `index.html`**

Single-page app with 3 screens: search (default), card detail, pre-op briefing. Structure:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1a1a2e">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Biblioteca CP">
  <title>Biblioteca CP — Consulta Cirurgica</title>
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icons/icon-192.svg">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Navigation bar -->
  <nav id="navbar">
    <button id="btn-back" class="nav-btn hidden" aria-label="Voltar">&#8592;</button>
    <h1 id="nav-title">Biblioteca CP</h1>
    <button id="btn-preop" class="nav-btn" aria-label="Pre-Op">&#9879;</button>
  </nav>

  <!-- Search screen (default) -->
  <div id="screen-search" class="screen">
    <div class="search-container">
      <input type="search" id="search-input" placeholder="Buscar fichas..." autocomplete="off">
    </div>
    <div id="search-results"></div>
    <div id="topic-browser"></div>
  </div>

  <!-- Card detail screen -->
  <div id="screen-card" class="screen hidden"></div>

  <!-- Pre-op briefing screen -->
  <div id="screen-preop" class="screen hidden">
    <div class="preop-input-container">
      <input type="search" id="preop-input" placeholder="Qual procedimento?" autocomplete="off">
    </div>
    <div id="preop-results"></div>
    <div id="preop-briefing"></div>
  </div>

  <script src="search.js"></script>
  <script src="renderer.js"></script>
  <script src="preop.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Write `sw.js`**

Cache-first service worker for offline support. Cache all card JSON files and assets.

```javascript
const CACHE_NAME = 'biblioteca-cp-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './search.js',
  './renderer.js',
  './preop.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok && e.request.url.includes('/content/') || e.request.url.includes('/assets/')) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});
```

- [ ] **Step 5: Commit**

```bash
git add webapp/library/
git commit -m "feat: PWA library shell (index.html, manifest, service worker)"
```

---

## Task 5: Search Engine (`webapp/library/search.js`)

**Files:**
- Create: `webapp/library/search.js`

- [ ] **Step 1: Write the search module**

Builds an inverted index at startup from all loaded cards. Supports instant prefix/substring search across title, aliases, tags, and key content fields. Returns results ranked by relevance.

```javascript
// search.js — Offline search index for atomic cards
const SearchEngine = (() => {
  let _index = [];  // [{id, type, title, topic, area, text, card}]

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

  function buildIndex(allCards) {
    _index = allCards.map(card => ({
      id: card.id,
      type: card.type,
      title: card.title || '',
      topic: card.topic,
      area: card.area,
      text: _extractText(card),
      card
    }));
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
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/search.js
git commit -m "feat: offline search engine for atomic cards"
```

---

## Task 6: Card Renderer (`webapp/library/renderer.js`)

**Files:**
- Create: `webapp/library/renderer.js`

- [ ] **Step 1: Write the renderer module**

Generates HTML for each card type. Each type has a distinct visual layout optimized for quick scanning.

```javascript
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
        `<div class="decision-option"><span class="decision-answer">${o.answer}</span><span class="decision-arrow">→</span><span class="decision-next">${o.next}</span></div>`
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
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/renderer.js
git commit -m "feat: card renderer with distinct layouts per type"
```

---

## Task 7: Pre-Op Briefing (`webapp/library/preop.js`)

**Files:**
- Create: `webapp/library/preop.js`

- [ ] **Step 1: Write the pre-op module**

Assembles a briefing by combining cards that match the selected procedure/topic. Groups by: anatomy, technique, complications, pearls.

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/preop.js
git commit -m "feat: pre-op briefing assembly from atomic cards"
```

---

## Task 8: Main App Logic (`webapp/library/app.js`)

**Files:**
- Create: `webapp/library/app.js`

- [ ] **Step 1: Write the main app**

Loads card data, wires up navigation, handles search input, and manages screen transitions.

```javascript
// app.js — Main application logic
const App = (() => {
  // Card data paths — add new topics here as they are migrated
  const CARD_MANIFEST = [
    { area: 'estetica-facial', topic: 'blefaroplastia' },
    { area: 'estetica-facial', topic: 'rinoplastia' }
  ];

  const CARD_TYPES = ['anatomia', 'tecnicas', 'decisoes', 'notas'];
  const CARDS_BASE = '../../content/cards/';

  let _allCards = [];
  let _history = [];

  // --- Data Loading ---
  async function loadAllCards() {
    _allCards = [];
    for (const { area, topic } of CARD_MANIFEST) {
      for (const type of CARD_TYPES) {
        try {
          const url = `${CARDS_BASE}${area}/${topic}/${type}.json`;
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const cards = await resp.json();
          if (Array.isArray(cards)) _allCards.push(...cards);
        } catch (e) {
          console.warn(`Failed to load ${area}/${topic}/${type}:`, e.message);
        }
      }
    }
    SearchEngine.buildIndex(_allCards);
    console.log(`Loaded ${_allCards.length} cards from ${CARD_MANIFEST.length} topics`);
  }

  // --- Navigation ---
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');

    const backBtn = document.getElementById('btn-back');
    if (id === 'screen-search') {
      backBtn.classList.add('hidden');
      document.getElementById('nav-title').textContent = 'Biblioteca CP';
    } else {
      backBtn.classList.remove('hidden');
    }
  }

  function navigateTo(screenId, title) {
    _history.push('screen-search');
    showScreen(screenId);
    if (title) document.getElementById('nav-title').textContent = title;
  }

  function goBack() {
    const prev = _history.pop() || 'screen-search';
    showScreen(prev);
  }

  // --- Search ---
  function handleSearch(query) {
    const container = document.getElementById('search-results');
    const browser = document.getElementById('topic-browser');

    if (!query.trim()) {
      container.innerHTML = '';
      browser.classList.remove('hidden');
      return;
    }

    browser.classList.add('hidden');
    const results = SearchEngine.search(query);

    if (results.length === 0) {
      container.innerHTML = '<div class="no-results">Nenhum resultado</div>';
      return;
    }

    container.innerHTML = results.slice(0, 30).map(r => Renderer.searchResult(r)).join('');
  }

  function showCard(id) {
    const card = SearchEngine.getById(id);
    if (!card) return;
    const screen = document.getElementById('screen-card');
    screen.innerHTML = Renderer.render(card);
    navigateTo('screen-card', card.title);
  }

  // --- Topic Browser (shown when search is empty) ---
  function renderTopicBrowser() {
    const topics = SearchEngine.getTopics();
    const container = document.getElementById('topic-browser');
    container.innerHTML = `<h3 class="browser-title">Temas</h3>` +
      topics.map(t =>
        `<div class="topic-item" data-topic="${t.topic}">
          <span class="topic-name">${t.topic}</span>
          <span class="topic-count">${t.count} fichas</span>
        </div>`
      ).join('');
  }

  function showTopicCards(topic) {
    const cards = SearchEngine.getByTopic(topic);
    const container = document.getElementById('search-results');
    const browser = document.getElementById('topic-browser');
    browser.classList.add('hidden');
    container.innerHTML = cards
      .filter(c => c.type !== 'flashcard')
      .map(c => Renderer.searchResult({ id: c.id, type: c.type, title: c.title || c.id, topic: c.topic }))
      .join('');
  }

  // --- Pre-Op ---
  function handlePreOp(query) {
    const resultsEl = document.getElementById('preop-results');
    const briefingEl = document.getElementById('preop-briefing');

    if (!query.trim()) {
      // Show topic list for pre-op
      const topics = SearchEngine.getTopics();
      resultsEl.innerHTML = topics.map(t =>
        `<div class="preop-topic-item" data-topic="${t.topic}">${t.topic}</div>`
      ).join('');
      briefingEl.innerHTML = '';
      return;
    }

    // Find matching topic
    const topics = SearchEngine.getTopics();
    const match = topics.find(t => t.topic.includes(query.toLowerCase()));
    if (match) {
      resultsEl.innerHTML = '';
      briefingEl.innerHTML = PreOp.buildBriefing(match.topic);
    }
  }

  function showPreOpForTopic(topic) {
    document.getElementById('preop-results').innerHTML = '';
    document.getElementById('preop-briefing').innerHTML = PreOp.buildBriefing(topic);
  }

  // --- Event Wiring ---
  function init() {
    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => handleSearch(searchInput.value));

    // Back button
    document.getElementById('btn-back').addEventListener('click', goBack);

    // Pre-op button
    document.getElementById('btn-preop').addEventListener('click', () => {
      navigateTo('screen-preop', 'Briefing Pre-Op');
      handlePreOp('');
    });

    // Pre-op input
    const preopInput = document.getElementById('preop-input');
    preopInput.addEventListener('input', () => handlePreOp(preopInput.value));

    // Delegated clicks
    document.addEventListener('click', e => {
      const result = e.target.closest('.search-result');
      if (result) { showCard(result.dataset.id); return; }

      const topicItem = e.target.closest('.topic-item');
      if (topicItem) { showTopicCards(topicItem.dataset.topic); return; }

      const preopTopic = e.target.closest('.preop-topic-item');
      if (preopTopic) { showPreOpForTopic(preopTopic.dataset.topic); return; }
    });

    // Load data then render
    loadAllCards().then(() => {
      renderTopicBrowser();
      showScreen('screen-search');
      searchInput.focus();
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js');
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/app.js
git commit -m "feat: main app logic — data loading, navigation, search, pre-op"
```

---

## Task 9: Styling (`webapp/library/style.css`)

**Files:**
- Create: `webapp/library/style.css`

**Context:** Follow the same dark theme and CSS variables as `webapp/approval/style.css`. Mobile-first, touch-friendly, standalone PWA with safe area insets. The card types need distinct visual treatments:
- Anatomy cards: `how_to_identify` and `surgical_relevance` in highlighted boxes
- Technique cards: `steps` numbered and prominent, `pearls` in green-tinted boxes
- Decision cards: tree-like layout with question/answer flow
- Note cards: clean bullet list
- Update boxes: blue/red/green borders matching the existing document convention

- [ ] **Step 1: Write the complete stylesheet**

The CSS must cover:
1. Reset, variables, base (match approval PWA theme)
2. Navbar (sticky, safe-area aware)
3. Search screen (input, results list, topic browser)
4. Card detail screen (all 5 card types)
5. Pre-op briefing (collapsible sections, mini-cards)
6. Badges (technique=purple, anatomy=teal, decision=orange, note=gray)
7. Highlight boxes (surgical_relevance, how_to_identify)
8. Pearl boxes (green tint)
9. Update boxes (blue/red/green)
10. Decision tree layout
11. Images (responsive, max-width)
12. Citations (small, muted)
13. Transitions and touch feedback

Write the full CSS to `webapp/library/style.css`. Use `--bg-primary: #0f0f1a`, `--bg-secondary: #1a1a2e`, `--bg-card: #16213e`, `--text-primary: #e0e0e0`, `--text-secondary: #8892a4`, `--accent-blue: #4361ee`, `--accent-green: #06d6a0`, `--accent-red: #ef476f`, `--accent-yellow: #ffd166` and add new variables as needed for card-type colors.

- [ ] **Step 2: Commit**

```bash
git add webapp/library/style.css
git commit -m "feat: dark theme stylesheet for library PWA"
```

---

## Task 10: Integration Test + Deploy

**Files:**
- All `webapp/library/` files
- All `content/cards/` files

- [ ] **Step 1: Test locally**

```bash
cd webapp/library
npx http-server . -p 8081 -c-1
```

Open `http://localhost:8081` in browser. Verify:
1. Topic browser shows blefaroplastia and rinoplastia with card counts
2. Search "lockwood" returns anatomy card for Ligamento de Lockwood
3. Tap card shows full detail with all fields
4. Search "ptose" returns technique and decision cards
5. Pre-op mode: tap blefaroplastia shows full briefing with anatomy, techniques, complications, pearls
6. Images load correctly in cards
7. Back navigation works

- [ ] **Step 2: Test on iPhone (same WiFi)**

Find local IP:
```bash
ipconfig | grep -i "ipv4"
```

Open `http://<local-ip>:8081` on iPhone Safari. Verify:
1. All screens render correctly mobile
2. Touch interactions work
3. "Add to Home Screen" installs as standalone PWA
4. After install, app opens without Safari chrome

- [ ] **Step 3: Fix any issues found in testing**

Address any rendering, navigation, or data loading problems.

- [ ] **Step 4: Commit all final fixes**

```bash
git add -A
git commit -m "fix: integration testing fixes for library PWA"
```

- [ ] **Step 5: Deploy to GitHub Pages (if ready)**

Confirm with Dr. Arthur before deploying. The PWA needs the card JSON files accessible, so either:
- Deploy the whole repo to Pages, or
- Copy card files into `webapp/library/data/` for self-contained deploy

Ask Dr. Arthur which approach he prefers.

---

## Summary

| Task | What it delivers |
|---|---|
| 1 | Card schema — foundation for all card data |
| 2 | Blefaroplastia cards — first topic fully migrated |
| 3 | Rinoplastia cards — second topic migrated |
| 4 | PWA shell — installable app structure |
| 5 | Search engine — instant offline search |
| 6 | Card renderer — visual card layouts |
| 7 | Pre-op module — briefing assembly |
| 8 | App logic — wires everything together |
| 9 | Styling — dark theme, mobile-first |
| 10 | Integration test — verify everything works end-to-end |

After Task 10, Dr. Arthur can search "lockwood" on his iPhone and get the answer in 5 seconds.
