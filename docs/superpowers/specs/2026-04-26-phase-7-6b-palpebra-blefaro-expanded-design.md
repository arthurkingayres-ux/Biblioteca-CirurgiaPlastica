# Phase 7.6b — Reconstrução de Pálpebra + Enriquecimento Blefaroplastia

**Data:** 2026-04-26
**Áreas:** `reconstrucao-facial/reconstrucao-de-palpebra` (novo) + `estetica-facial/blefaroplastia` (existente, expandido)
**Posição no roadmap:** Phase 7 — Reconstrução Facial por Sub-Unidade, Onda 2, sub-unidade pálpebra (segunda da onda 2 após bochecha)
**Status:** Spec aprovado, pronto para conversão em plano executável.

## Contexto

Sub-fases 7.0 (blefaroplastia remediation), 7.1 (chapter-opener), 7.2 (anatomy purge), 7.3 (RAGs Kaufman horizontais), 7.4 (nariz), 7.5 (lábio), 7.6a (bochecha) e 7.6.5 (schema relax + AJV gate) concluídas. Próxima sub-unidade do roadmap é **pálpebra**.

Em 2026-04-26 o Dr. Arthur adicionou dois livros à pasta `00-Livros-Texto/`:

1. **Oculofacial Plastic and Orbital Surgery** (BCSC Section 7, AAO 2019-2020) — 377 páginas, 360 com camada de texto. Currículo da Academia Americana de Oftalmologia em 15 capítulos cobrindo órbita, tecidos moles perioculares e sistema lacrimal.
2. **Jackson — Local Flaps in Head and Neck Reconstruction (2nd ed)** — 525 páginas; capítulos 1-2 (~58 páginas) com camada de texto, capítulos 3-10 (~467 páginas) escaneados sem OCR. Cap. 7 dedicado integralmente a pálpebra + cantos (80 páginas).

Leitura sistemática do Oculofacial revelou que cap. 11 (Reconstructive Eyelid Surgery) cobre a ladder reconstrutiva completa por tamanho do defeito (Tenzel, Hughes modificado, Cutler-Beard, Mustardé, retalho periosteal lateral, retalho glabelar/frontal medial), com profundidade suficiente para sustentar o RAG. Caps. 9 (Anatomia Facial e Palpebral), 10 (Classificação de Doenças Palpebrais) e 12 (Malposições) complementam.

OCR via easyocr instalado e rodando em background sobre Jackson (priorização cap.7 = páginas PDF 341-422). Saída em `00-Livros-Texto/_extracted/jackson-local-flaps-head-neck.ocr.txt` (gitignored).

## Decisões já tomadas (durante brainstorming)

1. **Escopo expandido** (10 cards de procedimentos + 2 anatômicos) em vez do padrão enxuto — pálpebra tem mais sub-variações anatômicas que outras sub-unidades.
2. **Anatomia condensada própria** no RAG (com viés reconstrutivo: lamelas funcionais, suprimento vascular pediculado), não link cruzado para blefaroplastia. Adicionalmente, 2 cards anatômicos novos.
3. **Fontes:** Neligan vol.3 + Oculofacial caps.9/10/11 + Jackson cap.7 + Practical Facial Reconstruction + Grabb 9ed. Codner & McCord e Spinelli **não disponíveis** (não estão em `00-Livros-Texto/`); descartados.
4. **Pacote A+B**: combinar reconstrução-pálpebra (frente A) com enriquecimento blefaroplastia (frente B) em uma Phase 7.6b única. Justificativa: ler Oculofacial caps. 9/12/13 é trabalho compartilhado entre as duas frentes; trabalho dobrado ao separar.
5. **Frentes deferidas** (não nesta phase): tema independente de ptose (Phase 7.7?), ectrópio/entrópio (7.8?), paralisia facial, sistema lacrimal (Phase 8?), órbita (Phase 8/9).

## Arquitetura

### Arquivos novos

```
content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md
content/cards/reconstrucao-facial/reconstrucao-de-palpebra/
├── _meta.json (versão 1.0.0)
├── 00-anatomia-lamelas-funcionais.json (anatomy_v2)
├── 01-anatomia-suprimento-vascular.json (anatomy_v2)
├── 02-defeito-parcial-inferior-fechamento-direto.json (technique)
├── 03-defeito-parcial-superior-fechamento-direto.json (technique)
├── 04-tenzel-semicircular.json (technique)
├── 05-hughes-modificado.json (technique)
├── 06-cutler-beard.json (technique)
├── 07-mustarde-bochecha-rotacao.json (technique)
├── 08-canto-lateral-periosteal.json (technique)
├── 09-canto-medial-ftsg-glabelar.json (technique)
├── 10-tarsoconjuntival-grafts.json (technique)
└── 11-enxerto-pele-total-palpebra.json (technique)

assets/images/reconstrucao-facial/reconstrucao-de-palpebra/
└── ~17 PNGs ASCII filenames
```

### Arquivos modificados

```
content/rag/estetica-facial/blefaroplastia.md       # +6k tokens (~7k → ~13k)
content/cards/estetica-facial/blefaroplastia/
├── _meta.json                                       # bump versão
├── (cards existentes adensados, sem deletar conteúdo)
└── 3-4 cards NOVOS:
    ├── XX-anatomia-whitnall-mueller.json (anatomy_v2)
    ├── XX-anatomia-fat-pads-detalhados.json (anatomy_v2)
    ├── XX-complicacao-cegueira-retrobulbar.json (clinical_pearl)
    └── XX-bomba-lacrimal-blink.json (clinical_pearl)

assets/images/estetica-facial/blefaroplastia/
└── 3 PNGs novos

content/cards/manifest.json                          # adicionar reconstrucao-de-palpebra; bump blefaroplastia
docs/superpowers/plans/2026-04-18-phase-7-reconstrucao-facial-roadmap.md  # marcar 7.6b
webapp/library/service-worker.js                     # bump v30 → v31
```

## RAG `reconstrucao-de-palpebra.md` — estrutura

Frontmatter padrão. Corpo organizado para sustentar clusters de cards.

| § | Seção | Tokens | Sustenta |
|---|---|---|---|
| 1 | Anatomia condensada com viés reconstrutivo | ~1.5k | cards 00, 01 |
| 1.1 | Lamelas funcionais (anterior cutâneo-muscular vs posterior tarso-conjuntival) | | 00 |
| 1.2 | Tarso superior 10-12mm vs inferior 3-4mm | | 00 |
| 1.3 | Arcadas marginal (2mm sup margem) e periférica (entre levator e Müller) | | 01 |
| 1.4 | Tendões cantais — limbos sup/inf, MCT lacrimal crest, LCT tubérculo orbital | | 08, 09 |
| 1.5 | Drenagem linfática medial→submandibular vs lateral→preauricular | | 09 |
| 1.6 | Zona de segurança 2cm canto lateral (ramo frontal CN VII) | | 07, 08 |
| 2 | Princípios reconstrutivos | ~1k | todos |
| 2.1 | Reconstruir anterior OU posterior com enxerto, nunca ambos (1 lamela = pedículo) | | |
| 2.2 | Tensão horizontal preferida vertical (evita retração/ectrópio) | | |
| 2.3 | Match cor/espessura, fixação cantal anatômica | | |
| 2.4 | Hierarquia: função → margem estável → fechamento → altura → epitelialização interna → cosmese | | |
| 3 | Etiologia dos defeitos | ~0.5k | 02-11 |
| 3.1 | Pós-tumor (BCC, SCC, sebáceo, melanoma, Merkel) | | |
| 3.2 | Pós-trauma (margem, canalicular, canthal avulsion, queimadura) | | |
| 3.3 | Pós-cirúrgico (blefaroplastia agressiva → retração/ectrópio iatrogênico) | | |
| 4 | Reconstrução de pálpebra inferior por tamanho | ~2k | 02, 04, 05, 07 |
| 4.1 | <33% margem: fechamento direto ± lateral cantólise | | 02 |
| 4.2 | 33-50%: Tenzel rotação semicircular | | 04 |
| 4.3 | >50% espessura total: Hughes modificado (passo-a-passo, 2 estágios, 3-4 sem) | | 05 |
| 4.4 | >50% lamela anterior isolada: Mustardé bochecha-rotação | | 07 |
| 4.5 | Defeitos completos: Hughes + Mustardé combinados | | 05, 07, 10 |
| 5 | Reconstrução de pálpebra superior por tamanho | ~1.5k | 03, 04, 06 |
| 5.1 | <33%: fechamento direto ± release LCT superior | | 03 |
| 5.2 | 33-50%: Tenzel modificado superior | | 04 |
| 5.3 | >50%: Cutler-Beard (bridge flap inferior→superior, 2 estágios, complicações) | | 06 |
| 5.4 | Alternativa moderna: enxerto livre tarsoconjuntival contralateral + retalho músculo-cutâneo | | 06, 10 |
| 6 | Cantos | ~1k | 08, 09 |
| 6.1 | Canto lateral: rhomboid, semicircular, retalho periosteal, Y-pedicle | | 08 |
| 6.2 | Canto medial: granulação 2ª intenção, FTSG, retalho glabelar/frontal mediano | | 09 |
| 6.3 | Telecanto pós-trauma — fios transnasais, miniplate Y posterior | | 09 |
| 7 | Enxertos e substitutos lamelares | ~1k | 10, 11 |
| 7.1 | FTSG anterior: pálpebra contralateral > postauricular > preauricular > supraclavicular > braço interno | | 11 |
| 7.2 | Posterior: tarsoconjuntival (4-5mm marginal preservado), mucosa bucal, palato duro (só inferior), cartilagem auricular, esclera preservada | | 10 |
| 8 | Complicações específicas | ~1k | todos |
| 8.1 | Ectrópio cicatricial pós-reconstrução (tração vertical, lamela anterior insuficiente) | | |
| 8.2 | Retração lamelar média: scarring septal, requer spacer | | |
| 8.3 | Triquíase, distichíase secundária à mal posição | | |
| 8.4 | Lagoftalmo, exposição corneana — Bell+, lubrificação, tarsorrafia temporária | | |
| 8.5 | Lesão lacrimal medial — DCR/CDCR diferida até clearance oncológico | | |
| 9 | Considerações peri-operatórias | ~0.5k | todos |
| 9.1 | Mohs preferencial em canto medial e tumores recorrentes/morfeaformes | | |
| 9.2 | Frozen sections + 1-2mm margem + mapeamento detalhado | | |
| 9.3 | Reconstrução só após confirmação de margens livres | | |
| 9.4 | Patching/sutura temporária se reconstrução diferida | | |
| 10 | Pediatria | ~0.3k | |
| 10.1 | Eyelid-sharing (Hughes, Cutler-Beard) — cuidado com ambliopia por privação | | |
| 10.2 | Frontalis suspension complementar se levator afetado | | |

**Total estimado:** ~10-12k tokens.

## Cards — lista final

| # | ID | Tipo | Título | Imagens |
|---|---|---|---|---|
| 00 | `00-anatomia-lamelas-funcionais` | anatomy_v2 | Lamelas Funcionais da Pálpebra | 1 (corte sagital + overlays) |
| 01 | `01-anatomia-suprimento-vascular` | anatomy_v2 | Suprimento Vascular Palpebral e Arcadas | 1 (frontal + zona segurança 2cm) |
| 02 | `02-defeito-parcial-inferior-fechamento-direto` | technique | Fechamento Direto de Defeito Parcial Inferior | 1 |
| 03 | `03-defeito-parcial-superior-fechamento-direto` | technique | Fechamento Direto de Defeito Parcial Superior | 1 |
| 04 | `04-tenzel-semicircular` | technique | Retalho Semicircular de Tenzel | 1 |
| 05 | `05-hughes-modificado` | technique | Hughes Modificado | 2 (estágios 1 e 2) |
| 06 | `06-cutler-beard` | technique | Cutler-Beard | 2 (estágios 1 e 2) |
| 07 | `07-mustarde-bochecha-rotacao` | technique | Mustardé Bochecha-Rotação | 2 (marcação + suspensão) |
| 08 | `08-canto-lateral-periosteal` | technique | Reconstrução de Canto Lateral | 1-2 |
| 09 | `09-canto-medial-ftsg-glabelar` | technique | Reconstrução de Canto Medial | 1-2 |
| 10 | `10-tarsoconjuntival-grafts` | technique | Enxertos Tarsoconjuntivais e Substitutos Posteriores | 1 |
| 11 | `11-enxerto-pele-total-palpebra` | technique | Enxerto de Pele Total para Lamela Anterior | 1 |

**Total:** 12 cards (2 anatomy_v2 + 10 technique), 14-17 imagens.

## Enriquecimento blefaroplastia (frente B)

### Adições ao RAG `estetica-facial/blefaroplastia.md`

Conteúdo existente preservado integralmente. Adições (~6k tokens):

- **Anatomia detalhada**: Whitnall (sleeve elástico, fulcrum), horns medial/lateral do levator (lateral divide lacrimal gland em orbital/palpebral lobes), Müller (12-14mm acima borda tarsal sup, 2-3mm elevação, simpático, peripheral arterial arcade landmark), capsulopalpebral fascia + Lockwood, 2 fat pads sup vs 3 inferiores com inferior oblique entre medial e central como landmark crítico.
- **Asian eyelid variant**: septum funde com aponeurose levator entre margem e borda sup tarso → crease mais baixa; implicações cirúrgicas.
- **SOOF e ROOF**: papel na descida midfacial; reposicionamento ROOF ao periósteo frontal.
- **Avaliação pré-op expandida**: 5 medidas de ptose com negação do frontalis, Hering's law, snapback test, distractibility, pinch test, mínimo 20mm sub-supercílio→margem após excisão, exophthalmometria, malar hypoplasia/proptose como red flags.
- **Técnicas: transcutâneo vs transconjuntival**: arcuate expansion do inferior oblique separando central de lateral, indicações de cada via.
- **Complicações graves — perda de visão**: hemorragia retrobulbar → compartment syndrome → isquemia; pressure dressing CONTRAINDICADO; sinais; manejo emergencial; lesão de oblíquo inferior/reto inferior/oblíquo superior.
- **Complicações cosméticas/funcionais**: lagoftalmo, ectrópio cicatricial, retração lamelar média (spacer), scleral show inferior; tratamento escalonado.
- **Mecânica da bomba lacrimal e blink cycle**: pretarsal fecha puncta+canalículos; preseptal cria pressão positiva; abertura cria negativa. Blink fraco → epífora funcional.
- **Contexto de rejuvenescimento integrado**: brow ptosis (browpexy/endoscópico/pretrichial), midface (preperiosteal vs subperiosteal), laser CO2/Er:YAG (Fitzpatrick I-III ideal), HA fillers (zonas de risco arterial; oclusão oftálmica retrógrada → cegueira).
- **Brow ptosis pré-op obrigatório**: reconhecer e tratar primeiro/concomitante.

### Cards de blefaroplastia

**Existentes:** adensar `keyPoints[]`, `complications[]`, `pitfalls[]` sem renomear/deletar.

**Novos (3-4):**

| ID | Tipo | Conteúdo |
|---|---|---|
| `XX-anatomia-whitnall-mueller.json` | anatomy_v2 | Whitnall + Müller + peripheral arcade |
| `XX-anatomia-fat-pads-detalhados.json` | anatomy_v2 | 2 sup vs 3 inf com inferior oblique landmark |
| `XX-complicacao-cegueira-retrobulbar.json` | clinical_pearl | Hemorragia retrobulbar → compartment → isquemia → cegueira |
| `XX-bomba-lacrimal-blink.json` | clinical_pearl | Mecânica da bomba; implicações para blefaroplastia agressiva |

Numeração `XX-` resolvida durante execução observando IDs já existentes.

### Imagens novas em blefaroplastia (3 PNGs)

- `whitnall-mueller-arcada-periferica.png` (Oculofacial Fig 9-18, 9-19, 9-20)
- `fat-pads-inferiores-oblique.png` (Oculofacial Fig 9-15, 9-16)
- `bomba-lacrimal-blink-cycle.png` (Oculofacial Fig 14-4)

## Estratégia de imagens

### Convenção de filenames (regra inviolável CLAUDE.md #5)

ASCII puro, sem acentos. Listagem completa em §6 do brainstorming consolidado.

### Pipeline

1. Pré-auditoria: `python tools/audit_images.py`.
2. Identificar figuras-alvo (página + número de figura por card-rascunho).
3. Renderizar via `tools/harvest_palpebra_images.py` (a criar, análogo aos harvesters de 7.4/7.5/7.6a) usando `fitz.Page.get_pixmap(dpi=300)`.
4. Annotate (overlays numéricos) os cards anatomy_v2 via `tools/annotate_figure.py`.
5. Validar visual: cada PNG via `Read`; conferir filename ASCII, label-conteúdo match, overlays no lugar, zero reuso entre cards.

## Fontes e citações

### Formato

- Livro-texto: `(Oculofacial cap.11, p.220)`
- PMID: `(PMID: 24389441)`
- Multiple: `;`-separated dentro de parênteses

### Abreviações canônicas

```
Oculofacial cap.X, p.Y     → Oculofacial Plastic and Orbital Surgery (BCSC Section 7, 2019-2020)
Neligan vol.3 cap.pálpebra → Neligan Plastic Surgery 5ed vol.3
Jackson cap.7, p.Y         → Jackson Local Flaps in Head and Neck Reconstruction 2ed
Practical FR cap.X         → Practical Facial Reconstruction: Theory and Practice
Grabb 9ed cap.X            → Grabb and Smith's Plastic Surgery 9ed (2024)
```

### PMIDs já identificados (lista parcial — confirmar via PubMed durante execução)

Lista completa em §7 do brainstorming consolidado (16 referências base). Buscar PMIDs adicionais por técnica via WebSearch/WebFetch durante execução de cada card.

### Princípio editorial

Toda afirmação técnica em card ou RAG cita livro com capítulo+página OU PMID. Conteúdo de conhecimento geral sem fonte = bloqueio de merge.

## Faseamento

### 7.6b.1 — Enriquecimento blefaroplastia (frente B)

Zero dependência de OCR Jackson; pode iniciar imediatamente. Escopo: expandir RAG existente, adensar cards, criar 3-4 cards novos, 3 PNGs novos, bump `_meta.json`. **Tempo estimado:** 2-3 horas.

### 7.6b.2 — Reconstrução de pálpebra: RAG + cards text-only (frente A parte 1)

Inicia após 7.6b.1 mergeada **e** OCR Jackson cap.7 completo. Escopo: criar RAG novo (~10-12k tokens), 12 cards JSON sem `images[]` populado, bump `manifest.json`, atualizar roadmap-7. **Tempo estimado:** 4-6 horas.

### 7.6b.3 — Imagens da reconstrução de pálpebra (frente A parte 2)

Após 7.6b.2 mergeada. Escopo: harvester para 17 PNGs, annotation overlays nos 2 cards anatomy_v2, popular `images[]` dos 12 cards, bump `_meta.json`, **bump SW v30 → v31**. **Tempo estimado:** 3-5 horas.

### Fechamento

`MEMORY.md` entry `project_phase7_6b_done.md` consolidando os 3 squashes; roadmap-7 marcando 7.6b ✅.

## Validação e gates

### Gates obrigatórios em cada PR

| Gate | Comando | Critério |
|---|---|---|
| AJV strict | `node tools/validate_cards_schema.mjs` | OK: N \| FAIL: 0 |
| BM25 | `node tools/build_rag_index.js` | Roda sem erro; reportar delta |
| Imagens | `python tools/audit_images.py` | Zero duplicatas, zero não-ASCII, zero reuso |
| Briefings | `node tools/validate_briefings.mjs` | Zero broken refs, zero lazy em primeiro card |
| /code-review-board | skill | Zero bloqueadores; importantes+sugeridos auto-aplicados |
| Worktree | `git rev-parse --show-toplevel` + `git branch --show-current` | Confirmar antes de scripts `tools/` |

### Métricas a reportar (per CLAUDE.md §11)

```
=== Phase 7.6b.X status ===
- AJV: OK: <N> | FAIL: 0
- BM25: <antes> → <depois> chunks
- audit_images: <N> imagens, 0 duplicatas
- validate_briefings: 0 broken refs, 0 lazy-on-first-card
- /code-review-board: <PR-N>-YYYY-MM-DD.md, 0 bloqueadores
- Squash SHA: <abbreviated>
```

## Riscos e mitigação

| Risco | Probab. | Mitigação |
|---|---|---|
| OCR Jackson cap.7 falhar/qualidade ruim | Média | Sample p.350 validou ~95%; fallback = renderizar PNGs e ler via `Read` multimodal; spec não cai porque Oculofacial cap.11 cobre o essencial |
| AJV bloquear cards novos | Baixa | Schema relax + AJV gate concluídos em 7.6.5 (572/572 passam) |
| Sobreposição cards anatômicos blefaro vs reconstrução | Baixa | Decisão B (anatomia condensada própria) já trata; viés clínico difere |
| Jackson com texto inglês em figuras | Média | Aceitar legendas em inglês; texto descritivo do card em português |
| Reuso acidental de imagem entre cards | Baixa-Média | Validação visual via `Read` + `audit_images.py` checa via hash |
| Acentuação portuguesa quebrada | Média | Escrever em português correto + grep NFC normalization pré-merge |
| CRLF quebrando BM25 | Baixa | Fix definitivo em 7.4 (`build_rag_index.js`); validar chunks count |
| Tempo total > orçado | Média-Alta | Faseamento em 3 PRs permite parar entre eles |

## Pontos de pausa autorizados

Per CLAUDE.md §1:

1. **Único ponto obrigatório de pausa por sub-fase:** antes do squash-merge, aguardando autorização explícita.
2. **Nenhuma outra pausa permitida**, exceto:
   - Bug imprevisto que impede progresso
   - Decisão arquitetural fora do escopo do spec
   - Finding de code-review que muda a premissa do plano

Para todo o resto (continue, próxima sub-fase, OCR pronto, etc.) → execução direta sem retornar a brainstorming.

## Próximos passos

1. Dr. Arthur revisa este spec.
2. Aprovação → conversão direta em plano executável em `docs/superpowers/plans/2026-04-26-phase-7-6b-palpebra-blefaro-expanded.md` (per CLAUDE.md §1, sem reentrar em brainstorming).
3. `superpowers:executing-plans` no mesmo turno.
4. Execução autônoma das 3 sub-fases sequenciais; pausa única antes de cada squash-merge.
