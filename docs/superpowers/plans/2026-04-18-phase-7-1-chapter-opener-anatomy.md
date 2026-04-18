# Phase 7.1 — Anatomy Chapter-Opener Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar tratamento visual editorial à seção "Anatomia Relevante" do briefing pré-operatório, destacando-a como subseção privilegiada do produto.

**Architecture:** Acrescentar uma classe modifier (`briefing-section--anatomy`) à `<details>` que contém os cards `anatomy`. Acrescentar ~30 linhas de CSS escopadas que aplicam wordmark eyebrow ("ANATOMIA" em Instrument Sans caps tracked verde), título em Fraunces italic 24px, régua vertical dissection-green à esquerda, e borda verde nos items abertos dessa section. Nada de renderer/card changes; nada de tokens novos.

**Tech Stack:** HTML/CSS/JS vanilla (sem framework); tokens CSS custom properties (`--dissection-green`, `--font-serif`, `--font-sans`); Playwright standalone para validação visual; service worker para cache bust.

**Spec:** `docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md` §5

---

## File Structure

| Arquivo | Mudança | Responsabilidade |
| --- | --- | --- |
| `webapp/library/preop.js` | modificar função `_section` (6-14) e chamada da anatomia (62) | passar modifier `briefing-section--anatomy` apenas na seção de anatomia |
| `webapp/library/style.css` | adicionar bloco após linha 416 | regras escopadas ao modifier: wordmark, italic, régua, borda verde |
| `webapp/library/sw.js:1` | bump CACHE_NAME v25→v26 | invalidar cache do PWA instalado |
| `webapp/library/index.html:16-56` | bump query-string `?v=...` | bust do cache do navegador em style.css, preop.js |
| `tools/validate_anatomy_opener.mjs` | criar | script Playwright standalone que tira screenshot da section anatomia em 3 briefings (abdomino, rino, blefaro) + 1 controle (otoplastia, poucos cards de anatomia) |

---

## Task 1: Playwright validation script (vermelho primeiro)

**Files:**
- Create: `tools/validate_anatomy_opener.mjs`

- [ ] **Step 1: Criar o script esperando o modifier**

```js
// tools/validate_anatomy_opener.mjs
// Valida presença do chapter-opener da seção Anatomia em múltiplos briefings.
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8778;
const TOPICS = ['abdominoplastia', 'rinoplastia', 'blefaroplastia', 'otoplastia'];
const OUT_DIR = join(ROOT, 'tools', '_validation', 'anatomy-opener');

const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2' };

function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = url.pathname === '/' ? '/webapp/library/index.html' : url.pathname;
    const fp = join(ROOT, pathname);
    if (!existsSync(fp)) { res.writeHead(404); res.end('not found'); return; }
    const data = await readFile(fp);
    res.writeHead(200, { 'Content-Type': MIME[extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
  return new Promise(ok => server.listen(PORT, () => ok(server)));
}

async function run() {
  await (await import('node:fs/promises')).mkdir(OUT_DIR, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();

  const failures = [];
  for (const topic of TOPICS) {
    await page.goto(`http://localhost:${PORT}/webapp/library/index.html#/preop/${topic}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.briefing-section');
    // Force all lazy images eager, wait for complete
    await page.evaluate(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(i => (i.loading = 'eager'));
    });
    await page.waitForLoadState('networkidle');

    const hasModifier = await page.locator('.briefing-section--anatomy').count();
    if (hasModifier === 0) failures.push(`${topic}: .briefing-section--anatomy AUSENTE`);

    // Abrir section anatomia
    const anatomyDetails = page.locator('.briefing-section--anatomy').first();
    if (await anatomyDetails.count() > 0) {
      await anatomyDetails.evaluate(el => el.setAttribute('open', ''));
    }
    await page.screenshot({ path: join(OUT_DIR, `${topic}-anatomy.png`), fullPage: true });
  }

  await browser.close();
  server.close();

  if (failures.length) {
    console.error('FAIL:');
    failures.forEach(f => console.error(' -', f));
    process.exit(1);
  }
  console.log('OK — screenshots em tools/_validation/anatomy-opener/');
}

run();
```

- [ ] **Step 2: Rodar para confirmar que falha antes da implementação**

Run: `node tools/validate_anatomy_opener.mjs`
Expected: FAIL com mensagens `abdominoplastia: .briefing-section--anatomy AUSENTE` etc. (classe ainda não foi adicionada).

- [ ] **Step 3: Commit do script**

```bash
git add tools/validate_anatomy_opener.mjs
git commit -m "test(phase-7.1): Playwright validator for anatomy chapter-opener"
```

---

## Task 2: `_section()` aceita modifier

**Files:**
- Modify: `webapp/library/preop.js:6-14`
- Modify: `webapp/library/preop.js:62`

- [ ] **Step 1: Estender assinatura de `_section`**

Substituir o bloco atual (linhas 6-14):

```js
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
```

- [ ] **Step 2: Passar modifier só na chamada da anatomia**

Linha 62 atual:
```js
      html += _section('Anatomia Relevante', anatomyCards.length, body);
```

Trocar para:
```js
      html += _section('Anatomia Relevante', anatomyCards.length, body, 'briefing-section--anatomy');
```

Demais chamadas (notas, decisões, técnicas, complicações, flashcards) permanecem inalteradas — `modifier` fica `undefined` e o ternário cai no branch sem classe extra.

- [ ] **Step 3: Rodar validator para confirmar modifier presente**

Run: `node tools/validate_anatomy_opener.mjs`
Expected: PASS (classe `.briefing-section--anatomy` presente nos 4 briefings). Screenshots gerados mas ainda sem estilo novo (chapter-opener aparece idêntico às outras sections).

- [ ] **Step 4: Commit**

```bash
git add webapp/library/preop.js
git commit -m "feat(preop): accept modifier param in _section and tag anatomy section"
```

---

## Task 3: CSS do chapter-opener

**Files:**
- Modify: `webapp/library/style.css` (adicionar bloco após linha 416)

- [ ] **Step 1: Adicionar bloco escopado ao modifier**

Após o bloco `.briefing-section-body { … }` (~linha 416), inserir:

```css
/* === Chapter-opener: Anatomia (Phase 7.1) === */
.briefing-section--anatomy {
  position: relative;
}
.briefing-section--anatomy > .briefing-section-title {
  position: relative;
  padding-top: 36px;
  padding-left: 18px;
  padding-bottom: 18px;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 24px;
  font-variation-settings: 'opsz' 80;
  letter-spacing: -0.01em;
}
.briefing-section--anatomy > .briefing-section-title::before {
  content: 'ANATOMIA';
  position: absolute;
  top: 14px;
  left: 18px;
  font-family: var(--font-sans);
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.20em;
  color: var(--dissection-green);
}
.briefing-section--anatomy > .briefing-section-title::after {
  border-color: var(--dissection-green);
}
.briefing-section--anatomy::after {
  content: '';
  position: absolute;
  left: 0;
  top: 40px;
  width: 2px;
  height: 24px;
  background: var(--dissection-green);
}
.briefing-section--anatomy .briefing-item[open] {
  border-color: var(--dissection-green);
}
```

Notas:
- `::before` do `.briefing-section-title` vira o eyebrow "ANATOMIA"; o `::after` existente (chevron) já é gerado pelo seletor da linha 390 — aqui apenas sobrescrevemos `border-color`.
- A régua vertical usa `::after` do próprio `.briefing-section--anatomy` (o `details`) para não conflitar com os pseudos do title.
- Nenhum background wash (confirmado §5.1 do spec).

- [ ] **Step 2: Rodar validator para inspeção visual**

Run: `node tools/validate_anatomy_opener.mjs`
Expected: PASS. Abrir `tools/_validation/anatomy-opener/abdominoplastia-anatomy.png` e confirmar: eyebrow "ANATOMIA" em verde, título italic 24px, régua verde vertical à esquerda, item aberto com borda verde.

- [ ] **Step 3: Validação cruzada em otoplastia**

Abrir `tools/_validation/anatomy-opener/otoplastia-anatomy.png` e confirmar que o layout não quebra com poucos cards (risco §9 do spec).

- [ ] **Step 4: Commit**

```bash
git add webapp/library/style.css
git commit -m "feat(style): anatomy chapter-opener (wordmark + italic + rule + green border)"
```

---

## Task 4: Bump SW cache

**Files:**
- Modify: `webapp/library/sw.js:1`

- [ ] **Step 1: Atualizar CACHE_NAME**

Linha 1 atual:
```js
const CACHE_NAME = 'briefing-preop-v25';
```

Trocar para:
```js
const CACHE_NAME = 'briefing-preop-v26';
```

- [ ] **Step 2: Verificar que handler de cleanup apaga v25**

No arquivo, o bloco `Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))` (linha ~28) já remove qualquer cache antigo automaticamente — nada mais a ajustar.

- [ ] **Step 3: Commit**

```bash
git add webapp/library/sw.js
git commit -m "chore(sw): bump cache v25->v26 for anatomy chapter-opener"
```

---

## Task 5: Cache-bust query-strings em index.html

**Files:**
- Modify: `webapp/library/index.html` (linhas com `?v=2026-04-16-anat2`)

- [ ] **Step 1: Localizar e substituir**

Substituir todas as ocorrências de `?v=2026-04-16-anat2` por `?v=2026-04-18-anat-opener`.

Run: `grep -n "?v=2026-04-16-anat2" webapp/library/index.html` — esperado: lista de linhas afetadas (script/link tags em 16-17 e 54-56, conforme auditoria inicial).

Usar Edit tool com `replace_all: true` em uma única chamada:

```
old_string: "?v=2026-04-16-anat2"
new_string: "?v=2026-04-18-anat-opener"
replace_all: true
```

- [ ] **Step 2: Verificar que nenhuma outra tag ficou com `?v=` antigo**

Run: `grep -n "2026-04-16-anat2" webapp/library/index.html`
Expected: sem resultados.

- [ ] **Step 3: Commit**

```bash
git add webapp/library/index.html
git commit -m "chore(html): bust asset cache to 2026-04-18-anat-opener"
```

---

## Task 6: Validação end-to-end e PR

- [ ] **Step 1: Rodar validator final**

Run: `node tools/validate_anatomy_opener.mjs`
Expected: PASS para todos os 4 tópicos (abdomino, rino, blefaro, oto).

- [ ] **Step 2: Rodar validator existente de briefings para garantir que nada regrediu**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: PASS (sem diff em counts de imagens, SW reinstala sem erro).

- [ ] **Step 3: Inspeção visual manual (mobile real ou devtools)**

Abrir em iPhone viewport (ou Safari/Chrome devtools mobile) pelo menos abdominoplastia e blefaroplastia. Confirmar:
- Wordmark "ANATOMIA" visível, verde, em caps tracked acima do título
- Título "Anatomia Relevante" em Fraunces italic 24px
- Régua verde vertical (2×24px) à esquerda da área do título
- Ao abrir um card de anatomia, a borda fica verde dissection-green
- Outras sections (Notas, Decisões, Técnicas) permanecem idênticas ao antes

- [ ] **Step 4: Abrir PR**

```bash
git push -u origin feature/phase-7-1-chapter-opener-anatomy
gh pr create --title "Phase 7.1: anatomy chapter-opener visual" --body "$(cat <<'EOF'
## Summary
- Tratamento editorial "chapter opener" na section Anatomia do briefing: wordmark + Fraunces italic 24px + régua dissection-green + borda verde nos items abertos.
- Escopado via classe modifier `.briefing-section--anatomy`; zero impacto em outras sections.
- Ganho global: todos os 8 temas v2 atuais + todos os futuros (reconstrução facial).

## Test plan
- [x] `node tools/validate_anatomy_opener.mjs` PASS
- [x] `node tools/validate_briefings.mjs --theme=both` PASS
- [x] Inspeção visual em abdominoplastia, rinoplastia, blefaroplastia, otoplastia em mobile viewport
- [x] SW reinstala sem erro (v25 → v26)

Spec: `docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md` §5

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Rodar `/code-review:code-review` antes do merge**

CLAUDE.md §5: obrigatório antes de qualquer PR.

- [ ] **Step 6: Pós-merge**

- Atualizar memória com "Phase 7.1 concluída" (`project_phase7_1_done.md`)
- Remover entry do índice `MEMORY.md` se substituindo entrada antiga; senão adicionar nova linha
- Sinalizar que próximo passo é Phase 7.2 (RAGs horizontais Kaufman)

---

## Fora do escopo (não tocar)

- `webapp/library/renderer.js` — cards de anatomia renderizam idênticos
- Tokens globais (`:root`) — reusa os existentes
- Outras sections do briefing (Notas, Decisões, Técnicas, Complicações) — intencionalmente deixadas no tratamento padrão para que anatomia se destaque por contraste
- Schema de cards v2 — inalterado
- Phase 7.2 em diante — fica para PRs subsequentes
