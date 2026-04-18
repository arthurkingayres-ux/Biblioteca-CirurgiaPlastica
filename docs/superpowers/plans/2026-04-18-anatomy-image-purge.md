# Phase 7.2 — Anatomy Image Purge: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover imagens de 64 cards anatomia v2 em 8 temas contorno+face, arquivando registry/PNG/coords; renderer já trata cards sem figura; SW cache invalidado; validador confirma zero figuras.

**Architecture:** Operação em 3 ondas — (1) validador TDD-red primeiro, provando que o estado atual tem figuras; (2) script `purge_anatomy_images.mjs` com dry-run + execute que faz toda a mutação em uma passada; (3) cache bump + validador TDD-green. Tudo em worktree isolada, commits frequentes, cada commit build-limpo.

**Tech Stack:** Node.js ESM (scripts), Playwright (validator), Git (worktree + commits), Service Worker (cache bump).

**Spec de referência:** [docs/superpowers/specs/2026-04-18-anatomy-image-purge-design.md](docs/superpowers/specs/2026-04-18-anatomy-image-purge-design.md).

---

## File Structure

### Criados
- `tools/purge_anatomy_images.mjs` — script one-shot com dry-run + execute
- `tools/validate_anatomy_image_purge.mjs` — Playwright validator, zero figuras em anatomia

### Modificados em massa (pelo script de purge)
- `content/cards/contorno-corporal/{abdominoplastia,contorno-pos-bariatrico,gluteoplastia,lipoaspiracao}/anatomia.json` — strip `images`
- `content/cards/estetica-facial/{blefaroplastia,otoplastia,rinoplastia,ritidoplastia}/anatomia.json` — strip `images`
- `content/images/manifest.json` — remove entradas arquivadas
- `tools/_coords/<tema>.json` × 8 — remove entradas arquivadas

### Modificados manualmente (cache bump)
- `webapp/library/sw.js` — bump CACHE_NAME + `?v=` suffix
- `webapp/library/index.html` — bump `?v=` suffix

### Movidos para `_archived/` (não deletados)
- `content/images/<tema>/<img-id>.json`
- `assets/images/<tema>/*.png`
- `webapp/library/assets/images/<tema>/*.png`

---

## Task 1 — Worktree setup

**Files:**
- Workspace: `.worktrees/phase-7-2-image-purge/`

- [ ] **Step 1: Create worktree and branch**

Run:
```bash
git worktree add .worktrees/phase-7-2-image-purge -b feature/phase-7-2-anatomy-image-purge
cd .worktrees/phase-7-2-image-purge
```

Expected: branch criado em `origin/master` (`9f0c7f8`) + `e9ff7ff` (spec), cwd na worktree.

- [ ] **Step 2: Verify baseline clean**

Run:
```bash
git log --oneline -2
node tools/validate_anatomy_opener.mjs
```

Expected: últimos 2 commits = `e9ff7ff docs(spec): Phase 7.2...` + `9f0c7f8 Phase 7.1...`. Validator roda verde (4/4 briefings com chapter-opener).

---

## Task 2 — Validator TDD red

**Files:**
- Create: `tools/validate_anatomy_image_purge.mjs`

- [ ] **Step 1: Create validator**

Conteúdo completo:

```javascript
#!/usr/bin/env node
// Valida que zero <img>/<figure> renderizam em cards anatomia dos 8 temas v2.
// Uso: node tools/validate_anatomy_image_purge.mjs
// Requer: dev server rodando em http://localhost:5173 (ou porta configurada).

import { chromium } from 'playwright';

const BRIEFINGS = [
  'abdominoplastia',
  'contorno-pos-bariatrico',
  'gluteoplastia',
  'lipoaspiracao',
  'blefaroplastia',
  'otoplastia',
  'rinoplastia',
  'ritidoplastia',
];

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const IPHONE = { width: 390, height: 844 };

async function countAnatomyFigures(page) {
  return page.evaluate(() => {
    const anatomySection = document.querySelector('.briefing-section--anatomy');
    if (!anatomySection) return { figures: 0, imgs: 0, cardCount: 0, error: 'section not found' };
    const cards = anatomySection.querySelectorAll('.card, [data-card-id]');
    let figures = 0, imgs = 0;
    for (const c of cards) {
      figures += c.querySelectorAll('figure').length;
      imgs += c.querySelectorAll('img').length;
    }
    return { figures, imgs, cardCount: cards.length };
  });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: IPHONE });
const page = await ctx.newPage();

let failed = 0;
for (const topic of BRIEFINGS) {
  const url = `${BASE}/briefing.html?topic=${topic}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  // Force lazy images to resolve eagerly
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
  });
  await page.waitForTimeout(600);

  const res = await countAnatomyFigures(page);
  const ok = res.figures === 0 && res.imgs === 0 && res.cardCount > 0 && !res.error;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${topic.padEnd(28)} cards=${res.cardCount} figures=${res.figures} imgs=${res.imgs}${res.error ? ' (' + res.error + ')' : ''}`);
  if (!ok) failed++;
}

await browser.close();

if (failed > 0) {
  console.error(`\n${failed}/${BRIEFINGS.length} briefings failed.`);
  process.exit(1);
}
console.log(`\nAll ${BRIEFINGS.length} briefings clean — zero anatomy figures.`);
```

- [ ] **Step 2: Start dev server + run validator, expect RED**

Run:
```bash
# em outro terminal:
cd webapp/library && python -m http.server 5173 &

# validator:
node tools/validate_anatomy_image_purge.mjs
```

Expected: FAIL em todos os 8 — cada briefing mostra `figures>0` ou `imgs>0` (estado atual tem imagens). `exit code 1`.

- [ ] **Step 3: Commit**

Run:
```bash
git add tools/validate_anatomy_image_purge.mjs
git commit -m "test(validator): zero anatomy figures across 8 temas (TDD red)"
```

---

## Task 3 — Purge script: dry-run mode

**Files:**
- Create: `tools/purge_anatomy_images.mjs`

- [ ] **Step 1: Create script with dry-run**

Conteúdo completo (ESM, Node ≥18):

```javascript
#!/usr/bin/env node
// Phase 7.2 — Purge imagens dos cards anatomia v2 em 8 temas contorno+face.
// Uso:
//   node tools/purge_anatomy_images.mjs             # dry-run (padrão)
//   node tools/purge_anatomy_images.mjs --execute   # aplica mudanças
//
// Mutações (execute):
//   - remove campo `images` de cada card anatomia nos 8 temas
//   - move registry JSONs órfãos para content/images/<tema>/_archived/
//   - move PNGs órfãos para assets/images/<tema>/_archived/ e webapp/library/assets/.../_archived/
//   - remove entradas arquivadas de content/images/manifest.json
//   - remove entradas arquivadas de tools/_coords/<tema>.json (arquivo inteiro se zerar)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const EXECUTE = process.argv.includes('--execute');

const SCOPE = [
  { area: 'contorno-corporal', topic: 'abdominoplastia' },
  { area: 'contorno-corporal', topic: 'contorno-pos-bariatrico' },
  { area: 'contorno-corporal', topic: 'gluteoplastia' },
  { area: 'contorno-corporal', topic: 'lipoaspiracao' },
  { area: 'estetica-facial',   topic: 'blefaroplastia' },
  { area: 'estetica-facial',   topic: 'otoplastia' },
  { area: 'estetica-facial',   topic: 'rinoplastia' },
  { area: 'estetica-facial',   topic: 'ritidoplastia' },
];

// ---------- Helpers ----------

function rel(p) { return path.relative(ROOT, p); }

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }

function writeJSON(p, data) {
  const body = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(p, body);
}

function mvFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}

function allCardFiles(topicDir) {
  return fs.readdirSync(topicDir)
    .filter(f => f.endsWith('.json') && f !== '_meta.json')
    .map(f => path.join(topicDir, f));
}

function imageRefsInCards(cardFiles) {
  const refs = new Set();
  for (const f of cardFiles) {
    const data = readJSON(f);
    const cards = Array.isArray(data) ? data : [data];
    for (const c of cards) {
      if (!Array.isArray(c.images)) continue;
      for (const img of c.images) if (img?.ref) refs.add(img.ref);
    }
  }
  return refs;
}

// ---------- Phase A: collect planned mutations ----------

const plan = {
  cardFilesModified: [],      // [{ path, cards: [{id, removedImages}] }]
  registriesToArchive: [],    // [{ imgId, src, dest }]
  registriesKept: [],         // [{ imgId, reason }]
  pngsToArchive: [],          // [{ src, dest }]
  manifestEntriesToRemove: [], // [imgId]
  coordsEntriesToRemove: [],   // [{ file, imgIds, willBeEmpty }]
};

const manifestPath = path.join(ROOT, 'content/images/manifest.json');
const manifest = readJSON(manifestPath);

for (const { area, topic } of SCOPE) {
  const topicDir = path.join(ROOT, 'content/cards', area, topic);
  const anatomyPath = path.join(topicDir, 'anatomia.json');
  if (!fs.existsSync(anatomyPath)) {
    console.error(`[skip] ${rel(anatomyPath)} missing`);
    continue;
  }

  const anatomy = readJSON(anatomyPath);
  const modified = [];
  const anatomyRefs = new Set();
  for (const c of anatomy) {
    if (!Array.isArray(c.images) || c.images.length === 0) continue;
    modified.push({ id: c.id, removedImages: c.images.map(i => i.ref).filter(Boolean) });
    for (const i of c.images) if (i?.ref) anatomyRefs.add(i.ref);
  }
  if (modified.length > 0) {
    plan.cardFilesModified.push({ path: anatomyPath, cards: modified });
  }

  // Check if each ref is shared with other card types in the same topic
  const otherCardFiles = allCardFiles(topicDir).filter(f => path.basename(f) !== 'anatomia.json');
  const otherRefs = imageRefsInCards(otherCardFiles);

  for (const imgId of anatomyRefs) {
    if (otherRefs.has(imgId)) {
      plan.registriesKept.push({ imgId, reason: `shared with non-anatomy cards in ${topic}` });
      continue;
    }

    // Archive registry JSON
    const registrySrc = path.join(ROOT, 'content/images', topic, `${imgId}.json`);
    if (fs.existsSync(registrySrc)) {
      const registryDest = path.join(ROOT, 'content/images', topic, '_archived', `${imgId}.json`);
      plan.registriesToArchive.push({ imgId, src: registrySrc, dest: registryDest });

      // Find PNG from registry
      const registry = readJSON(registrySrc);
      if (registry.file) {
        // assets/images/<file>
        const pngRel = registry.file;
        const assetSrc = path.join(ROOT, 'assets/images', pngRel);
        const pngName = path.basename(pngRel);
        const pngTopicDir = path.dirname(pngRel);
        if (fs.existsSync(assetSrc)) {
          plan.pngsToArchive.push({
            src: assetSrc,
            dest: path.join(ROOT, 'assets/images', pngTopicDir, '_archived', pngName),
          });
        }
        // webapp/library/assets/images/<file>
        const webappSrc = path.join(ROOT, 'webapp/library/assets/images', pngRel);
        if (fs.existsSync(webappSrc)) {
          plan.pngsToArchive.push({
            src: webappSrc,
            dest: path.join(ROOT, 'webapp/library/assets/images', pngTopicDir, '_archived', pngName),
          });
        }
      }

      // Manifest entry
      if (manifest.images && manifest.images[imgId]) {
        plan.manifestEntriesToRemove.push(imgId);
      }
    }

    // Coords entry
    const coordsPath = path.join(ROOT, 'tools/_coords', `${topic}.json`);
    if (fs.existsSync(coordsPath)) {
      const coords = readJSON(coordsPath);
      if (coords[imgId]) {
        // Aggregate per file
        let entry = plan.coordsEntriesToRemove.find(e => e.file === coordsPath);
        if (!entry) {
          entry = { file: coordsPath, imgIds: [], willBeEmpty: false };
          plan.coordsEntriesToRemove.push(entry);
        }
        entry.imgIds.push(imgId);
      }
    }
  }
}

// Recompute willBeEmpty for coords
for (const entry of plan.coordsEntriesToRemove) {
  const coords = readJSON(entry.file);
  const remaining = Object.keys(coords).filter(k => !entry.imgIds.includes(k));
  entry.willBeEmpty = remaining.length === 0;
}

// ---------- Phase B: report ----------

const cardCount = plan.cardFilesModified.reduce((n, f) => n + f.cards.length, 0);
console.log(`=== Phase 7.2 purge plan ${EXECUTE ? '(EXECUTING)' : '(dry-run)'} ===`);
console.log(`Topics in scope       : ${SCOPE.length}`);
console.log(`Card files modified   : ${plan.cardFilesModified.length}`);
console.log(`Cards losing images   : ${cardCount}`);
console.log(`Registry JSONs → _archived : ${plan.registriesToArchive.length}`);
console.log(`Registry JSONs kept (shared): ${plan.registriesKept.length}`);
console.log(`PNGs → _archived       : ${plan.pngsToArchive.length}`);
console.log(`Manifest entries removed: ${plan.manifestEntriesToRemove.length}`);
console.log(`Coords files touched   : ${plan.coordsEntriesToRemove.length}`);
console.log();

if (plan.registriesKept.length > 0) {
  console.log('Kept (shared):');
  for (const k of plan.registriesKept) console.log(`  ${k.imgId} — ${k.reason}`);
  console.log();
}

if (!EXECUTE) {
  console.log('Dry-run — no files modified. Re-run with --execute to apply.');
  process.exit(0);
}

// ---------- Phase C: execute ----------

// (implementado na Task 5)
console.error('--execute not yet implemented. Aborting.');
process.exit(2);
```

- [ ] **Step 2: Run dry-run**

Run:
```bash
node tools/purge_anatomy_images.mjs
```

Expected: report com números concretos. Valores esperados:
- Topics in scope: **8**
- Cards losing images: **64**
- Registry JSONs → \_archived: ~64 (menos qualquer compartilhada)
- Registry JSONs kept (shared): 0 ou pequeno
- PNGs → \_archived: ~128 (assets + webapp/library/assets espelhados)
- Manifest entries removed: ~64
- Coords files touched: ≤8

Se o count de cards ≠ 64, investigar antes de prosseguir.

- [ ] **Step 3: Commit**

```bash
git add tools/purge_anatomy_images.mjs
git commit -m "feat(tool): purge_anatomy_images script with dry-run"
```

---

## Task 4 — Validate dry-run sanity

- [ ] **Step 1: Spot-check one card file**

Run:
```bash
node tools/purge_anatomy_images.mjs 2>&1 | head -20
```

Check report. Then manually verify:

```bash
node -e "
const d = JSON.parse(require('fs').readFileSync('content/cards/estetica-facial/blefaroplastia/anatomia.json'));
console.log('blefaro cards with images:', d.filter(c => c.images?.length > 0).length);
console.log('total blefaro cards:', d.length);
"
```

Expected: `cards with images: 20`, `total: 20` — bate com o memory "Phase 4 — 20 cards blefaro migrados".

- [ ] **Step 2: Spot-check manifest coverage**

```bash
node -e "
const m = JSON.parse(require('fs').readFileSync('content/images/manifest.json'));
console.log('manifest entries:', Object.keys(m.images || m).length);
"
```

Log apenas para contexto. Registrar valor.

---

## Task 5 — Purge script: execute mode

**Files:**
- Modify: `tools/purge_anatomy_images.mjs`

- [ ] **Step 1: Implement execute phase**

Substituir o bloco `// ---------- Phase C: execute ----------` e o que vem depois por:

```javascript
// ---------- Phase C: execute ----------

// C1. Strip `images` field from each anatomy card
for (const { path: p, cards } of plan.cardFilesModified) {
  const data = readJSON(p);
  const targetIds = new Set(cards.map(c => c.id));
  for (const c of data) {
    if (targetIds.has(c.id)) delete c.images;
  }
  writeJSON(p, data);
  console.log(`  stripped images from ${cards.length} cards in ${rel(p)}`);
}

// C2. Move registry JSONs to _archived/
for (const { src, dest } of plan.registriesToArchive) {
  mvFile(src, dest);
}
console.log(`  archived ${plan.registriesToArchive.length} registry JSONs`);

// C3. Move PNGs to _archived/
for (const { src, dest } of plan.pngsToArchive) {
  mvFile(src, dest);
}
console.log(`  archived ${plan.pngsToArchive.length} PNGs`);

// C4. Manifest
if (plan.manifestEntriesToRemove.length > 0) {
  const m = readJSON(manifestPath);
  const bucket = m.images || m;
  for (const id of plan.manifestEntriesToRemove) delete bucket[id];
  writeJSON(manifestPath, m);
  console.log(`  removed ${plan.manifestEntriesToRemove.length} manifest entries`);
}

// C5. Coords
for (const entry of plan.coordsEntriesToRemove) {
  if (entry.willBeEmpty) {
    const archivedDir = path.join(ROOT, 'tools/_coords/_archived');
    fs.mkdirSync(archivedDir, { recursive: true });
    mvFile(entry.file, path.join(archivedDir, path.basename(entry.file)));
    console.log(`  archived empty coords file ${rel(entry.file)}`);
  } else {
    const coords = readJSON(entry.file);
    for (const id of entry.imgIds) delete coords[id];
    writeJSON(entry.file, coords);
    console.log(`  removed ${entry.imgIds.length} entries from ${rel(entry.file)}`);
  }
}

console.log('\nDone.');
```

- [ ] **Step 2: Re-run dry-run to confirm no regression**

```bash
node tools/purge_anatomy_images.mjs
```

Expected: mesmo report da Task 3.

- [ ] **Step 3: Commit**

```bash
git add tools/purge_anatomy_images.mjs
git commit -m "feat(tool): purge_anatomy_images execute mode"
```

---

## Task 6 — Execute purge

- [ ] **Step 1: Execute**

```bash
node tools/purge_anatomy_images.mjs --execute
```

Expected: logs por fase confirmando cards strippados, registries/PNGs archivados, manifest/coords atualizados.

- [ ] **Step 2: Verify repo state**

```bash
git status --short | head -40
```

Expected: dezenas de `M` (anatomia.json + manifest + coords) e dezenas de `R`/`D`+`??` (renames para `_archived/`).

- [ ] **Step 3: Verify no card retains images field**

```bash
node -e "
const fs = require('fs');
const topics = [
  ['contorno-corporal', 'abdominoplastia'],
  ['contorno-corporal', 'contorno-pos-bariatrico'],
  ['contorno-corporal', 'gluteoplastia'],
  ['contorno-corporal', 'lipoaspiracao'],
  ['estetica-facial', 'blefaroplastia'],
  ['estetica-facial', 'otoplastia'],
  ['estetica-facial', 'rinoplastia'],
  ['estetica-facial', 'ritidoplastia'],
];
let total = 0, withImages = 0;
for (const [a, t] of topics) {
  const d = JSON.parse(fs.readFileSync(\`content/cards/\${a}/\${t}/anatomia.json\`));
  total += d.length;
  withImages += d.filter(c => c.images?.length > 0).length;
}
console.log(\`anatomy cards total=\${total} withImages=\${withImages}\`);
"
```

Expected: `withImages=0`.

- [ ] **Step 4: Commit the mass change**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(cards): purge anatomy images across 8 temas (Phase 7.2)

- strip 'images' field from 64 anatomia cards (contorno+face)
- archive registry JSONs to content/images/<tema>/_archived/
- archive PNGs to assets/images/<tema>/_archived/ + webapp mirror
- remove archived entries from content/images/manifest.json
- remove archived entries from tools/_coords/<tema>.json

Renderer already handles anatomy cards without 'images' field
(abdo-anat-005 Gordura Visceral as reference). No behavioral
change in the renderer itself.

Spec: docs/superpowers/specs/2026-04-18-anatomy-image-purge-design.md
EOF
)"
```

---

## Task 7 — SW + index.html cache bump

**Files:**
- Modify: `webapp/library/sw.js`
- Modify: `webapp/library/index.html`

- [ ] **Step 1: Bump CACHE_NAME in sw.js**

Em `webapp/library/sw.js`, trocar `v26` por `v27` na linha `const CACHE_NAME = '...v26';`.

- [ ] **Step 2: Bump `?v=` suffix everywhere**

```bash
grep -rln '2026-04-18-anat-opener' webapp/library/
```

Expected: `sw.js` + `index.html` (+ talvez outros). Para cada arquivo listado:

```bash
# Use Edit tool with replace_all or sed equivalent:
node -e "
const fs = require('fs');
const files = ['webapp/library/sw.js', 'webapp/library/index.html'];
for (const f of files) {
  const c = fs.readFileSync(f, 'utf-8');
  fs.writeFileSync(f, c.replaceAll('2026-04-18-anat-opener', '2026-04-18-image-purge'));
  console.log('updated', f);
}
"
```

- [ ] **Step 3: Verify consistency**

```bash
grep -n '2026-04-18-' webapp/library/sw.js webapp/library/index.html | head
grep -n "CACHE_NAME" webapp/library/sw.js
```

Expected: todos `?v=` bateram em `2026-04-18-image-purge`; CACHE_NAME = `...v27`.

- [ ] **Step 4: Commit**

```bash
git add webapp/library/sw.js webapp/library/index.html
git commit -m "chore(sw): bump cache v26->v27 + ?v=image-purge (Phase 7.2)"
```

---

## Task 8 — Validator TDD green

- [ ] **Step 1: Restart dev server + run validator**

```bash
# kill servidor antigo, restart limpo
node tools/validate_anatomy_image_purge.mjs
```

Expected: `PASS` em todos os 8 briefings; `figures=0 imgs=0` cada. Mensagem final `All 8 briefings clean`.

Se algum FAIL: `figures>0` significa renderer ainda achou `<figure>`. Inspecionar HTML do tema falhando:
```bash
# headfull para debug visual
BASE_URL=http://localhost:5173 node tools/validate_anatomy_image_purge.mjs
# e inspecionar DevTools
```

- [ ] **Step 2: Run existing validators (no regression)**

```bash
node tools/validate_anatomy_opener.mjs
```

Expected: 4/4 briefings com chapter-opener ainda passando.

Outros validators existentes em `tools/validate_*.mjs` — rodar cada:

```bash
ls tools/validate_*.mjs
for v in tools/validate_*.mjs; do
  echo "=== $v ==="
  node "$v" || echo "FAILED: $v"
done
```

Expected: nenhum validator existente quebrado pela purge. Se algum quebrou por referenciar imagem removida, ajustar pontualmente.

- [ ] **Step 3: Commit fixes (se houve)**

```bash
git add tools/validate_*.mjs
git commit -m "fix(validators): adjust to post-purge anatomy state"
```

---

## Task 9 — Smoke manual

- [ ] **Step 1: Visual check abdominoplastia**

Com dev server rodando, abrir no browser (iPhone viewport ≥390px):
`http://localhost:5173/briefing.html?topic=abdominoplastia`

Expected:
- Seção Anatomia Relevante tem chapter-opener editorial intacto.
- Cards Camadas da Parede, Zonas de Huger, Reto Abdominal, Vasos Perfurantes, Gordura Visceral — todos renderizam com título, `one_liner`, `structures[]`, `clinical_hook`, tags.
- Zero figuras visíveis em anatomia.
- Seções Técnica, Decisões etc. mantêm suas imagens.

- [ ] **Step 2: Visual check blefaroplastia (maior volume)**

`http://localhost:5173/briefing.html?topic=blefaroplastia`

Expected: 20 cards anatomia, todos sem figura, texto renderiza limpo. Zero erros no console do browser.

- [ ] **Step 3: Visual check controle (pele-tumores)**

`http://localhost:5173/briefing.html?topic=retalhos-locais-face`

Expected: figuras de anatomia intactas (pele-tumores **fora** de escopo).

---

## Task 10 — Finalize branch

- [ ] **Step 1: Log final**

```bash
git log --oneline origin/master..HEAD
```

Expected: ~6 commits — validator red, purge script dry-run, execute mode, mass purge, cache bump, eventual fix.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feature/phase-7-2-anatomy-image-purge
```

- [ ] **Step 3: Rodar code review**

Invocar skill `/code-review:code-review` antes de abrir PR.

- [ ] **Step 4: Abrir PR**

```bash
gh pr create --title "Phase 7.2: anatomy image purge (8 temas)" --body "$(cat <<'EOF'
## Summary
- Remove `images` field de 64 cards anatomia v2 nos 8 temas contorno+face
- Arquiva registry JSONs, PNGs (assets + webapp mirror), manifest entries, coords entries em `_archived/`
- SW cache v26 → v27; `?v=` bumped para `image-purge`
- Renderer intocado (card sem `images` já funciona)
- Pele-tumores e outros card types intactos

## Test plan
- [x] `node tools/validate_anatomy_image_purge.mjs` — 8/8 PASS
- [x] `node tools/validate_anatomy_opener.mjs` — 4/4 PASS (sem regressão)
- [x] Smoke manual abdominoplastia + blefaroplastia no iPhone viewport
- [x] Smoke controle retalhos-locais-face: imagens intactas

Spec: `docs/superpowers/specs/2026-04-18-anatomy-image-purge-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

- **Spec coverage**: todas as 7 camadas do spec (cards, registry, PNGs, manifest, coords, renderer, SW) têm tasks diretas. Verificação (§7 do spec) coberta nas Tasks 8-9.
- **Type consistency**: nomes de variáveis/funções usados na Task 3 (`plan.cardFilesModified`, `plan.registriesToArchive`, `mvFile`) batem com os da Task 5 — mesmo arquivo, adição incremental.
- **Sem placeholders**: cada step tem comando ou código concreto. Task 8 Step 3 diz "se houve" — mas é condicional real, não placeholder.
- **Risco de registry compartilhado**: Task 3 implementa a detecção (cross-ref com outros card types no mesmo tema); registries compartilhados ficam em `plan.registriesKept` e não são movidos. Batido com §Riscos.1 do spec.
- **Ordem**: TDD red (Task 2) → script (Tasks 3-5) → execute (Task 6) → cache (Task 7) → green (Task 8) → smoke (Task 9) → finalize (Task 10). Green só vem depois de tudo.
