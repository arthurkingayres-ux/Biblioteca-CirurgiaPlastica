# Phase 7 — Reconstrução Facial por Sub-Unidade + Remediação Blefaroplastia + Chapter-Opener Visual

**Status:** draft, aguardando aprovação do Dr. Arthur
**Data:** 2026-04-18
**Brainstorming:** `/mnt/c/Users/absay/.claude/plans/swirling-bubbling-aho.md` (pré-plano exploratório do TOC Kaufman)

---

## 1. Contexto

O PWA Biblioteca Inteligente é repositório de briefings pré-operatórios cirúrgicos. Os 6 temas atuais da área `pele-tumores/` (retalhos-locais-face, enxertos-pele, principios-excisao-margens, CBC, CEC, melanoma) não cumprem essa identidade: CBC/CEC/melanoma são diagnósticos, retalhos/enxertos/margens são técnicas transversais. Dr. Arthur descartou essa área em 2026-04-18 como "conteúdo RAG forçado no PWA".

Substituímos por um índice **por sub-unidade anatômica facial** — como o cirurgião pensa no pré-op ("vou reconstruir uma pálpebra após remoção de CBC", não "vou operar um CBC"). Livro-texto primário: **Practical Facial Reconstruction: Theory and Practice** (Andrew J. Kaufman, Wolters Kluwer 2018), validado via render do TOC — 287 páginas, 8 capítulos, organizado por sub-unidade exatamente no padrão que buscamos.

Antes de construir conteúdo novo, precisamos consertar um débito técnico identificado durante este brainstorming: os cards de anatomia de **blefaroplastia** têm labels incorretas, imagem inadequada em um caso e reciclagem excessiva do corte sagital. Regra `feedback_verify_image_content_before_mapping` foi violada na Phase 5B. Não construímos reconstrução facial em cima disso.

Concorrentemente, o PWA se beneficia de destacar visualmente a seção **Anatomia Relevante** dentro de cada briefing — subseção privilegiada do produto, hoje renderizada no mesmo nível das demais.

---

## 2. Escopo

### Entra no escopo desta Phase 7

1. **Phase 7.0 — Remediação de imagens de anatomia em blefaroplastia** (bloqueante)
2. **Phase 7.1 — Chapter-opener editorial na seção Anatomia** do briefing (global, beneficia todos os temas)
3. **Phase 7.2 — RAGs horizontais** de reconstrução (`_principios-reconstrucao.md` + `_atlas-retalhos.md`)
4. **Phase 7.3 — Onda 1:** `reconstrucao-de-nariz` + `reconstrucao-de-labio` (paralelo)
5. **Phase 7.4 — Onda 2:** `reconstrucao-de-bochecha` + `reconstrucao-de-palpebra` + `reconstrucao-de-orelha` + `reconstrucao-de-fronte-e-tempora`
6. **Phase 7.5 — Onda 3:** `reconstrucao-de-couro-cabeludo` + `reconstrucao-de-queixo`
7. **Phase 7.6 — Encerramento:** remoção dos 6 temas antigos de `pele-tumores/` do manifest + arquivo dos RAG files

### Fora do escopo

- Audit sweep dos outros 7 temas v2 (abdomino, CPB, glúteo, lipo, oto, rino, rito) — Dr. Arthur detecta sob demanda (regra focal, ratificada 2026-04-18)
- Capítulos do Kaufman sem sub-unidade própria (reconstrução pediátrica, oncologia Mohs, enxerto de cartilagem isolado, rinectomia total) — não entram como temas de topo
- Novos tipos de card (schema v2 existente cobre tudo)

---

## 3. Arquitetura — nova área `reconstrucao-facial/`

### 3.1 Estrutura de diretórios

```text
content/
├── rag/
│   ├── pele-tumores/            # preservado como referência durante execução; arquivado em 7.6
│   └── reconstrucao-facial/     # NOVA
│       ├── _principios-reconstrucao.md   # horizontal, invisível ao PWA
│       ├── _atlas-retalhos.md            # horizontal, invisível ao PWA
│       ├── reconstrucao-de-nariz.md
│       ├── reconstrucao-de-labio.md
│       ├── reconstrucao-de-bochecha.md
│       ├── reconstrucao-de-palpebra.md
│       ├── reconstrucao-de-orelha.md
│       ├── reconstrucao-de-fronte-e-tempora.md
│       ├── reconstrucao-de-couro-cabeludo.md
│       └── reconstrucao-de-queixo.md
├── cards/
│   ├── pele-tumores/            # cards deletados em 7.6
│   └── reconstrucao-facial/     # NOVA
│       ├── reconstrucao-de-nariz/
│       │   ├── _meta.json
│       │   ├── anatomia.json
│       │   ├── tecnicas.json
│       │   ├── decisoes.json
│       │   ├── notas.json
│       │   └── flashcards.json
│       └── (…demais sub-unidades)
└── images/
    └── manifest.json             # entradas novas por sub-unidade
assets/
└── images/
    └── <slug-sub-unidade>/       # figuras catalogadas + anotadas
```

### 3.2 Schema v2 por tema

Nenhum card novo. Estrutura canônica existente (documentada em `content/cards/_structure.json`, `schema.json`):

- `anatomia.json` — unidades estéticas da sub-unidade, suprimento vascular, nervos em risco, margens livres (alar rim, red lip line, pálpebra margo, linhas estéticas)
- `tecnicas.json` — retalhos específicos daquela sub-unidade (ex: bilobed de Zitelli para ala, Abbe-Estlander para lábio, wedge de hélice, forehead paramediano)
- `decisoes.json` — algoritmos por localização × tamanho × profundidade, lógica Kaufman ("o que falta? onde acho? como movo?")
- `notas.json` — princípios universais aplicados à sub-unidade, fisiopatologia cicatricial, complicações (ectrópio, trapdoor, standing cone, notching, pincushioning), revisão de cicatriz
- `flashcards.json` — número/decisão rápida (exibido no PWA como "Parâmetros")

### 3.3 RAGs horizontais

Dois arquivos prefixados com `_` (convenção existente; ficam fora do `manifest.json` do PWA, logo invisíveis ao Dr. Arthur):

- `_principios-reconstrucao.md` — Kaufman Cap. 1 + princípios gerais de Neligan/Grabb. Framework editorial: 3 perguntas (o que falta? onde acho? como movo sem distorcer margens livres?); unidades estéticas da face; wound care; execução; revisão de cicatriz.
- `_atlas-retalhos.md` — Kaufman Cap. 2 expandido: advancement, rotation, transposition, island advancement, bilobed, rhombic, interpolation, FTSG/STSG, second intention. Cada tipo como seção independente com desenhos de planejamento e casos.

Cada RAG de sub-unidade **cita** esses horizontais em vez de repetir. Chat IA recupera os horizontais via RAG quando questionado sobre princípios gerais.

---

## 4. Phase 7.0 — Remediação de imagens em blefaroplastia (bloqueante)

Débito capturado em memória `project_debt_blefaroplastia_images.md`. Escopo focal: só blefaroplastia.

### 4.1 Cards afetados (auditoria inicial de Dr. Arthur)

Todos os cards de anatomia atualmente em `content/cards/estetica-facial/blefaroplastia/anatomia.json`:

- Pele palpebral — labels não correspondem às estruturas
- Músculo orbicular do olho — labels não correspondem às estruturas
- Septo orbital — labels não correspondem às estruturas
- Gordura orbitária pálpebra superior — **figura inadequada** ao conceito (além de labels)
- Gordura orbitária pálpebra inferior — labels não correspondem às estruturas
- Reciclagem detectada: mesmo corte sagital usado em múltiplos cards

### 4.2 Pipeline de remediação (por card)

1. **Read visual** da imagem atualmente referenciada
2. Decisão:
   - **Figura adequada, labels erradas** → re-anotar labels + x,y após inspeção visual rigorosa
   - **Figura inadequada** → substituir por figura nova (fontes prioritárias: Neligan Vol. 2 cap. blefaroplastia; Kaufman Cap. 8 Eyelid Reconstruction; Atlas Acessos Cirúrgicos ao Esqueleto Facial (Ellis & Zide); KenHub para esquemas didáticos)
3. Extrair, catalogar, anotar com overlays numéricos (pipeline Phase 6B existente: labels[] com x,y)
4. Atualizar `content/cards/estetica-facial/blefaroplastia/anatomia.json` + `content/images/manifest.json` + `assets/images/blefaroplastia/`

### 4.3 Meta

- Cada conceito anatômico de blefaroplastia tem sua **figura dedicada**
- **Zero** reciclagem do corte sagital
- Labels validadas por leitura visual (regra `feedback_verify_image_content_before_mapping`)

### 4.4 Entrega

PR único: cards blefaro remediados + manifest de imagens atualizado + novos arquivos em `assets/images/blefaroplastia/` + SW cache bump (v24 → v25). Validação Playwright obrigatória (screenshot mobile viewport antes/depois em briefing de blefaroplastia).

---

## 5. Phase 7.1 — Chapter-opener editorial na seção Anatomia

Destaque visual da subseção privilegiada do briefing. Opção B do brainstorming — tratamento "opening de capítulo" editorial.

### 5.1 Mudanças

- **`preop.js`**: adicionar classe `briefing-section--anatomy` à `<details class="briefing-section">` cujos items são cards `anatomy`
- **`style.css`**: ~25 linhas novas, seletor escopado a `.briefing-section--anatomy`:
  - Wordmark "ANATOMIA" em caps tracked (Instrument Sans, letter-spacing 2.4px, color `--dissection-green`) via `::before` do `.briefing-section-title`
  - Título em Fraunces italic, 24px (vs 20px padrão), opsz 80
  - Rule dissection-green 2px × 24px logo abaixo do título
  - `.briefing-item[open]` dentro da section usa `--dissection-green` na borda (substitui `--rule-strong`)
  - Zero background wash — mantém sobriedade
- **Zero mudança** em `renderer.js`, em cards, ou em tokens (reusa `--dissection-green`, `--font-serif`, escala tipográfica)

### 5.2 Entrega

PR único + SW bump. Validação Playwright: screenshot mobile viewport em 2+ briefings (abdomino, rino) mostrando a seção anatomia vs. outras seções.

---

## 6. Phases 7.3–7.5 — Construção das sub-unidades

### 6.1 Pipeline padrão por tema (executado em subagente Opus/Sonnet conforme complexidade)

1. **Render** do capítulo Kaufman relevante (ex: nariz = pg 95-163 → ~70 PNGs a 150 DPI em `tools/_cache/kaufman_<tema>/`)
2. **Leitura vision** página a página: texto em inglês + desenhos de planejamento + fotos pré/intra/pós
3. **Leitura complementar** do capítulo correspondente em Neligan Vol. 3 (reconstrução facial) e Grabb & Smith 9ed
4. **Catálogo de imagens reutilizáveis** em `assets/images/<tema>/` — nomes ASCII, legendas, labels + x,y via pipeline Phase 6B
5. **Escrita do RAG** unificado em `content/rag/reconstrucao-facial/<tema>.md` (Kaufman + Neligan + Grabb intercalados; seguir `_template.md`; citar `_principios-reconstrucao.md` e `_atlas-retalhos.md` em vez de repetir)
6. **Derivação de cards** via `tools/rag_to_cards.js` (ou equivalente)
7. **Entrada no manifest** (`content/cards/manifest.json` + `_meta.json`)
8. **SW bump + Playwright** validando briefing mobile
9. **Cleanup**: apagar `tools/_cache/kaufman_<tema>/`

### 6.2 Ondas

| Wave | Temas | Kaufman | Observação |
| --- | --- | --- | --- |
| 7.3 | nariz, lábio | Cap. 5 (12 variantes), Cap. 6 (12 variantes) | Capítulos mais densos. Paralelo via 2 subagentes. |
| 7.4 | bochecha, pálpebra, orelha, fronte-e-têmpora | Cap. 3, Cap. 8, Cap. 7, Cap. 4 | 4 subagentes em paralelo; split em 2 PRs se preferível por peso de review |
| 7.5 | couro cabeludo, queixo | — (Kaufman não cobre) | Fonte primária: Neligan Vol. 3 + Grabb & Smith. Sem ingestão Kaufman. |

### 6.3 Kaufman horizontais (7.2 antes de 7.3)

RAGs `_principios-reconstrucao.md` e `_atlas-retalhos.md` são escritos **antes** da Onda 1. Render de Kaufman Cap. 1 (pg 3-18) + Cap. 2 (pg 19-38) = ~35 páginas. Subagente dedicado.

---

## 7. Phase 7.6 — Encerramento e limpeza

Executada após todas as 8 sub-unidades estarem `complete` no manifest.

1. Remover entries de `pele-tumores/` (6 temas) do `content/cards/manifest.json`
2. Deletar `content/cards/pele-tumores/` (todas as subpastas e JSONs)
3. Mover `content/rag/pele-tumores/` → `content/rag/_archive/pele-tumores/` (preservação histórica; invisível ao agente em buscas, acessível via path explícito)
4. Decidir com Dr. Arthur destino de `assets/images/pele-tumores/` (se existir): portar imagens reutilizáveis para as sub-unidades onde couberem, arquivar restante
5. SW bump final
6. Atualizar `CLAUDE.md` (seção "Temas implementados") e memória

---

## 8. Verificação

### Por entrega

- **7.0 blefaro:** Playwright mobile screenshot comparativo em cada card de anatomia de blefaro (antes = atual/errado, depois = remediado). Read visual manual amostral de 2 cards para confirmar correspondência label↔estrutura.
- **7.1 visual:** Playwright mobile screenshot de briefing de abdomino + rino mostrando section anatomia com wordmark + rule + italic vs. outras sections.
- **7.2–7.5 sub-unidades:** para cada tema:
  - `tools/validate_briefings.mjs` (pipeline Playwright standalone existente) navega home → tema → anatomia → técnicas → decisões → notas → flashcards sem erro
  - Verificar `content/images/manifest.json` entries da sub-unidade têm x,y numéricos em 100% das labels
  - Revisão manual do RAG pelo Dr. Arthur antes de fechar PR
- **7.6 cleanup:** `manifest.json` não contém `pele-tumores`; PWA reinstala SW e serve 8 sub-unidades novas; busca interna retorna resultados apenas da área nova.

### Horizontais

- `_principios-reconstrucao.md` e `_atlas-retalhos.md` validados por leitura completa do Dr. Arthur
- Chat IA teste: perguntar "me explique os princípios de retalho em reconstrução facial" e confirmar que resposta puxa contexto de `_principios-reconstrucao.md` + `_atlas-retalhos.md` (via RAG embeddings)

---

## 9. Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Ingestão Kaufman (287 pg × vision) explode custo/tempo | Escopo por tema — nunca renderiza o livro inteiro de uma vez; cache scratch apagado ao fim. Cap. 1+2 horizontais = ~35 pg; Cap. 5 (mais denso) = ~70 pg. Budget por tema: 100-150 chamadas vision. |
| Phase 7.0 descobre outros cards afetados em blefaro além dos 5 citados | Pipeline já assume auditoria de TODOS os cards de anatomia de blefaro, não só os 5 flagrados por Dr. Arthur. |
| Repetição entre RAGs horizontais e RAGs de sub-unidade | Sub-unidades citam os horizontais em vez de transcrever. Revisão de cada PR verifica que não há duplicação material. |
| Couro cabeludo e queixo sem Kaufman ficam mais fracos | Acetar explicitamente que são Neligan-primary. Anotar em `_meta.json` do tema. Se revisão indicar fragilidade, incorporar fonte adicional (High Definition Body Sculpting não cobre; Operative Dictations complementa técnica). |
| Visual chapter-opener fica estranho em temas sem muitas cards de anatomia | Testar em oto (3 cards) e lipo (poucos cards) durante validação Playwright antes de mergear. |
| Schema v2 não acomoda alguma particularidade de reconstrução | Detectado durante execução de nariz (primeiro tema). Se surgir, extensão do schema vira pré-requisito antes de escalar para Onda 2 — não é backwards-break; é extensão. |

---

## 10. Arquivos críticos

### Criados

- `content/rag/reconstrucao-facial/_principios-reconstrucao.md`
- `content/rag/reconstrucao-facial/_atlas-retalhos.md`
- `content/rag/reconstrucao-facial/reconstrucao-de-<slug>.md` × 8
- `content/cards/reconstrucao-facial/reconstrucao-de-<slug>/{_meta,anatomia,tecnicas,decisoes,notas,flashcards}.json` × 8
- `assets/images/reconstrucao-de-<slug>/` × 8

### Modificados

- `content/cards/manifest.json` — remove 6 entries de pele-tumores; adiciona 8 novas
- `content/images/manifest.json` — novas entries com x,y labels para cada figura catalogada
- `webapp/library/preop.js` — adiciona classe `briefing-section--anatomy` na section correspondente
- `webapp/library/style.css` — ~25 linhas novas para chapter-opener
- `webapp/library/sw.js` — CACHE_NAME bump a cada PR
- `webapp/library/index.html` — bust query-string `?v=...` (se for promovido em algum PR)
- `CLAUDE.md` — atualização da seção "Temas implementados" ao encerrar (Phase 7.6)

### Arquivados (em 7.6)

- `content/rag/pele-tumores/*.md` → `content/rag/_archive/pele-tumores/`

### Deletados (em 7.6)

- `content/cards/pele-tumores/` (6 subpastas + JSONs)
- Entries correspondentes em `content/cards/manifest.json`

### Blefaro (em 7.0)

- `content/cards/estetica-facial/blefaroplastia/anatomia.json` — re-escrito
- `content/images/manifest.json` — entries blefaro re-anotadas / substituídas
- `assets/images/blefaroplastia/` — novas figuras adicionadas, eventualmente algumas obsoletas removidas

---

## 11. Ordem de execução recomendada

```text
7.0 blefaro remediation   ──┐
7.1 chapter-opener visual ──┤→ podem rodar em paralelo (PRs independentes)
7.2 horizontais Kaufman   ──┘
    │
    ▼
7.3 Onda 1 nariz + lábio (paralelo, 2 PRs)
    │
    ▼
7.4 Onda 2 bochecha + pálpebra + orelha + fronte-e-têmpora (paralelo, 2-4 PRs)
    │
    ▼
7.5 Onda 3 couro cabeludo + queixo (Neligan-primary, paralelo ou sequencial)
    │
    ▼
7.6 encerramento: remover pele-tumores, atualizar CLAUDE.md, SW final
```

Cada PR segue `superpowers:executing-plans` + `superpowers:verification-before-completion` + `/code-review:code-review` antes de merge.
