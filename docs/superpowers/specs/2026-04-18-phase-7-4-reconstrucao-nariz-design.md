# Spec — Phase 7.4: Reconstrução de Nariz (Wave 1, sub-unit 1)

**Data:** 2026-04-18
**Status:** Aprovado pelo Dr. Arthur em 2026-04-18
**Fase:** 7.4

---

## 1. Contexto

Phase 7.3 (PR #27, `9d3e45a`) entregou os 2 RAGs horizontais de `reconstrucao-facial/`: `_principios-reconstrucao.md` + `_atlas-retalhos.md`. A nova área está pronta para receber o primeiro sub-unit.

Escopo escolhido: **nariz primeiro, sequencial** (lábio vira plano separado após nariz mergear). Kaufman Cap. 5 é o capítulo mais denso do livro sobre retalhos nasais (bilobed de Zitelli, paramediano, melolabial para nariz, dorsal rotation, Rieger, island pedicle).

**Padrão novo capturado neste brainstorming, aplicável a todas as ondas futuras:**

- **Harvest de figuras** para a biblioteca de imagens durante o render das páginas
- **Cards e PWA permanecem text-only** — campo `images` vazio nos cards, sem overlays
- Manifest light por figura: `file + caption + credit` (sem `labels[]` com x,y; deferido ao pipeline curado futuro)
- Quando o pipeline curado maduro acontecer, as imagens já estarão na biblioteca — basta adicionar `images` nos cards e overlays

Essa é uma extensão explícita da doutrina Phase 7.2 à área nova: imagens só entram no PWA via pipeline curado com revisão visual. Até lá, a biblioteca acumula matéria-prima pronta.

---

## 2. Escopo

### 2.1 Dentro

- Render Kaufman Cap. 5 + capítulo correspondente de Neligan Vol. 3 sobre reconstrução nasal via `tools/render_pdf_pages.py`
- `content/rag/reconstrucao-facial/reconstrucao-de-nariz.md` — RAG unificado que cita `_principios-reconstrucao.md` e `_atlas-retalhos.md` em vez de repetir doutrina
- Cards completos em `content/cards/reconstrucao-facial/reconstrucao-de-nariz/`: `_meta`, `anatomia`, `tecnicas`, `decisoes`, `notas`, `flashcards` (6 arquivos) — **todos text-only**, nenhum card com campo `images`
- Harvest de figuras:
  - PNGs de páginas figure-heavy copiados inteiros para `assets/images/reconstrucao-de-nariz/<slug>.png` + mirror em `webapp/library/assets/images/reconstrucao-de-nariz/`
  - `content/images/reconstrucao-de-nariz/<slug>.json` por figura (manifest light: `file`, `caption` em PT-BR citando fonte, `credit`)
- Nova entry em `content/cards/manifest.json` + append em `content/images/manifest.json`
- `webapp/library/rag-index.json` regenerado (BM25 absorve novo RAG)

### 2.2 Fora

- Lábio — próximo plano, só depois de nariz mergear
- Campo `images` em qualquer card (doutrina Phase 7.2 estendida)
- Overlays numéricos / `labels[]` com coordenadas x,y nas figuras (pipeline curado futuro)
- Mudança visual, SW bump, CSS — PR de conteúdo puro
- Outras sub-unidades (lábio, bochecha, pálpebra, orelha, fronte-e-têmpora, couro cabeludo, queixo)
- Arquivamento de `pele-tumores/` (fase de cleanup futura)

---

## 3. Arquitetura — pipeline de 5 etapas

### 3.1 Render

`tools/render_pdf_pages.py` (criado em Phase 7.3) rasteriza dois ranges:

- Kaufman Cap. 5 → `tools/_cache/kaufman_cap5/pNNN.png`
- Neligan Vol. 3 capítulo nasal → `tools/_cache/neligan_vol3_nariz/pNNN.png`

Cache `_cache/` é gitignored; scratch apagado na Task de cleanup do plano. Páginas de início e fim de cada capítulo verificadas com Read visual (como em Phase 7.3 Task 4).

### 3.2 Subagente Opus A — autoria do RAG

Vision nas páginas renderizadas, escreve `reconstrucao-de-nariz.md` seguindo `content/rag/_template.md`.

**Regras de composição:**

- **Kaufman é a spine narrativa** — estrutura do documento segue o capítulo 5
- **Neligan complementa onde agrega** — anatomia profunda, passos que Kaufman omite, variações
- **Cita os horizontais** — `_principios-reconstrucao.md` e `_atlas-retalhos.md` — em vez de repetir framework das 3 perguntas, RSTL, free margins, biologia de retalho
- **Marca figuras com `[Imagem: nariz-<slug>.png]` inline** onde quer que uma figura seja referenciada; o subagente B consumirá essa whitelist
- Português brasileiro, acentuação correta, siglas expandidas na primeira ocorrência por seção, citação inline de cada afirmação

### 3.3 Subagente Opus B — harvest de figuras

Recebe a lista de referências `[Imagem:]` que o autor deixou no RAG (whitelist explícita).

**Para cada slug:**

1. Identifica qual página renderizada (Kaufman ou Neligan) corresponde — usa vision + contexto textual do RAG
2. Copia o PNG inteiro da página para `assets/images/reconstrucao-de-nariz/<slug>.png`
3. Espelha em `webapp/library/assets/images/reconstrucao-de-nariz/<slug>.png`
4. Cria `content/images/reconstrucao-de-nariz/<slug>.json` com `file`, `caption` (PT-BR, cita fonte), `credit`
5. Faz append do registro em `content/images/manifest.json`

**Subagente B não tem liberdade de escolher figuras adicionais** — a whitelist é autoritativa.

### 3.4 Subagente Sonnet C — derivação de cards

Recebe o RAG + `content/cards/_structure.json` + `content/cards/schema.json` + exemplar de formato (ex: `content/cards/estetica-facial/rinoplastia/` — só formato, não conteúdo).

Produz os 6 JSONs: `_meta`, `anatomia`, `tecnicas`, `decisoes`, `notas`, `flashcards`.

**Regras:**

- Cards sem campo `images` (nenhum)
- Acentuação PT-BR
- Siglas expandidas na primeira ocorrência
- Cita fonte inline nos campos de texto livre
- Seguir exatamente o schema v2 existente (anatomia com `structures[]`, `clinical_hook`, etc.)

### 3.5 Controller

Controller = esta sessão. Coordena os 3 subagentes, registra tema no `content/cards/manifest.json` como `complete`, rebuild `rag-index.json`, commits sequenciais, executa validators, revisão, abre PR.

**Ordem de commits sugerida:**

1. Render cache (não commitado — gitignored)
2. RAG (`reconstrucao-de-nariz.md`)
3. Image harvest (assets + mirror + registros `content/images/...`)
4. `content/images/manifest.json` append
5. Cards (6 JSONs + tema no `content/cards/manifest.json`)
6. `rag-index.json` rebuild

---

## 4. Estimativa de esforço

| Item | Quantidade | Nota |
|---|---|---|
| Páginas Kaufman Cap. 5 | ~70 | p. 95-163 impressas, verificar offset PDF |
| Páginas Neligan Vol. 3 nariz | ~30-50 | Capítulo de reconstrução nasal |
| Total vision budget | ~100-120 | Dentro do budget da spec guarda-chuva (100-150) |
| Volume relativo a Phase 7.3 | ~4× | Phase 7.3 = 36 páginas; Phase 7.4 = ~120 |
| Execução autônoma estimada | 1-2 sessões | Split se vision budget >150 |

---

## 5. Verificação

### 5.1 Automatizada

- `node tools/validate_briefings.mjs` → ALL PASS (inclui novo tema na grade)
- `node tools/validate_anatomy_opener.mjs` → OK (sem regressão Phase 7.1)
- `node tools/validate_anatomy_image_purge.mjs` → 8/8 PASS (tema novo não entra na purge — escopo é outros 8)
- Template conformance: `h1=1` + `h2≥5` + palavras dentro do range (target 4000-7000 para sub-unit)
- `node tools/build_rag_index.js` → log mostra `reconstrucao-facial/reconstrucao-de-nariz: N chunks` (N ≥ 5)

### 5.2 Manual

- Smoke: abrir briefing de `reconstrucao-de-nariz` no PWA mobile viewport (iPhone size)
- 6 seções renderizam sem erro
- Anatomia text-only (sem figura) + chapter-opener editorial da Phase 7.1 ativo
- Tecnicas text-only (sem figura) — cards listam passos + indicação + complicações
- Biblioteca de imagens populada em `assets/images/reconstrucao-de-nariz/` (inspeção visual amostral)

### 5.3 Revisão editorial

- Dr. Arthur lê o RAG no PR antes do merge
- Se solicitar alterações: aplicar, re-rodar build do rag-index, re-verificar

---

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Vision budget explode (>150 páginas) | Render página-a-página antes de despachar autor; se total >150, split em 2 metades e autor faz 2 passes |
| Subagente confunde Kaufman (spine) com Neligan (complemento) → narrativa truncada ou duplicada | Prompt explícito: "Kaufman é o spine; cite Neligan apenas quando adicionar anatomia específica ou passo que Kaufman não cobre" |
| Cards parecem "vazios" sem imagens | Aceito pela doutrina atual; quando pipeline curado wire os overlays, as figuras já estarão catalogadas |
| Subagente B copia páginas redundantes ou figuras fora da whitelist | Subagente B recebe APENAS a lista `[Imagem:]` extraída do RAG; sem liberdade criativa |
| Harvest captura páginas inteiras em vez de figuras recortadas | Aceito por design (manifest light); recorte cirúrgico é responsabilidade do pipeline curado futuro |
| Schema v2 não acomoda particularidade de reconstrução de nariz | Detectado durante derivação de cards; se surgir, plano ganha task de extensão de schema antes de escalar |
| Neligan Vol. 3 capítulo nasal pode ser grande/texto-pesado vs imagens | Priorizar Kaufman; se Neligan vira >50 pg, rendere apenas páginas de anatomia vascular + anexo de técnicas ausentes em Kaufman |

---

## 7. Arquivos críticos

### 7.1 Criados

- `content/rag/reconstrucao-facial/reconstrucao-de-nariz.md`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/_meta.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/anatomia.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/tecnicas.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/decisoes.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/notas.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/flashcards.json`
- `content/images/reconstrucao-de-nariz/<slug>.json` × N (uma por figura harvested)
- `assets/images/reconstrucao-de-nariz/<slug>.png` × N
- `webapp/library/assets/images/reconstrucao-de-nariz/<slug>.png` × N (mirror)

### 7.2 Modificados

- `content/cards/manifest.json` — adiciona `reconstrucao-facial/reconstrucao-de-nariz` com status `complete`
- `content/images/manifest.json` — append de entries novas
- `webapp/library/rag-index.json` — regenerado

### 7.3 Não tocados

- Demais sub-unidades em `reconstrucao-facial/`
- Área `pele-tumores/` (arquivamento ocorre em cleanup final, fase futura)
- `preop.js`, `renderer.js`, `style.css`, `sw.js`, `index.html`

---

## 8. Numeração

Este trabalho é **Phase 7.4** — renumerado porque Phase 7.2 (image purge) e Phase 7.3 (horizontais Kaufman) consumiram os slots 7.2–7.3 antes desta sub-unit. Próximas fases (lábio, bochecha etc.) recebem 7.5+ em ordem.

---

## 9. Doutrina capturada — aplicável a todas as ondas futuras

A partir desta fase, **o padrão de harvest + PWA text-only é o default** para toda nova área de conteúdo:

1. Render páginas relevantes dos livros-texto em cache scratch
2. Autor de RAG lê, escreve, marca figuras que quer destacar via `[Imagem: ...]`
3. Harvest copia páginas inteiras (manifest light) para a biblioteca de imagens
4. Cards derivados permanecem text-only
5. Pipeline curado futuro fará recorte cirúrgico + overlays + wiring de `images` nos cards, consumindo a biblioteca já pronta

Isso separa **acúmulo de matéria-prima** (barato, reprodutível, livre de decisões editoriais finas) de **curadoria visual** (caro, requer revisão estruturada com Dr. Arthur).

---

## 10. Referências

- Spec guarda-chuva: `docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md` (seção 6.1 pipeline por tema, seção 6.2 ondas)
- Horizontais entregues: `content/rag/reconstrucao-facial/_principios-reconstrucao.md` + `_atlas-retalhos.md`
- Template RAG: `content/rag/_template.md`
- Schema cards: `content/cards/_structure.json` + `content/cards/schema.json`
- Exemplar card pack (só formato): `content/cards/estetica-facial/rinoplastia/`
- Utilitário render: `tools/render_pdf_pages.py` (Phase 7.3)
- Utilitário index: `tools/build_rag_index.js` (patched em Phase 7.3)
