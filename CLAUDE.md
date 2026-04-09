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
```

Um arquivo por tema cirúrgico. Documento completo — tudo sobre o tema, como um capítulo de referência. Agrega livros-texto + artigos numa narrativa densa. O Dr. Arthur não consome diretamente; o agente é o único consumidor.

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

Blefaroplastia, rinoplastia, ritidoplastia, otoplastia, abdominoplastia. Expansão contínua tema a tema, conforme demanda do Dr. Arthur.

---

## PWA Library (`webapp/library/`)

O Dr. Arthur consome a biblioteca exclusivamente pelo iPhone.

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

---

## Orquestração de Trabalho

### 1. Plan Mode por Padrão

- Entrar em plan mode para QUALQUER tarefa não-trivial
- Se algo sair dos trilhos, PARAR e re-planejar imediatamente
- Usar Superpowers para planejamento — nunca improvisar

### 2. Estratégia de Subagentes

- Usar subagentes liberalmente para manter a janela de contexto limpa
- Delegar pesquisa, exploração e análises paralelas
- Uma tarefa por subagente para execução focada
- **OBRIGATÓRIO:** Avaliar modelo por complexidade (Haiku/Sonnet para tarefas simples, Opus para complexas)

### 3. Loop de Auto-Aperfeiçoamento

- Após QUALQUER correção do Dr. Arthur: registrar na memória
- Escrever regras que previnam o mesmo erro
- Revisar lições relevantes ao iniciar cada sessão

### 4. Verificação Antes de Concluir

- Nunca marcar tarefa como concluída sem provar que funciona
- Rodar testes, checar logs, demonstrar corretude

### 5. Correção Autônoma de Bugs

- Quando receber relato de bug: simplesmente corrigir. Não pedir passo a passo
- Zero troca de contexto exigida do Dr. Arthur

### Princípios Fundamentais

- **Simplicidade Primeiro**: impacto mínimo no código
- **Sem Preguiça**: causas raiz, não correções temporárias
- **Impacto Mínimo**: tocar apenas no necessário

---

## Plugins Claude Code

Lista completa de MCPs, skills de processo (Superpowers), regras de code review e frontend em [`settings.json`](settings.json). Consultar **antes** de começar qualquer tarefa não-trivial — o arquivo define quando cada plugin/skill deve ser usado.

---

## Princípios

- **Confiança nos Números** — todo dado rastreável ao documento-fonte. Nunca adivinhar
- **Simplicidade** — impacto mínimo, causas raiz, sem sobre-engenharia, sem efeitos colaterais
- **Specs = Fonte de Verdade da Arquitetura** — consultar antes de tomar decisões de implementação

---

## Regras de Trabalho

1. **Plan mode** para qualquer tarefa não-trivial
2. **Superpowers** para planejamento — nunca improvisar
3. **Subagentes** para manter contexto limpo (1 tarefa por agente)
4. **Registrar correções** do Dr. Arthur na memória imediatamente
5. **Nunca marcar concluído** sem provar que funciona
6. **Bug reportado** = corrigir autonomamente, sem pedir passo a passo
7. **Elegância** para mudanças não-triviais; simplicidade para o resto
8. **Code review obrigatório** — usar `/code-review:code-review` antes de criar ou mergear qualquer pull request

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
└── CLAUDE.md                       # Este arquivo
```
