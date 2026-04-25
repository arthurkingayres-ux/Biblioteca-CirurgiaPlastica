# Instruções do Agente — Biblioteca Inteligente de Cirurgia Plástica

## Identidade do Projeto

Assistente do **Dr. Arthur Balestra Silveira Ayres**, residente de Cirurgia Plástica na UNICAMP (R2, 2025–2028). Construímos um digital companion: um PWA mobile-first para consultas rápidas e planejamento cirúrgico.

**Produto principal:** Briefings pré-operatórias — material completo para planejamento cirúrgico, consultado no celular antes de cirurgias.

**Pasta raiz:** `~/Documents/Biblioteca-CirurgiaPlastica/`

---

## Arquitetura

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

**Pipelines:**

- `tools/rag_to_cards.js` — deriva cards atômicos a partir dos documentos RAG
- `tools/build_rag_index.js` — gera `webapp/library/rag-index.json` (BM25) que alimenta o Chat IA

### Estrutura canônica dos documentos RAG

Descrição completa em [`content/rag/_structure.json`](content/rag/_structure.json). Template para novos temas em [`content/rag/_template.md`](content/rag/_template.md). A estrutura espelha os capítulos do Neligan 5ed — headers em inglês, conteúdo em português brasileiro.

### Estrutura dos cards atômicos (JSON)

Descrição completa em [`content/cards/_structure.json`](content/cards/_structure.json). Schema JSON formal em [`content/cards/schema.json`](content/cards/schema.json). Cinco tipos: `anatomy`, `technique`, `decision`, `note`, `flashcard` — mais o badge `update` (inserido em qualquer card quando um artigo científico atualiza o conteúdo).

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

Lista viva em [`content/cards/manifest.json`](content/cards/manifest.json) (status `complete` vs `draft`). Expansão contínua tema a tema, conforme demanda do Dr. Arthur.

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

> Esta seção é a única fonte de verdade sobre quando e como usar os plugins e skills do Claude Code neste projeto. Não há outro arquivo de configuração paralelo.

### 1. Planejamento

**TODA tarefa de planejamento segue o mesmo fluxo, sem exceção:**

1. Entrar em plan mode (`EnterPlanMode`)
2. Invocar `superpowers:brainstorming` dentro do plan mode — **OBRIGATÓRIO**
3. Ao final do brainstorming, invocar `superpowers:writing-plans` — **OBRIGATÓRIO** para converter o design aprovado em plano executável

Se é planejamento (decidir o que/como fazer antes de executar), é plan mode + brainstorming + writing-plans — sem julgamento de trivialidade. Gatilhos: "retome o projeto", "planeja X", "faça tal tarefa", "o que fazer agora", ou qualquer pedido que exija decidir abordagem. Comandos atômicos sem decisão ("rode esse teste", "leia tal arquivo") executam direto. Se a execução sair dos trilhos, PARAR e voltar ao fluxo.

**Exceção — execução de plano aprovado:** quando (a) existe plano escrito em `docs/superpowers/plans/*.md`, (b) aprovado pelo Dr. Arthur, e (c) a sub-fase anterior foi fechada conforme §10, então "continue", "siga adiante", "próxima sub-fase" e equivalentes autorizam retomar a execução via `superpowers:executing-plans` sem reabrir brainstorming nem plan mode. Se for preciso alterar escopo, o plano ficou ambíguo, ou surgir decisão nova não coberta pelo plano → voltar ao fluxo de planejamento padrão.

### 2. Execução

- `superpowers:executing-plans` — **OBRIGATÓRIO** ao executar qualquer plano escrito (disciplina de commits, checklist por item)
- `superpowers:test-driven-development` — **OBRIGATÓRIO** ao escrever código novo de produção (teste vermelho antes do código, sem exceção)
- `superpowers:using-git-worktrees` — **OBRIGATÓRIO** ao iniciar feature que levará múltiplos commits ou trabalho isolado em paralelo
- `superpowers:subagent-driven-development` — **OBRIGATÓRIO** quando a execução envolve subagentes executando passos do plano
- `superpowers:dispatching-parallel-agents` — **OBRIGATÓRIO** ao enfrentar 2+ tarefas independentes que podem rodar simultaneamente
- Subagentes liberalmente para preservar contexto: uma tarefa por agente, modelo por complexidade (Haiku/Sonnet simples, Opus complexas)
- **Elegância** para mudanças não-triviais; simplicidade para o resto

### 3. Debugging

- `superpowers:systematic-debugging` — **OBRIGATÓRIO** ao encontrar qualquer bug
- Quando o Dr. Arthur reporta um bug: corrigir autonomamente usando systematic-debugging como método. Zero troca de contexto exigida dele — não pedir passo a passo, simplesmente diagnosticar e corrigir.

### 4. Verificação

- `superpowers:verification-before-completion` — **OBRIGATÓRIO** antes de marcar qualquer tarefa como concluída. Rodar testes, checar logs, provar corretude — nunca marcar sem demonstrar que funciona.

### 5. Code Review

- `superpowers:finishing-a-development-branch` — **OBRIGATÓRIO** quando a implementação termina e o branch está pronto para virar PR
- `superpowers:requesting-code-review` — **OBRIGATÓRIO** após completar feature significativa, antes de pedir review humano
- `/code-review-board` (skill do projeto) — **OBRIGATÓRIO** antes de abrir PR e antes de mergear. Roda 6 reviewers especializados (rag-integrity, cards-schema, pwa-frontend, image-assets, docs-memory, general-swe) em paralelo e grava relatório em `docs/reviews/PR-<N>-YYYY-MM-DD.md`. É o **único** gate de review obrigatório do projeto; o humano revisa o relatório antes de commitar.
- `/code-review:code-review` — opcional. Usar quando quiser segunda opinião externa (feature grande, mudança arquitetural). O gate obrigatório é `/code-review-board`.
- `superpowers:receiving-code-review` — **OBRIGATÓRIO** ao processar apontamentos devolvidos por um review (humano ou automatizado)

### 6. Loop de auto-aperfeiçoamento

- Após QUALQUER correção do Dr. Arthur: registrar na memória imediatamente como regra que previna o mesmo erro
- Revisar lições relevantes ao iniciar cada sessão
- `superpowers:using-superpowers` é a meta-skill de entrada: verifica outras skills aplicáveis no início de cada turno. Deixar rodar sem bloquear.

### 7. MCPs

- **`github`** — operações no repositório remoto (issues, PRs, branches, code search, leitura de outros repos). Usar quando fizer sentido; sem gatilho obrigatório.
- **`context7`** — **OBRIGATÓRIO** antes de usar qualquer API de terceiros, ao encontrar sintaxe nova ou duvidosa, ao migrar versões de dependências, ou para debug de comportamento específico de biblioteca. **NÃO usar para:** refatoração de código próprio, debug de lógica de negócio, code review, conceitos gerais de programação.
- **Playwright** — **OBRIGATÓRIO** para qualquer tarefa que exija browser: testar `webapp/library/` em mobile viewport, capturar screenshots para validar UI, navegar páginas renderizadas, verificar fluxos end-to-end (home → briefing → chat). **Preferir script standalone `npx` (ex: `tools/validate_briefings.mjs`) sobre MCP** — reproduzível, commitável, CI-ready, imune a falhas silenciosas de startup do servidor MCP. MCP fica como fallback para exploração interativa ao vivo. Lembrete: briefings usam `loading="lazy"`; scripts de validação devem forçar `eager` e aguardar `img.complete` antes de medir, senão reportam falsos positivos.

### 8. Frontend

- **`frontend-design:frontend-design`** — **OBRIGATÓRIO** consultar antes de implementar qualquer código de frontend (componentes, estilos, estrutura HTML/CSS/JS).
- **`ui-ux-pro-max:ui-ux-pro-max`** — **OBRIGATÓRIO** consultar antes de decisões de UI/UX (layout, interação, acessibilidade).
- Vale também durante bug fix autônomo — `systematic-debugging` roda em paralelo com `frontend-design`.

### 9. Criação e edição de skills

- `skill-creator:skill-creator` ou `superpowers:writing-skills` — **OBRIGATÓRIO** ao criar skill nova ou editar skill existente (do projeto ou global). Nunca improvisar a estrutura de uma skill.

### 10. Disciplina de sub-fases

Ao concluir sub-fase via `superpowers:subagent-driven-development`, seguir esta ordem fixa:

1. **Rodar suíte de testes / validações** → reportar contagem explícita e verificável (ex.: "rag-index: 734 chunks OK", "BM25 regression: 6/6 green", "validate_briefings: 0 broken images"). Obrigação ancorada em §4.
2. **`superpowers:finishing-a-development-branch`** → decidir PR vs merge direto vs cleanup. Obrigação ancorada em §5.
3. **`/code-review-board`** → grava relatório em `docs/reviews/PR-<N>-YYYY-MM-DD.md`. Obrigação ancorada em §5.
4. **PAUSAR** → aguardar Dr. Arthur revisar o relatório do board e autorizar. Sem autorização explícita, não mergear.
5. **Se houver findings bloqueadores** → `superpowers:receiving-code-review` → corrigir → voltar ao passo 1. Obrigação ancorada em §5.
6. **Squash-merge + delete branch + cleanup worktree**.
7. **Atualizar memória persistente da sub-fase** — arquivo novo `project_phaseX_Y_done.md` + linha de índice em `MEMORY.md`, citando o SHA do squash.
8. **Reportar status final** com os números do passo 1 e o SHA do passo 7. PAUSAR e aguardar autorização antes de iniciar a próxima sub-fase, salvo instrução explícita de encadear.

Ao encerrar **fase inteira** (todas as sub-fases fechadas), além do checklist acima: atualizar `content/cards/manifest.json`, criar `project_phaseX_done.md` consolidando as sub-fases, e só então considerar a fase fechada.

Nenhum passo é opcional. O checklist consolida ordem — todas as obrigações já estão ancoradas em §2–§5 e §11.

### 11. Verificação operacional

- Antes de rodar qualquer script em `tools/` (`rag_to_cards.js`, `build_rag_index.js`, `audit_images.py`, harvesters de imagem, geradores de diagrama): **confirmar o worktree correto** com `git rev-parse --show-toplevel` + `git branch --show-current`. Fases 7.x usam worktrees isolados e rodar no diretório errado corrompe master.
- Após sub-fase, reportar contagens concretas e verificáveis — nunca afirmar "funcionou" sem número (chunks indexados, cards migrados, imagens renderizadas, testes passados).
- Antes de mergear sub-fase com cards novos ou modificados: rodar `node tools/validate_cards_schema.mjs` e reportar `OK: N | FAIL: 0` no relatório de fechamento. Não mergear com `FAIL > 0`.

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
└── CLAUDE.md                       # Este arquivo
```
