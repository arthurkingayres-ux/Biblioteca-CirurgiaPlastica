# Plan — Phase 7.6a: Reconstrução de Bochecha

**Spec:** `docs/superpowers/specs/2026-04-23-phase-7-6a-reconstrucao-bochecha-design.md`
**Branch:** `feature/phase-7-6a-reconstrucao-bochecha`
**Worktree:** `.worktrees/phase-7-6a-reconstrucao-bochecha`

Execução segue o pipeline de 7.5 (`docs/superpowers/plans/2026-04-23-phase-7-5-reconstrucao-labio.md`). Este plano registra apenas os deltas.

---

## Sequência

### 1. Render (controller)

- Probe TOC Neligan Vol. 3 (idx 4–12) para localizar capítulo que cobre cheek/face lateral (provável Ch 10 Local flaps; validar).
- Probe Kaufman Cap. 3 start (idx ~52) + Cap. 4 start (idx ~78) para delimitar Cap. 3.
- `python tools/render_pdf_pages.py --pdf <Kaufman> --start <K_START> --end <K_END> --dpi 150 --output tools/_cache/kaufman_cap3/`
- `python tools/render_pdf_pages.py --pdf <Neligan vol3> --start <N_START> --end <N_END> --dpi 150 --output tools/_cache/neligan_vol3_bochecha/`
- Cache gitignored.

### 2. Subagente Opus A — autor RAG

- Input: páginas renderizadas + `content/rag/_template.md` + `_principios-reconstrucao.md` + `_atlas-retalhos.md` + spec desta fase + exemplar `reconstrucao-de-labio.md`.
- Regras idênticas a Phase 7.5 §2 (Kaufman spine, Neligan complementa, cita horizontais, 4000–7000 palavras, ≥15 cites Kaufman, ≥3 Neligan, ≥2 cada horizontal, 10–15 slugs `[Imagem: bochecha-<slug>.png]`).
- Output: `content/rag/reconstrucao-facial/reconstrucao-de-bochecha.md`.
- Commit: `feat(rag): Phase 7.6a reconstrucao de bochecha (Kaufman cap.3 + Neligan vol.3)`.

### 3. Subagente Opus B — harvest

- Input: whitelist `[Imagem:]` extraída do RAG.
- Copia página inteira → `assets/images/reconstrucao-de-bochecha/` + mirror `webapp/library/assets/images/...` + JSON per-file em `content/images/reconstrucao-de-bochecha/`.
- Regras: sem reuso (sha256 único), sem recorte, sem append no manifest global (controller faz).
- Commit: `feat(images): harvest figuras de reconstrucao-de-bochecha`.

### 4. Subagente Sonnet C — cards

- Input: RAG da etapa 2 + `content/cards/_structure.json` + `schema.json` + exemplar de formato `content/cards/reconstrucao-facial/reconstrucao-de-labio/`.
- Output: 6 JSONs em `content/cards/reconstrucao-facial/reconstrucao-de-bochecha/`, **text-only** (zero `images`), IDs `bochecha-anat-NNN`, etc.
- Append entry `reconstrucao-facial/reconstrucao-de-bochecha` em `content/cards/manifest.json` com status `complete`.
- Commit: `feat(cards): Phase 7.6a reconstrucao de bochecha (6 JSONs text-only)`.

### 5. Rebuild + SW bump

- `node tools/build_rag_index.js` → rag-index regenerado.
- Edit `webapp/library/sw.js`: `CACHE_NAME = 'briefing-preop-v30'` (v29 → v30).
- Commit: `chore(rag-index): rebuild after Phase 7.6a` (rag-index only).
- Commit: `fix(pwa): bump sw cache v29->v30 for Phase 7.6a rag-index + cheek assets` (sw.js only).

### 6. Validação + review + PR

- Validators: `validate_briefings.mjs`, `validate_anatomy_opener.mjs`, `validate_anatomy_image_purge.mjs` → ALL PASS.
- `/code-review-board` → relatório em `docs/reviews/BRANCH-feature-phase-7-6a-*.md`.
- Endereçar blockers. SW já bumpado, então blocker crônico evitado.
- `superpowers:finishing-a-development-branch` → Option 1 (merge local em master) ou Option 2 (PR) conforme Dr. Arthur.
- Atualizar roadmap umbrella com 7.6a concluída no merge.
- Cleanup local de `tools/_cache/`.

---

## Commits esperados (em ordem)

1. `docs(spec+plan): Phase 7.6a reconstrucao de bochecha`
2. `feat(rag): Phase 7.6a reconstrucao de bochecha (Kaufman cap.3 + Neligan vol.3)`
3. `feat(images): harvest figuras de reconstrucao-de-bochecha`
4. `feat(cards): Phase 7.6a reconstrucao de bochecha (6 JSONs text-only)`
5. `chore(rag-index): rebuild after Phase 7.6a`
6. `fix(pwa): bump sw cache v29->v30 for Phase 7.6a rag-index + cheek assets`
7. `docs(review): code-review-board report for Phase 7.6a branch` (após CRB)

---

## Checkpoints humanos

- Após etapa 2 (RAG escrito): Dr. Arthur pode revisar antes de harvest+cards (opcional; descartado = segue autônomo).
- Após etapa 6 (pronto para merge): Dr. Arthur revisa relatório do code-review-board antes de mergear.
