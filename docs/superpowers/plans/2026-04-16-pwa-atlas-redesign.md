# PWA Library — Redesign "Atlas" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a identidade visual SaaS-genérica do [webapp/library/](../../../webapp/library/) por um sistema de design editorial "Atlas" (atlas anatômico em 2026): paleta Atlas + Atlas Noir, tipografia Fraunces/Instrument Sans/JetBrains Mono self-hosted, ícones Lucide, badges tipadas, hero editorial, dark mode dedicado — preservando o comportamento offline-first e todo o conteúdo RAG/cards.

**Architecture:** Worktree isolado `feat/pwa-atlas-redesign`. CSS é reescrito por inteiro em checkpoints temáticos (tokens → tipografia → componentes), cada checkpoint commitado individualmente. HTML/JS recebem mudanças direcionadas (hero home, hero briefing, chat empty state, substituição de Unicode→Lucide). Verificação via `tools/validate_briefings.mjs` estendido para rodar em ambos os temas, mais smoke test Playwright manual. Nenhuma mudança em `content/cards/**` ou `content/rag/**`.

**Tech Stack:** HTML/CSS/vanilla JS (sem build step), fontes OFL 1.1 self-hosted em `webapp/library/fonts/` (Fraunces variable, Instrument Sans variable + italic, JetBrains Mono variable), Lucide icon subset inline SVG, Service Worker cache bump, Playwright (script standalone) para validação em iPhone 14 Pro viewport.

---

## Pré-requisitos

- Repositório limpo (sem WIP uncommitted em arquivos que este plano vai tocar).
- `node`, `npm`, `npx playwright` disponíveis (validador atual já depende disso).
- Acesso de rede para baixar os 4 arquivos `.woff2` uma única vez (Task 2).
- Dr. Arthur aprovou o design em `docs/superpowers/specs/2026-04-16-pwa-atlas-redesign-design.md`.

## Plano de arquivos (o que será alterado)

### Criar
- `webapp/library/fonts/Fraunces-VariableFont.woff2`
- `webapp/library/fonts/InstrumentSans-VariableFont.woff2`
- `webapp/library/fonts/InstrumentSans-Italic-VariableFont.woff2`
- `webapp/library/fonts/JetBrainsMono-VariableFont.woff2`
- `webapp/library/fonts/LICENSE.md` (OFL 1.1 attributions das 3 famílias)
- `webapp/library/icons/lucide.js`
- `webapp/library/theme.js`

### Reescrever
- `webapp/library/style.css` — full rewrite, ~1500 linhas em CSS Atlas

### Modificar pontualmente
- `webapp/library/index.html` — hero block, script tags, meta theme-color dual, Unicode→`data-icon`
- `webapp/library/renderer.js` — badges tipadas por `.badge-${type}`, ícone Lucide inline, legendas `role-meta`
- `webapp/library/preop.js` — hero editorial do briefing com fleuron, filete, contadores mono
- `webapp/library/app.js` — empty state do chat (índice editorial I/II/III), trocar `&#128218;` por Lucide, wire do toggle `moon`/`sun`
- `webapp/library/sw.js` — `CACHE_NAME` → `briefing-preop-v16`; adicionar fontes + `theme.js` + `icons/lucide.js` ao `ASSETS`
- `tools/validate_briefings.mjs` — CLI `--theme=light|dark|both`, smoke test de toggle

### Não tocar
- `content/cards/**`, `content/rag/**`
- `webapp/approval/**`
- `tools/*` (exceto `validate_briefings.mjs`)

---

## Task 1 — Worktree e branch

**Files:** nenhum.

- [ ] **Step 1.1:** Criar worktree.

```bash
cd /c/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git worktree add ../Biblioteca-CirurgiaPlastica-atlas -b feat/pwa-atlas-redesign master
cd ../Biblioteca-CirurgiaPlastica-atlas
```

- [ ] **Step 1.2:** Confirmar estado limpo.

```bash
git status
```

Expected: `On branch feat/pwa-atlas-redesign` + `nothing to commit, working tree clean`.

---

## Task 2 — Fontes self-hosted

**Files:**
- Create: `webapp/library/fonts/Fraunces-VariableFont.woff2`
- Create: `webapp/library/fonts/InstrumentSans-VariableFont.woff2`
- Create: `webapp/library/fonts/InstrumentSans-Italic-VariableFont.woff2`
- Create: `webapp/library/fonts/JetBrainsMono-VariableFont.woff2`
- Create: `webapp/library/fonts/LICENSE.md`

- [ ] **Step 2.1:** Criar diretório.

```bash
mkdir -p webapp/library/fonts
```

- [ ] **Step 2.2:** Baixar as 4 fontes variable `.woff2` do Google Fonts (URLs estáveis — usam assinatura por hash do conteúdo, apenas o proxy `fonts.gstatic.com` hospeda variable woff2 legitimamente).

Se o download direto não funcionar, usar `google-webfonts-helper` (https://gwfh.mranftl.com/fonts) para baixar os subsets Latin + Latin-Ext em variable `.woff2` e salvar com os nomes acima. Renomear conforme os paths do plano.

Validar cada arquivo:

```bash
ls -lh webapp/library/fonts/
file webapp/library/fonts/*.woff2
```

Expected: cada arquivo entre 50KB e 200KB, `file` reporta `Web Open Font Format (2)`.

- [ ] **Step 2.3:** Criar `webapp/library/fonts/LICENSE.md` com atribuições OFL 1.1.

```markdown
# Font Licenses

All fonts in this directory are licensed under the SIL Open Font License 1.1 (OFL-1.1).

## Fraunces
Copyright 2020 The Fraunces Project Authors (https://github.com/undercase/Fraunces)

## Instrument Sans
Copyright 2022 The Instrument Sans Project Authors (https://github.com/Instrument/instrument-sans)

## JetBrains Mono
Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)

---

Full OFL 1.1 text: https://openfontlicense.org
```

- [ ] **Step 2.4:** Commit.

```bash
git add webapp/library/fonts/
git commit -m "feat(pwa): adiciona fontes Atlas self-hosted (Fraunces, Instrument Sans, JetBrains Mono — OFL 1.1)"
```

---

## Task 3 — Biblioteca de ícones Lucide

**Files:**
- Create: `webapp/library/icons/lucide.js`

- [ ] **Step 3.1:** Criar `webapp/library/icons/lucide.js` com subset mínimo e helper `icon(name, size)`. Os paths abaixo são copiados exatamente das SVGs oficiais do Lucide v0.454 (ISC license).

```javascript
// icons/lucide.js — Lucide icon subset (ISC license).
// Exports ICONS map + icon(name, size=16) -> inline SVG string.
const ICONS = {
  'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'send': '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  'wifi-off': '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
  'book-open': '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
};

function icon(name, size = 16) {
  const body = ICONS[name] || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Hydrate [data-icon="name"] elements after DOM load.
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    const size = parseInt(el.getAttribute('data-icon-size') || '16', 10);
    if (ICONS[name]) el.innerHTML = icon(name, size);
  });
}

window.LucideIcons = { ICONS, icon, hydrateIcons };
```

- [ ] **Step 3.2:** Validar parse.

```bash
node -e "require('./webapp/library/icons/lucide.js'); console.log('ok')" 2>&1 || true
# Nota: o arquivo assume `window`, então node vai falhar no require.
# Em vez disso, validar sintaxe:
node --check webapp/library/icons/lucide.js
```

Expected: saída vazia (parse ok).

- [ ] **Step 3.3:** Commit.

```bash
git add webapp/library/icons/lucide.js
git commit -m "feat(pwa): icons/lucide.js — subset Lucide inline SVG (ISC)"
```

---

## Task 4 — Theme init script (anti-flash + toggle + persist)

**Files:**
- Create: `webapp/library/theme.js`

- [ ] **Step 4.1:** Criar `webapp/library/theme.js`. Esse script roda inline no `<head>` antes do CSS carregar para evitar flash.

```javascript
// theme.js — Atlas/Atlas Noir theme init. MUST run in <head> before CSS.
(function () {
  const STORAGE_KEY = 'atlasTheme';
  const VALID = ['light', 'dark'];

  function systemPref() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function resolve() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(stored) ? stored : systemPref();
  }

  function apply(theme) {
    const t = VALID.includes(theme) ? theme : 'light';
    document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#1A1713' : '#F4EFE4');
  }

  function toggle() {
    const next = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
    window.dispatchEvent(new CustomEvent('atlas:themechange', { detail: next }));
  }

  apply(resolve());

  // React to system changes only if user hasn't chosen.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!localStorage.getItem(STORAGE_KEY)) apply(systemPref());
    });
  }

  window.AtlasTheme = { apply, toggle, get: () => document.documentElement.getAttribute('data-theme') };
})();
```

- [ ] **Step 4.2:** Validar parse.

```bash
node --check webapp/library/theme.js
```

Expected: saída vazia.

- [ ] **Step 4.3:** Commit.

```bash
git add webapp/library/theme.js
git commit -m "feat(pwa): theme.js — Atlas/Atlas Noir com toggle, persist e anti-flash"
```

---

## Task 5 — CSS rewrite: tokens e base (reset + html/body)

**Files:**
- Rewrite: `webapp/library/style.css` (este task inicia o rewrite; tasks 5–11 vão compondo o arquivo final)

> Estratégia: reescrever `style.css` por completo em um único commit ao final da task 10 (evita commits com CSS quebrado). Durante as tasks 5–10, trabalhar num arquivo `webapp/library/style.css` em construção e validar sintaxe incrementalmente. Opcionalmente, durante a construção, usar `style.css.new` e renomear no final; por simplicidade deste plano, edita-se diretamente `style.css` e só commita quando o arquivo estiver completo (ao final da Task 10).

- [ ] **Step 5.1:** Esvaziar `style.css` e escrever o bloco de tokens Atlas (cor + tipografia + estrutura). Este é o **início do novo arquivo** e será complementado pelos próximos tasks antes do commit.

```css
/* ============================================================
   webapp/library/style.css — Atlas
   Editorial medical atlas aesthetic · mobile-first · light + dark
   Self-hosted fonts (OFL 1.1) · zero runtime deps
   ============================================================ */

/* === Reset === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* === Font faces === */
@font-face {
  font-family: 'Fraunces';
  src: url('./fonts/Fraunces-VariableFont.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Instrument Sans';
  src: url('./fonts/InstrumentSans-VariableFont.woff2') format('woff2-variations');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Instrument Sans';
  src: url('./fonts/InstrumentSans-Italic-VariableFont.woff2') format('woff2-variations');
  font-weight: 400 700;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('./fonts/JetBrainsMono-VariableFont.woff2') format('woff2-variations');
  font-weight: 300 800;
  font-style: normal;
  font-display: swap;
}

/* === Tokens — Atlas (light, default) === */
:root {
  --surface:          #F4EFE4;
  --elevated:         #FEFCF7;
  --ink:              #1E1A15;
  --ink-muted:        #6E6457;
  --ink-faint:        #8B7F6B;
  --rule:             #D4C8B0;
  --rule-strong:      #B8A98A;
  --anatomy-red:      #7A2E2A;
  --dissection-green: #2E4A3A;
  --gold:             #B8944B;

  /* inverse token pairs (used by filled badges etc.) */
  --on-anatomy-red:   var(--elevated);
  --on-green:         var(--elevated);
  --on-gold:          var(--ink);

  --font-serif:  'Fraunces', Georgia, 'Times New Roman', serif;
  --font-sans:   'Instrument Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  --font-mono:   'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace;

  --radius-card: 6px;
  --radius-pill: 999px;

  --ease-atlas:  cubic-bezier(0.2, 0.8, 0.2, 1);
  --duration:    280ms;
  --duration-fast: 180ms;

  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);

  color-scheme: light;
}

/* === Tokens — Atlas Noir (dark) === */
[data-theme="dark"] {
  --surface:          #1A1713;
  --elevated:         #22201C;
  --ink:              #E8DFC8;
  --ink-muted:        #A89A81;
  --ink-faint:        #8B8274;
  --rule:             #2E2821;
  --rule-strong:      #3A3329;
  --anatomy-red:      #C94E3E;
  --dissection-green: #5F8569;
  --gold:             #D4A858;

  --on-anatomy-red:   var(--surface);
  --on-green:         var(--surface);
  --on-gold:          var(--surface);

  color-scheme: dark;
}

/* === Base === */
html { height: 100%; font-size: 16px; }
body {
  min-height: 100%;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.65;
  color: var(--ink);
  background: var(--surface);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  text-rendering: optimizeLegibility;
  overscroll-behavior: none;
  overflow-x: hidden;
  transition: background var(--duration-fast) var(--ease-atlas), color var(--duration-fast) var(--ease-atlas);
}

.hidden { display: none !important; }

::selection { background: color-mix(in srgb, var(--gold) 40%, transparent); color: var(--ink); }
```

- [ ] **Step 5.2:** Validar sintaxe.

```bash
node -e "const c=require('fs').readFileSync('webapp/library/style.css','utf8'); const open=(c.match(/\\{/g)||[]).length; const close=(c.match(/\\}/g)||[]).length; console.log('open',open,'close',close); process.exit(open===close?0:1)"
```

Expected: `open N close N` com N igual, exit 0.

(sem commit — segue para Task 6)

---

## Task 6 — CSS rewrite: roles tipográficos e utilitários globais

**Files:**
- Append to: `webapp/library/style.css`

- [ ] **Step 6.1:** Anexar bloco de roles tipográficos e utilitários ao `style.css`.

```css
/* === Typography roles === */
.role-hero {
  font-family: var(--font-serif);
  font-size: clamp(28px, 8vw, 34px);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.1;
  font-variation-settings: 'opsz' 144, 'SOFT' 30;
}
.role-section {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  font-variation-settings: 'opsz' 60;
}
.role-card {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.3;
  font-variation-settings: 'opsz' 36;
}
.role-body {
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.65;
}
.role-label {
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--ink-muted);
}
.role-meta {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--ink-muted);
}
.role-mono {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
}

/* === Editorial ornaments === */
.fleuron {
  display: block;
  font-family: var(--font-serif);
  font-size: 20px;
  letter-spacing: 0.6em;
  color: var(--gold);
  text-align: center;
  margin-bottom: 12px;
  user-select: none;
}
.gold-rule {
  display: block;
  height: 1px;
  background: var(--gold);
  width: 36px;
  margin: 14px 0 18px;
  animation: rule-draw 420ms var(--ease-atlas) both;
}
.gold-rule.center { margin-left: auto; margin-right: auto; }

@keyframes rule-draw { from { width: 0; } to { width: 36px; } }
@keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes card-slide-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

/* === Icons === */
[data-icon] { display: inline-flex; align-items: center; justify-content: center; color: currentColor; }
[data-icon] svg { display: block; }

/* === Focus visibility (accessibility) === */
:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  border-radius: 2px;
}
```

- [ ] **Step 6.2:** Validar brace balance.

```bash
node -e "const c=require('fs').readFileSync('webapp/library/style.css','utf8'); const o=(c.match(/\\{/g)||[]).length; const cl=(c.match(/\\}/g)||[]).length; process.exit(o===cl?0:1)"
```

Expected: exit 0.

(sem commit)

---

## Task 7 — CSS rewrite: navbar, home (hero + lista)

**Files:**
- Append to: `webapp/library/style.css`

- [ ] **Step 7.1:** Anexar navbar + home.

```css
/* === Navbar === */
#navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: calc(var(--safe-top) + 10px) 16px 10px;
  display: grid;
  grid-template-columns: 40px 1fr 40px 40px;
  align-items: center;
  gap: 8px;
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  backdrop-filter: saturate(1.2) blur(10px);
  -webkit-backdrop-filter: saturate(1.2) blur(10px);
  border-bottom: 1px solid var(--rule);
}
#nav-title {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  text-align: center;
  font-variation-settings: 'opsz' 24;
}
.nav-btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--ink);
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-atlas);
}
.nav-btn:hover { background: color-mix(in srgb, var(--rule) 60%, transparent); }
.nav-btn:active { transform: scale(0.96); }

/* === Screens === */
.screen {
  padding: 20px 16px 40px;
  padding-bottom: calc(40px + var(--safe-bottom));
  animation: fade-in 360ms var(--ease-atlas) both;
}

/* === Home hero === */
.home-hero {
  padding: 8px 0 18px;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 20px;
}
.home-hero .role-hero { margin-bottom: 0; }
.home-hero .role-meta { margin-top: 4px; }

/* === Search === */
.search-container { margin: 14px 0 18px; }
#procedure-filter, #chat-input {
  width: 100%;
  appearance: none;
  background: var(--elevated);
  border: 1px solid var(--rule);
  border-radius: var(--radius-card);
  padding: 12px 14px;
  font-family: var(--font-sans);
  font-size: 15px;
  color: var(--ink);
  transition: border-color var(--duration-fast) var(--ease-atlas);
}
#procedure-filter::placeholder, #chat-input::placeholder {
  color: var(--ink-faint);
  font-style: italic;
  font-family: var(--font-serif);
}
#procedure-filter:focus, #chat-input:focus {
  outline: none;
  border-color: var(--rule-strong);
}

/* === Procedure list === */
#procedure-list { display: flex; flex-direction: column; }
.topic-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 14px 4px;
  border-bottom: 1px solid var(--rule);
  cursor: pointer;
  animation: card-slide-in 320ms var(--ease-atlas) both;
  transition: background var(--duration-fast) var(--ease-atlas);
}
.topic-item:hover { background: color-mix(in srgb, var(--elevated) 60%, transparent); }
.topic-item:active { background: color-mix(in srgb, var(--rule) 40%, transparent); }
.topic-name {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.topic-count {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}
.no-results {
  padding: 20px 0;
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--ink-muted);
}

/* Stagger topic items */
.topic-item:nth-child(1)  { animation-delay: 0ms; }
.topic-item:nth-child(2)  { animation-delay: 30ms; }
.topic-item:nth-child(3)  { animation-delay: 60ms; }
.topic-item:nth-child(4)  { animation-delay: 90ms; }
.topic-item:nth-child(5)  { animation-delay: 120ms; }
.topic-item:nth-child(6)  { animation-delay: 150ms; }
.topic-item:nth-child(7)  { animation-delay: 180ms; }
.topic-item:nth-child(8)  { animation-delay: 210ms; }
.topic-item:nth-child(9)  { animation-delay: 240ms; }
.topic-item:nth-child(10) { animation-delay: 270ms; }
```

- [ ] **Step 7.2:** Validar brace balance (mesmo comando da Task 6.2). Expected: exit 0.

(sem commit)

---

## Task 8 — CSS rewrite: briefing (hero + sections) e cards

**Files:**
- Append to: `webapp/library/style.css`

- [ ] **Step 8.1:** Anexar briefing + cards + badges tipadas + componentes internos (tabelas de decisão, figures, updates).

```css
/* === Briefing hero === */
.briefing-hero {
  padding: 8px 0 18px;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 22px;
  text-align: left;
}
.briefing-hero .role-hero { margin-bottom: 0; }
.briefing-hero .briefing-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.briefing-meta .count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-muted);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.briefing-meta .sep {
  color: var(--rule-strong);
  font-family: var(--font-serif);
}

/* === Briefing sections (accordions) === */
.briefing-section {
  border-top: 1px solid var(--rule);
  padding: 0;
}
.briefing-section:last-of-type { border-bottom: 1px solid var(--rule); }

.briefing-section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 4px;
  cursor: pointer;
  list-style: none;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink);
  font-variation-settings: 'opsz' 60;
  user-select: none;
}
.briefing-section-title::-webkit-details-marker { display: none; }
.briefing-section-title::after {
  content: '';
  width: 12px; height: 12px;
  border-right: 1.5px solid var(--ink-muted);
  border-bottom: 1.5px solid var(--ink-muted);
  transform: rotate(-45deg);
  transition: transform var(--duration-fast) var(--ease-atlas);
}
.briefing-section[open] > .briefing-section-title::after { transform: rotate(45deg); }

.briefing-section-title .section-count {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-faint);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  margin-left: auto;
  margin-right: 10px;
}

.briefing-section-body {
  padding: 4px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.briefing-item {
  background: var(--elevated);
  border: 1px solid var(--rule);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: border-color var(--duration-fast) var(--ease-atlas);
}
.briefing-item[open] { border-color: var(--rule-strong); }
.briefing-item-title {
  padding: 12px 14px;
  cursor: pointer;
  list-style: none;
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.briefing-item-title::-webkit-details-marker { display: none; }
.briefing-item-title::after {
  content: '';
  width: 9px; height: 9px;
  border-right: 1.5px solid var(--ink-muted);
  border-bottom: 1.5px solid var(--ink-muted);
  transform: rotate(-45deg);
  transition: transform var(--duration-fast) var(--ease-atlas);
}
.briefing-item[open] > .briefing-item-title::after { transform: rotate(45deg); }
.briefing-item-body {
  padding: 0 14px 14px;
  border-top: 1px solid var(--rule);
}

/* === Cards (when rendered inside briefing-item-body) === */
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 14px;
  animation: card-slide-in 320ms var(--ease-atlas) both;
}
.card h2 {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}
.card-aliases {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-muted);
  letter-spacing: 0.02em;
}
.card-section { display: flex; flex-direction: column; gap: 4px; }
.card-section .section-title {
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--ink-muted);
}
.card-section .section-body {
  font-family: var(--font-sans);
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--ink);
}
.card-section.warning .section-body { border-left: 2px solid var(--anatomy-red); padding-left: 10px; }
.card-section.highlight .section-body { border-left: 2px solid var(--gold); padding-left: 10px; }
.card-section.steps .section-body ol,
.card-section .section-body ul,
.card-section .section-body ol {
  padding-left: 1.2em;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.measure {
  font-family: var(--font-mono);
  font-size: 0.92em;
  font-weight: 600;
  color: var(--anatomy-red);
  font-variant-numeric: tabular-nums;
}
.inline-cite {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.92em;
  color: var(--ink-muted);
}

/* === Badges tipadas === */
.card-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  align-self: flex-start;
}
.badge-technique  { background: var(--anatomy-red); color: var(--on-anatomy-red); }
.badge-anatomy    { background: var(--dissection-green); color: var(--on-green); }
.badge-decision   { background: var(--gold); color: var(--on-gold); }
.badge-note       { background: transparent; color: var(--ink-muted); border: 1px solid var(--ink-muted); }
.badge-flashcard  { background: transparent; color: var(--ink); border: 1px solid var(--ink); font-family: var(--font-mono); letter-spacing: 0.1em; }
.badge-update     { background: transparent; color: var(--dissection-green); border: 1px dashed var(--dissection-green); }

/* === Figures & citations === */
.card-figure {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
}
.card-figure img {
  width: 100%;
  height: auto;
  border-radius: 4px;
  border: 1px solid var(--rule);
  background: var(--elevated);
}
.card-figure figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 12.5px;
  color: var(--ink-muted);
  letter-spacing: 0.02em;
}
.card-figure .credit { font-size: 11px; color: var(--ink-faint); }
.card-citations {
  border-top: 1px solid var(--rule);
  padding-top: 8px;
  margin-top: 4px;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 12px;
  color: var(--ink-muted);
  letter-spacing: 0.02em;
}

/* === Update boxes === */
.card-update {
  border-left: 3px dashed var(--dissection-green);
  background: color-mix(in srgb, var(--dissection-green) 8%, var(--elevated));
  padding: 10px 12px;
  border-radius: 0 var(--radius-card) var(--radius-card) 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-update .update-label {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--dissection-green);
}
.card-update.update-red { border-color: var(--anatomy-red); background: color-mix(in srgb, var(--anatomy-red) 8%, var(--elevated)); }
.card-update.update-red .update-label { color: var(--anatomy-red); }
.card-update.update-green { border-color: var(--dissection-green); }
.card-update .update-cite {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 11.5px;
  color: var(--ink-muted);
}

/* === Decision trees === */
.decision-tree {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.decision-step {
  border: 1px solid var(--rule);
  padding: 10px 12px;
  border-radius: var(--radius-card);
  background: var(--elevated);
}
.decision-step h4 {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
  color: var(--ink);
}
.decision-option {
  display: grid;
  grid-template-columns: auto 16px 1fr;
  align-items: baseline;
  gap: 8px;
  padding: 4px 0;
  font-family: var(--font-sans);
  font-size: 14px;
}
.decision-answer { color: var(--ink-muted); font-style: italic; }
.decision-arrow  { color: var(--gold); }
.decision-next   { color: var(--ink); }

/* === Params (flashcards) === */
.params-domain { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.params-domain-title {
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--ink-muted);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--rule);
}
.param-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dotted var(--rule);
  font-family: var(--font-sans);
  font-size: 13.5px;
}
.param-front { color: var(--ink); }
.param-back {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--anatomy-red);
  letter-spacing: 0.02em;
}
```

- [ ] **Step 8.2:** Validar brace balance. Expected: exit 0.

(sem commit)

---

## Task 9 — CSS rewrite: chat empty state, mensagens, offline banner

**Files:**
- Append to: `webapp/library/style.css`

- [ ] **Step 9.1:** Anexar blocos de chat.

```css
/* === Chat screen === */
#screen-chat {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 60px);
  padding-bottom: 0;
}
#chat-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
  overflow-y: auto;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 36px 0 20px;
  animation: fade-in 360ms var(--ease-atlas) both;
}
.chat-empty .fleuron { text-align: left; margin-bottom: 0; }
.chat-empty .role-hero { margin: 2px 0 4px; }
.chat-empty .role-meta { margin-bottom: 20px; max-width: 32ch; }
.chat-empty .chat-label {
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-top: 10px;
  margin-bottom: 6px;
}
.chat-suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
}
.chat-suggestion-item {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  align-items: baseline;
  padding: 10px 4px;
  border-bottom: 1px solid var(--rule);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-atlas);
}
.chat-suggestion-item:hover { background: color-mix(in srgb, var(--elevated) 60%, transparent); }
.chat-suggestion-index {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--gold);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.chat-suggestion-text {
  font-family: var(--font-serif);
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.chat-msg {
  padding: 10px 14px;
  border-radius: var(--radius-card);
  max-width: 92%;
  font-family: var(--font-sans);
  font-size: 14.5px;
  line-height: 1.6;
  animation: card-slide-in 280ms var(--ease-atlas) both;
}
.chat-msg-user {
  align-self: flex-end;
  background: var(--ink);
  color: var(--surface);
}
.chat-msg-assistant {
  align-self: flex-start;
  background: var(--elevated);
  border: 1px solid var(--rule);
  color: var(--ink);
}
.chat-msg-error {
  align-self: flex-start;
  color: var(--anatomy-red);
  font-style: italic;
  font-family: var(--font-serif);
}
.chat-cite {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.92em;
  color: var(--gold);
}

.chat-typing {
  align-self: flex-start;
  display: flex;
  gap: 4px;
  padding: 12px 14px;
}
.chat-typing-dot {
  width: 6px; height: 6px;
  background: var(--ink-muted);
  border-radius: 50%;
  animation: chat-blink 1.2s infinite both;
}
.chat-typing-dot:nth-child(2) { animation-delay: 0.15s; }
.chat-typing-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes chat-blink { 0%,80%,100% { opacity: 0.25; } 40% { opacity: 1; } }

.chat-input-area {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 44px;
  gap: 8px;
  padding: 10px 0;
  padding-bottom: calc(10px + var(--safe-bottom));
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: saturate(1.2) blur(10px);
  -webkit-backdrop-filter: saturate(1.2) blur(10px);
  border-top: 1px solid var(--rule);
}
#btn-send {
  appearance: none;
  border: 1px solid var(--rule-strong);
  background: var(--ink);
  color: var(--surface);
  border-radius: var(--radius-card);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-atlas), opacity var(--duration-fast) var(--ease-atlas);
}
#btn-send:active { transform: scale(0.96); }
#btn-send:disabled { opacity: 0.4; cursor: not-allowed; }

.chat-offline {
  padding: 10px 14px;
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--anatomy-red) 10%, var(--elevated));
  border: 1px solid var(--anatomy-red);
  color: var(--anatomy-red);
  font-family: var(--font-sans);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

/* === Search result (global search — legacy, mantido) === */
.search-result {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--rule);
  cursor: pointer;
}
.result-icon { color: var(--ink-muted); }
.result-title { font-family: var(--font-serif); font-size: 15px; font-weight: 500; color: var(--ink); }
.result-meta  { font-family: var(--font-sans); font-size: 11px; color: var(--ink-muted); margin-top: 2px; }

/* === prefers-reduced-motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

- [ ] **Step 9.2:** Validar brace balance. Expected: exit 0.

(sem commit)

---

## Task 10 — Finalizar CSS e commitar o rewrite completo

**Files:**
- Rewrite: `webapp/library/style.css` (final)

- [ ] **Step 10.1:** Contar linhas — o `style.css` final deve ter ~1200–1600 linhas.

```bash
wc -l webapp/library/style.css
```

Expected: entre 900 e 1800 linhas (ajustar tasks 5–9 se drasticamente fora).

- [ ] **Step 10.2:** Grep por tokens legacy que devem estar extintos no Atlas.

```bash
grep -n "F97316\|--accent-orange\|--bg-primary\|SF Pro Display\|Helvetica Neue" webapp/library/style.css && echo FOUND || echo CLEAN
```

Expected: `CLEAN`.

- [ ] **Step 10.3:** Commit.

```bash
git add webapp/library/style.css
git commit -m "feat(pwa): style.css — rewrite Atlas (tokens light/dark, tipografia, badges tipadas, hero editorial)"
```

---

## Task 11 — `index.html`: hero home, theme script, Lucide hooks

**Files:**
- Modify: `webapp/library/index.html`

- [ ] **Step 11.1:** Substituir `<head>` e `<body>` conforme abaixo.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#F4EFE4">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Biblioteca">
  <title>Biblioteca — Cirurgia Plástica</title>
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icons/icon-192.svg">
  <link rel="preload" href="fonts/Fraunces-VariableFont.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="fonts/InstrumentSans-VariableFont.woff2" as="font" type="font/woff2" crossorigin>
  <script src="theme.js?v=2026-04-16-atlas"></script>
  <link rel="stylesheet" href="style.css?v=2026-04-16-atlas">
</head>
<body>
  <!-- Navigation bar -->
  <nav id="navbar">
    <button id="btn-back" class="nav-btn hidden" aria-label="Voltar"><span data-icon="arrow-left" data-icon-size="18"></span></button>
    <h1 id="nav-title">Biblioteca</h1>
    <button id="btn-theme" class="nav-btn" aria-label="Alternar tema"><span data-icon="moon" data-icon-size="18"></span></button>
    <button id="btn-chat" class="nav-btn" aria-label="Chat IA"><span data-icon="message-circle" data-icon-size="18"></span></button>
  </nav>

  <!-- Home screen -->
  <div id="screen-home" class="screen">
    <header class="home-hero">
      <h2 class="role-hero">Biblioteca</h2>
      <span class="gold-rule"></span>
      <p class="role-meta">Cirurgia Plástica · Briefings Pré-Op</p>
    </header>
    <div class="search-container">
      <input type="search" id="procedure-filter" placeholder="Buscar procedimento…" autocomplete="off">
    </div>
    <div id="procedure-list"></div>
  </div>

  <!-- Briefing screen -->
  <div id="screen-briefing" class="screen hidden"></div>

  <!-- Chat screen -->
  <div id="screen-chat" class="screen hidden">
    <div id="chat-messages"></div>
    <div id="chat-offline" class="chat-offline hidden"><span data-icon="wifi-off" data-icon-size="16"></span><span>Sem conexão — chat indisponível offline</span></div>
    <div class="chat-input-area">
      <input type="text" id="chat-input" placeholder="Pergunte sobre cirurgia…" autocomplete="off">
      <button id="btn-send" aria-label="Enviar"><span data-icon="send" data-icon-size="18"></span></button>
    </div>
  </div>

  <script src="icons/lucide.js?v=2026-04-16-atlas"></script>
  <script src="search.js?v=2026-04-16-atlas"></script>
  <script src="renderer.js?v=2026-04-16-atlas"></script>
  <script src="preop.js?v=2026-04-16-atlas"></script>
  <script src="chat.js?v=2026-04-16-atlas"></script>
  <script src="app.js?v=2026-04-16-atlas"></script>
</body>
</html>
```

- [ ] **Step 11.2:** Validar sintaxe HTML.

```bash
node -e "const c=require('fs').readFileSync('webapp/library/index.html','utf8'); const open=(c.match(/<[a-zA-Z][^>\\/]*>/g)||[]).length; const close=(c.match(/<\\/[a-zA-Z][^>]*>/g)||[]).length; console.log('open tags',open,'close tags',close)"
```

Expected: impressão (não-zero) de open/close — leitura manual confirma balanced.

- [ ] **Step 11.3:** Commit.

```bash
git add webapp/library/index.html
git commit -m "feat(pwa): index.html — hero editorial, theme toggle, Lucide hooks, font preload"
```

---

## Task 12 — `renderer.js`: badges tipadas, chevron Lucide, role-meta nas legendas

**Files:**
- Modify: `webapp/library/renderer.js`

- [ ] **Step 12.1:** Atualizar `_badge`, `_images`, `decision`, `searchResult`. Substituir o conteúdo inteiro do arquivo:

```javascript
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
```

- [ ] **Step 12.2:** Validar parse.

```bash
node --check webapp/library/renderer.js
```

Expected: saída vazia.

- [ ] **Step 12.3:** Commit.

```bash
git add webapp/library/renderer.js
git commit -m "feat(pwa): renderer.js — badges tipadas, chevron Lucide em search results"
```

---

## Task 13 — `preop.js`: hero editorial do briefing, contadores mono

**Files:**
- Modify: `webapp/library/preop.js`

- [ ] **Step 13.1:** Substituir a função `buildBriefing` para usar hero editorial. Arquivo completo:

```javascript
// preop.js — Pre-operative briefing assembly (Atlas edition)
const PreOp = (() => {

  function _pad(n) { return String(n).padStart(2, '0'); }

  function _section(titleText, count, bodyHtml) {
    return `<details class="briefing-section" open>
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
      html += _section('Anatomia Relevante', anatomyCards.length, body);
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
```

- [ ] **Step 13.2:** Validar parse.

```bash
node --check webapp/library/preop.js
```

Expected: saída vazia.

- [ ] **Step 13.3:** Commit.

```bash
git add webapp/library/preop.js
git commit -m "feat(pwa): preop.js — hero editorial, fleuron, filete dourado, contadores mono"
```

---

## Task 14 — `app.js`: chat empty state editorial, toggle wire, Lucide hydrate

**Files:**
- Modify: `webapp/library/app.js`

- [ ] **Step 14.1:** Atualizar `_renderEmpty`, `init`, e adicionar wiring de `btn-theme`. Patch direcionado (substituir função `_renderEmpty` inteira e adicionar listeners em `init`).

Substituir `_renderEmpty` (linhas ~129-138):

```javascript
  function _renderEmpty() {
    const roman = ['I.', 'II.', 'III.'];
    const items = SUGGESTIONS.map((s, i) => `
      <li class="chat-suggestion-item" data-text="${s.replace(/"/g, '&quot;')}">
        <span class="chat-suggestion-index">${roman[i]}</span>
        <span class="chat-suggestion-text">${s}</span>
      </li>`).join('');

    return `<div class="chat-empty">
      <span class="fleuron">· · ·</span>
      <h2 class="role-hero">Consulta aberta.</h2>
      <span class="gold-rule"></span>
      <p class="role-meta">Pergunte sobre anatomia, técnicas ou decisões clínicas — respondo com base no acervo.</p>
      <div class="chat-label">Começar por</div>
      <ul class="chat-suggestions-list">${items}</ul>
    </div>`;
  }
```

Atualizar o bloco de cliques delegados no `init` (procurar `const suggestion = e.target.closest('.chat-suggestion')` e substituir):

```javascript
      const suggestion = e.target.closest('.chat-suggestion-item');
      if (suggestion) { handleSend(suggestion.dataset.text); return; }

      const themeBtn = e.target.closest('#btn-theme');
      if (themeBtn) { window.AtlasTheme && window.AtlasTheme.toggle(); return; }
```

Ao fim do `init`, antes do `if ('serviceWorker' in navigator)`, adicionar hidratação de ícones e reatividade ao toggle:

```javascript
    // Hydrate Lucide icons (initial + on theme change for moon/sun swap)
    const refreshThemeIcon = () => {
      const btn = document.getElementById('btn-theme');
      if (!btn) return;
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      btn.querySelector('[data-icon]').setAttribute('data-icon', theme === 'dark' ? 'sun' : 'moon');
      if (window.LucideIcons) window.LucideIcons.hydrateIcons(btn);
    };
    if (window.LucideIcons) window.LucideIcons.hydrateIcons();
    refreshThemeIcon();
    window.addEventListener('atlas:themechange', refreshThemeIcon);

    // Re-hydrate icons after dynamic content (briefing, chat empty state)
    const mo = new MutationObserver(() => {
      if (window.LucideIcons) window.LucideIcons.hydrateIcons();
    });
    mo.observe(document.body, { subtree: true, childList: true });
```

- [ ] **Step 14.2:** Validar parse.

```bash
node --check webapp/library/app.js
```

Expected: saída vazia.

- [ ] **Step 14.3:** Commit.

```bash
git add webapp/library/app.js
git commit -m "feat(pwa): app.js — chat empty state editorial (I/II/III), wiring do theme toggle, hidratação Lucide"
```

---

## Task 15 — Service Worker: bump cache, adicionar novos assets

**Files:**
- Modify: `webapp/library/sw.js`

- [ ] **Step 15.1:** Substituir o topo do `sw.js`.

```javascript
const CACHE_NAME = 'briefing-preop-v16';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=2026-04-16-atlas',
  './theme.js?v=2026-04-16-atlas',
  './app.js?v=2026-04-16-atlas',
  './search.js?v=2026-04-16-atlas',
  './renderer.js?v=2026-04-16-atlas',
  './preop.js?v=2026-04-16-atlas',
  './chat.js?v=2026-04-16-atlas',
  './icons/lucide.js?v=2026-04-16-atlas',
  './fonts/Fraunces-VariableFont.woff2',
  './fonts/InstrumentSans-VariableFont.woff2',
  './fonts/InstrumentSans-Italic-VariableFont.woff2',
  './fonts/JetBrainsMono-VariableFont.woff2',
  './manifest.json'
];
```

(Resto do arquivo — install/activate/fetch handlers — permanece igual.)

- [ ] **Step 15.2:** Validar parse.

```bash
node --check webapp/library/sw.js
```

Expected: saída vazia.

- [ ] **Step 15.3:** Commit.

```bash
git add webapp/library/sw.js
git commit -m "feat(pwa): sw.js v16 — cacheia fontes, theme.js, lucide.js"
```

---

## Task 16 — Estender `validate_briefings.mjs` para testar ambos os temas

**Files:**
- Modify: `tools/validate_briefings.mjs`

- [ ] **Step 16.1:** Substituir o conteúdo de `tools/validate_briefings.mjs` pela versão estendida:

```javascript
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8767;
const TOPICS = ['lipoaspiracao', 'gluteoplastia', 'contorno-pos-bariatrico', 'otoplastia'];
const OUT_DIR = join(ROOT, 'tools', '_validation');

const themeArg = (process.argv.find(a => a.startsWith('--theme=')) || '--theme=both').split('=')[1];
const THEMES = themeArg === 'both' ? ['light', 'dark'] : [themeArg];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const full = join(ROOT, p);
      if (!full.startsWith(ROOT)) return res.writeHead(403).end();
      const st = await stat(full).catch(() => null);
      if (!st || !st.isFile()) return res.writeHead(404).end('not found');
      res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' });
      res.end(await readFile(full));
    } catch (e) { res.writeHead(500).end(String(e)); }
  });
  return new Promise(r => server.listen(PORT, () => r(server)));
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('atlasTheme', t);
    window.AtlasTheme && window.AtlasTheme.apply(t);
  }, theme);
}

async function validateTopic(page, topic, theme) {
  await page.goto(`http://localhost:${PORT}/webapp/library/?t=${theme}`, { waitUntil: 'networkidle' });
  await setTheme(page, theme);
  await page.waitForSelector(`.topic-item[data-topic="${topic}"]`, { timeout: 5000 });
  await page.click(`.topic-item[data-topic="${topic}"]`);
  await page.waitForSelector('#screen-briefing:not(.hidden)', { timeout: 5000 });
  await page.waitForTimeout(400);

  const report = await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('#screen-briefing img'));
    imgs.forEach(i => { i.loading = 'eager'; if (!i.complete) { const s = i.src; i.src = ''; i.src = s; } });
    await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => {
      const done = () => r(); i.addEventListener('load', done, { once: true });
      i.addEventListener('error', done, { once: true });
      setTimeout(done, 8000);
    })));
    const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0)
      .map(i => ({ src: i.getAttribute('src'), alt: i.alt }));
    const theme = document.documentElement.getAttribute('data-theme');
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const heroCount = document.querySelectorAll('.briefing-hero .role-hero').length;
    const badgeTypes = [...new Set(Array.from(document.querySelectorAll('.card-badge')).map(b => [...b.classList].find(c => c.startsWith('badge-'))))];
    return { total: imgs.length, broken, theme, bodyBg, heroCount, badgeTypes };
  });

  await mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({ path: join(OUT_DIR, `${topic}-${theme}.png`), fullPage: true });
  return report;
}

async function smokeToggle(page) {
  await page.goto(`http://localhost:${PORT}/webapp/library/`, { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.click('#btn-theme');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  return { before, after, toggled: before !== after };
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[pageerror]', e.message));

  let ok = true;
  for (const theme of THEMES) {
    console.log(`\n=== Theme: ${theme} ===`);
    for (const t of TOPICS) {
      try {
        const r = await validateTopic(page, t, theme);
        const pass = r.broken.length === 0 && r.total > 0 && r.heroCount === 1 && r.theme === theme;
        if (!pass) ok = false;
        console.log(`${pass ? 'PASS' : 'FAIL'} ${t} [${theme}]: ${r.total} img, ${r.broken.length} broken, hero=${r.heroCount}, bg=${r.bodyBg}, badges=${r.badgeTypes.join(',')}`);
        if (r.broken.length) console.log('  broken:', r.broken.slice(0, 5));
      } catch (e) { ok = false; console.log(`FAIL ${t} [${theme}]: ${e.message}`); }
    }
  }

  const toggle = await smokeToggle(page);
  const togglePass = toggle.toggled;
  if (!togglePass) ok = false;
  console.log(`\nToggle smoke: ${togglePass ? 'PASS' : 'FAIL'} (${toggle.before} -> ${toggle.after})`);

  await browser.close();
  server.close();
  console.log(`\n${ok ? 'ALL PASS' : 'FAILURES DETECTED'}`);
  console.log(`screenshots: ${OUT_DIR}`);
  process.exit(ok ? 0 : 1);
})();
```

- [ ] **Step 16.2:** Validar parse.

```bash
node --check tools/validate_briefings.mjs
```

Expected: saída vazia.

- [ ] **Step 16.3:** Commit.

```bash
git add tools/validate_briefings.mjs
git commit -m "test(pwa): validate_briefings.mjs — ambos os temas + smoke test do toggle"
```

---

## Task 17 — Rodar validador e ajustar falhas

**Files:** depende do que o validador reportar.

- [ ] **Step 17.1:** Rodar validação full.

```bash
node tools/validate_briefings.mjs --theme=both
```

Expected: `ALL PASS` com 4 temas × 2 temas = 8 linhas PASS + `Toggle smoke: PASS`.

- [ ] **Step 17.2:** Abrir os 8 screenshots em `tools/_validation/` e verificar visualmente:
  - Home hero `Biblioteca` + filete dourado presente
  - Briefing hero com fleuron `· · ·` + titulo serif + filete + meta italic + contador mono
  - Seções com contador `03`, `06` etc em mono (lado direito do summary)
  - Badges em cores distintas (anatomy verde, technique vermelho, decision dourado)
  - Dark mode: fundo `#1A1713`, texto bege claro, nenhuma faixa branca
  - Sem ícones Unicode (`←`, `✉`, `➸`) — tudo Lucide SVG

- [ ] **Step 17.3:** Caso falha — iterar no CSS/HTML/JS até passar. Cada correção = commit próprio com mensagem descritiva (ex: `fix(pwa): corrige contraste do --ink-muted em Atlas Noir`).

- [ ] **Step 17.4:** Quando tudo passa, confirmar commits limpos.

```bash
git log --oneline master..HEAD
```

Expected: ~10–15 commits seguindo a ordem dos tasks.

---

## Task 18 — Verificação manual via Playwright MCP (8 passos do spec)

> Execução manual via MCP Playwright (não-automatizada) — valida o que o script não consegue medir objetivamente (tipografia, ritmo, ausência de flash).

- [ ] **Step 18.1:** Iniciar servidor e browser no viewport iPhone 14 Pro via MCP.

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8767/webapp/library/
```

(Servidor já roda como parte do validador; ou rodar um `python -m http.server 8767` no root em outra aba.)

- [ ] **Step 18.2–18.8:** Executar os 8 passos do spec (linhas 141–149 do design doc):

  1. Home → hero `Biblioteca` + filete dourado + topic-count em mono
  2. Tap Abdominoplastia → hero briefing com fleuron + titulo serif + contador mono + 6 seções
  3. Expandir Anatomia → abrir card → hierarquia role-card + role-body + role-label + italic role-meta
  4. Tap `moon` → transição Noir sem flash branco
  5. Reload com tema dark persistido → confirma sem flash (DOM já `data-theme="dark"` antes do CSS)
  6. Tap chat → `Consulta aberta.` + `Começar por` + `I.`, `II.`, `III.`
  7. DevTools → offline → banner com ícone `wifi-off`
  8. Repetir 1–7 no light mode

- [ ] **Step 18.3:** Capturar screenshot de cada passo em `tools/_validation/manual/` para PR.

- [ ] **Step 18.4:** Se passos 1–8 todos OK, seguir para Task 19. Qualquer falha → corrigir + commit + re-verificar.

---

## Task 19 — Checar tamanho do bundle

**Files:** nenhum código alterado.

- [ ] **Step 19.1:** Medir tamanho total de `webapp/library/` (incluindo fonts) comprimido.

```bash
cd webapp/library && du -sh . && tar -czf /tmp/atlas-bundle.tgz . && du -sh /tmp/atlas-bundle.tgz && cd -
```

Expected: `< 500KB` gzipped (conforme spec linha 139).

- [ ] **Step 19.2:** Se > 500KB, checar se alguma fonte pode ser subset-reduzida (latin-only suficiente). Corrigir se necessário + commit. Se ≤ 500KB, prosseguir.

---

## Task 20 — Code review antes do PR

**Files:** nenhum código alterado.

- [ ] **Step 20.1:** Invocar `/code-review:code-review` contra a diff do branch.

```bash
# Dentro do Claude Code CLI:
# /code-review:code-review
```

Seguir as instruções do skill. Ajustar código conforme recomendações do review, commit por correção.

- [ ] **Step 20.2:** Após review aprovar, invocar `superpowers:finishing-a-development-branch` para o fluxo final do branch.

---

## Task 21 — Abrir PR

**Files:** nenhum código alterado.

- [ ] **Step 21.1:** Push da branch.

```bash
git push -u origin feat/pwa-atlas-redesign
```

- [ ] **Step 21.2:** Abrir PR referenciando o spec.

```bash
gh pr create --title "feat(pwa): redesign Atlas (editorial + dark mode)" --body "$(cat <<'EOF'
## Summary
- CSS wholesale rewrite: paleta Atlas (light) + Atlas Noir (dark), tokens unificados, tipografia Fraunces/Instrument Sans/JetBrains Mono self-hosted (OFL 1.1)
- Badges tipadas por tipo de card (elimina monocromia laranja)
- Hero editorial em Home e Briefing (fleuron, filete dourado, contadores mono)
- Dark mode dedicado com toggle persistido (`localStorage.atlasTheme`) e anti-flash via script inline
- Ícones Lucide inline (ISC) substituem Unicode/emoji
- Chat empty state reescrito como índice editorial (`I. II. III.`)
- SW bump para `briefing-preop-v16` cacheando fontes, `theme.js`, `lucide.js`

Design: [docs/superpowers/specs/2026-04-16-pwa-atlas-redesign-design.md](../blob/master/docs/superpowers/specs/2026-04-16-pwa-atlas-redesign-design.md)
Plano: [docs/superpowers/plans/2026-04-16-pwa-atlas-redesign.md](../blob/master/docs/superpowers/plans/2026-04-16-pwa-atlas-redesign.md)

## Test plan
- [x] `node tools/validate_briefings.mjs --theme=both` — 8 temas × 2 temas passam + toggle smoke
- [x] Verificação manual via Playwright MCP (8 passos do spec)
- [x] Bundle gzipped ≤ 500KB
- [x] Nenhuma mudança em `content/cards/**` ou `content/rag/**`
- [ ] Lighthouse PWA audit ≥ 95 (rodar na PR preview ou staging)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: URL do PR impresso. Retornar ao Dr. Arthur.

---

## Verificação final (checklist para fechar)

- [ ] `node tools/validate_briefings.mjs --theme=both` passa
- [ ] Screenshots manuais (light + dark) anexados ou linkados no PR
- [ ] Bundle ≤ 500KB gzipped
- [ ] Diff inclui só arquivos listados em "Plano de arquivos"
- [ ] `grep "F97316\|--accent-orange"` em `webapp/library/` volta vazio
- [ ] `grep -r "&#8592;\|&#9993;\|&#10148;\|&#128218;" webapp/library/` volta vazio
- [ ] Commits individualmente reversíveis, mensagens descritivas
- [ ] Design e plano docs linkados no PR

---

## Notas de execução

- **TDD neste plano** não segue a forma clássica "teste vermelho → código verde" porque o trabalho é majoritariamente visual. O harness de teste é o `validate_briefings.mjs` estendido: ele mede broken images, hero count, badge types e toggle — um contrato visual mínimo. Tudo o que não é mensurável por ele cai em verificação manual via Playwright MCP (Task 18).
- **Por que commitar o CSS inteiro em um único commit** (Task 10) em vez de um por Task 5–9: CSS intermediário referencia classes ainda não definidas e produz renderização quebrada. Commits intermediários teriam branch em estado inválido. O ganho de granularidade não compensa.
- **`font-display: swap`** garante que o FOUT aconteça com a system font de fallback, nunca bloqueia render. Font preload no `<head>` (Fraunces + Instrument Sans) mitiga o swap visível nos dois roles mais frequentes.
- **Se o download de fontes (Task 2.2) falhar** por política de rede do ambiente: pedir ao Dr. Arthur para baixar manualmente via https://gwfh.mranftl.com/fonts e colocar os 4 `.woff2` em `webapp/library/fonts/`. O restante do plano não depende da origem das fontes.
