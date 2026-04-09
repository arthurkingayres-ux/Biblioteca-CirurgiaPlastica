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

A estrutura espelha os capítulos do Neligan 5ed. Headers em inglês (referência cruzada com o livro), conteúdo em português. Template completo em `content/rag/_template.md`.

```markdown
# <Tema> — Documento RAG Unificado
> Fonte de verdade | Status: <rascunho|completo> | Última atualização: <data>

## Referências Primárias
## Referências Secundárias (Artigos)

## Synopsis
(Bullet points — pontos-chave para o cirurgião, como o bloco SYNOPSIS do Neligan)

## Introduction
(Visão geral, epidemiologia, importância clínica, histórico)

## Basic Science
### Anatomy
#### <Estrutura>
- **Definição:** ...
- **Localização:** ...
- **Relações:** ...
- **Relevância cirúrgica:** ...
- **Como identificar:** ...
- [Imagem: <filename>]
- (Citação inline)
### Physiology / Pathophysiology
(Quando aplicável)

## Diagnosis / Patient Presentation
(Queixa, exame físico, testes, classificações diagnósticas)

## Patient Selection
(Indicações, contraindicações, classificações, árvores de decisão)

## Treatment / Surgical Technique
### <Técnica>
- **Indicação:** ...
- **Contraindicação:** ...
- **Passos:** 1. ... 2. ...
- **Complicações específicas:** ...
- [Imagem: <filename>]
- (Citação inline)

## Postoperative Care
(Curativos, drenos, medicações, acompanhamento)

## Outcomes and Complications
### <Complicação>
- **Incidência:** X%
- **Prevenção / Diagnóstico / Manejo:** ...

## Secondary Procedures
(Revisões, retoques, procedimentos complementares)

## Atualizações de Artigos
### <Autor et al., Journal, Ano>
- **Resumo:** achados principais
- **Impacto no RAG:** seções atualizadas
- **Cross-reference:** seções afetadas
```

### Estrutura dos cards atômicos (JSON)

Schema completo em `content/cards/schema.json`. Cinco tipos:

**anatomy** — 1 card por estrutura anatômica:

```json
{
  "id": "blef-anat-001",
  "type": "anatomy",
  "title": "Pele Pálpebral",
  "aliases": ["pele da pálpebra"],
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "definition": "A pele mais fina do corpo (~0.5mm)...",
  "location": "Região pré-tarsal e pré-septal...",
  "relations": ["músculo orbicular", "septo órbital"],
  "surgical_relevance": "Preservar ≥20mm entre borda ciliar e sobrancelha...",
  "how_to_identify": "Pele translúcida, pinçável na região pré-septal...",
  "images": ["blef-pele-palpebral.png"],
  "citations": ["Neligan, 2023, vol. 2, cap. 8"],
  "updates": [],
  "tags": ["anatomia", "pálpebra", "pele"]
}
```

**technique** — 1 card por técnica cirúrgica:

```json
{
  "id": "blef-tec-001",
  "type": "technique",
  "title": "Blefaroplastia Superior Clássica",
  "aliases": [],
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "indication": "Dermatocálase superior com excesso de pele...",
  "contraindication": "Olho seco grave, oftalmopatia de Graves ativa...",
  "steps": ["1. Marcação...", "2. Infiltração...", "3. Incisão..."],
  "complications": ["Hematoma retrobulbar (0.05%)", "Lagoftalmo"],
  "pearls": ["Preservar ≥20mm de pele..."],
  "images": [],
  "citations": ["Neligan, 2023, vol. 2, cap. 8"],
  "updates": [],
  "tags": ["técnica", "blefaroplastia-superior"]
}
```

**decision** — 1 card por árvore de decisão:

```json
{
  "id": "blef-dec-001",
  "type": "decision",
  "title": "Vetor Orbitário — Seleção de Abordagem Inferior",
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "trigger": "Paciente candidato a blefaroplastia inferior",
  "steps": [
    {
      "question": "Vetor neutro ou positivo?",
      "options": [
        { "answer": "Sim", "next": "Abordagem transcutânea segura" },
        { "answer": "Não (vetor negativo)", "next": "Avaliar cantopexia" }
      ]
    }
  ],
  "citations": ["Neligan, 2023, vol. 2, cap. 8"],
  "updates": [],
  "tags": ["decisão", "vetor-orbitário"]
}
```

**note** — conteúdo que não cabe nos outros tipos:

```json
{
  "id": "blef-nota-001",
  "type": "note",
  "title": "Fisiopatologia do Envelhecimento Periocular",
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "section": "fisiopatologia",
  "content": ["O envelhecimento periocular é multifatorial...", "..."],
  "images": [],
  "citations": ["Neligan, 2023, vol. 2, cap. 8"],
  "updates": [],
  "tags": ["fisiopatologia", "envelhecimento"]
}
```

**flashcard** — pares pergunta/resposta agrupados:

```json
{
  "id": "blef-fc-001",
  "type": "flashcard",
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "cards": [
    {
      "front": "Espessura da pele pálpebral?",
      "back": "~0.5mm (mais fina do corpo)",
      "citation": "Neligan, 2023, vol. 2, cap. 8",
      "domain": "anatomia"
    }
  ],
  "tags": ["flashcard", "anatomia"]
}
```

**update** — badge de atualização (inserido em qualquer card):

```json
{
  "color": "blue|red|green",
  "title": "Título da atualização",
  "content": ["Texto..."],
  "citation": "Autor et al., Journal, Ano",
  "paradigm_shift": false
}
```

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

## Plugins e Skills Obrigatórios

### MCP Servers

| Plugin | Uso |
| --- | --- |
| **GitHub MCP** | Operações no repositório remoto (issues, PRs, branches, code search) |
| **Context7** | Documentação atualizada de bibliotecas — consultar ANTES de usar qualquer API |
| **Playwright** | Qualquer tarefa que exija uso do browser deve ser executada através do Playwright (testar PWAs, capturar screenshots, navegar páginas, validar UI) |

### Skills de Processo (Superpowers)

Obrigatório para toda tarefa não-trivial (3+ passos ou decisão arquitetural):

- `superpowers:brainstorming` — antes de qualquer design
- `superpowers:writing-plans` — planos a partir de specs
- `superpowers:executing-plans` — execução com disciplina
- `superpowers:systematic-debugging` — diagnóstico de bugs
- `superpowers:verification-before-completion` — antes de marcar tarefa concluída
- `superpowers:subagent-driven-development` — execução paralela
- `superpowers:requesting-code-review` — após features significativas
- `code-review:code-review` — **OBRIGATÓRIO** ao criar pull requests

### Frontend

Toda tarefa que gere HTML/CSS/JS **deve** consultar:

- `frontend-design:frontend-design` — código de frontend
- `ui-ux-pro-max:ui-ux-pro-max` — decisões de UI/UX

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
