# Spec: Reescrita do CLAUDE.md para v2

**Data:** 2026-04-08
**Status:** Em revisão pelo Dr. Arthur
**Escopo:** Reescrita agressiva do CLAUDE.md — remover todo conteúdo v1, alinhar com arquitetura real v2

---

## 1. Problema

O CLAUDE.md atual (~516 linhas) é uma mistura de v1 e v2:
- ~250 linhas descrevem artefatos mortos (.docx, create_docx.js, fluxo manual de imagens, GitHub Actions)
- A arquitetura v2 (RAG + 2 motores) aparece no topo mas o corpo contradiz
- "Confiança nos Números" nos princípios — copiado de outro projeto
- Ferramentas e workflows listam tools descontinuados
- O documento confunde o agente sobre o que é real vs. aspiracional

## 2. Solução

Reescrita completa para ~200-250 linhas. Documento monolítico auto-suficiente, organizado em camadas conceituais. Remove TUDO que é v1.

## 3. Estrutura do Novo CLAUDE.md

### Seção 1: Identidade do Projeto (~10 linhas)
- Quem: assistente do Dr. Arthur, residente UNICAMP (R2, 2025–2028)
- O quê: digital companion PWA mobile-first
- Produto principal: briefings pré-operatórias
- Pasta raiz

### Seção 2: Arquitetura (~30 linhas)
- Diagrama: RAG (invisível) → 2 motores no PWA (Briefing Pré-Op + Chat IA)
- Sistema RAG: camada de dados que o Dr. Arthur não vê. Agente lê, edita, consulta
- Motor 1 — Briefing Pré-Op: montado offline a partir de cards derivados do RAG
- Motor 2 — Chat IA: perguntas livres, RAG como contexto, Claude API, requer internet
- Hierarquia de dados: RAG unificado (fonte de verdade) → Cards atômicos (derivados) → PWA renderiza

### Seção 3: Sistema RAG (~50 linhas)

#### Duas camadas

**Camada 1 — Documentos RAG** (`content/rag/<area>/<tema>.md`):
- Um arquivo por tema cirúrgico, dentro da área
- Documento completo — tudo sobre o tema, como um capítulo de referência
- Agrega livros-texto (ref. primárias) + artigos (ref. secundárias)
- Formato que o agente manipule melhor (.md ou .json — decisão na implementação)
- O Dr. Arthur não consome diretamente

**Camada 2 — Cards atômicos** (`content/cards/<area>/<tema>/`):
- 6 arquivos por tema: `_meta.json`, `anatomia.json`, `tecnicas.json`, `decisoes.json`, `notas.json`, `flashcards.json`
- Derivados do RAG — devem refletir a verdade científica do documento fonte
- Consumidos pelo PWA

#### Hierarquia de referências

**Referências primárias** (livros-texto em `00-Livros-Texto/`):

| Livro | Edição |
|---|---|
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

**Referências secundárias** (artigos científicos):
- PRS, ASJ, JPRAS, Annals, CPS, RBCP
- Incorporados ao RAG via pipeline de varredura

Livros são a BASE. Artigos COMPLEMENTAM — nunca substituem.

#### Temas implementados
Blefaroplastia, rinoplastia, ritidoplastia, otoplastia, abdominoplastia.
Expansão contínua tema a tema, conforme demanda do Dr. Arthur.

### Seção 4: PWA Library (~25 linhas)

O Dr. Arthur consome a biblioteca exclusivamente pelo iPhone.

**Tela inicial:** 2 ícones — Briefings Pré-Operatórias e Chat IA.

**Motor 1 — Briefing Pré-Op (offline):**
- Busca por procedimento dentro da seção de briefings
- Output: briefing montado automaticamente combinando cards relevantes
  - Anatomia (subseção privilegiada, colapsável)
  - Técnica passo a passo
  - Decisões clínicas
  - Complicações
- Funciona offline — todo conteúdo em cache local

**Motor 2 — Chat IA (online):**
- Perguntas livres em linguagem natural
- RAG fornece contexto, Claude API gera resposta
- Requer internet

**Hosting:** GitHub Pages (gratuito).

### Seção 5: Pipeline de Artigos Científicos (~20 linhas)

1. **Varredura** (sob demanda): agente busca PubMed → triagem IA → apresenta ao Dr. Arthur
2. **Aprovação**: Dr. Arthur decide quais artigos merecem entrar no RAG
3. **Download**: Dr. Arthur baixa PDFs → salva em `02-Artigos-Periodicos/_inbox/`
4. **Incorporação**: agente lê PDF → atualiza documento RAG do tema no local exato → atualiza cards derivados

Critérios de triagem:
- ALTA: Meta-análise, Revisão Sistemática, RCT com n > 30
- MÉDIA: Estudo comparativo/coorte, técnica nova com série > 20 casos
- BAIXA: Série de casos < 20 (apenas se tema raro)
- EXCLUIR: Relato isolado, estudo animal, editorial, carta ao editor

VPN UNICAMP necessário para download de texto completo. Metadados PubMed não requerem VPN.

### Seção 6: Regras de Conteúdo (~15 linhas)

- **NUNCA** apagar conteúdo existente ao atualizar
- **SEMPRE** validar acentuação portuguesa — material de ensino
- **SEMPRE** citar fonte inline em todo conteúdo novo
- Siglas com nome por extenso na primeira ocorrência
- Nomes de arquivo de imagem: ASCII sem acentos
- Língua: português brasileiro, terminologia anatômica oficial
- Anatomia é subseção privilegiada dentro do briefing

### Seção 7: Orquestração de Trabalho (~30 linhas)

Manter a seção atual com ajustes mínimos:
- Plan Mode por padrão
- Estratégia de subagentes (com alocação de modelo por complexidade)
- Loop de auto-aperfeiçoamento
- Verificação antes de concluir
- Elegância com equilíbrio
- Correção autônoma de bugs
- Gestão de tarefas (plano → validar → rastrear → explicar → documentar → capturar lições)

**Remover:** "Confiança nos Números" dos princípios.

### Seção 8: Plugins e Skills (~30 linhas)

Manter a seção atual. Remover referências a tools v1 na tabela de MCP:
- Remover: "Push automático do DB e PWA dentro de /atualizar-carteira"
- Remover: "Captura de extratos das corretoras via /buscar-extratos"
- Ajustar GitHub MCP para: "Operações no repositório remoto (issues, PRs, branches, code search)"

### Seção 9: Estrutura de Pastas (~20 linhas)

Atualizar para refletir a realidade v2:
```
~/Documents/Biblioteca-CirurgiaPlastica/
├── 00-Livros-Texto/              # PDFs na íntegra — referências primárias
├── 01-Documentos-Estudo/Imagens/ # Inbox de imagens curadas pelo Dr. Arthur
├── 02-Artigos-Periodicos/        # PDFs de artigos + _inbox/ para novos
├── content/
│   ├── rag/<area>/<tema>.md      # Documentos RAG unificados (fonte de verdade)
│   └── cards/<area>/<tema>/      # Cards atômicos derivados (consumidos pelo PWA)
├── assets/images/<tema>/         # Imagens renderizadas
├── webapp/
│   ├── approval/                 # PWA de aprovação de artigos (triagem)
│   └── library/                  # PWA principal (briefing + chat)
├── tools/                        # Scripts Python e Node.js
└── docs/superpowers/specs/       # Specs de design
```

## 4. O que é REMOVIDO do CLAUDE.md atual

| Seção removida | Motivo |
|---|---|
| Formato dos Documentos de Estudo (.docx) | .docx descontinuado |
| Regras de Atualização de Documentos (create_docx, incorporate_article) | Pipeline v1 morto |
| Fluxo de imagens manual | Substituído por pipeline automatizado |
| Workflows disponíveis (4 workflows .md) | Workflows v1 |
| Ferramentas Disponíveis (tabela com create_docx, test_generate, etc.) | Tools v1 |
| Automação / GitHub Actions | Descontinuado |
| Secrets configurados no GitHub | Não é instrução do agente |
| "Confiança nos Números" | Copiado de outro projeto |
| Seção detalhada do PWA de Aprovação | Excessivamente detalhada para CLAUDE.md |
| Filtro PubMed (query completa) | Detalhe de implementação, não instrução |

## 5. Verificação

Após a reescrita:
1. Contar linhas — deve ficar entre 200-250
2. Grep por termos v1: "docx", "create_docx", "test_generate", "incorporate_article", "GitHub Actions", "Confiança nos Números" — zero resultados
3. Verificar que toda seção descreve algo que EXISTE ou está sendo construído ativamente
4. Verificar coerência com a spec v2 (`docs/superpowers/specs/2026-04-05-biblioteca-v2-design.md`)
5. Ler o documento como se fosse uma nova sessão de agente — o CLAUDE.md é suficiente para operar?
