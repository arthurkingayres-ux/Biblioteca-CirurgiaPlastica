# Card Uniformity — Phase 5 Pending Images Sweep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Popular o campo `images[]` dos 36 anatomy cards pendentes (já em schema v2), em 2 PRs sequenciais por área, usando assets existentes em `assets/images/<tema>/` como fonte primária e extração Neligan como fallback.

**Architecture:** Por tema, mapear cada card pending a uma figura (asset existente primeiro; Neligan extraction se faltar; SVG custom último recurso). Para cada mapeamento, criar library entry `content/images/<tema>/img-<slug>-001.json` com labels numerados, e referenciá-la no card via `{ref: "..."}`. Regenerar manifest + pending report + bump SW cache ao fim de cada PR.

**Tech Stack:** JSON cards/images + AJV validation (draft 2020, strict false) + Python/Node tooling (`audit_images.py`, `extract_figures.py`, `build_image_manifest.py`, `report_pending_images.mjs`, `lint_acronyms.py`, `validate_briefings.mjs`) + Service Worker cache (`webapp/library/sw.js`) + Haiku subagent para blefaroplastia.

**Branch strategy:** 2 worktrees sequenciais — `feature/card-uniformity-phase-5a-contorno` e `feature/card-uniformity-phase-5b-face`. Fechar PR 5A antes de abrir 5B.

---

## Pre-flight: Commit spec

Spec já criada em `docs/superpowers/specs/2026-04-17-phase-5-pending-images-design.md`. Antes de tudo:

- [ ] **Pre-flight 1: Commit spec + plan**

Run:
```bash
cd c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git status
git add docs/superpowers/specs/2026-04-17-phase-5-pending-images-design.md docs/superpowers/plans/2026-04-17-card-uniformity-phase-5.md
git commit -m "$(cat <<'EOF'
docs(phase-5): spec + plano executavel para sweep de pending images

Phase 5 ataca os 36 anatomy cards com images: [] deixados em Phase 4.
2 PRs por area: 5A contorno (11 cards) + 5B face (25 cards).
Workflow: asset existente > Neligan extraction > SVG custom (ultimo recurso).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```
Expected: commit criado em master.

---

## Phase 5A — contorno-corporal (11 cards)

### Task 1: Setup worktree para PR 5A

**Files:**
- Create worktree: `.worktrees/phase-5a-contorno`

- [ ] **Step 1: Criar worktree e entrar**

Run:
```bash
cd c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git check-ignore -q .worktrees && echo "ignored OK"
git worktree add .worktrees/phase-5a-contorno -b feature/card-uniformity-phase-5a-contorno
cd .worktrees/phase-5a-contorno
```
Expected: "ignored OK" + worktree criado.

- [ ] **Step 2: Baseline sanity**

Run:
```bash
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d "content/cards/contorno-corporal/abdominoplastia/anatomia.json"
node tools/report_pending_images.mjs
```
Expected: anatomia.json valida; relatório reproduz 36 pendentes.

---

### Task 2: abdominoplastia — abdo-anat-005 (Gordura Visceral)

**Files:**
- Modify: `content/cards/contorno-corporal/abdominoplastia/anatomia.json` (card `abdo-anat-005`)
- Create: `content/images/abdominoplastia/img-visceral-fat-001.json` (se asset existir)

- [ ] **Step 1: Inspecionar card e assets disponíveis**

Run:
```bash
ls assets/images/abdominoplastia/
```
Abrir `content/cards/contorno-corporal/abdominoplastia/anatomia.json`, localizar `abdo-anat-005`, confirmar subject (Gordura Visceral).

- [ ] **Step 2: Escolher asset**

Procurar filename relacionado a "visceral", "gordura", "intra-abdominal". Se nenhum, rodar:
```bash
python tools/audit_images.py
python tools/extract_figures.py --book neligan --chapter "abdominoplasty" --query "visceral fat"
```
Se Neligan não tiver figura adequada, deixar card com `images: []` e registrar no `_pending_images.md` (débito residual documentado).

- [ ] **Step 3: Read na imagem escolhida**

Usar tool `Read` no asset (mesmo que PNG/JPEG) para confirmar visualmente que representa o subject. Listar estruturas identificáveis (para labels numerados).

- [ ] **Step 4: Criar library entry**

Write em `content/images/abdominoplastia/img-visceral-fat-001.json`:
```json
{
  "id": "img-visceral-fat-001",
  "file": "assets/images/abdominoplastia/<filename-escolhido>",
  "subject": "Gordura visceral intra-abdominal",
  "role": "detail",
  "source": "Neligan 5ed, ch.XX, fig.XX-X",
  "credit": "Neligan PC et al., Plastic Surgery 5ed (Elsevier 2023)",
  "default_caption": "Gordura visceral em corte axial",
  "labels": [
    {"n": 1, "text": "..."},
    {"n": 2, "text": "..."}
  ],
  "applicable_topics": ["abdominoplastia"],
  "status": "available"
}
```

- [ ] **Step 5: Referenciar no card**

Edit em `content/cards/contorno-corporal/abdominoplastia/anatomia.json`, card `abdo-anat-005`:
```json
"images": [{"ref": "img-visceral-fat-001"}]
```

- [ ] **Step 6: Validar**

Run:
```bash
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d "content/cards/contorno-corporal/abdominoplastia/anatomia.json"
python tools/lint_acronyms.py content/cards/contorno-corporal/abdominoplastia/
```
Expected: validação OK, lint clean.

- [ ] **Step 7: Commit**

```bash
git add content/cards/contorno-corporal/abdominoplastia/anatomia.json content/images/abdominoplastia/
git commit -m "feat(cards): abdominoplastia anat-005 image ref (Gordura Visceral)"
```

---

### Task 3: gluteoplastia — 3 cards (glut-anat-001, -007, -008)

**Files:**
- Modify: `content/cards/contorno-corporal/gluteoplastia/anatomia.json`
- Create: até 3 entries em `content/images/gluteoplastia/`

Subjects: 
- `glut-anat-001` — Artéria Glútea Superior
- `glut-anat-007` — Nervo Glúteo Superior
- `glut-anat-008` — Nervo Glúteo Inferior

- [ ] **Step 1: Inventário assets**

Run:
```bash
ls assets/images/gluteoplastia/
```
Identificar quais filenames correspondem aos 3 subjects (keywords: "arteria-glutea-superior", "nervo-glut").

- [ ] **Step 2: Por card, executar o workflow de 4 sub-etapas inline**

Para cada um dos 3 cards:
  a. `Read` no asset candidato para confirmar
  b. Criar library entry `content/images/gluteoplastia/img-<slug>-001.json` (slugs sugeridos: `superior-gluteal-artery`, `superior-gluteal-nerve`, `inferior-gluteal-nerve`)
  c. Referenciar no card via `images: [{"ref": "..."}]`
  d. Se nenhum asset corresponder, rodar `tools/extract_figures.py` no capítulo Neligan "Body Contouring — Gluteal"; fallback: deixar como débito

- [ ] **Step 3: Validar**

Run:
```bash
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d "content/cards/contorno-corporal/gluteoplastia/anatomia.json"
python tools/lint_acronyms.py content/cards/contorno-corporal/gluteoplastia/
```
Expected: OK + clean.

- [ ] **Step 4: Commit**

```bash
git add content/cards/contorno-corporal/gluteoplastia/anatomia.json content/images/gluteoplastia/
git commit -m "feat(cards): gluteoplastia image refs (arteria+nervos gluteos)"
```

---

### Task 4: contorno-pos-bariatrico — 7 cards

**Files:**
- Modify: `content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json`
- Create: até 7 entries em `content/images/contorno-pos-bariatrico/`

Subjects:
- `cpb-anat-002` — Monte Púbico
- `cpb-anat-007` — Parede Abdominal Pós-Bariátrica (ficha complementar)
- `cpb-anat-008` — Monte Púbico (ficha complementar)
- `cpb-anat-009` — Coxa Medial (ficha complementar)
- `cpb-anat-010` — Braço (ficha complementar)
- `cpb-anat-011` — Mama Pós-Bariátrica (ficha complementar)
- `cpb-anat-012` — Face e Pescoço (ficha complementar)

Já existem 7 library entries em `content/images/contorno-pos-bariatrico/` (incluindo `medial-thigh-001`, `arm-sagittal-001`, `breast-ptosis-001`, `face-neck-ptosis-001`, `rectus-diastasis-001`, `scarpa-fat-compartment-001`, `trunk-adherence-zones-001`). **Reusar** quando subject bater; criar novos só se subject novo (ex: monte púbico).

- [ ] **Step 1: Inventário cruzado**

Run:
```bash
ls content/images/contorno-pos-bariatrico/
ls assets/images/contorno-pos-bariatrico/
```
Mapear cada card subject → library entry existente ou novo asset.

- [ ] **Step 2: Montar tabela de mapeamento**

Exemplo esperado:
| Card | Library entry | Status |
|---|---|---|
| cpb-anat-007 | img-rectus-diastasis-001 (existente) | reuse |
| cpb-anat-008 | img-pubic-mound-001 (novo) | criar |
| cpb-anat-009 | img-medial-thigh-001 (existente) | reuse |
| cpb-anat-010 | img-arm-sagittal-001 (existente) | reuse |
| cpb-anat-011 | img-breast-ptosis-001 (existente) | reuse |
| cpb-anat-012 | img-face-neck-ptosis-001 (existente) | reuse |
| cpb-anat-002 | img-pubic-mound-001 (mesmo da -008) | reuse |

- [ ] **Step 3: Executar mapeamento**

Para reuse: só adicionar `"images": [{"ref": "img-<nome>-001"}]` no card.
Para criar: seguir workflow Task 2 steps 3-5.

- [ ] **Step 4: Validar + commit**

Run:
```bash
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d "content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json"
python tools/lint_acronyms.py content/cards/contorno-corporal/contorno-pos-bariatrico/
git add content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json content/images/contorno-pos-bariatrico/
git commit -m "feat(cards): contorno-pos-bariatrico image refs (7 cards pending zerados)"
```

---

### Task 5: Chore + abrir PR 5A

**Files:**
- Modify: `content/images/manifest.json` (regenerado)
- Modify: `content/cards/_pending_images.md` (regenerado)
- Modify: `webapp/library/sw.js` (bump cache v20→v21)

- [ ] **Step 1: Regenerar manifests**

Run:
```bash
python tools/build_image_manifest.py
node tools/report_pending_images.mjs
```
Expected: manifest atualizado, pending reduzido de 36 para ~25.

- [ ] **Step 2: Bump SW cache**

Edit em `webapp/library/sw.js` linha 1:
```js
const CACHE_NAME = 'briefing-preop-v21';
```

- [ ] **Step 3: Smoke test**

Run:
```bash
npx tools/validate_briefings.mjs
```
Expected: briefings dos 3 temas tocados renderizam sem 404.

- [ ] **Step 4: Commit chore**

```bash
git add content/images/manifest.json content/cards/_pending_images.md webapp/library/sw.js
git commit -m "chore(sw,docs): bump SW cache v20->v21 + regen manifest (phase 5A)"
```

- [ ] **Step 5: Push + abrir PR**

```bash
git push -u origin feature/card-uniformity-phase-5a-contorno
gh pr create --title "feat(cards): phase 5A pending images — contorno-corporal (11 cards)" --body "$(cat <<'EOF'
## Summary
- Popula `images[]` dos 11 anatomy cards pendentes em contorno-corporal (abdomino 1 + gluteo 3 + CPB 7)
- Reutiliza library entries existentes em contorno-pos-bariatrico onde aplicavel
- Bump SW cache v20 -> v21

## Test plan
- [ ] ajv valida os 3 anatomia.json tocados
- [ ] lint_acronyms clean
- [ ] report_pending_images mostra 36 -> 25
- [ ] validate_briefings sem 404

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Code review + merge**

Rodar `/code-review:code-review`. Após aprovação do Dr. Arthur:
```bash
gh pr merge <N> --merge --delete-branch
```

---

### Task 6: Cleanup worktree 5A

- [ ] **Step 1: Remover worktree**

Run:
```bash
cd c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git worktree remove .worktrees/phase-5a-contorno
git branch -d feature/card-uniformity-phase-5a-contorno
git pull origin master
```
Expected: worktree limpo, master sincronizado.

---

## Phase 5B — estetica-facial (25 cards)

### Task 7: Setup worktree para PR 5B

- [ ] **Step 1: Criar worktree**

Run:
```bash
cd c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git worktree add .worktrees/phase-5b-face -b feature/card-uniformity-phase-5b-face
cd .worktrees/phase-5b-face
```
Expected: worktree criado em branch novo sobre master já com PR 5A mergeado.

---

### Task 8: rinoplastia — 10 cards (Opus inline)

**Files:**
- Modify: `content/cards/estetica-facial/rinoplastia/anatomia.json`
- Create: até 10 entries em `content/images/rinoplastia/`

Subjects pendentes (mapeamento sugerido a validar com Read):
- `rino-anat-003` — Pirâmide Óssea — Terço Superior
- `rino-anat-004` — Cartilagens Laterais Superiores (CLS) → primeira ocorrência expande sigla por campo
- `rino-anat-005` — Área do Keystone
- `rino-anat-007` — Scroll Area
- `rino-anat-009` — Ligamentos Nasais
- `rino-anat-011` — Inervação Nasal
- `rino-anat-012` — Musculatura Nasal
- `rino-anat-013` — Cornetos (Turbinatos) Nasais
- `rino-anat-015` — Valva Nasal Externa
- `rino-anat-016` — Mecanismos de Suporte da Ponta Nasal

- [ ] **Step 1: Inventário assets**

Run:
```bash
ls assets/images/rinoplastia/
```
Identificar filenames candidatos (`piramide`, `keystone`, `scroll`, `ligamentos`, `inervacao`, `musculatura`, `cornetos`, `valva-externa`, `ponta-nasal`).

- [ ] **Step 2: Para cada card, workflow inline**

Repetir (Read asset → criar library entry → referenciar no card). Se miss, rodar `extract_figures.py` no capítulo Neligan 18 (Rhinoplasty). Conceitos abstratos sem figura (ex: "Mecanismos de Suporte da Ponta") podem recorrer a `generate_diagrams.py` ou ficar débito.

- [ ] **Step 3: Validar + commit**

Run:
```bash
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d "content/cards/estetica-facial/rinoplastia/anatomia.json"
python tools/lint_acronyms.py content/cards/estetica-facial/rinoplastia/
git add content/cards/estetica-facial/rinoplastia/anatomia.json content/images/rinoplastia/
git commit -m "feat(cards): rinoplastia image refs (10 cards pending zerados)"
```

---

### Task 9: blefaroplastia — 15 cards via Haiku subagent

**Files:**
- Modify: `content/cards/estetica-facial/blefaroplastia/anatomia.json`
- Create: até 15 entries em `content/images/blefaroplastia/`

Subjects pendentes: 15 cards listados em `_pending_images.md` seção Blefaroplastia.

- [ ] **Step 1: Inventário pré-subagent**

Antes de dispatch, o orquestrador Opus deve:
1. `ls assets/images/blefaroplastia/` — 47 assets disponíveis
2. Para cada um dos 15 cards pending, propor best-match asset filename
3. Montar tabela explícita card → asset filename → library entry slug

- [ ] **Step 2: Dispatch Haiku subagent**

Invocar `Agent` com:
- `subagent_type: general-purpose`
- `model: haiku`
- Prompt contendo:
  * Schema completo da library entry
  * Tabela card → asset → slug (fechada pelo Opus no Step 1)
  * Regra de acrônimos: `ROOF` expande para "Retro-Orbicularis Oculi Fat", `ORL` para "Ligamento de Retenção Orbicular", `SOOF` para "Suborbicularis Oculi Fat", `SMAS` para "Sistema Musculoaponeurótico Superficial" — cada um na primeira ocorrência POR CAMPO
  * Regra de Portuguese: preservar diacríticos em texto (pálpebra, músculo, órbita); manter termos técnicos em inglês sem acento (Whitnall, Müller é exceção com trema, ORL, SOOF, ROOF)
  * Output esperado: 15 library entry JSONs + anatomia.json modificado com os 15 refs
  * Verificação obrigatória pelo subagent: `Read` em cada asset ANTES de escrever labels
  * Ao fim: rodar ajv validate e lint_acronyms, retornar ambos resultados

- [ ] **Step 3: Verificar output do subagent**

Após retorno:
```bash
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d "content/cards/estetica-facial/blefaroplastia/anatomia.json"
python tools/lint_acronyms.py content/cards/estetica-facial/blefaroplastia/
```
Expected: ambos clean. Se warnings, fixar inline (não redispatch).

- [ ] **Step 4: Commit**

```bash
git add content/cards/estetica-facial/blefaroplastia/anatomia.json content/images/blefaroplastia/
git commit -m "feat(cards): blefaroplastia image refs (15 cards pending zerados via Haiku)"
```

---

### Task 10: Chore + abrir PR 5B

- [ ] **Step 1: Regenerar manifests**

Run:
```bash
python tools/build_image_manifest.py
node tools/report_pending_images.mjs
```
Expected: pending reduzido de 25 para ~0 (ou próximo disso dependendo do débito residual).

- [ ] **Step 2: Bump SW cache**

Edit em `webapp/library/sw.js` linha 1:
```js
const CACHE_NAME = 'briefing-preop-v22';
```

- [ ] **Step 3: Smoke test**

Run:
```bash
npx tools/validate_briefings.mjs
```
Expected: briefings rinoplastia + blefaroplastia renderizam sem 404.

- [ ] **Step 4: Commit chore**

```bash
git add content/images/manifest.json content/cards/_pending_images.md webapp/library/sw.js
git commit -m "chore(sw,docs): bump SW cache v21->v22 + regen manifest (phase 5B)"
```

- [ ] **Step 5: Push + abrir PR**

```bash
git push -u origin feature/card-uniformity-phase-5b-face
gh pr create --title "feat(cards): phase 5B pending images — estetica-facial (25 cards)" --body "$(cat <<'EOF'
## Summary
- Popula `images[]` dos 25 anatomy cards pendentes em estetica-facial (rinoplastia 10 + blefaroplastia 15)
- Blefaroplastia migrada via Haiku subagent com tabela card->asset predefinida
- Bump SW cache v21 -> v22

## Test plan
- [ ] ajv valida os 2 anatomia.json tocados
- [ ] lint_acronyms clean (inclui ROOF, SOOF, ORL, SMAS expandidos por campo)
- [ ] report_pending_images mostra 25 -> ~0
- [ ] validate_briefings sem 404

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Code review + merge**

Rodar `/code-review:code-review`. Após aprovação:
```bash
gh pr merge <N> --merge --delete-branch
```

---

### Task 11: Cleanup + memory update

- [ ] **Step 1: Remover worktree**

Run:
```bash
cd c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git worktree remove .worktrees/phase-5b-face
git branch -d feature/card-uniformity-phase-5b-face
git pull origin master
```

- [ ] **Step 2: Criar memória de conclusão**

Write em `C:/Users/absay/.claude/projects/c--Users-absay-Documents-Biblioteca-CirurgiaPlastica/memory/project_phase5_done.md`:
```markdown
---
name: Phase 5 pending images CONCLUIDA
description: 36 anatomy cards pending images zerados em 2 PRs (5A contorno + 5B face) em 2026-04-17
type: project
---
Phase 5 concluida em 2026-04-17.

**Why:** Zerar debito de 36 cards com images: [] deixados em Phase 4, para que todos os 65 anatomy cards v2 tenham figura associada.

**How to apply:**
- 2 PRs sequenciais: 5A contorno-corporal (11 cards) + 5B estetica-facial (25 cards).
- SW cache final: briefing-preop-v22.
- Padrao que funcionou: reuse de library entries ja existentes em contorno-pos-bariatrico (5 refs); Haiku subagent para blefaroplastia (15) com tabela predefinida pelo Opus; Opus inline para rinoplastia (10).
- Debito residual documentado em _pending_images.md caso Neligan nao tenha figura para algum conceito abstrato.
- Proximos passos: Phase 6 (migrar 6 temas pele-tumores para v2) ou Phase 7 (SVG custom para conceitos sem figura Neligan).
```

- [ ] **Step 3: Atualizar MEMORY.md index**

Edit em `C:/Users/absay/.claude/projects/c--Users-absay-Documents-Biblioteca-CirurgiaPlastica/memory/MEMORY.md`, seção "## Projeto v2", adicionar após a linha de Phase 4:
```markdown
- [Phase 5 pending images CONCLUIDA](project_phase5_done.md) — 2026-04-17 PRs 5A+5B mergeados; 36 cards zerados; SW v22
```

---

## Ferramentas reutilizadas (referência rápida)

- `tools/audit_images.py` — regra #8 CLAUDE.md, antes de adicionar imagem
- `tools/extract_figures.py` — extração básica do Neligan por capítulo
- `tools/extract_labeled_figures.py` — extração com preservação de labels originais
- `tools/generate_diagrams.py` — SVG custom para conceitos sem figura fotográfica
- `tools/build_image_manifest.py` — regenera `content/images/manifest.json`
- `tools/report_pending_images.mjs` — regenera `content/cards/_pending_images.md`
- `tools/lint_acronyms.py` — valida expansão de siglas por campo; ALLOWED = {PRS, ASJ, CPS, RBCP, JPRAS, RCT, SBCP, V1, V2}
- `tools/validate_briefings.mjs` — Playwright smoke test, força `eager` loading

## Regras transversais (não esquecer)

1. Sempre `Read` na imagem antes de escrever labels (feedback_verify_image_content_before_mapping)
2. Nomes de arquivo ASCII sem acentos (feedback_image_filenames_no_accents)
3. Siglas ROOF, SOOF, ORL, SMAS, CLS expandem na primeira ocorrência POR CAMPO
4. Preservar diacríticos nos textos em português
5. Uma figura, um arquivo — rodar `audit_images.py` antes de adicionar (CLAUDE.md regra 8)
6. Nunca apagar conteúdo existente ao atualizar (CLAUDE.md regra 1)

## Execution Handoff

Plano salvo em `docs/superpowers/plans/2026-04-17-card-uniformity-phase-5.md`. Opções de execução:

**1. Subagent-Driven (recomendado)** — fresh subagent por task, review entre tasks
**2. Inline Execution** — tudo nesta sessão via executing-plans com checkpoints

Preferência: **inline**, já que Phase 4 foi executada com sucesso inline (Opus para o grosso + dispatch Haiku pontual só para lotes ≥15). Subagent dispatch por task inteira seria overhead para tasks de 2-3 cards.
