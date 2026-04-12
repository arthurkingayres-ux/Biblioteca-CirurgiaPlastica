# Fase 5b — RAG Enrichment (rinoplastia, gluteoplastia, contorno-pos-bariatrico) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enriquecer 3 documentos RAG (`complete` no manifest) com conteúdo dos livros-texto canônicos, re-derivar cards atômicos com citações inline, e abrir PR revisado.

**Architecture:** Worktree isolado para a branch `feat/v2-fase5b-rag-enrichment`. Um commit de enriquecimento RAG por tema (3 commits), depois um commit único re-derivando os cards dos 3 temas via `tools/rag_to_cards.js`. Verificação mobile via Playwright antes do PR. Subagentes lêem capítulos de livros-texto em paralelo para acelerar trabalho e preservar contexto do agente principal.

**Tech Stack:** Markdown RAG (PT-BR), JSON cards com schema em `content/cards/schema.json`, Node script `tools/rag_to_cards.js` (usa Claude Haiku 4.5 via `@anthropic-ai/sdk`), Playwright MCP, gh CLI.

---

## Pré-requisitos

- Worktrees ignorados por `.gitignore` (já configurado em commit `e1f54d8`).
- `.env` com `ANTHROPIC_API_KEY` válido para `rag_to_cards.js`.
- PDFs dos livros-texto em `00-Livros-Texto/` acessíveis.
- Última `master` local sincronizada com remoto.

## Plano de arquivos (o que será alterado)

- **Modificar (RAG):**
  - `content/rag/estetica-facial/rinoplastia.md`
  - `content/rag/contorno-corporal/gluteoplastia.md`
  - `content/rag/contorno-corporal/contorno-pos-bariatrico.md`
- **Sobrescrever (cards derivados):**
  - `content/cards/estetica-facial/rinoplastia/{anatomia,tecnicas,decisoes,notas,flashcards,_meta}.json`
  - `content/cards/contorno-corporal/gluteoplastia/{anatomia,tecnicas,decisoes,notas,flashcards,_meta}.json`
  - `content/cards/contorno-corporal/contorno-pos-bariatrico/{anatomia,tecnicas,decisoes,notas,flashcards,_meta}.json`
- **Não tocar:** `content/cards/manifest.json` (temas já `complete`), CLAUDE.md (pode atualizar em PR separado se nada estrutural mudar).

---

## Task 1 — Criar worktree e branch

**Files:** nenhum código modificado.

- [ ] **Step 1.1:** No diretório principal, criar worktree isolado.

```bash
cd c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git fetch origin
git worktree add .worktrees/fase5b -b feat/v2-fase5b-rag-enrichment origin/master
```

- [ ] **Step 1.2:** Verificar worktree.

```bash
git worktree list
```
Expected: listagem inclui `.worktrees/fase5b` na branch `feat/v2-fase5b-rag-enrichment`.

- [ ] **Step 1.3:** Mudar cwd para o worktree. Todos os próximos passos assumem `cwd=.worktrees/fase5b`.

```bash
cd .worktrees/fase5b && git status
```
Expected: `On branch feat/v2-fase5b-rag-enrichment`, working tree limpo.

---

## Task 2 — Enriquecer rinoplastia

**Files:**
- Modify: `content/rag/estetica-facial/rinoplastia.md`

### Referência dos capítulos

| Livro | Capítulo/Seção |
|---|---|
| Neligan 5ed Vol.2 | "Primary rhinoplasty", "Secondary rhinoplasty", "Cleft rhinoplasty" |
| Grabb & Smith 9ed | Capítulos de rinoplastia |
| Neligan Core Procedures 2ed | Cap. de rinoplastia |
| Operative Dictations in PRS | Ditados de rinoplastia aberta/fechada |

- [ ] **Step 2.1:** Despachar subagente **Explore** para mapear o conteúdo existente.

Prompt literal para o subagente:

> Leia `content/rag/estetica-facial/rinoplastia.md` e produza um inventário conciso: lista de seções de nível 2 (`##`) e nível 3 (`###`), e para cada seção indique (a) se já tem citações inline a livros-texto, (b) se tem lacunas ou claims sem fonte. Não modifique o arquivo. Resposta em até 300 palavras.

- [ ] **Step 2.2:** Despachar subagente **Explore** (paralelo ao 2.1 se possível) para extrair conteúdo dos livros-texto.

Prompt literal:

> Leia os capítulos de rinoplastia em `00-Livros-Texto/Neligan5ed/` (Vol.2), `00-Livros-Texto/Grabb9ed/`, `00-Livros-Texto/NeliganCoreProcedures2ed/`, `00-Livros-Texto/OperativeDictations/`. Extraia pontos factuais acionáveis para enriquecer um RAG de rinoplastia focados em: anatomia (cartilagens alares/laterais, septo, vascularização, SMAS nasal), análise pré-op (rinosopatia, deformidades secundárias), técnica aberta vs fechada, manobras da ponta (transdomal, sutura columelar, strut, shield graft, tip graft), redução dorsal (preservação vs tradicional), osteotomias, revisão, complicações. Para cada ponto, devolva (a) afirmação em português, (b) citação exata no formato `[Livro 5ed, cap. X, p.NNN]`. Não modifique nada. Estruture por tema (anatomia, técnica, complicações, etc.).

- [ ] **Step 2.3:** No agente principal, consolidar inventário + extratos e editar `content/rag/estetica-facial/rinoplastia.md`:
  - Inserir novos parágrafos nas seções onde há lacunas detectadas no 2.1
  - **Toda frase nova** deve ter citação inline no formato usado pelos temas já enriquecidos (ex.: `[Neligan 5ed, Vol.2, cap. 18, p. 512]`)
  - **Nunca apagar** conteúdo existente
  - Preservar acentuação PT-BR
  - Siglas expandidas na primeira ocorrência (ex.: "SMAS — sistema músculo-aponeurótico superficial")

- [ ] **Step 2.4:** Validar visualmente diff.

```bash
git diff content/rag/estetica-facial/rinoplastia.md | head -200
```
Expected: apenas adições, nenhuma remoção de linhas existentes.

- [ ] **Step 2.5:** Commit.

```bash
git add content/rag/estetica-facial/rinoplastia.md
git commit -m "feat(rag): enriquecer rinoplastia com livros-texto"
```

---

## Task 3 — Enriquecer gluteoplastia

**Files:**
- Modify: `content/rag/contorno-corporal/gluteoplastia.md`

### Referência dos capítulos

| Livro | Capítulo/Seção |
|---|---|
| Neligan 5ed Vol.2 | "Buttock augmentation", contorno glúteo |
| Grabb & Smith 9ed | Gluteoplastia |
| High Definition Body Sculpting (HDBS) | **Obrigatório** para lipoenxertia glútea / etching |
| Operative Dictations in PRS | Ditados glúteos |

- [ ] **Step 3.1:** Despachar subagente **Explore** para inventário do RAG atual.

Prompt literal:

> Leia `content/rag/contorno-corporal/gluteoplastia.md` e produza inventário (nível 2, nível 3, citações presentes, lacunas). Resposta em até 250 palavras. Não modifique o arquivo.

- [ ] **Step 3.2:** Despachar subagente **Explore** para extração dos livros-texto.

Prompt literal:

> Leia os capítulos de gluteoplastia/contorno glúteo em `00-Livros-Texto/Neligan5ed/Vol2/`, `00-Livros-Texto/Grabb9ed/`, `00-Livros-Texto/HDBS/`, `00-Livros-Texto/OperativeDictations/`. Extraia pontos factuais para enriquecer um RAG de gluteoplastia focados em: (a) anatomia glútea (músculos, fáscia profunda, plexo, veias glúteas — relevância de segurança pós-mortes BBL), (b) BBL — Brazilian Butt Lift — Lipoenxertia Glútea (técnica subcutânea pura, recomendações ASERF/ASPS, volume por glúteo, cânula de diâmetro maior, visualização com ultrassom intraop quando disponível), (c) implantes glúteos (subfascial, submuscular, intramuscular — XYZ Mendieta), (d) gluteoplastia de aumento/elevação (lower body lift, flap autoaumento), (e) complicações (embolia gordurosa, seroma, infecção, migração de implante). Cada ponto com citação inline literal no formato `[Livro, cap. X, p.NNN]`. Até 500 palavras.

- [ ] **Step 3.3:** Editar `content/rag/contorno-corporal/gluteoplastia.md` com o conteúdo extraído:
  - Expandir seções existentes; criar subseções se a estrutura do `_structure.json` exigir
  - **Toda frase nova** com citação inline
  - Jamais apagar conteúdo existente
  - Expandir sigla BBL na primeira ocorrência; manter consistência de terminologia

- [ ] **Step 3.4:** Validar diff.

```bash
git diff content/rag/contorno-corporal/gluteoplastia.md | head -200
```
Expected: apenas adições.

- [ ] **Step 3.5:** Commit.

```bash
git add content/rag/contorno-corporal/gluteoplastia.md
git commit -m "feat(rag): enriquecer gluteoplastia com livros-texto"
```

---

## Task 4 — Enriquecer contorno-pos-bariatrico

**Files:**
- Modify: `content/rag/contorno-corporal/contorno-pos-bariatrico.md`

### Referência dos capítulos

| Livro | Capítulo/Seção |
|---|---|
| Neligan 5ed Vol.2 | "Body contouring after massive weight loss" (capítulos dedicados) |
| Grabb & Smith 9ed | Post-bariatric body contouring |
| Neligan Core Procedures 2ed | Bodylift, braquioplastia |
| Operative Dictations in PRS | Bodylift inferior, braquioplastia, mastopexia |

- [ ] **Step 4.1:** Subagente **Explore** — inventário.

Prompt literal:

> Leia `content/rag/contorno-corporal/contorno-pos-bariatrico.md` e devolva inventário (níveis 2/3, citações presentes, lacunas). Até 250 palavras. Não modificar.

- [ ] **Step 4.2:** Subagente **Explore** — extração dos livros-texto.

Prompt literal:

> Leia os capítulos de body contouring pós-bariátrico em `00-Livros-Texto/Neligan5ed/Vol2/`, `00-Livros-Texto/Grabb9ed/`, `00-Livros-Texto/NeliganCoreProcedures2ed/`, `00-Livros-Texto/OperativeDictations/`. Extraia pontos focados em: (a) avaliação pré-op pós-bariátrica (IMC — índice de massa corporal — estabilidade ≥12 meses, reposição proteica, deficiências de micronutrientes, ASA), (b) bodylift inferior circunferencial (marcações em ortostatismo, plano de dissecção, avanço vs ressecção, drenagem), (c) braquioplastia (padrões de incisão T vs longitudinal, neuroma do cutâneo medial do antebraço), (d) mastopexia pós-bariátrica (auto-aumento, parenchymal remodeling), (e) combinações seguras e sequenciamento por etapas, (f) complicações de ferida (deiscência, seroma, TEP — tromboembolismo pulmonar — profilaxia com HBPM — heparina de baixo peso molecular). Cada ponto com citação inline literal. Até 500 palavras.

- [ ] **Step 4.3:** Editar o arquivo RAG aplicando o extrato:
  - Manter IMC e siglas expandidas na primeira ocorrência
  - Toda frase nova com citação
  - Não apagar conteúdo existente

- [ ] **Step 4.4:** Validar diff.

```bash
git diff content/rag/contorno-corporal/contorno-pos-bariatrico.md | head -200
```
Expected: apenas adições.

- [ ] **Step 4.5:** Commit.

```bash
git add content/rag/contorno-corporal/contorno-pos-bariatrico.md
git commit -m "feat(rag): enriquecer contorno-pos-bariatrico com livros-texto"
```

---

## Task 5 — Re-derivar cards dos 3 temas

**Files:**
- Overwrite: `content/cards/estetica-facial/rinoplastia/*.json`
- Overwrite: `content/cards/contorno-corporal/gluteoplastia/*.json`
- Overwrite: `content/cards/contorno-corporal/contorno-pos-bariatrico/*.json`

- [ ] **Step 5.1:** Rodar derivação em dry-run para conferir parsing.

```bash
node tools/rag_to_cards.js --topic rinoplastia --area estetica-facial --dry-run
```
Expected: log de seções parseadas, sem erro de parser, sem escrita.

Repetir para os outros dois:

```bash
node tools/rag_to_cards.js --topic gluteoplastia --area contorno-corporal --dry-run
node tools/rag_to_cards.js --topic contorno-pos-bariatrico --area contorno-corporal --dry-run
```

- [ ] **Step 5.2:** Rodar derivação real (sem dry-run) para os 3 temas.

```bash
node tools/rag_to_cards.js --topic rinoplastia --area estetica-facial
node tools/rag_to_cards.js --topic gluteoplastia --area contorno-corporal
node tools/rag_to_cards.js --topic contorno-pos-bariatrico --area contorno-corporal
```
Expected: cada execução imprime contagens (anatomia, técnicas, decisões, notas, flashcards) e "OK ✓" para cada schema validate.

- [ ] **Step 5.3:** Inspecionar um card de cada tema para confirmar citações inline presentes.

```bash
grep -c "cap\." content/cards/estetica-facial/rinoplastia/notas.json
grep -c "cap\." content/cards/contorno-corporal/gluteoplastia/notas.json
grep -c "cap\." content/cards/contorno-corporal/contorno-pos-bariatrico/notas.json
```
Expected: contagem > 0 para os 3 — toda nota deve ter citação.

- [ ] **Step 5.4:** Conferir `_meta.json` de cada tema bate com contagens dos arquivos.

```bash
for t in rinoplastia gluteoplastia contorno-pos-bariatrico; do
  area=$( [ "$t" = "rinoplastia" ] && echo estetica-facial || echo contorno-corporal )
  echo "=== $t ==="
  cat "content/cards/$area/$t/_meta.json"
done
```
Expected: `counts` em `_meta.json` bate com `length` dos arrays nos JSONs correspondentes.

- [ ] **Step 5.5:** Validar acentuação PT-BR — heurística: não deve haver caracteres `Ã` ou `Â` (indicam mojibake).

```bash
for t in rinoplastia gluteoplastia contorno-pos-bariatrico; do
  area=$( [ "$t" = "rinoplastia" ] && echo estetica-facial || echo contorno-corporal )
  grep -l "Ã\|Â" content/cards/$area/$t/*.json && echo "MOJIBAKE em $t" || echo "OK $t"
done
```
Expected: `OK` para os 3 temas.

- [ ] **Step 5.6:** Commit único para os 3 re-derivações.

```bash
git add content/cards/estetica-facial/rinoplastia/ content/cards/contorno-corporal/gluteoplastia/ content/cards/contorno-corporal/contorno-pos-bariatrico/
git commit -m "feat(cards): re-derivar cards dos 3 temas da fase 5b com citacoes inline"
```

---

## Task 6 — Verificação end-to-end (Playwright mobile)

**Files:** nenhum.

- [ ] **Step 6.1:** Subir servidor estático do PWA.

```bash
cd webapp/library && python -m http.server 8765 &
```
Expected: `Serving HTTP on 0.0.0.0 port 8765`. Salvar PID para kill posterior.

- [ ] **Step 6.2:** Via Playwright MCP, navegar para `http://localhost:8765/` em viewport iPhone (390×844).

Ações do Playwright:
1. `browser_resize(390, 844)`
2. `browser_navigate("http://localhost:8765/")`
3. `browser_snapshot()` — confirmar home renderiza 2 ícones (Briefing, Chat IA)

- [ ] **Step 6.3:** Para cada tema (rinoplastia, gluteoplastia, contorno-pos-bariatrico):
  1. Clicar no ícone Briefing
  2. Buscar pelo tema
  3. Abrir briefing
  4. `browser_snapshot()` + `browser_console_messages()` para checar erros
  5. Conferir render de: Anatomia (labels), Técnicas (passos), Decisões (árvores), Flashcards

Expected: nenhum erro no console, todas as seções renderizam conteúdo não-vazio.

- [ ] **Step 6.4:** Parar servidor.

```bash
kill %1 2>/dev/null || true
```

---

## Task 7 — Code review e PR

- [ ] **Step 7.1:** Invocar skill `superpowers:requesting-code-review` sobre a branch `feat/v2-fase5b-rag-enrichment`. Aplicar correções propostas se houver.

- [ ] **Step 7.2:** Invocar `/code-review:code-review` local antes de abrir PR. Aplicar correções.

- [ ] **Step 7.3:** Push da branch.

```bash
git push -u origin feat/v2-fase5b-rag-enrichment
```

- [ ] **Step 7.4:** Criar PR com gh CLI.

```bash
gh pr create --title "feat(fase5b): enriquecer 3 temas RAG com livros-texto" --body "$(cat <<'EOF'
## Summary
- Enriquecido rinoplastia, gluteoplastia e contorno-pos-bariatrico com conteúdo dos livros-texto canônicos (Neligan 5ed, Grabb & Smith 9ed, Core Procedures, Operative Dictations, HDBS para glúteo)
- Toda frase nova tem citação inline
- Cards re-derivados via `tools/rag_to_cards.js`, schemas validados
- Verificado em mobile via Playwright (briefing de cada tema renderizando)

## Test plan
- [ ] Rodar `node tools/rag_to_cards.js --all --dry-run` localmente — parser OK
- [ ] Abrir PWA no iPhone e navegar briefings dos 3 temas

🤖 Generated with Claude Code
EOF
)"
```

- [ ] **Step 7.5:** Atualizar memória após merge.

Criar/atualizar `project_fase5b_rag_enrichment.md`:
- Status: CONCLUÍDA em <data do merge>
- Temas enriquecidos: rinoplastia, gluteoplastia, contorno-pos-bariatrico
- PR #: <número>
- Temas RAG ainda pendentes: otoplastia, lipoaspiracao (Fase 5c)

Atualizar índice em `MEMORY.md`.

- [ ] **Step 7.6:** Remover worktree após merge.

```bash
cd c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git worktree remove .worktrees/fase5b
git branch -d feat/v2-fase5b-rag-enrichment
```

---

## Self-review — checagem final antes de executar

**Spec coverage:**
- [x] Rinoplastia enriquecida (Task 2)
- [x] Gluteoplastia enriquecida com HDBS (Task 3)
- [x] Contorno-pós-bariátrico enriquecido (Task 4)
- [x] Cards re-derivados com citações inline (Task 5)
- [x] Verificação Playwright mobile (Task 6)
- [x] Code review + PR (Task 7)
- [x] Worktree isolado (Task 1)
- [x] Memória atualizada (Step 7.5)

**Placeholders:** nenhum "TBD"/"TODO" solto; prompts dos subagentes são literais; comandos têm expected output.

**Consistência:** nomes de arquivo (`rinoplastia.md`, etc.) batem com listagem real verificada via `ls`; tool `rag_to_cards.js` usa exatamente as flags `--topic`, `--area`, `--dry-run`, `--all` conforme cabeçalho do script.

**Fora de escopo (para Fase 5c):** otoplastia, lipoaspiracao. Plano separado será criado após merge deste.
