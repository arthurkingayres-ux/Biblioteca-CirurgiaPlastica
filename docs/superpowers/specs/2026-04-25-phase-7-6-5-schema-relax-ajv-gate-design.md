# Phase 7.6.5 — Schema Relax + AJV Gate (design)

**Data:** 2026-04-25
**Sub-fase:** 7.6.5 (housekeeping entre 7.6a e 7.6b)
**Tipo:** débito técnico — schema vs. drift sistêmico
**Branch alvo:** `chore/phase-7-6-5-schema-relax-ajv-gate`

## Contexto

Ao longo de Phases 7.4 (nariz), 7.5 (lábio) e 7.6a (bochecha), o subagente de geração de cards produziu texto rico que ultrapassou os caps de `maxLength` do schema `anatomy_v2`. O reviewer `cards-schema` flagou como Important em 7.5 e Blocker em 7.6a (`severity × confidence = 76`). Dr. Arthur autorizou merge consistente em 7.6a, postergando o fix.

Medição em **todos os 90 cards v2** do repo (não só os 3 temas Phase 7) revelou que o drift cobre 9 dos 12 caps. Detalhes em `memory/project_debt_anatomy_v2_maxlength.md` (sistema de memória persistente, fora do repo). Dois fatores explicam por que o drift passou:

1. **Test suite testa schema sintético, não produção.** `tools/tests/test_schema_anatomy.mjs` valida `'x'.repeat(161)` mas não itera `content/cards/**/*.json`.
2. **Pipeline `rag_to_cards.js` não chama AJV.** Geração não tem gate de validação.

## Decisão

**C + A**: relaxar caps no schema para refletir o gênero editorial real (anatomia rica de reconstrução, com Kaufman + Neligan), e adicionar gate AJV no pipeline para travar futuras violações no novo patamar.

Não enxugamos cards existentes. Conteúdo mergeado em 7.4/7.5/7.6a foi consumido e aprovado pelo Dr. Arthur — assumir que os caps originais estavam apertados demais para o gênero é mais honesto que cortar texto validado.

## Caps propostos

Headroom de ~10% sobre o máximo observado, mantendo função de "ceiling contra megacard acidental" (e.g., paste de 5kb num campo).

| Campo (`anatomy_v2.*`) | Cap atual | Max observado | Cap novo |
| --- | --- | --- | --- |
| `title` | 60 | 65 | **80** |
| `aliases[]` items | 60 | 61 | **80** |
| `one_liner` | 160 | 293 | **320** |
| `clinical_hook` | 200 | 330 | **360** |
| `how_to_identify` | 150 | 267 | **300** |
| `structures.description` | 80 | 172 | **200** |
| `structures.label` | 60 | 51 | 60 (mantém) |
| `numbers.label` | 40 | 52 | **60** |
| `numbers.value` | 30 | 43 | **50** |
| `numbers.note` | 60 | 120 | **140** |
| `relations[]` items | 80 | 157 | **180** |
| `location` | 200 | 81 | 200 (mantém) |

`anatomy_legacy` permanece intocado.

## Componentes

### 1. `content/cards/schema.json`

Atualizar 9 caps em `$defs.anatomy_v2` conforme tabela. Adicionar `description` curto em cada cap explicando o racional (e.g., `"description": "Hard ceiling against accidental megacards, not editorial guidance"`).

### 2. `tools/validate_cards_schema.mjs` (novo)

Script standalone (Node, ESM):

- Carrega `content/cards/schema.json` com `Ajv 2020` strict (mesma config do `test_schema_anatomy.mjs`).
- Itera todos os `content/cards/**/*.json`, excluindo `_meta.json`, `_structure.json` e `manifest.json`.
- Para cada arquivo, deduz tipo (anatomy/technique/decision/note/flashcard) pelo `cards[0].type` ou nome do arquivo (`anatomia.json` → anatomy etc.).
- Compila validator por tipo via `$ref: '#/$defs/<type>'`.
- Reporta `OK: N cards | FAIL: M cards`. Para cada falha: path + AJV `errors[]` (instancePath + message).
- Exit code 0 se zero falhas, 1 caso contrário.

Output esperado em master pós-7.6.5: `OK: 111 cards | FAIL: 0` (90 v2 anatomy + 21 legacy + technique/decision/note/flashcard).

### 3. `tools/rag_to_cards.js`

Após gerar cards, chamar `validate_cards_schema.mjs` (via `child_process.spawnSync` ou inline AJV) e abortar com exit 1 se falhar. Mensagem de erro deve incluir o path do card inválido.

### 4. `tools/tests/test_schema_anatomy.mjs`

- Atualizar test "v2 anatomy rejects one_liner over cap": `'x'.repeat(161)` → `'x'.repeat(321)`.
- Adicionar test novo: dry-run de `validate_cards_schema.mjs` (spawnSync) e assertar exit 0 + `FAIL: 0` no stdout.

### 5. `CLAUDE.md §11`

Adicionar bullet:
> Antes de mergear sub-fase com cards novos ou modificados: rodar `node tools/validate_cards_schema.mjs` e reportar `OK: N | FAIL: 0` no relatório de fechamento.

## Test plan

1. **Estado atual (sem mudança de schema)**: rodar `validate_cards_schema.mjs` (sem o relax) — esperado: `FAIL > 0` em ~24 cards Phase 7. Confirma que o validator pega o drift.
2. **Pós-relax**: mesmo script — esperado: `OK: 111 | FAIL: 0`.
3. **Suite existente**: `node --test tools/tests/test_schema_anatomy.mjs` — 5/5 verde (4 originais com cap 320 + 1 smoke novo).
4. **Smoke pipeline**: rodar `tools/rag_to_cards.js` em tema dummy (ou apenas o linker) — verificar que termina com exit 0 e não quebra fluxo existente.

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Schema relaxado mascara excessos editoriais futuros | Caps ainda existem como ceiling; CLAUDE.md §11 exige rodar validator antes de mergear |
| AJV strict pega violações em campos não medidos (e.g., `images.ref` pattern, `id` pattern em tema antigo) | Test plan passo 1 detecta antes do relax; falhas extras viram findings da própria sub-fase 7.6.5 |
| Mudar `rag_to_cards.js` quebra pipelines de outras frentes | Mudança é aditiva (chamada de validador no final); Phase 7.6a passou pelo pipeline pré-7.6.5 OK |

## Escopo não incluído

- Enxugamento de cards existentes (trade-off escolhido)
- Mudança em `anatomy_legacy`
- Pre-commit hook automático (script standalone + CLAUDE.md basta)
- Mudança em renderer ou CSS (texto longo já flui sem quebrar)
- Mudança em outros tipos (`technique`, `decision`, `note`, `flashcard`) — sem drift documentado neles

## Critérios de aceitação

- [ ] `content/cards/schema.json` atualizado com 9 caps novos + descriptions curtos
- [ ] `tools/validate_cards_schema.mjs` criado, executa em < 5s, reporta `OK: 111 | FAIL: 0` em master pós-relax
- [ ] `tools/rag_to_cards.js` chama o validador e aborta em falha
- [ ] `tools/tests/test_schema_anatomy.mjs` atualizado e verde (5/5)
- [ ] `CLAUDE.md §11` ganha bullet do validator
- [ ] `/code-review-board` rodado, relatório em `docs/reviews/`
- [ ] PR aberto, mergeado via squash, branch e worktree limpos
- [ ] Memo `project_phase7_6_5_done.md` + linha em `MEMORY.md` com SHA do squash
