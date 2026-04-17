# Card Uniformity Fase 3 — Piloto Abdominoplastia (Design)

**Data:** 2026-04-17
**Estado:** Aprovado, pronto para `writing-plans`
**Plano pai:** `docs/superpowers/plans/2026-04-16-card-uniformity-anatomy-pilot.md`

---

## Contexto

Fases 0-2 do plano card-uniformity mergeadas em master em 2026-04-16 (`f3612f7`). Entregas:

- **Fase 0:** image library schema, `build_image_manifest.py`, `lint_acronyms.py`, 7 pytest tests.
- **Fase 1:** `schema.json` anatomy `oneOf: [legacy, v2]`, 4 node schema tests.
- **Fase 2:** renderer.js v1/v2 branch, CSS primitives (`.lead-line`, `.chip`, `.hook-box`, `.struct-table`, `.fig-legend`), sw cache v17→v18, 8/8 Playwright.

Fase 3 (piloto abdominoplastia anatomia end-to-end) pendente. Memória sinalizou dois itens não-bloqueantes antes do piloto:

1. `content/cards/_structure.json` bloco `anatomy` com `purpose` e `required_fields` ainda descrevendo fields legacy, enquanto `example` já é v2. Fonte de confusão para quem lê o estrutura oficial.
2. `tools/validate_briefings.mjs` não detecta `.card-figure.placeholder` no DOM — refs quebradas da v2 renderizam "Imagem pendente" sem falhar o validador, risco silencioso na migração.

Inspeção do PDF Neligan vol. 2 (PyMuPDF TOC + grep de `Fig. 27.X`) confirmou que **abdominoplastia é capítulo 27 (Alan Matarasso)**, PDF páginas **930-972** (impressas 732-774). O plano original grafou "chapter 98" — errata; citações inline dos cards (cap. 27) estão corretas.

## Objetivo

Executar Fase 3 do plano card-uniformity, precedida por um PR de tooling/hardening que:

- Resolve os dois itens não-bloqueantes acima.
- Introduz o pipeline de anotação de callouts via Haiku subagent + PIL (decisão da memória `project_card_uniformity_phases_0_2_done.md`).

## Abordagem

Dois PRs sequenciais:

- **PR #1 — Tooling hardening.** Landa isolado, verificável por pytest + `validate_briefings.mjs` contra estado atual. Zero conteúdo de cards muda.
- **PR #2 — Piloto abdominoplastia.** Usa tooling já mergeado. Executa Tasks 3.2-3.9 do plano pai, adaptadas (cap. 27 correto, anotação via Haiku+PIL).

Padrão idêntico ao usado nas Fases 0-2 (separação infra vs conteúdo).

---

## PR #1 — Tooling hardening

### Componentes

#### `tools/annotate_figure.py` (novo)

CLI:

```
python tools/annotate_figure.py \
  --image X.png \
  --coords coords.json \
  --out Y.png \
  [--radius 18] [--stroke 1.5] [--font-size 16]
```

`coords.json` = `[{ "num": int, "x": float 0-1, "y": float 0-1 }, ...]`.

Implementação: Pillow. Círculo preto filled (radius px), stroke branco, número branco centralizado (DejaVu Sans Bold embutido do Pillow; fallback `load_default()`). Clampa coords fora de `[0,1]` + emite warning. Suporta PNG e JPG.

#### `tools/tests/test_annotate_figure.py` (novo)

Três casos via `pytest.tmp_path`:

1. `coords.json` vazio → no-op (imagem saída idêntica à entrada).
2. Uma coord central em imagem 200×200 branca → pixel central `≈ (0,0,0)`.
3. Coord `(1.5, -0.2)` → clampa a `(1.0, 0.0)`, emite warning.

#### `content/cards/_structure.json` — bloco `anatomy`

- `purpose`: `"1 card por estrutura anatômica — one-liner clínico, tabela de estruturas, hook cirúrgico"`
- `required_fields`: `["id", "type", "title", "topic", "area", "one_liner", "structures", "clinical_hook"]`
- `example`: **sem mudança** (já v2).

#### `tools/validate_briefings.mjs`

- `TOPICS` recebe `'abdominoplastia'`.
- Novo `const EXPECTED_IMAGE_COUNTS = { ..., abdominoplastia: null }` (null = sem soft-gate até PR #2 flipar para 6).
- No `page.evaluate`: coletar `placeholders = document.querySelectorAll('.card-figure.placeholder').length`.
- Verdict: incluir `r.placeholders === 0` no `pass`.
- Soft warning: `EXPECTED_IMAGE_COUNTS[t] !== null && r.total !== expected` → `console.log('  WARN expected X, got Y')`, não afeta `ok`.

### Verificação PR #1

- `python -m pytest tools/tests -v` → ≥10 PASS.
- `node tools/validate_briefings.mjs --theme=light` → 5 tópicos PASS, zero placeholders, zero WARN.

---

## PR #2 — Piloto abdominoplastia

### Fluxo

1. **Extração:** `python tools/extract_figures.py --pdf "Neligan vol2" --topic abdominoplastia --pages 930-972`.
2. **Seleção manual:** escolher 6 figuras (Huger, camadas, umbigo, Scarpa+linfáticos, unidades estéticas, perfuradores laterais). Copiar para `assets/images/abdominoplastia/` com filenames ASCII.
3. **Anotação:** para cada figura — dispachar `Agent(subagent_type=general-purpose, model=haiku)` com imagem + lista de estruturas-alvo. Colher `coords.json`. Rodar `annotate_figure.py`. Se visual errado, editar JSON manualmente e re-rodar (não re-dispachar Haiku).
4. **Library entries:** 6 arquivos JSON em `content/images/abdominoplastia/` conforme plano pai (linhas 1516-1683). Validar com `npx ajv`.
5. **Manifest:** `python tools/build_image_manifest.py` regenera.
6. **Cards:** reescrever `anatomia.json` em v2 (6 cards, plano pai linhas 1715-1872). Validar schema + `lint_acronyms.py`.
7. **Gate update:** mudar `abdominoplastia: null` → `abdominoplastia: 6` em `validate_briefings.mjs` (commit separado).
8. **Playwright:** `validate_briefings.mjs --theme=both` → 10 PASS, zero placeholders, zero WARN.
9. **Orphan cleanup:** `audit_images.py --topic abdominoplastia` identifica órfãos, `git rm`, re-rodar validator.

### Verificação end-to-end PR #2

- `python -m pytest tools/tests -v` → ≥10 PASS.
- `node --test tools/tests/test_schema_anatomy.mjs` → 4 PASS.
- `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false --spec=draft2020` → tudo valid.
- `node tools/validate_briefings.mjs --theme=both` → 10 PASS, zero placeholders, zero WARN.
- Smoke iPhone viewport: `abdo-anat-002 Zonas de Huger` com lead-line + struct-table + hook-box + 2 imagens numeradas; DIEA/SIEA/SCIA expandidos; offline funciona.

---

## Data flow

```
PDF Neligan cap.27 → extract_figures.py → .tmp/figures/
  → [seleção] → assets/images/abdominoplastia/*.png
  → [Haiku via Agent] → coords JSON → annotate_figure.py (sobrescreve)
  → content/images/abdominoplastia/*.json (library entries)
  → build_image_manifest.py → content/images/manifest.json
  → content/cards/.../anatomia.json (v2)
  → renderer.js v2 → PWA briefing
  → validate_briefings.mjs (Playwright gate)
```

## Error handling

- **Haiku coord fora de [0,1]:** `annotate_figure.py` clampa + warn.
- **Haiku estrutura errada:** screenshot Playwright expõe; correção manual do JSON + re-run `annotate_figure.py`.
- **Ref quebrada em card:** gate duro `placeholders === 0` falha o validator → PR não merge.
- **Órfão após cleanup:** `validate_briefings.mjs` pega imagem ausente (broken); restore ou ajuste de ref.

## Reuso

- `tools/extract_figures.py`, `tools/build_image_manifest.py`, `tools/lint_acronyms.py`, `tools/audit_images.py` (todos existem, Fase 0).
- `content/images/_schema.json` (Fase 0).
- `webapp/library/renderer.js` v2 branch (Fase 2).
- `content/cards/schema.json` anatomy `oneOf` (Fase 1).

## Out of scope

- Fase 4 (sweep dos outros 7 temas) — próximo sprint.
- Fase 5 (remover legacy) — após Fase 4.
- CI automatizado — manual por enquanto.
- Suporte SVG no annotator — só PNG/JPG.
- Retry automático do Haiku — fallback é correção manual.
