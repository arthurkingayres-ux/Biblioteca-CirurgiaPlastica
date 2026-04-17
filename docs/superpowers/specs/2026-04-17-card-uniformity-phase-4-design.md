# Card Uniformity Fase 4 — Sweep de Anatomia v2 (7 temas contorno + face)

**Data:** 2026-04-17
**Estado:** Aprovado, pronto para `writing-plans`
**Plano pai:** `docs/superpowers/plans/2026-04-16-card-uniformity-anatomy-pilot.md` (stub de Phase 4 substituído por este design)
**Fase anterior:** `docs/superpowers/specs/2026-04-17-card-uniformity-phase-3-design.md` (piloto abdominoplastia)

---

## Contexto

O piloto de anatomia v2 (Fase 3, tema abdominoplastia) foi mergeado em master em 2026-04-17 (`2216ce6`, merge no-ff) e aprovado em qualidade pelo Dr. Arthur. A entrega teve 5 library entries + 5 cards anatômicos v2, validados por `validate_briefings.mjs` em light+dark.

Dois problemas concretos emergiram do piloto e precisam ser resolvidos antes de escalar para os temas restantes:

1. **Débito de acentuação.** Os 10 JSONs do piloto (5 library entries em `content/images/abdominoplastia/` + 5 cards em `content/cards/contorno-corporal/abdominoplastia/anatomia.json`) saíram sem diacríticos portugueses. Viola a regra #2 do `CLAUDE.md` ("SEMPRE validar acentuação portuguesa"). Causa raiz provável: prompt do subagente Haiku de produção não enfatizou acentuação, ou houve normalização ASCII silenciosa no pipeline.
2. **Gap de validação.** `tools/validate_briefings.mjs` detecta placeholders renderizados no DOM, mas não conta imagens por tópico. Um card v2 com `images: []` passa "valid" e renderiza "Imagem pendente" no PWA sem falhar o validador. Risco silencioso se um tema migra só parte dos cards.

Se o sweep dos 7 temas seguintes entrar sem resolver esses dois pontos, ambos os erros se multiplicam por 7.

A estrutura final do manifest (`content/cards/manifest.json`) tem 14 temas `complete`. Um já está em v2 (abdominoplastia). Esta fase ataca **7 temas** com perfil comum: anatomia espacial e acervo de imagens já em disco. Os 6 temas de pele/tumores (perfil conceitual + zero imagens em disco) ficam para Fase 4C dedicada.

Phase 4 habilita Phase 5 (remoção do `oneOf` legacy em `schema.json` e branch legacy em `renderer.js`), pois nenhum card de anatomia dos 8 temas contorno+face usará mais o formato antigo.

## Objetivo

Migrar os 65 cards de anatomia dos 7 temas contorno+face para o formato v2, produzindo 30 library entries novas e deixando 35 cards em estado "imagem pendente" (`images: []`) para follow-ups incrementais. Precedido por um PR de hardening do pipeline que quita o débito do piloto e endurece o validador, garantindo que os 7 temas novos nasçam já no padrão aprovado.

## Escopo

### Temas incluídos (7)

| Tema | Área | Cards legacy | Alvo com imagens | Pendências |
|---|---|---|---|---|
| lipoaspiracao | contorno-corporal | 4 | 4 | 0 |
| gluteoplastia | contorno-corporal | 8 | 5 | 3 |
| contorno-pos-bariatrico | contorno-corporal | 12 | 5 | 7 |
| blefaroplastia | estetica-facial | 20 | 5 | 15 |
| rinoplastia | estetica-facial | 15 | 5 | 10 |
| otoplastia | estetica-facial | 2 | 2 | 0 |
| ritidoplastia | estetica-facial | 4 | 4 | 0 |
| **Total** | | **65** | **30** | **35** |

### Ordem de migração

Por utilidade clínica R2 (maior demanda primeiro, valor rápido para briefing pré-op real):

1. lipoaspiracao
2. gluteoplastia
3. contorno-pos-bariatrico
4. blefaroplastia
5. rinoplastia
6. otoplastia
7. ritidoplastia

### Out-of-scope explícito

- **6 temas de pele/tumores** (retalhos-locais-face, enxertos-pele, principios-excisao-margens, carcinoma-basocelular, carcinoma-espinocelular, melanoma-cutaneo) — Fase 4C separada; exigem decisões de design distintas (figuras do zero, cards conceituais vs espaciais).
- **Expansão de imagens para os 35 cards pendentes** — follow-ups incrementais, rastreados em `content/cards/_pending_images.md` (arquivo-manifesto gerado automaticamente).
- **Subseções técnicas/decisões/notas/flashcards** dos temas — fora desta fase; Phase 6+ se houver.
- **Remoção do branch legacy** (`oneOf` em `schema.json`, branch v1 em `renderer.js`, CSS legacy) — é a Phase 5, habilitada após esta.

## Decisões-chave

### 1. Todos os cards migram; apenas 5 ganham imagem

Contra-proposta ao design inicial ("consolidar blefaroplastia 20 → 5") foi rejeitada pelo Dr. Arthur: todos os cards legacy são úteis e devem ser preservados integralmente.

**Regra:** todos os cards legacy de cada tema viram v2. Os 5 cards mais centrais por tema recebem `images[]` apontando para library entries. Os demais ficam com `images: []` como "imagem pendente". Para temas com ≤5 cards (lipo, oto, ritido), todos recebem imagens.

A "centralidade" de um card é julgamento editorial durante execução, guiado pelo princípio do piloto: priorizar cards que ancoram o planejamento pré-op (camadas, zonas de perfusão, landmarks principais, subunidades estéticas, estruturas preservação-crítica).

### 2. Cards conceituais recebem `structures[]` com 1 entry (Opção A)

Alguns cards legacy não descrevem anatomia espacial (ex: "PMI" em lipo — ponto único; "Zonas de Segurança e Perigo" em lipo — lista de áreas dispersas pelo corpo). O formato v2 foi desenhado para anatomia espacial com legenda numerada.

**Regra:** schema v2 permite `structures: []` (sem `minItems`). Para cards conceituais, usar `structures` com 1 entry única representando o conceito principal. `one_liner` + `clinical_hook` carregam o grosso do conteúdo. Renderer exibe tabela de 1 linha — aceitável; evita segundo branch de schema e preserva promessa "todos em v2".

Rejeitadas: `structures` vazio (renderer ficaria sem seção estrutural, card "capado"); schema híbrido legacy/v2 por card (atrasa Phase 5).

### 3. Mapeamento canônico de campos legacy → v2

| Legacy | v2 | Regra |
|---|---|---|
| `definition` | `one_liner` | Condensar para ≤160 caracteres, manter acentuação |
| `location` | integra `how_to_identify` ou vira 1 entry em `structures[]` conforme cabimento | Julgamento por card |
| `relations` | integra `clinical_hook` ou `structures[].description` | Julgamento por card |
| `surgical_relevance` | `clinical_hook` | Condensar para ≤200 caracteres, manter todas as vírgulas/acentos |
| `how_to_identify` | `how_to_identify` | Mantém |
| `id` | `id` | **Preservado** (`lipo-anat-001` → `lipo-anat-001`); facilita rastreabilidade |
| `tags` | `tags` | Mantém |
| `citations` | `citations` | Mantém |
| `aliases` | `aliases` | Mantém |
| `updates` | `updates` | Mantém |
| `images[{file, caption, credit}]` | `images[{ref}]` via library entry | Nos 5 cards escolhidos; demais: `images: []` |

### 4. Pipeline: 1 subagente Haiku por tema

Cada tema é executado por um subagente dispatchado via `Agent` tool (`subagent_type=general-purpose`, `model=haiku`), guiado pelo template canônico entregue em PR 4.0. Um subagente por tema mantém contexto focado e libera memória entre temas.

Dr. Arthur revisa output antes de cada commit (mesmo padrão do piloto). Passagem manual de acentos só deve ser necessária como fallback; o endurecimento do prompt em PR 4.0 mira zero recorrência.

### 5. Três PRs sequenciais

- **PR 4.0 — Preparação do pipeline.** ~8 commits. Quita acentuação de abdominoplastia, endurece prompt, estende validador, atualiza `_structure.json`, cria template canônico. Não toca nos 7 temas novos.
- **PR 4A — Contorno corporal.** ~18 commits. Três temas (lipo, gluteo, pós-bariátrico). Bump SW cache v18→v19.
- **PR 4B — Estética facial.** ~24 commits. Quatro temas (blefaro, rino, oto, ritido). Bump SW cache v19→v20.

Rejeitadas: PR único com 7 temas (review inviável); 1 PR por tema × 8 (burocracia git, cache SW bumped 8×, risco de conflito crescente com Phase 5 paralela).

## Abordagem

### PR 4.0 — Preparação do pipeline

Tarefas:

1. **Corrigir acentuação de abdominoplastia.** Passada manual com leitura contextual nos 10 JSONs (`content/cards/contorno-corporal/abdominoplastia/anatomia.json` + 5 entries em `content/images/abdominoplastia/`). Preservar termos técnicos que não levam acento (Scarpa, Huger, PDSEA, SAT, DAT, Matarasso).

2. **Template canônico do subagente.** Criar `docs/superpowers/templates/anatomy-v2-tema.md` contendo:
   - Checklist de 7 passos intra-tema (inventário → extrair → entries → manifest → v2 cards → validar → auditar)
   - Mapeamento de campos legacy → v2 (tabela acima)
   - Regra Opção A para cards conceituais
   - Lista de termos técnicos sem acento
   - Output format: apenas JSON válido, sem comentários, sem prosa
   - Diretriz explícita de acentuação portuguesa como obrigatória

3. **Endurecer `tools/validate_briefings.mjs`.** Adicionar:
   - Assertion: cada tópico listado em `EXPECTED_IMAGE_COUNTS` tem ≥ N cards com `images` não-vazio (N = mínimo entre target da fase 4 e número total de cards)
   - Cards v2 com `images: []` são aceitos como "pending" e não quebram CI
   - Relatório agregado ao final: contagem de pendências por tópico
   - Manter compat com schema legacy (cards legacy não participam da métrica)

4. **Gerar `content/cards/_pending_images.md` automaticamente.** Script separado `tools/report_pending_images.mjs` (mais simples que hook acoplado ao validador; separa preocupações). Varre todos os `anatomia.json` e escreve markdown com cards `images: []` agrupados por tópico. Humanos rodam manualmente e comitam o arquivo junto com cada PR de tema — CI não escreve no repo, evita diff ruidoso entre execuções. Primeira versão gerada em PR 4.0 listará as pendências conhecidas no momento (só cards em v2 aparecem; cards legacy ficam invisíveis ao script até serem migrados).

5. **Alinhar `content/rag/_structure.json` anatomy.** Atualizar `purpose` e `required_fields` para refletir v2 (débito carregado da Fase 2). Remover menções a `definition`, `location`, `relations`, `surgical_relevance` como campos obrigatórios.

6. **Testes do validador estendido.** Cobertura de:
   - Card v2 com `images[]` preenchido → passa
   - Card v2 com `images: []` → passa mas aparece em pendências
   - Tópico com menos de N cards com imagem → falha
   - Card legacy → ignorado pela métrica nova

Encerra PR 4.0 com `validate_briefings.mjs --theme=both` verde em estado atual do repo (8 temas complete, 1 em v2 com imagens corretas, 13 em legacy) e ajv validate sem erros.

### PR 4A — Contorno corporal (3 temas)

Aplica o ciclo padrão de 7 passos para cada tema em ordem:

1. lipoaspiracao (4 cards → 4 com imagem)
2. gluteoplastia (8 cards → 5 com imagem + 3 pendentes)
3. contorno-pos-bariatrico (12 cards → 5 com imagem + 7 pendentes)

Ciclo por tema (um commit por passo, sem batching cross-tema):

1. **Inventário do legacy.** Ler `content/cards/contorno-corporal/<tema>/anatomia.json`, listar cards, escolher os 5 mais centrais para receber imagem, justificar escolha em comentário de commit.
2. **Extrair ou reaproveitar figuras.** Verificar primeiro `assets/images/<tema>/` — vários temas já têm imagens acumuladas de fases anteriores (oto: 15, blefaro: 47, rino: 24, ritido: 20). Se as imagens existentes cobrem as 5 figuras anatômicas alvo, reutilizar; caso contrário, `python tools/extract_figures.py` sobre o capítulo correspondente do Neligan para complementar. Regra: primeiro auditar disco, depois extrair o que faltar.
3. **Criar library entries.** 5 (ou menos) arquivos em `content/images/<tema>/img-<slug>-NNN.json`, seguindo template. Validar com `npx ajv validate -s content/images/_schema.json -d "content/images/<tema>/*.json" --strict=false`.
4. **Regenerar manifest.** `python tools/build_image_manifest.py`.
5. **Reescrever `anatomia.json` em v2.** Dispatch do subagente Haiku com o template canônico como prompt, passando o JSON legacy + as 5 library entries recém-criadas. Output: novo `anatomia.json` com todos os cards em v2, 5 deles com `images[{ref}]`. Dr. Arthur revisa.
6. **Validar.** `npx ajv validate -s content/cards/schema.json -d content/cards/contorno-corporal/<tema>/anatomia.json --strict=false`, `python tools/lint_acronyms.py content/cards/contorno-corporal/<tema>/anatomia.json`, `node tools/validate_briefings.mjs --theme=both`.
7. **Auditar órfãs.** `python tools/audit_images.py --topic <tema>`; deletar imagens sem referência.

Ao final dos 3 temas, bump `webapp/library/sw.js` cache v18 → v19, `validate_briefings.mjs --theme=both` verde, manifest `_pending_images.md` lista ~10 pendências totais (0+3+7).

### PR 4B — Estética facial (4 temas)

Mesmo ciclo aplicado em ordem:

1. blefaroplastia (20 cards → 5 com imagem + 15 pendentes)
2. rinoplastia (15 cards → 5 com imagem + 10 pendentes)
3. otoplastia (2 cards → 2 com imagem)
4. ritidoplastia (4 cards → 4 com imagem)

Blefaroplastia é o tema mais denso (20 cards) e está primeiro — se o pipeline endurecido de PR 4.0 vai falhar, falha cedo.

Bump `sw.js` cache v19 → v20 ao final. Manifest `_pending_images.md` acumula ~25 novas pendências (15+10+0+0), totalizando ~35 com o que sobrou do PR 4A.

### Critérios de sucesso end-to-end (pós PR 4B)

1. `npx ajv validate -s content/cards/schema.json -d "content/cards/**/anatomia.json" --strict=false` → 0 erros
2. `grep -rn '"definition"' content/cards/contorno-corporal content/cards/estetica-facial --include='anatomia.json'` → 0 ocorrências (nenhum card anatomia ainda em legacy nos 8 temas contorno+face; pele/tumores fica fora do escopo e permanece legacy até Phase 4C)
3. `node tools/validate_briefings.mjs --theme=both` → 8 temas × 2 themes pass, 0 broken, 0 placeholders nos cards com imagem
4. `python tools/lint_acronyms.py content/cards/**/anatomia.json` → exit 0
5. `python tools/audit_images.py` → nenhuma órfã nos 7 temas tocados
6. `content/cards/_pending_images.md` existe e lista as 35 pendências por tópico
7. Dr. Arthur faz spot-check manual no PWA iPhone em 2-3 temas aleatórios pós-merge de cada PR

### Gates por PR individual

- **PR 4.0**: testes do validador verdes; `validate_briefings.mjs` verde no estado atual; abdominoplastia acentuada e renderiza igual ao estado pré-correção (só texto mudou).
- **PR 4A**: 3 temas migrados passam ajv + lint_acronyms + validate_briefings; SW bumped; `_pending_images.md` atualizado.
- **PR 4B**: 4 temas migrados passam os mesmos gates; SW bumped; `_pending_images.md` atualizado; `grep` de `"definition"` retorna 0 nos temas do sweep.

## Arquivos tocados

### Criados (PR 4.0)

- `docs/superpowers/templates/anatomy-v2-tema.md` — template canônico do subagente
- `content/cards/_pending_images.md` — manifesto de pendências (primeira versão, gerada automaticamente)
- `tools/report_pending_images.mjs` — script que varre `content/cards/**/anatomia.json` e gera `content/cards/_pending_images.md`
- `tools/tests/test_validate_briefings_image_counts.*` — testes da extensão de validador

### Modificados (PR 4.0)

- `content/cards/contorno-corporal/abdominoplastia/anatomia.json` — acentuação
- `content/images/abdominoplastia/*.json` (5 arquivos) — acentuação
- `tools/validate_briefings.mjs` — assertion de contagem + relatório pendências
- `content/rag/_structure.json` — bloco anatomy atualizado
- Testes em `tools/tests/` — adicionar arquivo `test_validate_briefings_image_counts.*` (cobertura das 4 situações listadas no item 6 de "PR 4.0 — Preparação do pipeline")

### Criados (PR 4A)

- `content/images/lipoaspiracao/img-*.json` (4 entries)
- `content/images/gluteoplastia/img-*.json` (5 entries)
- `content/images/contorno-pos-bariatrico/img-*.json` (5 entries)
- `assets/images/<tema>/*.png` novos (conforme extração; ~14 totais se cada tema gera imagens novas)

### Modificados (PR 4A)

- `content/cards/contorno-corporal/lipoaspiracao/anatomia.json`
- `content/cards/contorno-corporal/gluteoplastia/anatomia.json`
- `content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json`
- `content/images/manifest.json` (regen)
- `content/cards/_pending_images.md` (regen)
- `webapp/library/sw.js` (cache bump)

### Criados (PR 4B)

- `content/images/blefaroplastia/img-*.json` (5 entries)
- `content/images/rinoplastia/img-*.json` (5 entries)
- `content/images/otoplastia/img-*.json` (2 entries)
- `content/images/ritidoplastia/img-*.json` (4 entries)
- `assets/images/<tema>/*.png` novos (conforme extração)

### Modificados (PR 4B)

- `content/cards/estetica-facial/blefaroplastia/anatomia.json`
- `content/cards/estetica-facial/rinoplastia/anatomia.json`
- `content/cards/estetica-facial/otoplastia/anatomia.json`
- `content/cards/estetica-facial/ritidoplastia/anatomia.json`
- `content/images/manifest.json` (regen)
- `content/cards/_pending_images.md` (regen)
- `webapp/library/sw.js` (cache bump)

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Subagente Haiku recai em saída sem acentos | PR 4.0 endurece prompt com exemplos positivos/negativos; revisão humana obrigatória antes do commit de cada tema; `lint_acronyms.py` não cobre acentos, mas renderização no PWA expõe visualmente |
| Cards conceituais ficam pobres visualmente com `structures[]` de 1 entry | Aceito explicitamente como trade-off (evita schema híbrido); revisitável em Phase 6 se virar dor |
| Figuras do Neligan para temas periféricos (otoplastia, ritido) podem ser escassas | Extração guiada por TOC do PDF; se <5 figuras disponíveis, tema fica com menos imagens (consistente com regra "todos em v2, ≤5 com imagens") |
| 35 cards ficam com "Imagem pendente" no PWA após Phase 4 | Intencional; `_pending_images.md` vira backlog explícito; Dr. Arthur vê imediatamente quais cards ainda precisam imagem; follow-ups são incrementais e de baixo risco |
| Phase 5 pode ficar bloqueada se algum card resistir à migração | Critério #2 (grep de `"definition"`) falha cedo; força resolução por tema antes de merge |
| Cache SW bumped 3× em curto intervalo | Usuário (Dr. Arthur) precisa refresh do PWA 3×; aceitável dado escopo; mencionar no PR body de cada fase |

## Referências

- `docs/superpowers/plans/2026-04-16-card-uniformity-anatomy-pilot.md` — plano mãe com stub de Phase 4
- `docs/superpowers/plans/2026-04-17-card-uniformity-phase-3.md` — plano canônico do piloto
- `content/cards/schema.json` — anatomy v2 via `oneOf`
- `content/cards/contorno-corporal/abdominoplastia/anatomia.json` — referência viva v2
- `content/images/abdominoplastia/*.json` — referência viva library entries
- Memória `project_fase_pilot_abdominoplastia_v2_done.md` — registro do piloto
- Memória `project_debt_abdominoplastia_v2_accents.md` — causa raiz do débito
- Memória `feedback_anatomy_v2_pilot_approved.md` — validação do formato pelo Dr. Arthur
- Memória `reference_anatomy_v2_renderer_labels.md` — como o renderer v2 exibe labels
