# CLAUDE.md slimming + extract architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir `CLAUDE.md` de 308 para ~160 linhas movendo arquitetura/RAG/PWA/pipeline/pastas para `docs/ARCHITECTURE.md`, e fazer tightening moderado do harness §1-§11. Zero perda de conteúdo.

**Architecture:** Doc-only changes. Cria `docs/ARCHITECTURE.md` (novo) e reescreve `CLAUDE.md` (existente). Verificação manual via `git diff` + `wc -l` + checagem bullets-a-bullets contra versão atual. Sem código, sem testes automatizados, sem PR — commit único em master após o Dr. Arthur conferir o diff.

**Tech Stack:** Markdown puro. Ferramentas: Write, Read, Edit, Bash (`git`, `wc`).

**Spec:** `docs/superpowers/specs/2026-04-25-claude-md-slimming-design.md` (commit 607194e).

---

## File Structure

- **Create**: `docs/ARCHITECTURE.md` — narrativa humana de arquitetura, RAG, PWA, pipeline de artigos, estrutura de pastas. Único SoT de explicação humana de arquitetura. Schemas técnicos continuam em `content/rag/_structure.json`, `content/cards/_structure.json`, `content/cards/schema.json`.
- **Modify**: `CLAUDE.md` — reescrito na nova estrutura compacta: identidade + ponteiros para docs externos + regras de conteúdo + harness §1-§11 com tightening B.
- **Reference (não modificados)**: `content/rag/_structure.json`, `content/rag/_template.md`, `content/cards/_structure.json`, `content/cards/schema.json`, `content/cards/manifest.json`.

---

## Task 1: Criar `docs/ARCHITECTURE.md` com todo o conteúdo deslocado

**Files:**
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Ler `CLAUDE.md` atual integralmente para extração precisa**

Run: `Read CLAUDE.md` (já feito no brainstorming, mas re-confirmar antes de escrever).

- [ ] **Step 2: Escrever `docs/ARCHITECTURE.md`**

Conteúdo completo (sem cortes — apenas relocação):

````markdown
# Arquitetura — Biblioteca Inteligente de Cirurgia Plástica

## Identidade do Projeto

Assistente do **Dr. Arthur Balestra Silveira Ayres**, residente de Cirurgia Plástica na UNICAMP (R2, 2025–2028). Construímos um digital companion: um PWA mobile-first para consultas rápidas e planejamento cirúrgico.

**Produto principal:** Briefings pré-operatórias — material completo para planejamento cirúrgico, consultado no celular antes de cirurgias.

---

## Visão Geral

O projeto é composto de um **sistema RAG** + **2 motores** que o consomem:

```text
┌─────────────────────────────────────────────┐
│          PWA Library (webapp/library/)       │
│                                             │
│   Tela inicial: 2 ícones                   │
│   ┌──────────────┐  ┌──────────────┐       │
│   │  Briefing    │  │   Chat IA    │       │
│   │  Pré-Op      │  │              │       │
│   │  (offline)   │  │  (online)    │       │
│   └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────┤
│           Sistema RAG (invisível)           │
│  Documentos unificados → Cards atômicos    │
│  Fontes: livros-texto + artigos científicos │
└─────────────────────────────────────────────┘
```

- **Sistema RAG**: camada de dados que o Dr. Arthur não vê. Um documento unificado por tema agregando livros-texto (ref. primárias) + artigos (ref. secundárias). O agente lê, edita e consulta livremente.
- **Motor 1 — Briefing Pré-Op**: montado offline a partir de cards atômicos derivados do RAG. Anatomia, técnica, decisões, complicações — tudo para uma cirurgia específica.
- **Motor 2 — Chat IA**: perguntas livres em linguagem natural. RAG fornece contexto, Claude API gera resposta. Requer internet.

### Hierarquia de dados

```text
RAG unificado (fonte de verdade) → Cards atômicos (derivados) → PWA renderiza
```

Os cards devem sempre refletir a verdade científica do RAG. Se o RAG atualiza, os cards seguem.

---

## Sistema RAG

### Duas camadas

**Camada 1 — Documentos RAG** (fonte de verdade):

```text
content/rag/<area>/<tema>.md
content/rag/<area>/_<horizontal>.md   # RAGs transversais (princípios, atlas) — área reconstrucao-facial
```

Um arquivo por tema cirúrgico. Documento completo — tudo sobre o tema, como um capítulo de referência. Agrega livros-texto + artigos numa narrativa densa. O Dr. Arthur não consome diretamente; o agente é o único consumidor.

Arquivos prefixados `_` são **RAGs horizontais** (não ligados a um tema específico): referência compartilhada por vários temas da área — ex.: `_principios-reconstrucao.md` e `_atlas-retalhos.md` em `reconstrucao-facial/`.

**Camada 2 — Cards atômicos** (derivados para o PWA):

```text
content/cards/<area>/<tema>/
├── _meta.json       # Metadados (versão, referências, contagens)
├── anatomia.json    # Estruturas, landmarks, relevância cirúrgica
├── tecnicas.json    # Passos, indicações, complicações
├── decisoes.json    # Árvores de decisão clínica
├── notas.json       # Fisiopatologia, princípios, contexto
└── flashcards.json  # Pares pergunta/resposta
```

Cards são gerados a partir dos documentos RAG. Consumidos pelo PWA.

### Pipelines

- `tools/rag_to_cards.js` — deriva cards atômicos a partir dos documentos RAG.
- `tools/build_rag_index.js` — gera `webapp/library/rag-index.json` (BM25) que alimenta o Chat IA.
- `tools/validate_cards_schema.mjs` — valida todos os `content/cards/<area>/<tema>/*.json` contra `schema.json` (AJV strict). Chamado por `rag_to_cards.js` ao final do pipeline e exigido antes de mergear sub-fase com cards novos.

### Estrutura canônica dos documentos RAG

Descrição completa em [`content/rag/_structure.json`](../content/rag/_structure.json). Template para novos temas em [`content/rag/_template.md`](../content/rag/_template.md). A estrutura espelha os capítulos do Neligan 5ed — headers em inglês, conteúdo em português brasileiro.

### Estrutura dos cards atômicos (JSON)

Descrição completa em [`content/cards/_structure.json`](../content/cards/_structure.json). Schema JSON formal em [`content/cards/schema.json`](../content/cards/schema.json). Cinco tipos: `anatomy`, `technique`, `decision`, `note`, `flashcard` — mais o badge `update` (inserido em qualquer card quando um artigo científico atualiza o conteúdo).

### Referências primárias (livros-texto em `00-Livros-Texto/`)

| Livro | Edição |
| --- | --- |
| Neligan's Plastic Surgery | 5ª Ed., Elsevier, 2023 (Vol 1–6) |
| Grabb and Smith's Plastic Surgery | 9ª Ed., 2024 |
| Neligan Core Procedures | 2ª Ed., Elsevier, 2020 |
| Operative Dictations in Plastic and Reconstructive Surgery | — |
| Craniofacial Trauma | 2ª Ed., 2019 |
| Acessos Cirúrgicos ao Esqueleto Facial | 2ª Ed. (Ellis & Zyde) |
| Practical Facial Reconstruction: Theory and Practice | — |
| The Cutaneous Arteries of the Human Body | — |
| High Definition Body Sculpting | — |

Neligan 5ª Ed. é a base preferencial. Demais consultados conforme pertinência temática.

### Referências secundárias (artigos científicos)

Periódicos-alvo: PRS, ASJ, JPRAS, Annals, CPS, RBCP. Incorporados ao RAG via pipeline de varredura.

**Regra fundamental:** Livros-texto são a BASE. Artigos COMPLEMENTAM — nunca substituem.

### Temas implementados

Lista viva em [`content/cards/manifest.json`](../content/cards/manifest.json) (status `complete` vs `draft`). Expansão contínua tema a tema, conforme demanda do Dr. Arthur.

---

## PWA Library (`webapp/library/`)

O Dr. Arthur consome a biblioteca exclusivamente pelo iPhone.

**Servir localmente:** `npm run dev` (porta 5173).

**Tela inicial:** 2 ícones — Briefings Pré-Operatórias e Chat IA.

### Motor 1 — Briefing Pré-Op (offline)

- Busca por procedimento dentro da seção de briefings
- Output: briefing montado automaticamente combinando cards relevantes
  - Anatomia (subseção privilegiada, colapsável)
  - Técnica passo a passo
  - Decisões clínicas
  - Complicações
- Funciona offline — todo conteúdo em cache local

### Motor 2 — Chat IA (online)

- Perguntas livres em linguagem natural
- RAG fornece contexto, Claude API gera resposta
- Para comparações, nuances, perguntas que não cabem numa ficha
- Requer internet

**Hosting:** GitHub Pages (gratuito).

---

## Pipeline de Artigos Científicos

1. **Varredura** (sob demanda): agente busca PubMed → triagem IA → apresenta ao Dr. Arthur
2. **Aprovação**: Dr. Arthur decide quais artigos merecem entrar no RAG
3. **Download**: Dr. Arthur baixa PDFs via VPN UNICAMP → salva em `02-Artigos-Periodicos/_inbox/`
4. **Incorporação**: agente lê PDF → atualiza documento RAG do tema no local exato → atualiza cards derivados

### Critérios de triagem

| Prioridade | Tipo de estudo |
| --- | --- |
| **ALTA** | Meta-análise / Revisão Sistemática / RCT com n > 30 |
| **MÉDIA** | Estudo comparativo/coorte / Técnica nova com série > 20 casos |
| **BAIXA** | Série de casos < 20 (apenas se tema raro) |
| **EXCLUIR** | Relato isolado, estudo animal, editorial, carta ao editor |

---

## Estrutura de Pastas

```text
~/Documents/Biblioteca-CirurgiaPlastica/
├── 00-Livros-Texto/                # PDFs na íntegra — referências primárias
├── 01-Documentos-Estudo/Imagens/   # Inbox de imagens curadas pelo Dr. Arthur
├── 02-Artigos-Periodicos/          # PDFs de artigos + _inbox/ para novos downloads
├── content/
│   ├── rag/<area>/<tema>.md        # Documentos RAG unificados (fonte de verdade)
│   └── cards/<area>/<tema>/        # Cards atômicos derivados (consumidos pelo PWA)
├── assets/images/<tema>/           # Imagens renderizadas nos cards
├── webapp/
│   ├── approval/                   # PWA de aprovação/triagem de artigos
│   └── library/                    # PWA principal (briefing pré-op + chat IA)
├── tools/                          # Scripts Python e Node.js
├── docs/superpowers/specs/         # Specs de design
├── docs/superpowers/plans/         # Planos de execução (writing-plans)
├── docs/evaluations/               # Avaliações de skills / pipelines
└── CLAUDE.md                       # Harness do agente
```
````

- [ ] **Step 3: Verificar arquivo escrito**

Run: `wc -l docs/ARCHITECTURE.md`
Expected: ~150 linhas (sanity check).

Run: `Read docs/ARCHITECTURE.md` (primeiras e últimas 50 linhas).
Expected: cabeçalho, diagrama ASCII, tabela de livros, árvore de pastas — tudo presente.

---

## Task 2: Reescrever `CLAUDE.md` na nova estrutura compacta

**Files:**
- Modify: `CLAUDE.md` (rewrite total)

- [ ] **Step 1: Escrever novo `CLAUDE.md`**

Conteúdo completo:

````markdown
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
````

- [ ] **Step 2: Verificar arquivo escrito**

Run: `wc -l CLAUDE.md`
Expected: 150-180 linhas. Se > 180, voltar ao Step 1 e apertar mais.

---

## Task 3: Verificar preservação de regras e qualidade dos links

**Files:**
- Read-only: `CLAUDE.md`, `docs/ARCHITECTURE.md`

- [ ] **Step 1: Confirmar que cada skill / regra do harness antigo aparece no novo**

Para cada um dos itens abaixo, executar `Grep` no novo `CLAUDE.md` confirmando presença:

- `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:executing-plans`
- `superpowers:test-driven-development`, `superpowers:using-git-worktrees`
- `superpowers:subagent-driven-development`, `superpowers:dispatching-parallel-agents`
- `superpowers:systematic-debugging`, `superpowers:verification-before-completion`
- `superpowers:finishing-a-development-branch`, `superpowers:requesting-code-review`
- `superpowers:receiving-code-review`, `superpowers:using-superpowers`, `superpowers:writing-skills`
- `frontend-design:frontend-design`, `ui-ux-pro-max:ui-ux-pro-max`, `skill-creator:skill-creator`
- `/code-review-board`, `/code-review:code-review`
- MCPs: `github`, `context7`, `Playwright`
- Frases-chave: "spec aprovada É a aprovação do plano", "Plano não é checkpoint" OU equivalente, "três situações" (atrito permitido), "loading=\"lazy\"" (lembrete Playwright), "validate_cards_schema.mjs"

Run: `Grep` para cada termo. Se algum estiver ausente, voltar ao Task 2 Step 1 e adicionar.

- [ ] **Step 2: Confirmar links resolvem para arquivos existentes**

Run em sequência:
- `ls docs/ARCHITECTURE.md`
- `ls content/rag/_structure.json`
- `ls content/rag/_template.md`
- `ls content/cards/_structure.json`
- `ls content/cards/schema.json`
- `ls content/cards/manifest.json`

Expected: todos existem. Se algum falhar, corrigir caminho no CLAUDE.md.

- [ ] **Step 3: Confirmar conteúdo deslocado está em ARCHITECTURE.md**

Run: `Grep` em `docs/ARCHITECTURE.md` para cada item:
- "Neligan's Plastic Surgery" (tabela de livros)
- "PRS, ASJ, JPRAS" (referências secundárias)
- "Briefing Pré-Op (offline)" (motores PWA)
- "Critérios de triagem" (pipeline de artigos)
- "00-Livros-Texto" (árvore de pastas)
- "RAGs horizontais" (camada 1 do RAG)

Expected: todos presentes. Se ausente, completar ARCHITECTURE.md.

- [ ] **Step 4: Apresentar diff ao Dr. Arthur**

Run: `git diff --stat CLAUDE.md docs/ARCHITECTURE.md`
Run: `wc -l CLAUDE.md docs/ARCHITECTURE.md`
Run: `git diff CLAUDE.md` (mostrar diff completo do CLAUDE.md).

Apresentar números e diff. Aguardar aprovação explícita ("commita", "OK pode commitar", "pode prosseguir").

---

## Task 4: Commit

**Files:**
- Stage: `CLAUDE.md`, `docs/ARCHITECTURE.md`

- [ ] **Step 1: Stage e commit**

Run:
```bash
git add CLAUDE.md docs/ARCHITECTURE.md
git commit -m "$(cat <<'EOF'
docs: slim CLAUDE.md and extract architecture to docs/ARCHITECTURE.md

CLAUDE.md focado no harness (alvo <200 linhas):
- Identidade + ponteiros para docs externos
- Regras de Conteúdo invioláveis (verbatim)
- Orquestração §1-§11 com tightening moderado (sem perda de regra)

Conteúdo deslocado para docs/ARCHITECTURE.md (zero perda):
- Visão geral + diagrama
- Sistema RAG (camadas, pipelines, refs primárias/secundárias)
- PWA Library (motores, hosting)
- Pipeline de Artigos Científicos (fluxo + triagem)
- Estrutura de pastas

Spec: docs/superpowers/specs/2026-04-25-claude-md-slimming-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Verificar commit**

Run: `git log -1 --stat`
Expected: 1 commit, 2 arquivos alterados (CLAUDE.md modificado, docs/ARCHITECTURE.md novo).

Run: `git status`
Expected: working tree clean (exceto eventuais arquivos não relacionados).

---

## Critério final de sucesso

1. ✅ `wc -l CLAUDE.md` ≤ 180.
2. ✅ `docs/ARCHITECTURE.md` existe com todo o conteúdo deslocado.
3. ✅ Todos os 17 skills/MCPs/comandos do harness antigo aparecem no novo (Task 3 Step 1).
4. ✅ Todos os 6 links do CLAUDE.md resolvem (Task 3 Step 2).
5. ✅ Regras de Conteúdo invioláveis (8 itens) inalteradas — comparar texto.
6. ✅ Commit limpo em master, mensagem descritiva, sem alterações não relacionadas.
