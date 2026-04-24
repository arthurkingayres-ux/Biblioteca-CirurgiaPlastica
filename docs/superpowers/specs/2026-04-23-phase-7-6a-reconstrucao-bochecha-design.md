# Spec — Phase 7.6a: Reconstrução de Bochecha (Wave 2, sub-unit 1)

**Data:** 2026-04-23
**Status:** Aprovado pelo Dr. Arthur em 2026-04-23 (plan mode)
**Fase:** 7.6a

---

## 1. Contexto

Phase 7.5 (merge `6af38ad`) fechou Onda 1 (nariz + lábio) da área `reconstrucao-facial/`. A Onda 2 — bochecha + pálpebra + orelha + fronte/têmpora — foi escopada como **4 fases sequenciais** (7.6a → 7.6d), uma sub-unidade por fase, mantendo o blast radius baixo e o ritmo de review-board de 7.4/7.5. Esta é a primeira das quatro: **bochecha**.

---

## 2. Delta único vs Phase 7.5

Clone fiel do pipeline 7.5. Única diferença: fontes.

| Item | 7.5 (lábio) | 7.6a (bochecha) |
|---|---|---|
| Spine | Kaufman Cap. 6 "Lip" | Kaufman Cap. 3 "Cheek Reconstruction" (p. 39–64, ~26pp) |
| Complemento | Neligan Vol. 3 Ch 11 (Pribaz & Buller) | Neligan Vol. 3 — Ch 10 "Local flaps for facial coverage" (validar via probe de TOC) e/ou trechos cheek-específicos |
| Slug | `reconstrucao-de-labio` | `reconstrucao-de-bochecha` |
| Técnicas esperadas | Abbe, Estlander, Karapandzic, Gillies, Bernard-Burow | cervicofacial advancement, Mustardé cheek rotation, rombóide zygomatic, ilha V-Y malar, interpolation cheek-to-nose, bilobed lateral |

Kaufman TOC confirmado via probe do TOC (pp xv–xvi): Cap. 3 **Cheek Reconstruction** (p. 39), Cap. 4 Forehead + Temple (65), Cap. 7 Ear (~205), Cap. 8 Eyelid (~247).

Doutrina inalterada: cards text-only, harvest de página inteira, sem overlays, sem curadoria visual.

---

## 3. Escopo

### 3.1 Dentro
- Render Kaufman Cap. 3 + capítulo(s) relevante(s) de Neligan Vol. 3 via `tools/render_pdf_pages.py`
- `content/rag/reconstrucao-facial/reconstrucao-de-bochecha.md` (Kaufman spine, Neligan complemento, cita horizontais)
- 6 cards text-only em `content/cards/reconstrucao-facial/reconstrucao-de-bochecha/` (sem campo `images`)
- Harvest 10–15 figuras → `assets/images/reconstrucao-de-bochecha/` + mirror `webapp/library/` + manifest light
- Append em `content/cards/manifest.json` + `content/images/manifest.json`
- Regenerar `webapp/library/rag-index.json`
- **SW bump v29 → v30** (aprendido do blocker recorrente de 7.4/7.5)

### 3.2 Fora
- Campo `images` em cards; overlays numéricos
- CSS/HTML/JS changes (só rag-index.json e PNGs mirror no webapp/library/)
- Demais sub-units da Onda 2 (pálpebra/orelha/fronte)
- Arquivamento de `pele-tumores/`

---

## 4. Arquitetura

Idêntica a Phase 7.5. Pipeline de 5 etapas (render → RAG → harvest → cards → controller), detalhado em `docs/superpowers/specs/2026-04-23-phase-7-5-reconstrucao-labio-design.md` §3.

---

## 5. Estimativa

| Item | Quantidade | Nota |
|---|---|---|
| Páginas Kaufman Cap. 3 | ~26 | p. 39–64, PDF idx ≈ 52–77 (offset ~13) |
| Páginas Neligan Vol. 3 cheek | ~20–30 | Ch 10 provável, confirmar via probe |
| Total vision budget | ~46–56 | Dentro do guarda-chuva |
| Execução autônoma estimada | 1 sessão | |

---

## 6. Verificação

### 6.1 Automatizada
- `node tools/validate_briefings.mjs` → ALL PASS (tema novo)
- `node tools/validate_anatomy_opener.mjs` → OK
- `node tools/validate_anatomy_image_purge.mjs` → 8/8 PASS (tema novo fora da purge)
- `node tools/build_rag_index.js` → `reconstrucao-facial/reconstrucao-de-bochecha: N chunks` com N ≥ 5

### 6.2 Editorial
- Dr. Arthur lê o relatório do code-review-board antes do merge.

---

## 7. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Kaufman cheek (~26pp) pode resultar em RAG abaixo do alvo | Puxar Neligan Vol. 3 Ch 10 mais agressivamente; fallback a Vol. 2 aesthetic se insuficiente |
| Neligan Vol. 3 talvez não dedique capítulo único a cheek | Probe TOC em execução; subagente A consome múltiplos capítulos se necessário |
| Sobreposição entre cervicofacial, Mustardé e retalhos regionais do lábio/temporal | Autor cross-referencia `_atlas-retalhos.md` em vez de duplicar |
| Review-board SW blocker crônico | Bump SW no mesmo diff, commit dedicado pré-CRB |

---

## 8. Arquivos críticos

### 8.1 Criados
- `content/rag/reconstrucao-facial/reconstrucao-de-bochecha.md`
- `content/cards/reconstrucao-facial/reconstrucao-de-bochecha/{_meta,anatomia,tecnicas,decisoes,notas,flashcards}.json`
- `content/images/reconstrucao-de-bochecha/*.json` × N
- `assets/images/reconstrucao-de-bochecha/*.png` × N
- `webapp/library/assets/images/reconstrucao-de-bochecha/*.png` × N (mirror)

### 8.2 Modificados
- `content/cards/manifest.json`
- `content/images/manifest.json`
- `webapp/library/rag-index.json`
- `webapp/library/sw.js` (v29 → v30)
- `docs/superpowers/plans/2026-04-18-phase-7-reconstrucao-facial-roadmap.md`

### 8.3 Não tocados
- Demais sub-units (pálpebra/orelha/fronte)
- `pele-tumores/`
- `preop.js`, `renderer.js`, `style.css`, `index.html`

---

## 9. Referências

- Spec autoritativa anterior (doutrina + pipeline): `docs/superpowers/specs/2026-04-23-phase-7-5-reconstrucao-labio-design.md`
- Plano anterior: `docs/superpowers/plans/2026-04-23-phase-7-5-reconstrucao-labio.md`
- Spec guarda-chuva: `docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md`
- Roadmap: `docs/superpowers/plans/2026-04-18-phase-7-reconstrucao-facial-roadmap.md`
- Horizontais: `content/rag/reconstrucao-facial/{_principios-reconstrucao,_atlas-retalhos}.md`
- Exemplar card pack (só formato): `content/cards/reconstrucao-facial/reconstrucao-de-labio/`
- Utilitário: `tools/render_pdf_pages.py`
