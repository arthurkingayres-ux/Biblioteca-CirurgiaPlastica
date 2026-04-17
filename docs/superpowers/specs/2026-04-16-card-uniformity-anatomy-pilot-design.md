# Atlas — Uniformidade de Cards (Piloto Anatomy)

**Data:** 2026-04-16
**Escopo:** Piloto — tipo `anatomy` apenas; tema `abdominoplastia` primeiro.

---

## Context

Os cards atômicos do PWA consumidos pelo Dr. Arthur apresentam **não-uniformidade estrutural**: o mesmo `type: anatomy` contém desde fichas escaneáveis em 5 s (ex: `blef-anat-001 Pele Palpebral`) até blocos de prose de 130 palavras com enumerações embutidas (ex: `abdo-anat-002 Zonas de Huger`). A causa raiz é o schema JSON — o campo `definition: string` aceita qualquer comprimento e não há sub-campos atômicos para casos recorrentes (enumerações, números-chave, gancho clínico).

O objetivo é uniformizar a gramática textual e visual dos cards sem perder densidade pedagógica, inspirado no padrão editorial de theplasticsfella (ver `reference_plasticsfella_eyelid.md` na memória). A mudança é apenas nos **cards** — o RAG permanece narrativo.

**Resultado esperado:** um card de anatomia sempre entrega, em ordem canônica, lead line + números-chave + estruturas + relações + gancho clínico + imagem anotada, com caps de tamanho enforced via schema e validação editorial em CI.

---

## Decisões de design (fechadas na brainstorming)

1. **Abordagem textual:** schema atômico refatorado (Abordagem B).
2. **Gramática visual:** 1 imagem por card com callouts numerados + legenda estruturada (Abordagem B).
3. **Biblioteca de imagens:** híbrida — 1 arquivo JSON por imagem em `content/images/<tema>/<image-id>.json` + `content/images/manifest.json` gerado por tool.
4. **RAG:** permanece narrativo (só cards mudam).
5. **Anotação numerada no piloto:** manual-baked. Automação fica para post-pilot se provar necessária.
6. **Escopo piloto:** apenas `type: anatomy`, apenas tema `abdominoplastia`.

---

## Anatomy schema v2

Campos obrigatórios em **negrito**; caps em caracteres.

| Campo | Tipo | Cap | Papel |
|---|---|---|---|
| **`id`** | string | — | id único (mantém convenção atual) |
| **`type`** | `"anatomy"` | — | — |
| **`title`** | string | ≤60 | nome da estrutura/conceito |
| **`topic`** | string | — | mantém atual |
| **`area`** | string | — | mantém atual |
| `aliases?` | string[] | cada ≤60 | sinônimos |
| **`one_liner`** | string | ≤160 (~25 palavras) | função/definição em 1 frase; substitui `definition` |
| `structures?` | `[{label, description}]` | descrição ≤80 cada | enumerações: zonas, lâminas, camadas, segmentos |
| `numbers?` | `[{label, value, note?}]` | value curto | medidas-chave |
| `relations?` | string[] | cada ≤80 | estruturas vizinhas |
| `location?` | string | ≤200 | quando `structures` não basta |
| **`clinical_hook`** | string | ≤200 (~35 palavras) | gancho cirúrgico acionável; substitui `surgical_relevance` |
| `how_to_identify?` | string | ≤150 | dica intra-op |
| `images?` | `[{ref, caption_override?}]` | — | referência à biblioteca; ≥1 encorajada em anatomia |
| **`citations`** | string[] | — | mantém atual |
| **`tags`** | string[] | — | mantém atual |
| `updates?` | array | — | mantém atual |

**Regras editoriais (enforced por linter, não schema):**

- Siglas expandidas na primeira ocorrência por seção (regra já em `feedback_acronyms_expanded.md`).
- Nomes de arquivo de imagem ASCII sem acentos (regra já em `feedback_image_filenames_no_accents.md`).

---

## Image library schema

Arquivo: `content/images/<tema>/<image-id>.json`

```json
{
  "id": "img-huger-zones-overview-001",
  "file": "abdominoplastia/huger-zones-overview.png",
  "subject": "zonas de perfusão de Huger",
  "role": "overview",
  "source": "Neligan 5ed, Fig. 98.3",
  "credit": "Adaptado de Neligan 5ed",
  "default_caption": "Três zonas de perfusão da parede abdominal (Huger, 1979).",
  "labels": [
    { "num": 1, "text": "Zona I — artérias epigástrica inferior profunda (DIEA) e superficial (SIEA)." },
    { "num": 2, "text": "Zona II — artérias circunflexa ilíaca superficial (SCIA) e SIEA." },
    { "num": 3, "text": "Zona III — intercostais, subcostais e lombares." }
  ],
  "applicable_topics": ["abdominoplastia", "dermolipectomia"],
  "status": "available"
}
```

- `role` enum: `overview | detail | surgical | variation | schematic`.
- `status` enum: `available | placeholder`.
- `labels` segue gramática B (numeração + legenda).
- Bitstream fica em `assets/images/<tema>/<file>` (inalterado).

Manifest agregado: `content/images/manifest.json` gerado por `tools/build_image_manifest.py`, listando todos os IDs, status e `applicable_topics` para queries rápidas.

---

## Renderer anatomy (novo)

`webapp/library/renderer.js` função `anatomy()` rescrita para ordem canônica:

1. `_badge('anatomy')`
2. `<h2>{title}</h2>` + aliases
3. **Lead line** — `one_liner` em parágrafo destacado (font-weight 600, font-size maior)
4. **Chips row** (se `numbers`) — `.chips-row > .chip` com label+value
5. **Structures table** (se `structures`) — `<table class="struct-table">` 2 colunas
6. **Relations bullets** (se `relations`)
7. **Location block** (se `location`)
8. **How-to-identify** (se `how_to_identify`) — estilo highlight
9. **Hook box** — `.hook-box` vermelho com label "Gancho Clínico"
10. **Images** — resolvidas via `ref` → library entry → render com legenda numerada
11. **Updates + citations** (como hoje)

**Resolução de `ref`:** renderer (ou step de build) carrega `content/images/manifest.json` e resolve `card.images[i].ref` para o objeto library. Fallback para placeholder se `ref` inexistente.

**Fallback legado:** durante a migração, renderer detecta presença de `definition` (schema antigo) vs `one_liner` (schema novo) e faz render adequado. Fallback removido na fase 5.

**Formatadores reutilizáveis:** manter `_formatText`, `_section`, `_list`, `_citations`, `_updates`, `_badge` atuais de `renderer.js`.

---

## Pipeline de imagens (piloto — manual-baked)

Para o piloto, anotação numerada é feita manualmente pelo agente em editor gráfico. Library entry guarda `{num, text}` sem coordenadas.

1. Fonte: Neligan 5ed cap. 98 (abdominoplastia) — PDF já disponível em `00-Livros-Texto/`.
2. Extração: `tools/extract_figures.py` (a criar, baseado em PyMuPDF — ver `project_image_workflow.md` na memória) → bitmap bruto.
3. Anotação manual: agente adiciona círculos numerados sobre a figura (editor externo) → salva em `assets/images/abdominoplastia/<file>.png`.
4. Registro: escreve `content/images/abdominoplastia/<image-id>.json` com `labels: [{num, text}]`.
5. `tools/build_image_manifest.py` (a criar) agrega em `content/images/manifest.json`.
6. `tools/audit_images.py` existente continua prevenindo duplicatas (regra CLAUDE.md §11).

Automação (coordenadas + regeneração) adiada para post-pilot.

---

## Fases de execução (cada fase = 1 PR)

| Fase | Entrega | Arquivos principais |
|---|---|---|
| **0** | Scaffold image library + tooling base | `content/images/` (dir), `content/images/_schema.json` (novo), `tools/build_image_manifest.py` (novo) |
| **1** | Anatomy schema v2 + validação | `content/cards/schema.json` (editar), `content/cards/_structure.json` (editar exemplos) |
| **2** | Renderer novo com fallback legado | `webapp/library/renderer.js` (editar), `webapp/library/library.css` (adicionar `.lead-line`, `.chips-row`, `.chip`, `.struct-table`, `.hook-box`) |
| **3** | Piloto abdominoplastia anatomy end-to-end | `content/cards/contorno-corporal/abdominoplastia/anatomia.json` (reescrever), `content/images/abdominoplastia/*.json` (criar), `assets/images/abdominoplastia/*.png` (anotar) |
| **4** | Sweep nos 7 temas restantes | `content/cards/*/*/anatomia.json` (reescrever), library entries para cada |
| **5** | Remover fallback legado | `webapp/library/renderer.js` (cleanup) |

---

## Critical files

**Ler antes de implementar:**

- `content/cards/schema.json` — schema atual
- `content/cards/_structure.json` — docs dos tipos com exemplos
- `webapp/library/renderer.js` — renderer atual (156 linhas)
- `content/cards/contorno-corporal/abdominoplastia/anatomia.json` — conteúdo fonte do piloto
- `tools/audit_images.py` — lógica de dedup para reusar
- `tools/validate_briefings.mjs` — smoke test Playwright para não-regressão

**Novos:**

- `content/images/_schema.json` — JSON Schema da biblioteca
- `tools/build_image_manifest.py` — agregador
- `tools/lint_acronyms.py` — editorial check (siglas expandidas)

---

## Verificação

Ao final de cada fase:

- **Fase 0:** `python tools/build_image_manifest.py` roda sem erro em dir vazio; manifest válido.
- **Fase 1:** `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json"` passa em todos os cards existentes (via fallback legado).
- **Fase 2:** PWA renderiza cards legados sem regressão visual (comparar screenshots `home.png`, `briefing.png`, `card_detail.png`).
- **Fase 3:** Briefing de abdominoplastia abre, renderiza cards de anatomia em novo layout, imagens resolvem da biblioteca. `node tools/validate_briefings.mjs abdominoplastia` passa.
- **Fase 4:** Todos os 8 temas passam ajv + validate_briefings. Screenshots novos revisados.
- **Fase 5:** Nenhuma menção a `definition`/`surgical_relevance` em renderer após cleanup.

**Smoke test manual do piloto:** abrir `http://localhost:8080/webapp/library/` no iPhone viewport (Playwright ou DevTools), navegar para briefing de abdominoplastia, verificar:

- Card `abdo-anat-002 Zonas de Huger` renderiza com lead line + tabela estruturas + hook box + imagem numerada
- Legenda da imagem expande DIEA, SIEA, SCIA com nome por extenso
- Offline (sem rede): funciona
