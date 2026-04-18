# Phase 5 — Pending Images Sweep (Design Spec)

## Context

Phase 4 (card uniformity) migrou os 65 anatomy cards dos 7 temas contorno+face para schema v2. Porém 36 desses cards ficaram com `images: []` por falta de tempo de mapear figuras — débito documentado em `content/cards/_pending_images.md`. Phase 5 zera esse débito mapeando cada card pending para uma figura (existente em `assets/images/<tema>/` ou extraída do Neligan 5ed), criando a library entry correspondente e referenciando-a no card.

Motivação: briefings pré-operatórios rendem muito melhor no iPhone quando cada card de anatomia traz sua figura. 36 cards sem imagem = 36 pontos do briefing que dependem só de texto. Após Phase 5, a anatomia v2 estará visualmente completa nos 7 temas.

## Escopo

36 cards pendentes, em 2 PRs sequenciais por área:

**PR 5A — contorno-corporal (11 cards)**
- abdominoplastia (1): `abdo-anat-005`
- gluteoplastia (3): `glut-anat-001`, `-007`, `-008`
- contorno-pos-bariatrico (7): `cpb-anat-002`, `-007`, `-008`, `-009`, `-010`, `-011`, `-012`

**PR 5B — estetica-facial (25 cards)**
- rinoplastia (10): `rino-anat-003`, `-004`, `-005`, `-007`, `-009`, `-011`, `-012`, `-013`, `-015`, `-016`
- blefaroplastia (15): 15 cards listados em `_pending_images.md`

## Workflow por card

1. **Buscar asset existente**: olhar subject do card pending, buscar keyword em `assets/images/<tema>/`.
2. **Se hit**: `Read` na imagem pra confirmar conteúdo → criar library entry em `content/images/<tema>/img-<slug>-001.json` com labels numerados → referenciar no card via `{ref: "img-<slug>-001"}`.
3. **Se miss**: rodar `python tools/audit_images.py` (regra #8 CLAUDE.md: evitar duplicatas) → tentar extração via `python tools/extract_figures.py` ou `extract_labeled_figures.py` no capítulo Neligan relevante → se nada adequado aparecer, manter `images: []` e deixar card no `_pending_images.md` regenerado (débito residual).
4. **Último recurso** para conceitos sem figura (ex: "ligamentos nasais", "mecanismos de suporte da ponta"): `python tools/generate_diagrams.py`.

## Disciplina herdada de Phase 4

- **Haiku subagent** (`subagent_type: general-purpose`, `model: haiku`) para blefaroplastia (15 cards) — prompt com tabela explícita card→imagem + regra de expansão de acrônimos por campo (na primeira ocorrência de `SMAS`, `CLS`, `ROOF`, `ORL`, etc.).
- **Opus inline** para lotes ≤10 cards (todos os outros temas).
- **Library entry schema** (validado em Phase 4):

```json
{
  "id": "img-<slug>-001",
  "file": "assets/images/<tema>/<filename>",
  "subject": "...",
  "role": "overview|detail",
  "source": "Neligan 5ed, ch.XX, fig.XX-XX",
  "credit": "Neligan PC et al., Plastic Surgery 5ed (Elsevier 2023)",
  "default_caption": "...",
  "labels": [{"n": 1, "text": "..."}, ...],
  "applicable_topics": ["<tema>"],
  "status": "available"
}
```

## Arquivos críticos

- `content/cards/<area>/<tema>/anatomia.json` — 5 arquivos tocados (1 por tema com pendentes)
- `content/images/<tema>/img-*.json` — novos library entries (até 36)
- `content/images/manifest.json` — regenerado por `build_image_manifest.py`
- `content/cards/_pending_images.md` — regenerado por `tools/report_pending_images.mjs`
- `webapp/library/sw.js` — bump cache (v20→v21 no PR 5A; v21→v22 no PR 5B)

## Ferramentas reutilizadas

- `tools/audit_images.py` — preveni duplicatas PNG/JPEG
- `tools/extract_figures.py` e `tools/extract_labeled_figures.py` — extração de figuras do Neligan PDF
- `tools/generate_diagrams.py` — fallback para diagramas SVG (criado na Frente B)
- `tools/build_image_manifest.py` — regenera `content/images/manifest.json`
- `tools/report_pending_images.mjs` — regenera `_pending_images.md`
- `tools/lint_acronyms.py` — valida expansão de siglas por campo
- `tools/validate_briefings.mjs` — smoke test Playwright (viewport mobile)

## Verificação (por PR)

1. `ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d 'content/cards/<area>/<tema>/anatomia.json'` para cada tema tocado — OK.
2. `python tools/lint_acronyms.py` — sem warnings nos temas tocados.
3. `node tools/report_pending_images.mjs` — total de pendentes reduziu conforme esperado (PR 5A: 36→25; PR 5B: 25→0 ou próximo disso, dependendo de quantos ficarem como débito residual).
4. `python tools/build_image_manifest.py` — manifest regenerado sem erros.
5. `npx tools/validate_briefings.mjs` — smoke test do briefing do(s) tema(s) tocado(s), confirmar que imagens renderizam, sem 404 no console.
6. Após tudo verde, abrir PR, rodar `/code-review:code-review`, só então mergear.

## Execução sequencial (alto nível)

1. Escrever spec + plan em `docs/superpowers/` (este arquivo + plan detalhado) e commitar.
2. **PR 5A (contorno-corporal)**: worktree `feature/card-uniformity-phase-5a-contorno`, tema por tema (abdomino → gluteo → CPB), bump SW v20→v21, PR, review, merge.
3. **PR 5B (estetica-facial)**: worktree `feature/card-uniformity-phase-5b-face`, rinoplastia Opus inline, blefaroplastia via Haiku subagent, bump SW v21→v22, PR, review, merge.
4. Cleanup worktrees + memória atualizada.

## Riscos / mitigações

- **Risco**: asset existente não corresponder exatamente ao subject do card. **Mitigação**: sempre `Read` na imagem antes de escrever labels (memória `feedback_verify_image_content_before_mapping`).
- **Risco**: acrônimos (ROOF, ORL, CLS) não expandidos por campo. **Mitigação**: `lint_acronyms.py` gate + prompt explícito no Haiku subagent.
- **Risco**: débito residual se Neligan não tiver figura para algum conceito. **Mitigação**: aceito — documentar em `_pending_images.md` + próximo passo possível seria gerar SVG custom em Phase 6.

## Próximos passos após Phase 5

- Possível Phase 6: migrar 6 temas pele-tumores para schema v2 (ainda legado).
- Possível Phase 7: diagramas SVG custom para conceitos abstratos sem figura Neligan.
