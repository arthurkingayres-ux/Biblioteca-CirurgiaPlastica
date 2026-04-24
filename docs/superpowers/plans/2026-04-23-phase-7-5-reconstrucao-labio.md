# Plan — Phase 7.5: Reconstrução de Lábio

**Spec:** `docs/superpowers/specs/2026-04-23-phase-7-5-reconstrucao-labio-design.md`
**Branch:** `feature/phase-7-5-reconstrucao-labio`
**PR alvo:** #29
**Worktree:** `.worktrees/phase-7-5-reconstrucao-labio`

Execução segue exatamente o pipeline de 5 etapas de Phase 7.4 (`docs/superpowers/plans/2026-04-18-phase-7-4-reconstrucao-nariz.md`). Este plano registra apenas os deltas.

---

## Sequência

### 1. Render (controller — script de Phase 7.3)

- `python tools/render_pdf_pages.py --book kaufman --chapter 6 --out tools/_cache/kaufman_cap6/`
- `python tools/render_pdf_pages.py --book neligan_vol3 --pages <range-labio> --out tools/_cache/neligan_vol3_labio/`
- Verificar offset PDF (Read visual nas páginas inicial/final) antes de despachar autor.
- Se soma > 150 páginas → split em 2 passes.
- Cache gitignored.

### 2. Subagente Opus A — autor RAG

- Input: páginas renderizadas + `content/rag/_template.md` + `_principios-reconstrucao.md` + `_atlas-retalhos.md` + spec desta fase.
- Regras idênticas a Phase 7.4 §3.2.
- Output: `content/rag/reconstrucao-facial/reconstrucao-de-labio.md` com `[Imagem: labio-<slug>.png]` inline.
- Commit: `feat(rag): Phase 7.5 reconstrucao de labio`.

### 3. Subagente Opus B — harvest

- Input: whitelist `[Imagem:]` extraída do RAG da etapa 2.
- Copia página inteira, espelha no webapp, cria manifest light por figura, faz append global.
- Commit: `feat(images): harvest figuras de reconstrucao-de-labio`.

### 4. Subagente Sonnet C — cards

- Input: RAG da etapa 2 + `content/cards/_structure.json` + `content/cards/schema.json` + exemplar de formato `content/cards/reconstrucao-facial/reconstrucao-de-nariz/`.
- Output: 6 JSONs em `content/cards/reconstrucao-facial/reconstrucao-de-labio/`, **todos text-only** (zero `images`).
- Append entry `reconstrucao-facial/reconstrucao-de-labio` em `content/cards/manifest.json` com status `complete`.
- Commit: `feat(cards): Phase 7.5 reconstrucao de labio (6 JSONs text-only)`.

### 5. Rebuild do índice

- `node tools/build_rag_index.js` → rag-index.json regenerado (LF enforced pela Phase 7.3).
- Verificar no log: `reconstrucao-facial/reconstrucao-de-labio: N chunks` com N ≥ 5.
- Commit: `chore(rag-index): rebuild after Phase 7.5`.

### 6. Validação + review + PR

- Validators: `validate_briefings.mjs`, `validate_anatomy_opener.mjs`, `validate_anatomy_image_purge.mjs`.
- Smoke Playwright standalone (iPhone viewport): abrir briefing `reconstrucao-de-labio`.
- `/code-review-board` → relatório em `docs/reviews/PR-29-<data>.md`.
- Endereçar achados críticos/altos antes do PR.
- `superpowers:finishing-a-development-branch` → PR #29 `Phase 7.5: Reconstrucao de Labio`.
- Atualizar roadmap umbrella com 7.5 concluída no merge.
- Cleanup local de `tools/_cache/`.

---

## Commits esperados (em ordem)

1. `docs(spec+plan): Phase 7.5 reconstrucao de labio`
2. `docs(roadmap): Phase 7.5 em execucao (lip wave 1.2)`
3. `feat(rag): Phase 7.5 reconstrucao de labio`
4. `feat(images): harvest figuras de reconstrucao-de-labio`
5. `feat(cards): Phase 7.5 reconstrucao de labio (6 JSONs text-only)`
6. `chore(rag-index): rebuild after Phase 7.5`
7. (opcional) `fix(...): response to code-review-board findings`

---

## Checkpoints humanos

- Após etapa 2 (RAG escrito): Dr. Arthur pode querer revisar antes de harvest+cards (opcional; se descartado, segue autônomo).
- Após etapa 6 (pronto para PR): Dr. Arthur revisa o relatório do code-review-board antes de mergear.
