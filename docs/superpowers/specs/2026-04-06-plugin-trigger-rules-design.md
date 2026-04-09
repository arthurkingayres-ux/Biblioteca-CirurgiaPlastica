# Design: Regras de Trigger para Plugins — CLAUDE.md

**Data:** 2026-04-06
**Decisoes:**
- Escopo: apenas plugins relevantes ao projeto (omitir meta/administrativos como keybindings-help, update-config)
- Formato: regras imperativas por trigger (se X, entao use Y) — nao tabela generica
- Superpowers: 8 skills core listadas individualmente + 5 situacionais agrupadas em tabela
- Organização: por categoria (MCP Servers, Skills de Workflow, Outras Skills, Agent Types)

---

## Texto final da secao (substituir linhas 518-539 do CLAUDE.md)

```markdown
## Plugins e Extensoes (Claude Code)

> **REGRA INVIOLAVEL:** Os triggers abaixo sao **obrigatorios**, nao sugestoes. Se uma situacao gatilho ocorrer, o plugin correspondente DEVE ser usado — sem excecao. Pular um trigger e tao grave quanto apagar conteudo de um documento.

### MCP Servers

**GitHub** (`mcp__github__*`)
- **TRIGGER:** SEMPRE que precisar interagir com o repositorio remoto (issues, PRs, branches, arquivos, code search, reviews)
- Preferir sobre `gh` CLI. Cobre: criar/ler issues e PRs, buscar codigo no repo, gerenciar branches, ler/criar arquivos remotos, reviews de PR

**Context7** (`mcp__plugin_context7_context7__*`)
- **TRIGGER:** SEMPRE que for usar qualquer biblioteca, framework, SDK ou ferramenta CLI — mesmo que pareca saber a API de cor
- Consultar documentacao atualizada antes de escrever codigo que dependa de APIs externas (docx, Node.js, PyMuPDF, React, Tailwind, etc.)
- Dados de treinamento podem estar desatualizados — Context7 e a fonte de verdade

**Playwright** (`mcp__plugin_playwright_playwright__*`)
- **TRIGGER:** SEMPRE que precisar testar, validar ou interagir com as PWAs no browser
- Cobre: navegar paginas, clicar elementos, preencher formularios, tirar screenshots, inspecionar console, testar responsividade, validar visual
- Usar para testes de integracao das PWAs (approval e library)

### Skills de Workflow — Core

**`/superpowers:brainstorming`**
- **TRIGGER:** ANTES de comecar qualquer feature, componente, funcionalidade nova, ou mudanca criativa/arquitetural
- Explora intencao, requisitos e design antes de implementar. Produz spec escrita

**`/superpowers:writing-plans`**
- **TRIGGER:** QUANDO tiver uma spec ou requisitos para tarefa multi-step, ANTES de tocar em codigo
- Transforma spec em plano de implementacao detalhado com passos verificaveis

**`/superpowers:executing-plans`**
- **TRIGGER:** QUANDO tiver um plano escrito para executar em sessao separada, com checkpoints de review
- Executa plano passo a passo com verificacao a cada etapa

**`/superpowers:subagent-driven-development`**
- **TRIGGER:** QUANDO executar planos com tarefas independentes na sessao atual
- Delega tarefas a subagentes especializados. Estrategia principal de execucao do projeto v2

**`/superpowers:dispatching-parallel-agents`**
- **TRIGGER:** QUANDO houver 2+ tarefas independentes que podem rodar em paralelo
- Lanca multiplos agentes simultaneos sem dependencias entre si

**`/superpowers:verification-before-completion`**
- **TRIGGER:** ANTES de afirmar que o trabalho esta completo, corrigido ou passando — antes de commit ou PR
- Obriga rodar comandos de verificacao e confirmar output. Evidencia antes de afirmacao

**`/superpowers:systematic-debugging`**
- **TRIGGER:** QUANDO encontrar qualquer bug, teste falhando ou comportamento inesperado, ANTES de propor correcoes
- Investigacao metodica: reproduzir → isolar → diagnosticar → corrigir → verificar

**`/superpowers:requesting-code-review`**
- **TRIGGER:** APOS completar tarefa significativa, implementar feature major, ou antes de merge
- Solicita review estruturado para verificar que o trabalho atende requisitos

### Outras Skills

**`/frontend-design:frontend-design`**
- **TRIGGER:** QUANDO construir ou modificar interfaces web (componentes, paginas, PWAs)
- Gera codigo frontend com design de alta qualidade, evitando estetica generica de IA

**`/ui-ux-pro-max:ui-ux-pro-max`**
- **TRIGGER:** QUANDO tomar decisoes de design visual — paletas de cores, tipografia, layout, UX guidelines
- Usar em conjunto com frontend-design para as PWAs. Inclui 50+ estilos, 161 paletas, 57 pares de fontes

**`/code-review:code-review`**
- **TRIGGER:** QUANDO precisar revisar um PR existente
- Review estruturado de pull requests

**`/claude-api`**
- **TRIGGER:** QUANDO escrever codigo que importe `anthropic`, `@anthropic-ai/sdk`, ou use a API Claude/Anthropic
- Essencial nas Fases 3 (test engine) e 4 (chat/RAG) do plano v2

**`/simplify`**
- **TRIGGER:** APOS implementacao concluida, antes de commitar — quando o codigo funciona mas pode ser mais limpo
- Revisa codigo alterado buscando reuso, qualidade e eficiencia

**`/skill-creator:skill-creator`**
- **TRIGGER:** QUANDO precisar criar, modificar ou medir performance de skills customizadas

### Skills Situacionais (superpowers)

Disponiveis quando a situacao especifica surgir — nao tem trigger recorrente:

| Skill | Quando usar |
|---|---|
| `receiving-code-review` | Ao receber feedback de code review — antes de implementar sugestoes |
| `finishing-a-development-branch` | Quando implementacao esta completa e precisa decidir como integrar (merge, PR, cleanup) |
| `using-git-worktrees` | Quando feature precisa de isolamento do workspace atual |
| `test-driven-development` | Se adotarmos TDD para uma feature especifica |
| `writing-skills` | Quando criando/editando skills antes de deploy |

### Agent Types (Subagentes Especializados)

Subagentes disponiveis via ferramenta `Agent`. Diferentes das skills — sao processos autonomos delegados.

**`Explore`**
- **TRIGGER:** QUANDO precisar explorar o codebase em profundidade (busca aberta, multiplos arquivos, padroes de codigo)
- Mais lento que Glob/Grep direto — usar apenas quando busca simples nao bastar ou tarefa exigir 3+ queries

**`Plan`**
- **TRIGGER:** QUANDO precisar planejar estrategia de implementacao, identificar arquivos criticos, avaliar trade-offs arquiteturais
- Retorna planos passo a passo. Usar como complemento ao writing-plans para analise tecnica

**`superpowers:code-reviewer`**
- **TRIGGER:** QUANDO uma etapa major do projeto for concluida e precisa ser validada contra o plano original
- Review de codigo implementado contra especificacao e padroes de qualidade

**`code-simplifier:code-simplifier`**
- **TRIGGER:** APOS implementacao de codigo significativo — simplifica e refina para clareza, consistencia e manutenibilidade
- Focado em codigo recem-modificado, a menos que instruido diferente
```
