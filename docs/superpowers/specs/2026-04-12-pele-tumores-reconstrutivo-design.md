# Pele/Tumores — Bloco Reconstrutivo (Frente A)

**Data:** 2026-04-12
**Status:** Aprovado
**Autor:** Dr. Arthur Balestra Silveira Ayres + Claude

---

## Objetivo

Inaugurar a área `pele-tumores` na biblioteca com três temas reconstrutivos de alta frequência na rotina cirúrgica, cobrindo princípios que se aplicam a qualquer ressecção cutânea (oncológica ou não). Esta é a primeira leva; os temas oncológicos (CBC, CEC, melanoma) entrarão em ciclo posterior dentro da mesma área.

## Escopo

### Área nova

- Identificador: `pele-tumores`
- Acomoda tanto reconstrução pós-excisão quanto oncologia cutânea futura
- Adicionar ao `content/cards/manifest.json` três entradas com `status: "complete"` após execução

### Temas

| # | Tema (topic) | displayName |
|---|---|---|
| 1 | `retalhos-locais-face` | Retalhos Locais de Face |
| 2 | `enxertos-pele` | Enxertos de Pele (FTSG e STSG) |
| 3 | `principios-excisao-margens` | Princípios de Excisão e Margens |

### Conteúdo por tema

**1. Retalhos Locais de Face**
- Princípios: RSTL (linhas de tensão relaxada), subunidades estéticas, vascularização de retalhos randômicos, arco de rotação, back-cut, dog-ear
- Técnicas: rombóide (Limberg), bilobado (Zitelli), avanço (unilateral, bilateral, V-Y), rotação, transposição
- Seleção por região: nasal, malar, perioral, periorbital, frontal, auricular
- Complicações: necrose, trap-door, dehiscência, distorção de landmarks

**2. Enxertos de Pele (FTSG e STSG)**
- Princípios: fases de take (imbibição, inosculação, revascularização), causas de falha
- FTSG: indicações, sítios doadores (retroauricular, supraclavicular, pálpebra superior, prega inguinal), técnica
- STSG: indicações, dermátomo, espessura, meshing, sítio doador (coxa/glúteo/dorso)
- Cuidados: bolster, curativo, imobilização, cuidado com sítio doador
- Contraindicações: leito avascular (osso exposto sem periósteo, cartilagem exposta sem pericôndrio, tendão sem paratendão)

**3. Princípios de Excisão e Margens**
- Planejamento: elipse, razão comprimento/largura, orientação em RSTL
- Margens oncológicas: CBC (4 mm), CEC (4–6 mm com critérios de alto risco), melanoma (por Breslow), nevo atípico
- Orientação da peça cirúrgica: fio de orientação, marcação para patologia
- Cirurgia de Mohs: indicações (face, margens mal definidas, recidiva, histologia agressiva), princípios
- Re-excisão: quando e como

### Referências primárias

- Neligan's Plastic Surgery 5ª Ed. — Vol 1 (Principles), Vol 2 (Aesthetic), Vol 3 (Craniofacial/Head & Neck), Vol 5 (Skin/Tumors) conforme pertinência
- Grabb and Smith's Plastic Surgery 9ª Ed.
- Operative Dictations in Plastic and Reconstructive Surgery
- Practical Facial Reconstruction: Theory and Practice
- The Cutaneous Arteries of the Human Body (para vascularização de retalhos)

## Arquitetura

### Estrutura de dados

```text
content/rag/pele-tumores/
├── retalhos-locais-face.md
├── enxertos-pele.md
└── principios-excisao-margens.md

content/cards/pele-tumores/
├── retalhos-locais-face/
│   ├── _meta.json
│   ├── anatomia.json
│   ├── tecnicas.json
│   ├── decisoes.json
│   ├── notas.json
│   └── flashcards.json
├── enxertos-pele/
│   └── (mesma estrutura)
└── principios-excisao-margens/
    └── (mesma estrutura)
```

### Template canônico

Cada RAG segue `content/rag/_template.md` e a estrutura descrita em `content/rag/_structure.json`. Headers em inglês (espelho do Neligan 5ª), conteúdo em português brasileiro com terminologia anatômica oficial. Siglas com nome por extenso na primeira ocorrência por seção.

### Cards derivados

- Gerados pela tool idempotente `tools/rag_to_cards.js` (já corrigida em PR #6 para dedupe por título + `_meta` do manifest + parser CRLF-safe)
- Schema validado contra `content/cards/schema.json`
- Cinco tipos: `anatomy`, `technique`, `decision`, `note`, `flashcard`

## Workflow por Tema

### Passo 1: Escrita do RAG

- Ler capítulos correspondentes do Neligan 5ª + livros secundários pertinentes
- Compor documento unificado seguindo template canônico
- Citação inline em todo conteúdo novo
- Nunca apagar conteúdo existente (regra invariante — aqui não se aplica por ser tema novo, mas a regra vale para edições futuras)

### Passo 2: Derivação dos cards

- `node tools/rag_to_cards.js content/rag/pele-tumores/<tema>.md`
- Conferir output: `content/cards/pele-tumores/<tema>/*.json`
- Validar schema: cada JSON deve passar `content/cards/schema.json`

### Passo 3: Atualizar manifest

Adicionar três entradas em `content/cards/manifest.json`:

```json
{ "area": "pele-tumores", "topic": "retalhos-locais-face", "displayName": "Retalhos Locais de Face", "status": "complete" },
{ "area": "pele-tumores", "topic": "enxertos-pele", "displayName": "Enxertos de Pele (FTSG e STSG)", "status": "complete" },
{ "area": "pele-tumores", "topic": "principios-excisao-margens", "displayName": "Princípios de Excisão e Margens", "status": "complete" }
```

### Passo 4: Build do índice RAG e validação PWA

- `node tools/build_rag_index.js`
- Verificar que o PWA lista os três novos temas na busca
- Bump de `CACHE_NAME` no service worker
- Testar mobile viewport via Playwright: home → busca → briefing pré-op de um dos novos temas

## Imagens

Esta spec cria a **estrutura textual** dos três temas. A enriquecimento com imagens não faz parte do escopo — será tratado em ciclo próprio (análogo à frente B para os temas atuais). Os diretórios `assets/images/<tema>/` podem ser criados vazios para reservar o caminho.

## Entrega

- **Branch:** `feat/v2-pele-tumores-reconstrutivo`
- **PR:** #7 (ou seguinte)
- **Ordem de commits dentro da branch:**
  1. `feat(rag): iniciar area pele-tumores com retalhos-locais-face`
  2. `feat(cards): derivar cards de retalhos-locais-face`
  3. `feat(rag): adicionar enxertos-pele`
  4. `feat(cards): derivar cards de enxertos-pele`
  5. `feat(rag): adicionar principios-excisao-margens`
  6. `feat(cards): derivar cards de principios-excisao-margens`
  7. `chore(manifest): marcar 3 temas de pele-tumores como complete`
- **Code review:** `/code-review:code-review` antes de mergear
- **Merge:** após aprovação humana

## Critérios de Aceitação

- [ ] Três RAGs escritos seguindo template canônico, com citações inline
- [ ] Três blocos de cards derivados e validados contra schema
- [ ] Manifest atualizado com as três entradas `complete`
- [ ] Índice RAG rebuildado
- [ ] Service worker com `CACHE_NAME` bumpado
- [ ] PWA lista e renderiza os três temas corretamente em mobile viewport

## Regras de Conteúdo

Valem todas as regras invariantes do `CLAUDE.md`:

1. Nunca apagar conteúdo existente ao atualizar
2. Validar acentuação portuguesa
3. Citação de fonte inline em todo conteúdo novo
4. Siglas com nome por extenso na primeira ocorrência por seção
5. Nomes de arquivo de imagem: ASCII sem acentos (aplicável apenas quando imagens entrarem no ciclo próprio)
6. Português brasileiro com terminologia anatômica oficial
7. Nunca escrever conteúdo sem ter lido o capítulo correspondente do Neligan

## Paralelismo com Frente B

Esta spec roda em branch independente da spec `2026-04-12-imagens-b1-design.md` (Frente B). As duas frentes tocam arquivos disjuntos — zero risco de conflito. Podem mergear em qualquer ordem.
