# Spec — CLAUDE.md slimming + extração de arquitetura

**Data:** 2026-04-25
**Autor:** Agente (sessão de revisão de CLAUDE.md)
**Aprovação do Dr. Arthur:** dada inline (decisões A / A / B)

---

## Problema

`CLAUDE.md` atual tem 308 linhas — muito acima do alvo de ~200 linhas que o Dr. Arthur considera ideal para um arquivo carregado em todo turno. Cerca de metade do conteúdo é descrição de arquitetura, sistema RAG, motores PWA, pipeline de artigos e estrutura de pastas — material de referência que pode viver fora do CLAUDE.md, citado por link.

A intenção é que o CLAUDE.md contenha **principalmente o harness** (forma de trabalhar com o agente) e que a estrutura detalhada do projeto resida em documentos linkados.

## Decisões tomadas (brainstorming)

1. **Regras de Conteúdo invioláveis ficam no CLAUDE.md** — opção A do brainstorming. São operacionais, previnem erros recorrentes, devem permanecer sempre carregadas.
2. **Arquitetura, RAG, PWA, pipeline de artigos e estrutura de pastas movem para um único `docs/ARCHITECTURE.md`** — opção A. Doc único, fácil de descobrir e manter, citado no topo do CLAUDE.md. Os arquivos `content/rag/_structure.json`, `content/cards/_structure.json` e `content/cards/schema.json` continuam como SoT de schema técnico — ARCHITECTURE.md narra a explicação humana, structure.json define o schema.
3. **Tightening do harness §1-§11 em nível moderado** — opção B. Consolidar prosa redundante sem perder regra. Cortar §1 (3 blocos sobrepostos sobre "exceção pós-spec aprovado") para um bloco único; remover "Obrigação ancorada em §X" repetido em cada passo do §10 (o rodapé já consolida). Preservar todos os gatilhos, exceções e nuances que vieram de incidentes reais.

## Alvo

- `CLAUDE.md` final: **~160 linhas** (confortavelmente abaixo do alvo de 200).
- `docs/ARCHITECTURE.md` novo: ~150 linhas, sem constraint de tamanho.
- **Zero perda de conteúdo** — toda informação atual permanece no repositório, apenas redistribuída.

## Estrutura do novo CLAUDE.md

```text
1. Cabeçalho — 1 linha
2. Identidade — 4-5 linhas
   - Dr. Arthur, residente UNICAMP, produto = briefings pré-op
   - Pasta raiz
   - Link único para docs/ARCHITECTURE.md como SoT de arquitetura
3. Onde está o quê — 8-10 linhas (seção NOVA)
   - Ponteiros para docs/ARCHITECTURE.md, _structure.json, schema.json,
     manifest.json, tools/
4. Regras de Conteúdo — 12-15 linhas (verbatim das atuais 8 invioláveis)
5. Orquestração de Trabalho §1-§11 — ~120 linhas (tightening B)
```

### Tightening do harness (detalhe)

- **§1 Planejamento** (atual ~30 linhas → ~18): consolidar os blocos sobre "exceção pós-spec aprovado" + "plano não é checkpoint" + "gatilho de auto-correção" em um bloco único e denso. Preservar: lista de gatilhos do plan mode, regra inviolável "spec aprovada = plano aprovado", as 3 situações que permitem atrito, exceção de continuidade entre sub-fases.
- **§2-§9**: já são bullets enxutos. Cortes mínimos (~5 linhas no total) só onde houver redundância óbvia.
- **§10 Disciplina de sub-fases** (atual 17 linhas → 13): remover o trailer "Obrigação ancorada em §X" repetido em cada passo — o rodapé já diz "todas as obrigações já estão ancoradas em §2-§5 e §11". Manter os 8 passos e o adendo de fase inteira.
- **§11 Verificação operacional**: mantido como está (3 bullets já compactos).

## Estrutura do novo `docs/ARCHITECTURE.md`

```text
# Arquitetura — Biblioteca Inteligente de Cirurgia Plástica

## Identidade do Projeto
   (parágrafo expandido sobre Dr. Arthur, R2 UNICAMP, propósito)

## Visão geral
   (diagrama ASCII atual: PWA + RAG + 2 motores)
   (hierarquia de dados: RAG → Cards → PWA)

## Sistema RAG
   ### Duas camadas
   ### Estrutura canônica dos documentos RAG (link p/ _structure.json)
   ### Estrutura dos cards atômicos (link p/ schema.json)
   ### Pipelines (rag_to_cards, build_rag_index, validate_cards_schema)
   ### Referências primárias (tabela 9 livros)
   ### Referências secundárias
   ### Temas implementados (link p/ manifest.json)

## PWA Library (webapp/library/)
   ### Motor 1 — Briefing Pré-Op (offline)
   ### Motor 2 — Chat IA (online)
   ### Hosting

## Pipeline de Artigos Científicos
   ### Fluxo (4 passos)
   ### Critérios de triagem (tabela)

## Estrutura de Pastas
   (árvore atual completa)
```

## Critério de sucesso

1. `wc -l CLAUDE.md` retorna ≤ 180 linhas (margem sobre o alvo de 200).
2. `docs/ARCHITECTURE.md` existe e contém todo o conteúdo deslocado, sem perda.
3. Harness §1-§11 preserva todas as regras normativas atuais. Comparação manual: cada gatilho, exceção, obrigação ou skill nomeada no CLAUDE.md atual está presente no novo (texto pode estar mais denso, mas a regra precisa estar lá).
4. Regras de Conteúdo invioláveis (8 itens) inalteradas.
5. Links no novo CLAUDE.md resolvem para arquivos existentes (`docs/ARCHITECTURE.md`, `content/rag/_structure.json`, `content/rag/_template.md`, `content/cards/_structure.json`, `content/cards/schema.json`, `content/cards/manifest.json`).

## Riscos e mitigação

- **Subagentes não veem CLAUDE.md mas precisam saber arquitetura.** Subagentes recebem prompt completo do main agent — não dependem de CLAUDE.md global. Sem mudança de comportamento.
- **Regra esquecida ao tightenar §1/§10.** Mitigação: comparar bullets-a-bullets entre versão antiga e nova antes de commitar; rodar checklist do critério de sucesso item 3.
- **Link quebrado para ARCHITECTURE.md.** Mitigação: criar ARCHITECTURE.md no mesmo commit do CLAUDE.md slimmed, verificar com `Read` antes de commit.
- **Reverter no futuro.** Git preserva a versão atual. Se algum subagente operar pior por falta de contexto, o caminho é expandir ARCHITECTURE.md ou trazer trechos de volta — não rollback.

## Fora de escopo

- Mudar o conteúdo de qualquer skill, plugin, MCP server.
- Refatorar `tools/`, `webapp/`, ou outros artefatos.
- Atualizar memória persistente (`MEMORY.md`) — o protocolo de fechamento de sub-fase faz isso, mas esta tarefa não é sub-fase de uma fase numerada do projeto. O fechamento desta tarefa é um commit simples.
- Revisar regras de conteúdo (decisão A: ficam verbatim).
- Code-review-board e suíte de testes — não há código alterado, apenas docs. Validação manual basta.

## Plano de execução (alto nível)

1. Criar `docs/ARCHITECTURE.md` com todo o conteúdo deslocado.
2. Reescrever `CLAUDE.md` na nova estrutura compacta.
3. Verificar `wc -l`, links, e comparar bullets-a-bullets contra versão atual via `git diff`.
4. Apresentar diff ao Dr. Arthur antes do commit.
5. Commit único: "docs: slim CLAUDE.md and extract architecture to docs/ARCHITECTURE.md".

A versão executável detalhada será produzida por `superpowers:writing-plans` em seguida.
