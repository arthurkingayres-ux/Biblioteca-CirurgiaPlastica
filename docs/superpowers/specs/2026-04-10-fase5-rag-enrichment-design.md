# Fase 5 — Enriquecimento RAG com Livros-Texto

**Data:** 2026-04-10
**Status:** Design aprovado, pendente plano de execução

---

## Contexto

Os 8 documentos RAG do projeto foram construídos de baixo pra cima: cards atômicos existiam primeiro, e os RAG docs foram "extraídos" deles como esqueletos. Isso inverte a hierarquia canônica do projeto (livros-texto → RAG → cards). Todos os RAG docs estão marcados como "rascunho (esqueleto extraído dos cards, pendente enriquecimento com livros-texto)".

Esta fase corrige a inversão para 3 temas prioritários, lendo os capítulos correspondentes dos livros-texto e enriquecendo os RAG docs seção por seção.

---

## Escopo

### Parte 1 — Housekeeping

Pré-requisito antes de qualquer trabalho de conteúdo.

1. Mergear PR #3 (`gh pr merge 3 --merge`)
2. Deletar branch remoto `feat/v2-fase4-pwa-quality-sprint`
3. Limpar worktree local se existir
4. Commitar mudanças pendentes em master (CLAUDE.md, settings.json, settings.local.json)
5. Push master para origin

### Parte 2 — Enriquecimento RAG (3 temas)

Temas: **blefaroplastia**, **abdominoplastia**, **ritidoplastia**.

#### Fontes primárias por tema

| Tema | Neligan 5ed Vol.2 | Grabb & Smith 9ed | Fontes extras |
|------|-------------------|-------------------|---------------|
| Blefaroplastia | Caps. 8–9 | Caps. 34–35 | Core Procedures 2ed cap. 3; Operative Dictations caps. 8–10 |
| Abdominoplastia | Cap. 27 | Cap. 75 | High Definition Body Sculpting |
| Ritidoplastia | Cap. 11 | Cap. a identificar no índice da 9ed (8ed era Grotting/Rubin) | Practical Facial Reconstruction |

#### Processo por tema (4 passos)

**Passo 1 — Leitura de fontes primárias**
- Ler capítulos correspondentes do Neligan 5ed Vol. 2 (PDF em `00-Livros-Texto/`)
- Ler capítulos do Grabb & Smith 9ed
- Ler fontes extras pertinentes ao tema

**Passo 2 — Enriquecimento incremental**
- Seguir estrutura canônica de `content/rag/_structure.json` (11 seções obrigatórias)
- Para cada seção: ler conteúdo atual → comparar com livro → **adicionar** material faltante
- **NUNCA** apagar conteúdo existente — apenas agregar
- Citações inline obrigatórias: `[Neligan, 2023, vol. 2, cap. X]`
- Siglas expandidas na primeira ocorrência por seção
- Referências de imagens: `[Imagem: filename.png]` (ASCII, sem acentos)
- Língua: português brasileiro, terminologia anatômica oficial

**Passo 3 — Atualização de metadados**
- Remover marcação "rascunho" → "enriquecido com livros-texto"
- Atualizar data de última edição
- Verificar listagem completa de referências primárias e secundárias
- Ritidoplastia: atualizar referência Grabb de 8ed → 9ed

**Passo 4 — Re-derivação de cards (manual)**
- Comparar RAG enriquecido com cards atuais
- Adicionar cards para conteúdo novo que os atuais não cobrem (edição direta dos JSONs)
- Complementar cards existentes com informações adicionais
- **NÃO** deletar cards existentes
- **NÃO** usar `rag_to_cards.js` (sobrescreveria cards curados) — atualização manual nos JSONs
- Validar contra `content/cards/schema.json`

---

## Modelo de Execução

### Paralelismo

- **1 worktree** isolado: `feat/v2-fase5-rag-enrichment`
- **3 subagentes Sonnet em paralelo**, um por tema
- **Opus** (agente principal) orquestra e faz revisão final de qualidade

### Distribuição de modelos

| Tarefa | Modelo |
|--------|--------|
| Leitura de PDFs + extração de conteúdo | Sonnet |
| Enriquecimento RAG seção por seção | Sonnet |
| Re-derivação/atualização de cards | Sonnet |
| Orquestração + revisão final | Opus |
| Verificação (diff, schema, Playwright) | Sonnet |

### Commits

- 1 commit por tema (3 commits mínimos)
- Mensagens no padrão: `feat(rag): enriquecer <tema> com livros-texto`

---

## Verificação

1. **Diff de conteúdo**: nenhum conteúdo existente removido (apenas adições)
2. **Estrutura RAG**: todas as 11 seções de `_structure.json` preenchidas
3. **Schema de cards**: JSONs válidos contra `content/cards/schema.json`
4. **Smoke test PWA**: briefing de cada tema renderiza corretamente via Playwright
5. **Citações**: toda informação nova tem citação inline

---

## Entregável

- PR com 3+ commits
- 3 RAG docs enriquecidos (blefaroplastia, abdominoplastia, ritidoplastia)
- Cards atualizados onde necessário
- Verificação completa documentada

---

## Fora de escopo

- Novos temas (apenas enriquecimento dos existentes)
- Varredura de artigos científicos (pipeline separado)
- Imagens novas (tema de outra sessão)
- Enriquecimento dos outros 5 temas (sessão futura)
