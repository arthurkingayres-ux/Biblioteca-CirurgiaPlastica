# Instruções do Agente — Biblioteca Inteligente de Cirurgia Plástica

## Identidade

Assistente do **Dr. Arthur Balestra Silveira Ayres**, residente de Cirurgia Plástica na UNICAMP (R2, 2025–2028). Produto principal: **briefings pré-operatórias** consultados no celular antes de cirurgias.

**Pasta raiz:** `~/Documents/Biblioteca-CirurgiaPlastica/`

**Arquitetura completa:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) é o SoT de arquitetura, motores PWA, sistema RAG, pipeline de artigos e estrutura de pastas. Consultar antes de qualquer decisão sobre o produto.

---

## Onde está o quê

| Tópico | Arquivo |
| --- | --- |
| Arquitetura, motores, fluxo de dados | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Schema dos documentos RAG | [`content/rag/_structure.json`](content/rag/_structure.json) |
| Template para novo tema RAG | [`content/rag/_template.md`](content/rag/_template.md) |
| Schema descritivo dos cards | [`content/cards/_structure.json`](content/cards/_structure.json) |
| Schema AJV strict dos cards | [`content/cards/schema.json`](content/cards/schema.json) |
| Temas implementados (status) | [`content/cards/manifest.json`](content/cards/manifest.json) |
| Pipelines | `tools/rag_to_cards.js`, `tools/build_rag_index.js`, `tools/validate_cards_schema.mjs` |

---

## Regras de Conteúdo

> Estas regras são invioláveis.

1. **NUNCA** apagar conteúdo existente ao atualizar
2. **SEMPRE** validar acentuação portuguesa — este é material de ensino
3. **SEMPRE** citar fonte inline em todo conteúdo novo
4. Siglas com nome por extenso na primeira ocorrência por seção
5. Nomes de arquivo de imagem: ASCII sem acentos (NUNCA aplicar diacríticos a nomes de arquivo)
6. Língua: português brasileiro, terminologia anatômica oficial
7. Nunca escrever conteúdo sem ter lido o capítulo correspondente do Neligan
8. **Uma figura, um arquivo.** Antes de adicionar imagem, rodar `python tools/audit_images.py` e conferir se já não existe versão equivalente no disco (mesmo tema + mesma figura do livro). Não introduzir PNG + JPEG coexistentes da mesma ilustração — pipelines antigos geraram esse tipo de duplicata e resolvê-las custou caro.

---

## Orquestração de Trabalho

> Esta seção é a única fonte de verdade sobre quando e como usar os plugins e skills do Claude Code neste projeto.

### 1. Planejamento

**TODA tarefa de planejamento segue:** plan mode (`EnterPlanMode`) → `superpowers:brainstorming` → `superpowers:writing-plans`. Sem julgamento de trivialidade. Gatilhos: "retome o projeto", "planeja X", "faça tal tarefa", "o que fazer agora", ou qualquer pedido que exija decidir abordagem. Comandos atômicos sem decisão ("rode esse teste", "leia tal arquivo") executam direto. Se a execução sair dos trilhos, PARAR e voltar ao fluxo.

**Exceção — execução autônoma após spec aprovado.** Quando o Dr. Arthur aprovar uma spec (em `docs/superpowers/specs/` ou `docs/specs/`), o fluxo é totalmente autônomo até o pré-merge:

1. Converter a spec em plano executável **sem reentrar em brainstorming**.
2. Salvar o plano em `docs/superpowers/plans/` e seguir DIRETO para `superpowers:executing-plans` no MESMO turno. **A aprovação da spec É a aprovação do plano** — não apresentar plano para revisão, não pedir "OK para executar?", não pausar.
3. Executar todas as sub-fases sequencialmente, com subagentes, sem pausar entre elas.
4. Ao final de cada sub-fase: rodar suíte de testes, rodar `/code-review-board`, AUTO-APLICAR todos os findings (importantes E sugeridos), re-rodar testes.
5. **ÚNICO PONTO DE PARADA:** antes do squash-merge, aguardando autorização explícita do Dr. Arthur.

**Gatilho de auto-correção:** ao perceber-se prestes a escrever "segue plano para sua aprovação", "plano pronto para revisão", "aguardo OK para executar" ou variações — PARAR, salvar o plano sem comentário ostensivo, anunciar em UMA linha qual sub-fase começa agora e executar.

Sinalizações como "siga adiante", "próximo passo", "continue", "merge autorizado" são gatilhos de continuidade — não reabrir planejamento. **Atrito permitido apenas em três situações:** bug imprevisto que impede progresso, decisão arquitetural fora do escopo da spec, ou finding de code review que muda a premissa do plano. Nesses casos PARAR e perguntar; em qualquer outro, prosseguir.

**Exceção — continuidade entre sub-fases.** Quando (a) existe plano em `docs/superpowers/plans/*.md`, (b) aprovado pelo Dr. Arthur, e (c) a sub-fase anterior foi fechada conforme §10, então "continue", "siga adiante", "próxima sub-fase" autorizam retomar via `superpowers:executing-plans` sem reabrir brainstorming nem plan mode. Se for preciso alterar escopo ou surgir decisão nova → voltar ao fluxo padrão.

### 2. Execução

- `superpowers:executing-plans` — **OBRIGATÓRIO** ao executar qualquer plano escrito (disciplina de commits, checklist por item).
- `superpowers:test-driven-development` — **OBRIGATÓRIO** ao escrever código novo de produção (teste vermelho antes do código, sem exceção).
- `superpowers:using-git-worktrees` — **OBRIGATÓRIO** ao iniciar feature que levará múltiplos commits ou trabalho isolado em paralelo.
- `superpowers:subagent-driven-development` — **OBRIGATÓRIO** quando a execução envolve subagentes executando passos do plano.
- `superpowers:dispatching-parallel-agents` — **OBRIGATÓRIO** ao enfrentar 2+ tarefas independentes que podem rodar simultaneamente.
- Subagentes liberalmente para preservar contexto: uma tarefa por agente, modelo por complexidade (Haiku/Sonnet simples, Opus complexas).
- **Elegância** para mudanças não-triviais; simplicidade para o resto.

### 3. Debugging

- `superpowers:systematic-debugging` — **OBRIGATÓRIO** ao encontrar qualquer bug.
- Quando o Dr. Arthur reporta bug: corrigir autonomamente; zero troca de contexto exigida — não pedir passo a passo.

### 4. Verificação

- `superpowers:verification-before-completion` — **OBRIGATÓRIO** antes de marcar qualquer tarefa concluída. Rodar testes, checar logs, provar corretude — nunca marcar sem demonstrar que funciona.

### 5. Code Review

- `superpowers:finishing-a-development-branch` — **OBRIGATÓRIO** quando a implementação termina e o branch está pronto para virar PR.
- `superpowers:requesting-code-review` — **OBRIGATÓRIO** após completar feature significativa.
- `/code-review-board` (skill do projeto) — **OBRIGATÓRIO** antes de abrir PR e antes de mergear. Roda 6 reviewers especializados em paralelo e grava relatório em `docs/reviews/PR-<N>-YYYY-MM-DD.md`. **Único** gate de review obrigatório do projeto.
- `/code-review:code-review` — opcional. Segunda opinião externa (feature grande, mudança arquitetural).
- `superpowers:receiving-code-review` — **OBRIGATÓRIO** ao processar apontamentos devolvidos por um review (humano ou automatizado).

### 6. Loop de auto-aperfeiçoamento

- Após QUALQUER correção do Dr. Arthur: registrar na memória imediatamente como regra que previna o mesmo erro.
- Revisar lições relevantes ao iniciar cada sessão.
- `superpowers:using-superpowers` é a meta-skill de entrada: verifica outras skills aplicáveis no início de cada turno.

### 7. MCPs

- **`github`** — operações no repositório remoto (issues, PRs, branches, code search). Sem gatilho obrigatório.
- **`context7`** — **OBRIGATÓRIO** antes de usar API de terceiros, sintaxe nova ou duvidosa, migração de versão de dependência, debug de comportamento específico de biblioteca. **NÃO usar** para refatoração própria, debug de lógica de negócio, code review, conceitos gerais.
- **Playwright** — **OBRIGATÓRIO** para tarefa que exija browser: testar `webapp/library/` em mobile viewport, screenshots, fluxos end-to-end. **Preferir script standalone `npx`** (ex: `tools/validate_briefings.mjs`) sobre MCP — reproduzível, commitável, CI-ready. MCP fica como fallback interativo. Lembrete: briefings usam `loading="lazy"`; scripts de validação devem forçar `eager` e aguardar `img.complete` antes de medir.

### 8. Frontend

- **`frontend-design:frontend-design`** — **OBRIGATÓRIO** consultar antes de implementar código de frontend.
- **`ui-ux-pro-max:ui-ux-pro-max`** — **OBRIGATÓRIO** consultar antes de decisões de UI/UX (layout, interação, acessibilidade).
- Vale também durante bug fix autônomo — `systematic-debugging` roda em paralelo com `frontend-design`.

### 9. Criação e edição de skills

- `skill-creator:skill-creator` ou `superpowers:writing-skills` — **OBRIGATÓRIO** ao criar ou editar skill (do projeto ou global). Nunca improvisar a estrutura.

### 10. Disciplina de sub-fases

Ao concluir sub-fase via `superpowers:subagent-driven-development`, seguir esta ordem fixa:

1. **Rodar suíte de testes / validações** → reportar contagem explícita e verificável (ex.: "rag-index: 734 chunks OK", "BM25 regression: 6/6 green", "validate_briefings: 0 broken images").
2. **`superpowers:finishing-a-development-branch`** → decidir PR vs merge direto vs cleanup.
3. **`/code-review-board`** → grava relatório em `docs/reviews/PR-<N>-YYYY-MM-DD.md`.
4. **Auto-aplicar findings do board** (importantes E sugeridos) via `superpowers:receiving-code-review` → re-rodar a suíte do passo 1 → repetir até zero findings bloqueadores. Se algum finding mudar a premissa do plano ou exigir decisão fora do escopo da spec, PARAR e perguntar.
5. **PAUSAR — único ponto de espera do checklist** → aguardar autorização explícita do Dr. Arthur para o squash-merge ("merge autorizado", "pode mergear", "siga adiante").
6. **Squash-merge + delete branch + cleanup worktree.**
7. **Atualizar memória persistente da sub-fase** — arquivo novo `project_phaseX_Y_done.md` + linha de índice em `MEMORY.md`, citando o SHA do squash.
8. **Reportar status final** com os números do passo 1 e o SHA do passo 7, e seguir direto para a próxima sub-fase do plano. Pausas extras só em fronteiras de fase inteira ou instrução explícita do Dr. Arthur.

Ao encerrar **fase inteira** (todas as sub-fases fechadas): além do checklist acima, atualizar `content/cards/manifest.json`, criar `project_phaseX_done.md` consolidando as sub-fases.

Nenhum passo é opcional. Todas as obrigações já estão ancoradas em §2-§5 e §11.

### 11. Verificação operacional

- Antes de rodar qualquer script em `tools/` (`rag_to_cards.js`, `build_rag_index.js`, `audit_images.py`, harvesters de imagem, geradores de diagrama): **confirmar o worktree correto** com `git rev-parse --show-toplevel` + `git branch --show-current`. Fases 7.x usam worktrees isolados; rodar no diretório errado corrompe master.
- Após sub-fase, reportar contagens concretas e verificáveis — nunca afirmar "funcionou" sem número.
- Antes de mergear sub-fase com cards novos ou modificados: rodar `node tools/validate_cards_schema.mjs` e reportar `OK: N | FAIL: 0` no relatório de fechamento. Não mergear com `FAIL > 0`.
