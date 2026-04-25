# Phase 7.6.5 — Schema Relax + AJV Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relaxar caps de `anatomy_v2` no `content/cards/schema.json` para refletir o gênero editorial real e adicionar gate AJV no pipeline + suíte de testes para travar futuras violações no novo patamar.

**Architecture:** Mudança em duas frentes coordenadas — (1) `schema.json` ganha caps maiores (~10% headroom sobre o max real observado nos 111 anatomy cards do repo), (2) novo script standalone `tools/validate_cards_schema.mjs` itera todos os cards e roda AJV strict, chamado pelo `rag_to_cards.js` ao final e por um teste novo em `node --test`. Cards existentes não mudam. Renderer e CSS não mudam.

**Tech Stack:** Node 22 (built-in test runner + ESM), `ajv@8` + `ajv-formats` (já em `package.json`), `node:fs`, `node:path`, `node:child_process`.

**Spec:** [`docs/superpowers/specs/2026-04-25-phase-7-6-5-schema-relax-ajv-gate-design.md`](../specs/2026-04-25-phase-7-6-5-schema-relax-ajv-gate-design.md)

**Sub-fase:** 7.6.5 (housekeeping entre 7.6a e 7.6b)

**Baseline (master `2f5bb74`):** 111 cards anatomy total — 45 passam schema atual, **66 falham** (drift Phase 4 + 7.4 + 7.5 + 7.6a). Após este plano: 111/111 passam.

---

## Pre-flight

### Task 0: Worktree + branch

**Files:** none

- [ ] **Step 1: Confirmar working tree limpo no master**

```bash
git status
git rev-parse --show-toplevel
```

Expected: `On branch master`, `nothing to commit, working tree clean`, root path `c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica`.

- [ ] **Step 2: Criar worktree isolado**

```bash
git worktree add ../Biblioteca-CirurgiaPlastica-7-6-5 -b chore/phase-7-6-5-schema-relax-ajv-gate
cd ../Biblioteca-CirurgiaPlastica-7-6-5
git rev-parse --show-toplevel
git branch --show-current
```

Expected: novo worktree em `../Biblioteca-CirurgiaPlastica-7-6-5`, branch `chore/phase-7-6-5-schema-relax-ajv-gate`.

- [ ] **Step 3: Garantir que dependências estão instaladas**

```bash
test -d node_modules || npm install
node -e "require('ajv'); require('ajv-formats'); console.log('ajv ok')"
```

Expected: `ajv ok`.

---

## Task 1: Standalone validator script (TDD red)

**Files:**
- Create: `tools/validate_cards_schema.mjs`
- Test: `tools/tests/test_validate_cards_schema.mjs` (novo)

- [ ] **Step 1: Write the failing test**

Criar `tools/tests/test_validate_cards_schema.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('validate_cards_schema.mjs runs and reports OK/FAIL counts', () => {
  const r = spawnSync('node', ['tools/validate_cards_schema.mjs'], { encoding: 'utf8' });
  // Antes do schema relax: exit 1 esperado (drift). Depois: exit 0.
  // Independente disso, o stdout precisa conter o resumo.
  assert.match(r.stdout, /OK:\s*\d+/, `stdout missing OK count: ${r.stdout}`);
  assert.match(r.stdout, /FAIL:\s*\d+/, `stdout missing FAIL count: ${r.stdout}`);
});

test('validate_cards_schema.mjs exits 0 when all cards pass', () => {
  const r = spawnSync('node', ['tools/validate_cards_schema.mjs'], { encoding: 'utf8' });
  assert.equal(r.status, 0, `exit ${r.status}; stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tools/tests/test_validate_cards_schema.mjs
```

Expected: 2 falhas (script não existe, stdout vazio, exit code não-zero).

- [ ] **Step 3: Create the standalone validator**

Criar `tools/validate_cards_schema.mjs` (ESM, executável):

```javascript
#!/usr/bin/env node
// tools/validate_cards_schema.mjs — Valida todos os cards JSON contra schema.json (AJV strict).
// Uso: node tools/validate_cards_schema.mjs
// Exit 0 se todos validam, 1 caso contrário.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARDS_DIR = join(ROOT, 'content', 'cards');
const SCHEMA_PATH = join(CARDS_DIR, 'schema.json');

const SKIP_FILES = new Set(['_meta.json', '_structure.json', 'manifest.json', 'schema.json']);

const FILE_TO_TYPE = {
  'anatomia.json': 'anatomy',
  'tecnicas.json': 'technique',
  'decisoes.json': 'decision',
  'notas.json': 'note',
  'flashcards.json': 'flashcard',
};

function loadValidators() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  // Manter $schema removido por compatibilidade com ajv 2020
  delete schema.$schema;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(schema, 'root');
  return {
    anatomy: ajv.compile({ $ref: 'root#/$defs/anatomy' }),
    technique: ajv.compile({ $ref: 'root#/$defs/technique' }),
    decision: ajv.compile({ $ref: 'root#/$defs/decision' }),
    note: ajv.compile({ $ref: 'root#/$defs/note' }),
    flashcard: ajv.compile({ $ref: 'root#/$defs/flashcard' }),
  };
}

function* walkJson(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walkJson(full);
    else if (name.endsWith('.json') && !SKIP_FILES.has(name)) yield full;
  }
}

function main() {
  const validators = loadValidators();
  let okCount = 0;
  let failCount = 0;
  const failures = [];

  for (const filePath of walkJson(CARDS_DIR)) {
    const baseName = filePath.split(/[\\/]/).pop();
    const type = FILE_TO_TYPE[baseName];
    if (!type) continue; // ignora flashcards individuais ou arquivos não-padrão sem ruído
    let cards;
    try {
      cards = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (e) {
      failures.push({ file: relative(ROOT, filePath), card: '<file>', errors: [{ message: `JSON parse: ${e.message}` }] });
      failCount++;
      continue;
    }
    if (!Array.isArray(cards)) cards = [cards];
    for (const card of cards) {
      const validate = validators[type];
      if (validate(card)) {
        okCount++;
      } else {
        failCount++;
        failures.push({ file: relative(ROOT, filePath), card: card.id || '<no-id>', errors: validate.errors });
      }
    }
  }

  console.log(`OK: ${okCount} cards | FAIL: ${failCount} cards`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  ${f.file} :: ${f.card}`);
      for (const err of f.errors) {
        console.log(`    - ${err.instancePath || '/'} ${err.message}`);
      }
    }
  }
  process.exit(failCount === 0 ? 0 : 1);
}

main();
```

- [ ] **Step 4: Run script against current master to confirm drift**

```bash
node tools/validate_cards_schema.mjs
echo "Exit: $?"
```

Expected: stdout começa com `OK: 45 cards | FAIL: 66 cards` (ou números próximos), seguido de lista de falhas. Exit `1`. Isto confirma que o validador detecta o drift atual.

- [ ] **Step 5: Run the new test (should still fail on the second assertion only)**

```bash
node --test tools/tests/test_validate_cards_schema.mjs
```

Expected: primeiro test passa (stdout contém OK/FAIL), segundo test falha (exit 1 ≠ 0). É o estado correto antes do schema relax.

- [ ] **Step 6: Commit**

```bash
git add tools/validate_cards_schema.mjs tools/tests/test_validate_cards_schema.mjs
git commit -m "feat(tools): standalone validator for cards JSON (AJV strict)

Itera todos os content/cards/<area>/<topic>/<file>.json e valida
contra schema.json. Reporta OK/FAIL counts e exit 1 em falhas.

Baseline em master: 45 OK, 66 FAIL — drift de maxLength em
anatomy_v2 acumulado em Phases 4 + 7.4 + 7.5 + 7.6a. Validator
detecta corretamente; relax do schema vem em commit subsequente."
```

---

## Task 2: Schema relax (caps refletindo gênero real)

**Files:**
- Modify: `content/cards/schema.json` (bloco `$defs.anatomy_v2` e seus sub-objetos)

- [ ] **Step 1: Atualizar 9 caps em `anatomy_v2`**

No arquivo `content/cards/schema.json`, aplicar as substituições abaixo. Cada `Edit` deve usar o `old_string` exato (com indentação) do trecho atual:

`"title": { "type": "string", "maxLength": 60 }` → `"title": { "type": "string", "maxLength": 80, "description": "Hard ceiling against accidental megacards, not editorial guidance" }`

`"aliases": { "type": "array", "items": { "type": "string", "maxLength": 60 }, "default": [] }` → `"aliases": { "type": "array", "items": { "type": "string", "maxLength": 80 }, "default": [] }`

`"one_liner": { "type": "string", "maxLength": 160 }` → `"one_liner": { "type": "string", "maxLength": 320, "description": "Hard ceiling against accidental megacards, not editorial guidance" }`

`"clinical_hook": { "type": "string", "maxLength": 200 }` → `"clinical_hook": { "type": "string", "maxLength": 360, "description": "Hard ceiling against accidental megacards, not editorial guidance" }`

`"how_to_identify": { "type": "string", "maxLength": 150 }` → `"how_to_identify": { "type": "string", "maxLength": 300, "description": "Hard ceiling against accidental megacards, not editorial guidance" }`

`"description": { "type": "string", "maxLength": 80 }` (dentro de `structures.items.properties`) → `"description": { "type": "string", "maxLength": 200 }` — atenção: este `description` aparece **2 vezes** no schema (em `anatomy_v2.structures` e em `anatomy_legacy`); só o de `anatomy_v2` muda. Use `old_string` longo o suficiente (incluir contexto `"label": { "type": "string", "maxLength": 60 }`) para identificar o correto.

`"label": { "type": "string", "maxLength": 40 }` (dentro de `numbers.items.properties`) → `"label": { "type": "string", "maxLength": 60 }`

`"value": { "type": "string", "maxLength": 30 }` (dentro de `numbers.items.properties`) → `"value": { "type": "string", "maxLength": 50 }`

`"note": { "type": "string", "maxLength": 60 }` (dentro de `numbers.items.properties`) → `"note": { "type": "string", "maxLength": 140 }`

`"relations": { "type": "array", "items": { "type": "string", "maxLength": 80 }, "default": [] }` (em `anatomy_v2`) → `"relations": { "type": "array", "items": { "type": "string", "maxLength": 180 }, "default": [] }` — também aparece em `anatomy_legacy` sem `maxLength` no items; só o de `anatomy_v2` muda.

- [ ] **Step 2: Rodar validator manualmente**

```bash
node tools/validate_cards_schema.mjs
echo "Exit: $?"
```

Expected: `OK: 111 cards | FAIL: 0 cards`. Exit `0`.

- [ ] **Step 3: Rodar a suíte de testes do validator**

```bash
node --test tools/tests/test_validate_cards_schema.mjs
```

Expected: `# pass 2`, `# fail 0`.

- [ ] **Step 4: Commit**

```bash
git add content/cards/schema.json
git commit -m "fix(schema): relax anatomy_v2 maxLength caps to match real genre

Caps elevados em 9 campos para ~10% headroom sobre o max observado
nos 111 anatomy cards do repo. Mantem funcao de ceiling contra
megacard acidental sem cortar conteudo ja mergeado em Phases 4 e 7.

Validator agora reporta 111 OK / 0 FAIL contra todo o repo."
```

---

## Task 3: Atualizar test_schema_anatomy.mjs

**Files:**
- Modify: `tools/tests/test_schema_anatomy.mjs:42-56`

- [ ] **Step 1: Atualizar assertion do cap rejection**

Edit em `tools/tests/test_schema_anatomy.mjs`:

```javascript
test('v2 anatomy rejects one_liner over cap', () => {
  const tooLong = {
    id: 'abdo-anat-003',
    type: 'anatomy',
    title: 'X',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    one_liner: 'x'.repeat(321),
    clinical_hook: 'ok',
    citations: ['c'],
    tags: ['t']
  };
  const ok = validateAnatomy(tooLong);
  assert.equal(ok, false);
});
```

(Mudança: `'x'.repeat(161)` → `'x'.repeat(321)`.)

- [ ] **Step 2: Rodar a suíte e confirmar 4/4**

```bash
node --test tools/tests/test_schema_anatomy.mjs
```

Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 3: Commit**

```bash
git add tools/tests/test_schema_anatomy.mjs
git commit -m "test(schema): bump one_liner reject threshold 161 -> 321

Reflete cap relaxado de 160 -> 320. Mantem cobertura de rejeicao
acima do ceiling sem falsos positivos no patamar atual."
```

---

## Task 4: Wire validator into rag_to_cards.js (final gate)

**Files:**
- Modify: `tools/rag_to_cards.js` (final do `processTopic` ou bloco `main` antes de exit)

- [ ] **Step 1: Localizar o ponto de inserção**

Ler `tools/rag_to_cards.js` próximo ao final do `processTopic` (busca onde os arquivos são escritos com `fs.writeFileSync`). O validador deve rodar **depois** que todos os JSONs do tema foram escritos, mas **antes** do log final de stats.

- [ ] **Step 2: Adicionar require + função helper no topo do arquivo**

Logo após a linha `const PREFIXES = JSON.parse(...);` (~linha 26), adicionar:

```javascript
const { spawnSync } = require('child_process');

function runStandaloneValidator() {
  const r = spawnSync('node', [path.join(__dirname, 'validate_cards_schema.mjs')], {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.error('\n[FATAL] validate_cards_schema.mjs falhou — abortando pipeline.');
    process.exit(1);
  }
}
```

- [ ] **Step 3: Chamar `runStandaloneValidator()` no fim do `processTopic`**

Localizar o bloco final do `processTopic` (logo antes do `console.log` que reporta `Validados`, ou logo após o último `fs.writeFileSync` do `_meta.json`). Adicionar:

```javascript
console.log('\n[gate] Rodando validate_cards_schema.mjs no diretorio cards/...');
runStandaloneValidator();
console.log('[gate] OK — todos os cards passaram validacao final.');
```

- [ ] **Step 4: Smoke test em `--dry-run` (não chama API Anthropic)**

```bash
node tools/rag_to_cards.js --topic abdominoplastia --area contorno-corporal --dry-run 2>&1 | tail -20
echo "Exit: $?"
```

Expected: dry-run roda até o final sem chamar API. Se o dry-run não exercita o validador final (por estar fora do path de escrita), aceitar — o gate ativa em runs reais. Importante: comando termina com exit 0.

- [ ] **Step 5: Verificar que o gate dispara em estado inválido (test manual reversível)**

```bash
# Introduz drift artificial num card temporário
node -e "
const fs = require('fs');
const p = 'content/cards/contorno-corporal/abdominoplastia/anatomia.json';
const j = JSON.parse(fs.readFileSync(p,'utf8'));
const orig = JSON.stringify(j);
fs.writeFileSync(p+'.bak', orig);
j[0].one_liner = 'x'.repeat(400);
fs.writeFileSync(p, JSON.stringify(j, null, 2));
"
node tools/validate_cards_schema.mjs ; echo "Exit: $?"
# Restaurar
node -e "
const fs = require('fs');
const p = 'content/cards/contorno-corporal/abdominoplastia/anatomia.json';
fs.copyFileSync(p+'.bak', p);
fs.unlinkSync(p+'.bak');
"
node tools/validate_cards_schema.mjs ; echo "Exit: $?"
```

Expected: primeira execução exit `1` com falha de `one_liner` 400 > 320. Segunda execução exit `0`.

- [ ] **Step 6: Commit**

```bash
git add tools/rag_to_cards.js
git commit -m "feat(pipeline): rag_to_cards calls standalone validator as final gate

Apos escrever todos os JSONs do tema, roda validate_cards_schema.mjs
e aborta com exit 1 se algum card falhar. Cobre o gap em que cards
autorados fora do pipeline (subagentes, edicao manual) nao passavam
pela AJV per-card que ja existe no rag_to_cards."
```

---

## Task 5: Atualizar CLAUDE.md §11

**Files:**
- Modify: `CLAUDE.md` (§11 Verificação operacional)

- [ ] **Step 1: Adicionar bullet ao §11**

Localizar §11 em `CLAUDE.md`. Adicionar um bullet ao final da seção:

```markdown
- Antes de mergear sub-fase com cards novos ou modificados: rodar `node tools/validate_cards_schema.mjs` e reportar `OK: N | FAIL: 0` no relatório de fechamento. Não mergear com `FAIL > 0`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): require validate_cards_schema.mjs at sub-phase close

Adiciona bullet ao §11 (Verificacao operacional) exigindo rodar o
validator standalone antes de mergear sub-fase com cards novos.
Relatorio de fechamento deve citar OK/FAIL counts."
```

---

## Task 6: Smoke test final + manifest

**Files:** none

- [ ] **Step 1: Rodar a suíte completa**

```bash
node --test tools/tests/
```

Expected: todas as suítes passam — incluir `test_schema_anatomy.mjs` (4/4), `test_validate_cards_schema.mjs` (2/2), e demais (`test_validate_briefings_image_counts.py` é Python — rodar separado se existirem).

- [ ] **Step 2: Rodar validator final + reportar contagem**

```bash
node tools/validate_cards_schema.mjs | head -1
echo "Exit: $?"
```

Expected: `OK: 111 cards | FAIL: 0 cards`, exit `0`. Anotar este número para o relatório de fechamento.

- [ ] **Step 3: Confirmar que sw.js não precisa bump**

Esta sub-fase **não toca** `webapp/library/`, `assets/images/`, nem `rag-index.json`. Confirmar via diff:

```bash
git diff master --stat
```

Expected: apenas `content/cards/schema.json`, `tools/validate_cards_schema.mjs`, `tools/tests/test_validate_cards_schema.mjs`, `tools/tests/test_schema_anatomy.mjs`, `tools/rag_to_cards.js`, `CLAUDE.md`. Nada em `webapp/` ou `assets/`. Sem necessidade de SW cache bump.

---

## Task 7: Code review board + close-out (§10)

**Files:** none nesta task — apenas processo

- [ ] **Step 1: Push da branch**

```bash
git push -u origin chore/phase-7-6-5-schema-relax-ajv-gate
```

- [ ] **Step 2: Invocar `/code-review-board`**

Comando: `/code-review-board` (sem args = `master..HEAD` na branch atual).

Esperado: relatório gravado em `docs/reviews/BRANCH-chore-phase-7-6-5-schema-relax-ajv-gate-2026-04-25.md` (ou path equivalente).

- [ ] **Step 3: PAUSAR — aguardar Dr. Arthur revisar o relatório**

Sem autorização explícita, **não mergear**.

- [ ] **Step 4: Se houver findings bloqueadores, invocar `superpowers:receiving-code-review` e voltar à task em questão**

- [ ] **Step 5: Squash-merge em master**

```bash
cd ../Biblioteca-CirurgiaPlastica
git checkout master
git pull origin master
git merge --squash chore/phase-7-6-5-schema-relax-ajv-gate
git commit -m "Phase 7.6.5: Schema relax + AJV gate

Relaxa caps de anatomy_v2 em 9 campos para ~10% headroom sobre o max
observado nos 111 anatomy cards do repo. Adiciona standalone validator
(tools/validate_cards_schema.mjs) chamado por rag_to_cards.js no final
do pipeline e por suite de testes node --test. Atualiza CLAUDE.md §11
com bullet exigindo o validator antes de mergear sub-fase.

Validator final em master: OK: 111 cards | FAIL: 0 cards.

Resolve debito flagado em /code-review-board reports de Phase 7.5
(Important #1) e 7.6a (Blocker #1)."
git push origin master
git branch -D chore/phase-7-6-5-schema-relax-ajv-gate
git push origin --delete chore/phase-7-6-5-schema-relax-ajv-gate
git worktree remove ../Biblioteca-CirurgiaPlastica-7-6-5
git worktree prune
```

- [ ] **Step 6: Capturar SHA do squash**

```bash
git log -1 --format=%H
```

Anotar o SHA — entra no memo `project_phase7_6_5_done.md`.

- [ ] **Step 7: Atualizar memória persistente**

Criar `C:\Users\absay\.claude\projects\c--Users-absay-Documents-Biblioteca-CirurgiaPlastica\memory\project_phase7_6_5_done.md`:

```markdown
---
name: Phase 7.6.5 schema relax + AJV gate CONCLUIDA
description: Sub-fase de housekeeping; 9 caps relaxados em anatomy_v2 + standalone validator + gate no pipeline
type: project
---

Phase 7.6.5 — Schema Relax + AJV Gate fechada em 2026-04-25.

**Squash em master:** `<SHA>` "Phase 7.6.5: Schema relax + AJV gate"

**Entregas:**
- `content/cards/schema.json` — 9 caps de `anatomy_v2` relaxados (~10% headroom sobre max observado)
- `tools/validate_cards_schema.mjs` — novo standalone validator (AJV strict)
- `tools/rag_to_cards.js` — chama validator no final do pipeline, exit 1 em falha
- `tools/tests/test_validate_cards_schema.mjs` — novo (2 testes)
- `tools/tests/test_schema_anatomy.mjs` — bump 161→321 no test de cap rejection
- `CLAUDE.md §11` — bullet exigindo validator antes de mergear

**Validator pos-merge:** OK: 111 cards | FAIL: 0 cards.

**Why:** drift sistemático em 66/111 cards anatomy v2 acumulado em Phases 4/7.4/7.5/7.6a, flagado como blocker em /code-review-board do PR de 7.6a. Decisao C+A da spec.

**How to apply:** caps novos em schema.json sao referencia para futuros cards anatomy_v2. Antes de mergear sub-fase com cards novos, rodar `node tools/validate_cards_schema.mjs` e reportar OK/FAIL no relatorio de fechamento (CLAUDE.md §11). Marca o debito `project_debt_anatomy_v2_maxlength.md` como RESOLVIDO.
```

Atualizar `MEMORY.md` adicionando linha (e marcar débito como resolvido):

```markdown
- [Phase 7.6.5 schema relax + AJV gate CONCLUIDA](project_phase7_6_5_done.md) — squash <SHA> em master 2026-04-25; 111/111 cards passam AJV; resolve debito anatomy_v2_maxlength
```

E atualizar `project_debt_anatomy_v2_maxlength.md` adicionando seção `**RESOLVIDO em 2026-04-25:**` no topo, citando SHA + link para `project_phase7_6_5_done.md`.

- [ ] **Step 8: Reportar status final**

Reportar ao Dr. Arthur:
- Validator final: `OK: 111 cards | FAIL: 0 cards`
- Suite de testes: `test_schema_anatomy: 4/4`, `test_validate_cards_schema: 2/2`
- SHA do squash em master
- Próxima sub-fase do roadmap: 7.6b — Reconstrução de pálpebra (Onda 2, sub-unit 2). PAUSAR e aguardar autorização explícita antes de iniciar.

---

## Critérios de aceitação (recap da spec)

- [x] Spec coverage: cada item do critério da spec mapeado a uma task
- [ ] `content/cards/schema.json` — 9 caps + descriptions curtos (Task 2)
- [ ] `tools/validate_cards_schema.mjs` — executa em < 5s, reporta `OK: 111 | FAIL: 0` pós-relax (Tasks 1+2)
- [ ] `tools/rag_to_cards.js` — chama validator e aborta em falha (Task 4)
- [ ] `tools/tests/test_schema_anatomy.mjs` — 4/4 verde com novo cap (Task 3)
- [ ] `tools/tests/test_validate_cards_schema.mjs` — 2/2 verde (Task 1)
- [ ] `CLAUDE.md §11` — bullet do validator (Task 5)
- [ ] `/code-review-board` rodado, relatório em `docs/reviews/` (Task 7)
- [ ] PR squash-mergeado, branch + worktree limpos (Task 7)
- [ ] Memo `project_phase7_6_5_done.md` + linha em `MEMORY.md` com SHA (Task 7)
