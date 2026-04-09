# Estrategia de Alocacao de Modelos — Biblioteca v2

**Data:** 2026-04-05
**Status:** Aprovado pelo Dr. Arthur
**Referencia:** `docs/superpowers/specs/2026-04-05-biblioteca-v2-design.md`
**Plano Fase 1:** `docs/superpowers/plans/2026-04-05-fase1-schema-migracao-pwa.md`

---

## Principio

Usar o modelo mais barato capaz de executar cada micro-task. Opus apenas para conteudo medico e pedagogia. Sonnet para design visual e debug. Haiku para tudo mecanico.

## Regras de Alocacao

| Modelo | Quando usar |
|---|---|
| **Opus** | Curadoria de conteudo medico (fichas atomicas a partir de JSONs lineares), design de prompts pedagogicos (geracao e avaliacao de questoes) |
| **Sonnet** | CSS/design visual, debug/integracao complexa, prompt engineering nao-medico, logica com julgamento (OpenCV thresholds, RAG calibration) |
| **Haiku** | Codigo boilerplate copiado do plano, criacao de schema/pastas, validacao JSON, UI padrao (HTML/JS sem design), logica mecanica (scoring, localStorage, concatenacao) |

---

## Fase 1: Schema + Migracao + PWA

Consolidacao: 10 tasks originais → 6 mega-tasks.

| # | Mega-Task | Tasks originais | Modelo | Descricao |
|---|---|---|---|---|
| 1 | Schema + Infraestrutura | Task 1 | **Haiku** | Criar `content/cards/schema.json` (codigo pronto no plano), pastas, validar |
| 2 | Curadoria Blefaroplastia | Task 2 | **Opus** | Ler 1245 linhas linear → ~100 fichas atomicas (anatomia, tecnicas, decisoes, notas, flashcards, _meta) |
| 3 | Curadoria Rinoplastia | Task 3 | **Opus** | Ler 1214 linhas linear → ~100 fichas atomicas |
| 4 | PWA Codigo Completo | Tasks 4+5+6+7+8 | **Haiku** | Criar index.html, manifest.json, sw.js, search.js, renderer.js, preop.js, app.js — todo codigo fornecido verbatim no plano |
| 5 | Estilo Visual | Task 9 | **Sonnet** | Criar style.css completo (dark theme, mobile-first, 5 tipos de card, badges, decision tree layout) |
| 6 | Teste de Integracao | Task 10 | **Sonnet** | Testar localmente, identificar e corrigir bugs, validar no browser |

### Dependencias e Paralelismo

```
Mega-Task 1 (Haiku)
    ├── Mega-Task 2 (Opus) ──┐
    ├── Mega-Task 3 (Opus) ──┤ (paralelo)
    └── Mega-Task 4 (Haiku) ─┤ (paralelo)
         Mega-Task 5 (Sonnet) ┘
              └── Mega-Task 6 (Sonnet)
```

- Tasks 2, 3 e 4 sao independentes → rodam em paralelo apos Task 1
- Task 5 (CSS) pode rodar em paralelo com 2-3, mas apos 4
- Task 6 (integracao) requer todas anteriores completas

---

## Fase 2: Pipeline de Imagens

| # | Micro-Task | Modelo |
|---|---|---|
| 2.1 | Script PyMuPDF (render PDF pages → PNG 300 DPI) | **Haiku** |
| 2.2 | Script OpenCV (deteccao de blocos visuais + recorte) | **Sonnet** |
| 2.3 | Prompt de classificacao para Claude Haiku API | **Sonnet** |
| 2.4 | Galeria de revisao (HTML/JS para batch review) | **Haiku** |
| 2.5 | Integracao pipeline completo + teste | **Sonnet** |

---

## Fase 3: Motor de Teste

| # | Micro-Task | Modelo |
|---|---|---|
| 3.1 | Design de prompts — geracao de questoes medicas | **Opus** |
| 3.2 | Design de prompts — avaliacao de respostas | **Opus** |
| 3.3 | UI do teste (tela de perguntas, input, feedback) | **Haiku** |
| 3.4 | Logica de perfil adaptativo (scoring, decay, ponderacao) | **Haiku** |
| 3.5 | Integracao com API Claude (fetch, streaming, error handling) | **Sonnet** |
| 3.6 | Teste de integracao | **Sonnet** |

---

## Fase 4: Chat IA (RAG)

| # | Micro-Task | Modelo |
|---|---|---|
| 4.1 | Logica de RAG (selecao e montagem de contexto a partir de fichas) | **Haiku** |
| 4.2 | UI do chat (input, mensagens, scroll) | **Haiku** |
| 4.3 | Prompt engineering para RAG (tom, formato, completude) | **Sonnet** |
| 4.4 | Integracao API + streaming response | **Sonnet** |
| 4.5 | Teste de integracao | **Sonnet** |

---

## Fase 5: Expansao (por tema novo)

| # | Micro-Task | Modelo |
|---|---|---|
| 5.1 | Curadoria medica (fichas atomicas a partir de livro-texto) | **Opus** |
| 5.2 | Validacao JSON + _meta.json | **Haiku** |

Repetido para cada novo tema (abdominoplastia, ritidoplastia, etc.).

---

## Resumo de Uso por Fase

| Fase | Opus | Sonnet | Haiku |
|---|---|---|---|
| 1 — Schema + Migracao + PWA | 2 tasks (curadoria) | 2 tasks (CSS, integracao) | 2 tasks (schema, codigo PWA) |
| 2 — Pipeline de Imagens | 0 | 3 tasks | 2 tasks |
| 3 — Motor de Teste | 2 tasks (prompts) | 2 tasks | 2 tasks |
| 4 — Chat IA | 0 | 3 tasks | 2 tasks |
| 5 — Expansao (por tema) | 1 task | 0 | 1 task |
