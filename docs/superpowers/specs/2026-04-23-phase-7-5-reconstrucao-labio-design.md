# Spec — Phase 7.5: Reconstrução de Lábio (Wave 1, sub-unit 2)

**Data:** 2026-04-23
**Status:** Aprovado pelo Dr. Arthur em 2026-04-23
**Fase:** 7.5

---

## 1. Contexto

Phase 7.4 (PR #28, `fc57ab2`) entregou a primeira sub-unit da Onda 1 de `reconstrucao-facial/`: reconstrução de nariz. Ela consolidou o padrão operacional da área — pipeline de 5 etapas (render → RAG → harvest → cards → controller), cards text-only com harvest de página inteira e manifest light. Phase 7.5 aplica esse padrão ao lábio, fechando a Onda 1.

**Delta único vs Phase 7.4:** troca das fontes.

| Item | 7.4 (nariz) | 7.5 (lábio) |
| --- | --- | --- |
| Spine | Kaufman Cap. 5 (~70 pg) | Kaufman Cap. 6 (lip reconstruction) |
| Complemento | Neligan Vol. 3 capítulo nasal | Neligan Vol. 3 capítulo de reconstrução de lábio |
| Slug tema | `reconstrucao-de-nariz` | `reconstrucao-de-labio` |
| Técnicas esperadas | bilobed Zitelli, paramediano, melolabial, dorsal rotation, Rieger, island pedicle | avanço em V-Y, Abbe, Estlander, Karapandzic, Gillies fan, Bernard-Burow |

Nenhuma mudança de doutrina: harvest de página inteira, cards sem campo `images`, sem overlays, sem SW bump, sem mudança visual. Curadoria visual fica para pipeline futuro.

---

## 2. Escopo

### 2.1 Dentro

- Render Kaufman Cap. 6 + capítulo correspondente de Neligan Vol. 3 via `tools/render_pdf_pages.py`
- `content/rag/reconstrucao-facial/reconstrucao-de-labio.md` citando `_principios-reconstrucao.md` e `_atlas-retalhos.md` em vez de repetir doutrina
- Cards completos em `content/cards/reconstrucao-facial/reconstrucao-de-labio/`: `_meta`, `anatomia`, `tecnicas`, `decisoes`, `notas`, `flashcards` — **text-only**, sem campo `images`
- Harvest de figuras (página inteira → `assets/images/reconstrucao-de-labio/<slug>.png` + mirror) com manifest light por figura
- Nova entry em `content/cards/manifest.json` + append em `content/images/manifest.json`
- `webapp/library/rag-index.json` regenerado

### 2.2 Fora

- Campo `images` em qualquer card (doutrina Phase 7.2/7.4 preservada)
- Overlays numéricos e `labels[]` com x,y nas figuras
- SW bump, CSS, alterações em `preop.js`/`renderer.js`/`index.html`
- Demais sub-unidades da Onda 2 (bochecha, pálpebra, orelha, fronte/têmpora)
- Arquivamento de `pele-tumores/`

---

## 3. Arquitetura

Idêntica a Phase 7.4. **Referência autoritativa:**
`docs/superpowers/specs/2026-04-18-phase-7-4-reconstrucao-nariz-design.md` §3 (pipeline 5 etapas) e §9 (doutrina harvest).

Recapitulação curta:

1. **Render** — `tools/render_pdf_pages.py` → `tools/_cache/kaufman_cap6/` + `tools/_cache/neligan_vol3_labio/`. Cache gitignored.
2. **Subagente Opus A — autor RAG.** Kaufman como spine, Neligan complementar, cita horizontais, marca figuras com `[Imagem: labio-<slug>.png]` inline.
3. **Subagente Opus B — harvest.** Whitelist autoritativa = referências `[Imagem:]` extraídas do RAG. Copia PNG inteiro + mirror + manifest light + append manifest global.
4. **Subagente Sonnet C — derivação de cards.** Consome RAG + schema v2 + exemplar `reconstrucao-de-nariz/`. Produz 6 JSONs text-only.
5. **Controller (sessão de execução).** Coordena, commita em ordem (RAG → images → cards → index), roda validators, abre PR.

---

## 4. Estimativa

| Item | Quantidade | Nota |
|---|---|---|
| Páginas Kaufman Cap. 6 | ~50–80 | Verificar offset PDF antes de despachar autor |
| Páginas Neligan Vol. 3 lábio | ~30–50 | Capítulo de reconstrução labial |
| Total vision budget | ~80–130 | Dentro do guarda-chuva (100–150) |
| Execução autônoma estimada | 1–2 sessões | Split em 2 passes se total > 150 |

---

## 5. Verificação

### 5.1 Automatizada

- `node tools/validate_briefings.mjs` → ALL PASS (inclui novo tema)
- `node tools/validate_anatomy_opener.mjs` → OK
- `node tools/validate_anatomy_image_purge.mjs` → 8/8 PASS (tema novo fora da purge)
- Template conformance: h1=1, h2≥5, 4000–7000 palavras
- `node tools/build_rag_index.js` → log mostra `reconstrucao-facial/reconstrucao-de-labio: N chunks` com N ≥ 5

### 5.2 Manual

- Playwright standalone em viewport iPhone: abrir briefing de `reconstrucao-de-labio`; 6 seções renderizam; anatomia text-only + chapter-opener editorial (Phase 7.1) ativo
- Biblioteca de imagens inspecionada amostralmente em `assets/images/reconstrucao-de-labio/`

### 5.3 Editorial

- Dr. Arthur lê o RAG no PR antes do merge. Alterações re-disparam rebuild + validators.

---

## 6. Riscos e mitigações

Idênticos a Phase 7.4 §6. Específicos adicionais para lábio:

| Risco | Mitigação |
|---|---|
| Anatomia motora do orbicular dos lábios é densa; risco de RAG inchar além de 7000 palavras | Autor prioriza Kaufman spine; anatomia detalhada fica curta com ponteiro para `_principios-reconstrucao.md` |
| Técnicas comissurais (Estlander, Abbe, Karapandzic, Gillies fan) se sobrepõem semanticamente | Subagente A organiza como uma família em `Technical Steps`; cards separam em `technique` items distintos mesmo quando relacionados |
| Bernard-Burow e variantes podem ser descritas de forma inconsistente entre Kaufman e Neligan | Autor marca a divergência no RAG com citação inline de ambas as fontes; Dr. Arthur decide no review |

---

## 7. Arquivos críticos

### 7.1 Criados

- `content/rag/reconstrucao-facial/reconstrucao-de-labio.md`
- `content/cards/reconstrucao-facial/reconstrucao-de-labio/{_meta,anatomia,tecnicas,decisoes,notas,flashcards}.json`
- `content/images/reconstrucao-de-labio/<slug>.json` × N
- `assets/images/reconstrucao-de-labio/<slug>.png` × N
- `webapp/library/assets/images/reconstrucao-de-labio/<slug>.png` × N (mirror)

### 7.2 Modificados

- `content/cards/manifest.json` — adiciona `reconstrucao-facial/reconstrucao-de-labio` como `complete`
- `content/images/manifest.json` — append de entries novas
- `webapp/library/rag-index.json` — regenerado
- `docs/superpowers/plans/2026-04-18-phase-7-reconstrucao-facial-roadmap.md` — marca 7.5 como concluída no merge

### 7.3 Não tocados

- Demais sub-unidades em `reconstrucao-facial/`
- `pele-tumores/`
- `preop.js`, `renderer.js`, `style.css`, `sw.js`, `index.html`

---

## 8. Referências

- Spec da sub-unit anterior (autoritativa para doutrina): `docs/superpowers/specs/2026-04-18-phase-7-4-reconstrucao-nariz-design.md`
- Spec guarda-chuva: `docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md`
- Roadmap: `docs/superpowers/plans/2026-04-18-phase-7-reconstrucao-facial-roadmap.md`
- Horizontais: `content/rag/reconstrucao-facial/_principios-reconstrucao.md` + `_atlas-retalhos.md`
- Template RAG: `content/rag/_template.md`
- Schema cards: `content/cards/_structure.json` + `content/cards/schema.json`
- Exemplar card pack (só formato): `content/cards/reconstrucao-facial/reconstrucao-de-nariz/`
- Utilitário render: `tools/render_pdf_pages.py`
