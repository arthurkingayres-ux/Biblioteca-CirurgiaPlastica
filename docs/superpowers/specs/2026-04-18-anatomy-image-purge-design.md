# Spec — Phase 7.2: Purge de imagens de anatomia

**Data:** 2026-04-18
**Status:** Aprovado pelo Dr. Arthur em 2026-04-18
**Fase:** 7.2

## Contexto

O PWA atualmente exibe imagens nos cards de anatomia v2 (Phase 3 piloto + Phase 4 rollout + Phase 6B overlays numéricos runtime). Ao consumir o produto, o Dr. Arthur avaliou que o resultado visual é insatisfatório: labels erradas, figuras recicladas, overlays que não leem, correspondência fraca entre figura e texto do card. O investimento em corrigir caso a caso gasta tokens e tempo sem convergir para um modelo reprodutível.

**Decisão:** remover sistematicamente todas as imagens dos cards de anatomia e liberar o espaço para reintrodução futura, em processo curado (visual companion + labels intra-imagem + caption extra-imagem), quando houver um modelo bom e replicável.

**Exemplo do shape-alvo:** o card `abdo-anat-005` (*Gordura Visceral*) já renderiza corretamente sem campo `images` — seções de anatomia v2 intactas, só sem figura. Esse é o estado-alvo para todos os 64 cards afetados.

## Escopo

**Incluído** — 8 temas v2 de contorno corporal + estética facial:

| Área | Tema | Cards anatomia |
|---|---|---|
| contorno-corporal | abdominoplastia | 5 |
| contorno-corporal | contorno-pos-bariatrico | 6 |
| contorno-corporal | gluteoplastia | 8 |
| contorno-corporal | lipoaspiracao | 4 |
| estetica-facial | blefaroplastia | 20 |
| estetica-facial | otoplastia | 2 |
| estetica-facial | rinoplastia | 15 |
| estetica-facial | ritidoplastia | 4 |

**Total:** 64 cards anatomia com imagem → 0 cards com imagem.

**Fora de escopo:**

- Cards de outros tipos (`técnicas`, `decisoes`, `notas`, `flashcards`) — mantêm imagens como estão.
- Temas v1/v2 de `pele-tumores/` (6 temas, 21 cards anatomia com imagem) — mantidos intactos.
- Nenhum card fora de anatomia é tocado, em nenhum tema.

## Arquitetura das mudanças

Quatro camadas de artefatos estão envolvidas. Cada uma tem tratamento específico.

### Camada 1 — Cards (`content/cards/<area>/<tema>/anatomia.json`)

Para cada card dos 8 temas em escopo: remover o campo `images`. Todos os outros campos preservados (`title`, `aliases`, `one_liner`, `structures[]`, `relations[]`, `key_points[]`, `clinical_hook`, `how_to_identify`, `citations`, `updates`, `tags`).

Shape-alvo idêntico a `abdo-anat-005`:

```json
{
  "id": "abdo-anat-005",
  "type": "anatomy",
  "title": "Gordura Visceral",
  "aliases": ["..."],
  "topic": "abdominoplastia",
  "area": "contorno-corporal",
  "one_liner": "...",
  "structures": [...],
  "key_points": [...],
  "clinical_hook": "...",
  "how_to_identify": "...",
  "citations": [...],
  "updates": [],
  "tags": [...]
}
```

Nenhum campo novo adicionado, nenhum placeholder. A ausência de `images` é a sinalização.

### Camada 2 — Registry de imagens (`content/images/<tema>/*.json`)

Cada imagem de anatomia tem um JSON de registro com `file`, `labels[]` (com coords `x`/`y`), `default_caption`, `credit`. Esses registros refletem o editorial do modelo antigo (labels, overlays) que está sendo descartado.

**Ação:** mover para `content/images/<tema>/_archived/`. Não deletados — o Dr. Arthur optou por arquivar para referência histórica.

Apenas registros referenciados por cards de anatomia nos 8 temas em escopo são arquivados. Registros usados por outros card types (técnicas etc.) permanecem ativos.

### Camada 3 — PNGs físicos (`assets/images/<tema>/` + `webapp/library/assets/images/<tema>/`)

Cada PNG associado a um registro arquivado também é movido.

**Ação:** mover para `assets/images/<tema>/_archived/` e `webapp/library/assets/images/<tema>/_archived/`.

PNGs são extrações brutas de livros-texto (Neligan, Grabb) e em si neutros — podem virar matéria-prima no pipeline futuro. Arquivar preserva trabalho de extração já feito.

### Camada 4 — Índices centrais

**`content/images/manifest.json`:** remover entradas de imagens arquivadas. Manter entradas de imagens que continuam ativas (outros card types, outras áreas).

**`tools/_coords/<tema>.json`:** remover entradas de coordenadas das imagens arquivadas. Se o arquivo ficar vazio, mover o arquivo todo para `tools/_coords/_archived/`.

### Camada 5 — Renderer e overlays

Nenhuma mudança comportamental necessária. O renderer da seção Anatomia Relevante já lida corretamente com cards sem `images` (evidência empírica: `abdo-anat-005` renderiza limpo hoje).

O código de overlay numérico runtime (Phase 6B — desenha `1`, `2`, `3` sobre figuras usando `x`/`y` dos coords) fica **dormente**: só dispara se o card tem `figures`/`images`; com todos vazios, nunca executa. Custo zero, fácil reativar no futuro.

### Camada 6 — Service Worker e cache

- Bump `CACHE_NAME` de `v26` para `v27`.
- Bump `?v=` query-string suffix no `index.html` e no `sw.js` ASSETS para `2026-04-18-image-purge`.
- Regenerar manifest do SW via script existente para listar assets ativos (exclui `_archived/`).

Validação: offline funciona após deploy, cache velho é invalidado, usuários veem estado novo sem intervenção manual.

### Camada 7 — Validators

Scripts standalone Playwright em `tools/validate_*.mjs` podem testar presença de figuras de anatomia. Revisar e ajustar:

- `tools/validate_anatomy_opener.mjs` — testa chapter-opener editorial (Phase 7.1). Se também testa imagens, ajustar para aceitar zero figuras em anatomia.
- Demais validators — scan rápido, ajuste pontual.

## Pipeline futuro (registrado, não executado nesta fase)

Quando o Dr. Arthur decidir reintroduzir imagens, o processo será:

1. **Seleção colaborativa via visual companion**: brainstorming visual interativo com o Dr. Arthur, comparando candidatas em browser local, decidindo figura por card.
2. **Labels intra-imagem**: números desenhados sobre a figura (não runtime — commitados na imagem final), validados visualmente pelo Dr. Arthur antes de commit.
3. **Caption extra-imagem**: texto explicativo ao lado da figura, com referência bibliográfica.
4. **Iteração por card, não em massa**: um card por vez, confirmado antes de avançar.

Este pipeline é o modelo reprodutível que ainda não existe — construído tema a tema quando o Dr. Arthur decidir.

## Verificação

**Automatizada:**

- Script novo `tools/validate_anatomy_image_purge.mjs` (standalone Playwright) que abre os 8 briefings em viewport mobile (iPhone-width), navega até a seção Anatomia Relevante, e confirma:
  - Zero elementos `<img>` ou `<figure>` renderizados dentro de cards anatomia.
  - Cards renderizam título + texto corretamente (pelo menos `one_liner` + `structures[]`).
  - Chapter-opener editorial da Phase 7.1 (wordmark, itálico, régua) mantido.

**Manual:**

- Abrir briefing de abdominoplastia no celular: confirmar Camadas, Zonas de Huger, Reto Abdominal etc. renderizam só texto. Confirmar Gordura Visceral (controle) idêntica ao estado atual.
- Abrir briefing de blefaroplastia (maior volume, 20 cards): confirmar todos os cards renderizam sem figura e sem degradação visual.

**Smoke cross-feature:**

- Briefing de cards sem anatomia afetada (ex: lipoaspiracao — só 4 anatomia cards, muito mais técnica/decisão): confirmar que técnica/decisão/etc. continuam com imagens intactas.

## Riscos e mitigações

**Risco 1 — Over-purging**: afetar cards fora dos 8 temas ou de outros card types.
**Mitigação:** filtro explícito por lista de (área, tema) hardcoded; script de purge lê apenas `anatomia.json` desses 8 diretórios; dry-run antes da execução real mostra contagem exata.

**Risco 2 — Registry órfão**: imagem referenciada por anatomia E outro card type, arquivamento quebra o outro.
**Mitigação:** antes de arquivar cada registry JSON, grep em todos os cards do tema por `"ref": "<img-id>"`. Se >1 card referencia, alertar e não arquivar a imagem (card anatomia ainda perde o `images` — mas registry+PNG ficam).

**Risco 3 — SW cache stale**: usuários ficam com versão antiga.
**Mitigação:** bump `CACHE_NAME` + bump `?v=` suffix (padrão das phases anteriores, testado).

**Risco 4 — Código de overlay quebra no estado "zero imagens"**: alguma branch defensiva faltando.
**Mitigação:** teste manual no primeiro tema (abdominoplastia), confirmar zero erro console. Se quebrar, fix antes de prosseguir.

## Critérios de sucesso

- Nenhum card anatomia dos 8 temas renderiza figura no PWA.
- Todos os outros cards (técnicas/decisões/etc.) nos mesmos temas renderizam suas figuras normalmente.
- Pele-tumores intacto.
- SW cache novo ativa, offline funciona, zero regressão em outras seções do briefing.
- Registry + PNGs + coords de imagens de anatomia estão em `_archived/` — zero deleção permanente.
- Código de overlay runtime intacto, dormente.
- Spec para pipeline futuro (visual companion) registrado.

## Fora do escopo desta fase

- Criar ou validar o pipeline de reintrodução de imagens. Isso acontece em fase posterior, card a card, quando o Dr. Arthur decidir.
- Tocar em cards de pele-tumores (qualquer tipo).
- Tocar em cards não-anatomia de qualquer tema.
- Refatorar o código de overlay numérico runtime — fica dormente, sem alteração.
