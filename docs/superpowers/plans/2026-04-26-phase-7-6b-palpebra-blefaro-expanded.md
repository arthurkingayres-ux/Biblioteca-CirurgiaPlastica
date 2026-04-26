# Phase 7.6b Implementation Plan — Reconstrução de Pálpebra + Blefaroplastia Enrichment

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (per CLAUDE.md §2 — obrigatório para sub-fases). Steps use checkbox (`- [ ]`) syntax.

**Spec:** [`docs/superpowers/specs/2026-04-26-phase-7-6b-palpebra-blefaro-expanded-design.md`](../specs/2026-04-26-phase-7-6b-palpebra-blefaro-expanded-design.md)

**Goal:** Add `reconstrucao-de-palpebra` (12 cards + ~10-12k token RAG) and enrich `blefaroplastia` (RAG ~7k → ~13k + 3-4 new cards) using Oculofacial BCSC Section 7 caps. 9/10/11/12/13/14, Jackson Local Flaps cap.7 (OCR), Neligan vol.3, Practical Facial Reconstruction, and Grabb 9ed as primary sources.

**Architecture:** Three sequential PRs (7.6b.1 → 7.6b.2 → 7.6b.3), each closes with CLAUDE.md §10 sub-phase checklist (tests → finishing-a-development-branch → /code-review-board → auto-apply findings → pause for explicit merge auth → squash → memory entry). 7.6b.1 starts immediately (no Jackson dependency). 7.6b.2 starts when Jackson cap.7 OCR completes (currently running in background, cap.7 done; full book ETA ~30 min remaining). 7.6b.3 starts after 7.6b.2 merged.

**Tech Stack:** JSON cards (v1 + v2 schema mixed via `type` discriminator), Markdown RAG (BM25 indexed via `tools/build_rag_index.js`), AJV strict validation (`tools/validate_cards_schema.mjs` — gate from Phase 7.6.5), PyMuPDF + easyocr for image harvest and OCR, Service Worker bump (`webapp/library/sw.js`).

---

## Schema reference (discovered during planning)

All topics share folder structure: `_meta.json + anatomia.json + decisoes.json + flashcards.json + notas.json + tecnicas.json`. Each JSON is an array of cards. Card `type` field discriminates: `anatomy_legacy` (v1, used in many existing topics), `anatomy_v2` (post Phase 4 migration), `technique`, plus `decision`/`note`/`flashcard` types in the respective category files. ID pattern `<prefix>-<type-abbrev>-NNN` where prefix is derived from topic slug (e.g., `narreconr-anat-001` for nariz, `blef-anat-001` for blefaroplastia).

For pálpebra-reconstrução, target prefix: `palreconr-` (mirroring `narreconr-` precedent from Phase 7.4 nariz). Confirm during execution Step 7.6b.2.0 by inspecting nariz/lábio/bochecha prefixes.

SW path: `webapp/library/sw.js` (NOT `service-worker.js`). Current `CACHE_NAME = 'briefing-preop-v30'`. Bump to `v31` in 7.6b.3.

---

# Sub-phase 7.6b.1 — Blefaroplastia Enrichment

**Branch:** `feature/phase-7-6b-1-blefaro-enrichment`
**Worktree:** `.worktrees/phase-7-6b-1-blefaro-enrichment`
**Sources:** Oculofacial cap.9 (anatomy), cap.12 (blepharoplasty subsection p.259+), cap.13 (rejuvenation), cap.14 (lacrimal pump). Zero Jackson dependency.

### Task 7.6b.1.0: Create worktree and verify baseline

**Files:**
- Modify: `.worktrees/phase-7-6b-1-blefaro-enrichment/` (new)

- [ ] **Step 1: Create worktree from master**

```bash
cd /c/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git worktree add .worktrees/phase-7-6b-1-blefaro-enrichment -b feature/phase-7-6b-1-blefaro-enrichment master
cd .worktrees/phase-7-6b-1-blefaro-enrichment
```

- [ ] **Step 2: Verify worktree state**

Run: `git rev-parse --show-toplevel && git branch --show-current && git status`
Expected: path ends with `phase-7-6b-1-blefaro-enrichment`, branch `feature/phase-7-6b-1-blefaro-enrichment`, clean.

- [ ] **Step 3: Baseline metrics**

```bash
node tools/validate_cards_schema.mjs 2>&1 | tail -3
node tools/build_rag_index.js 2>&1 | tail -3
wc -l content/rag/estetica-facial/blefaroplastia.md
python -c "import json; d=json.load(open('content/cards/estetica-facial/blefaroplastia/anatomia.json',encoding='utf-8')); print('anatomia cards:',len(d), 'last id:', d[-1]['id'])"
python -c "import json; d=json.load(open('content/cards/estetica-facial/blefaroplastia/notas.json',encoding='utf-8')); print('notas cards:',len(d), 'last id:', d[-1]['id'])"
```

Expected baseline (record these numbers): AJV `OK: 572 | FAIL: 0`; BM25 chunks `811`; RAG line count `~827`; `anatomia.json` 20 entries last id `blef-anat-020`; `notas.json` 12 entries last id format documented.

### Task 7.6b.1.1: RAG anatomy expansion (Whitnall, Müller, fat pads, Asian variant, SOOF/ROOF)

**Files:**
- Modify: `content/rag/estetica-facial/blefaroplastia.md` (append/expand inside existing Anatomia section)

- [ ] **Step 1: Locate existing Anatomia section**

```bash
grep -n "^## " content/rag/estetica-facial/blefaroplastia.md | head -20
```

Identify the heading that opens the anatomical content. Append new sub-sections AFTER the existing anatomical content, preserving everything previous (CLAUDE.md inviolable rule #1: NUNCA apagar conteúdo existente).

- [ ] **Step 2: Append Whitnall + horns sub-section**

Insert at end of Anatomia section (preserve all existing text):

```markdown
### Ligamento de Whitnall e cornos do levator

O ligamento transverso superior (ligamento de Whitnall) é uma manga de fibras elásticas que envolve o músculo levantador da pálpebra superior, posicionada próximo ou acima da transição músculo-aponeurose (Oculofacial cap.9, p.164). Funciona como suporte suspensor da pálpebra superior e dos tecidos orbitais superiores e atua como **fulcro** que transfere o vetor de força do levator de uma direção ântero-posterior para superior-inferior. Medialmente fixa-se a tecidos conjuntivos ao redor da tróclea e do tendão do oblíquo superior; lateralmente forma septos através do estroma da glândula lacrimal e curva-se para inserir na parede orbitária lateral milímetros acima do tubérculo orbitário, com fibras estendendo-se inferiormente para o retináculo lateral. Seu análogo na pálpebra inferior é o **ligamento de Lockwood**.

**Distinção crítica:** o ligamento de Whitnall **não é o mesmo que os cornos da aponeurose levator**. Os cornos situam-se mais inferiores e mais voltados aos cantos (Oculofacial cap.9, p.165, fig 9-18):

- **Corno lateral** — robusto, divide a glândula lacrimal em lobos orbital e palpebral; insere-se firmemente no tubérculo orbitário lateral.
- **Corno medial** — mais delicado; conexões frouxas ao aspecto posterior do tendão cantal medial e à crista lacrimal posterior.

A aponeurose levator divide-se em porção anterior (insere-se em finos cordões nos septos entre o orbicular pré-tarsal e a pele, formando o sulco palpebral superior) e posterior (insere-se firmemente na superfície anterior da metade inferior do tarso, mais firme ~3 mm acima da margem palpebral, frouxa nos 2-3 mm superiores). Disinserção, deiscência ou rarefação dessa aponeurose após cirurgia ocular, inflamação intraocular, trauma ou senescência produz ptose aponeurótica (Oculofacial cap.9, p.166).
```

- [ ] **Step 3: Append Müller + arcada periférica sub-section**

```markdown
### Músculo de Müller (tarsal superior) e arcada periférica

O músculo de Müller origina-se da subsuperfície do levator aproximadamente ao nível do ligamento de Whitnall, **12-14 mm acima da borda tarsal superior** (Oculofacial cap.9, p.166, fig 9-20). Inserção sympathetic ao longo da borda tarsal superior provê **2-3 mm de elevação adicional** da pálpebra superior; sua interrupção (síndrome de Horner) gera ptose leve. O músculo é firmemente aderido à conjuntiva posteriormente, especialmente logo acima da borda tarsal superior.

**Landmark cirúrgico:** a **arcada arterial periférica** localiza-se entre a aponeurose levator e o músculo de Müller, logo acima da borda tarsal superior — referência confiável para identificar o plano do Müller intraoperatoriamente (Oculofacial cap.9, p.166). Não confundir com a **arcada marginal** (2 mm acima da margem palpebral, anterior ao tarso, próxima aos folículos ciliares — Oculofacial cap.9, p.171).

Na pálpebra inferior, o análogo da aponeurose levator é a **fáscia capsulopalpebral** (origina-se de fibras musculares terminais do reto inferior, envolve o oblíquo inferior e funde-se com a bainha desse músculo, formando anteriormente o ligamento suspensor de Lockwood). O músculo tarsal inferior (análogo do Müller) é menos desenvolvido e corre posterior à capsulopalpebral.
```

- [ ] **Step 4: Append fat pads with inferior oblique landmark**

```markdown
### Compartimentos adiposos: 2 superiores vs 3 inferiores e o oblíquo inferior

A gordura orbital localiza-se posterior ao septo orbital e anterior à aponeurose levator (superior) ou à fáscia capsulopalpebral (inferior). Distribuição **assimétrica** entre as pálpebras (Oculofacial cap.9, p.164):

- **Pálpebra superior — 2 compartimentos:** medial e central (preaponeurótico). O medial é menos amarelado que o central.
- **Pálpebra inferior — 3 compartimentos:** medial, central e lateral. O medial é menos amarelado que central e lateral.

**Landmark cirúrgico crítico — oblíquo inferior:** o músculo oblíquo inferior corre **entre os compartimentos medial e central da pálpebra inferior** (Oculofacial cap.9, p.164, figs 9-15 e 9-16). Identificá-lo é mandatório antes de qualquer manipulação dos pads adiposos inferiores; lesão produz diplopia em downgaze. Adicionalmente, a **expansão arcuada do oblíquo inferior** separa o compartimento central do lateral; sua incisão controlada melhora o acesso ao pad lateral (Oculofacial cap.12, p.261).
```

- [ ] **Step 5: Append Asian eyelid variant**

```markdown
### Variação étnica — pálpebra asiática

A pálpebra do indivíduo asiático normalmente tem sulco palpebral superior **mais baixo** ou ausente, porque o **septo orbital funde-se com a aponeurose levator entre a margem palpebral e a borda tarsal superior** (em contraste com a fusão supratarsal típica do não-asiático — Oculofacial cap.9, p.161, fig 9-11). Essa configuração permite que a gordura preaponeurótica ocupe posição mais inferior e anterior na pálpebra. Embora o sulco inferior seja menos definido que o superior, essas diferenças também aparecem na pálpebra inferior.

**Implicação cirúrgica:** não tentar criar sulco alto em paciente asiático sem consentimento explícito sobre a alteração estética desejada — a "ocidentalização" é uma decisão estética distinta, não uma correção anatômica.
```

- [ ] **Step 6: Append SOOF and ROOF**

```markdown
### SOOF e ROOF — gorduras suborbiculares supra e infra

Profunda ao músculo orbicular e sobreposta ao periósteo maxilar e zigomático há um plano de gordura **não-septada** denominado **SOOF (suborbicularis oculi fat)**. Análogo superior é o **ROOF (retro-orbicularis oculi fat)**, situado profundo à sobrancelha que se estende à pálpebra, fundindo-se com a fáscia pós-orbicular na pálpebra superior (Oculofacial cap.9, p.168).

**Papel envelhecimento:** o SOOF participa da descida gradual gravitacional dos tecidos moles do terço médio facial. Reposicionamento do SOOF pode sustentar retração involucional e cicatricial da pálpebra inferior; em procedimentos estéticos, sua elevação restaura contornos juvenis da pálpebra inferior e do terço médio. O ROOF descido (mais branco e fibroso) **não deve ser confundido com a gordura preaponeurótica amarela prolapsada** na pálpebra superior; em alguns pacientes é necessário reposicioná-lo ao periósteo frontal durante blefaroplastia para resultado funcional e estético adequado (Oculofacial cap.9, p.168).
```

- [ ] **Step 7: Verify file integrity**

```bash
wc -l content/rag/estetica-facial/blefaroplastia.md
python -c "
content = open('content/rag/estetica-facial/blefaroplastia.md', encoding='utf-8').read()
assert 'Whitnall' in content, 'missing Whitnall'
assert 'Müller' in content, 'missing Müller'
assert 'oblíquo inferior' in content, 'missing inferior oblique'
assert 'asiática' in content, 'missing Asian variant'
assert 'SOOF' in content and 'ROOF' in content, 'missing SOOF/ROOF'
print('OK — all 5 anatomy expansions present')
"
```

- [ ] **Step 8: Commit anatomy expansions**

```bash
git add content/rag/estetica-facial/blefaroplastia.md
git commit -m "$(cat <<'EOF'
feat(rag): blefaroplastia anatomy expansions (Whitnall, Müller, fat pads, Asian variant, SOOF/ROOF)

Adds 5 anatomy sub-sections to blefaroplastia RAG covering Whitnall ligament
distinction from levator horns, Müller muscle with peripheral arcade landmark,
fat pad distribution (2 sup vs 3 inf with inferior oblique between medial and
central as critical surgical landmark), Asian eyelid anatomical variant, and
SOOF/ROOF roles in midfacial aging.

All citations from Oculofacial Plastic and Orbital Surgery (BCSC Section 7,
2019-2020) caps. 9 and 12. Existing content preserved.

Phase 7.6b.1 — sub-phase 1 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.6b.1.2: RAG pre-op evaluation expansion (5 ptosis measurements, snapback, 20mm rule)

**Files:**
- Modify: `content/rag/estetica-facial/blefaroplastia.md` (Avaliação Pré-Operatória section)

- [ ] **Step 1: Locate Avaliação Pré-Operatória section**

```bash
grep -n "Avalia\|Pré-Op\|Preoperat" content/rag/estetica-facial/blefaroplastia.md
```

Identify section to extend.

- [ ] **Step 2: Append measurements sub-section**

```markdown
### Medições oftalmoplásticas (5 medidas obrigatórias quando há suspeita de ptose)

Todo paciente blefaroplastia que apresente assimetria palpebral ou queixa de campo visual reduzido deve ter as 5 medidas clínicas documentadas (Oculofacial cap.12, p.241):

1. **MRD1 (margin–reflex distance 1)** — distância entre margem palpebral superior e o reflexo corneano em posição primária. **Negativa em ptose severa**. É a medida mais importante para descrever quantitativamente a ptose.
2. **MRD2 (margin–reflex distance 2)** — distância entre o reflexo corneano e a margem palpebral inferior; documenta retração inferior/scleral show.
3. **Fissura palpebral vertical** — maior distância entre margens superior e inferior. **MRD1 + MRD2 = fissura vertical.**
4. **Posição do sulco palpebral superior** — não-asiático: 8-9 mm em homens, 9-11 mm em mulheres. Sulco alto, duplicado ou assimétrico sugere posição anormal da aponeurose levator. Tipicamente elevado em ptose involucional, ausente/raso em ptose congênita.
5. **Função do levator (excursão palpebral)** — medida do downgaze ao upgaze com **frontalis negado por pressão digital sobre a sobrancelha**. Falha em negar o frontalis superestima a função e pode levar a diagnóstico/conduta incorretos.

**Adicional:** documentar **lagoftalmo** (mm de exposição com olhos fechados em sono fisiológico simulado).

#### Lei de Hering aplicada à blefaroplastia
Em ptose unilateral aparente, **elevar a pálpebra contralateral mais ptótica desmascara ptose oculta** no lado examinado (Oculofacial cap.12, p.242, fig 12-12). Implicação: avaliar ambos os olhos ANTES de planejar correção unilateral.

### Testes de laxidade lamelar inferior

- **Snapback test** — pinçar e tracionar pálpebra inferior longe do globo; soltar. Retorno imediato à posição = normal. Retorno lento ou apenas com piscar = laxidade.
- **Distraction test** — tracionar pálpebra inferior anteriormente afastando do globo; **>6 mm de afastamento = laxidade significativa**.

Ambos devem ser positivos antes de blefaroplastia inferior agressiva — sem corrigir laxidade, alta probabilidade de retração/ectrópio pós-op (Oculofacial cap.12, p.260).

### Pinch test e regra dos 20 mm

Para marcar excesso de pele cutâneo superior, o cirurgião pinça a pele com pinça sem dentes e identifica a redundância. **Regra inviolável: ≥20 mm de pele residual entre a borda inferior da sobrancelha e a margem palpebral após excisão** (Oculofacial cap.12, p.261, fig 12-26). Violação dessa regra produz lagoftalmo e exposição corneana.

### Red flags pré-op específicas

- **Malar hypoplasia** ou **proptose relativa** — predispõem a scleral show pós-op; abordagem conservadora obrigatória.
- **Tireoidopatia ocular** — pode causar retração lamelar superior e inferior; avaliar função tireoidiana preoperatoriamente; se ativa, adiar.
- **Função frontalis cronicamente engajada** — sugere brow ptosis subjacente; tratar primeiro/concomitante.
```

- [ ] **Step 3: Verify**

```bash
python -c "
c = open('content/rag/estetica-facial/blefaroplastia.md', encoding='utf-8').read()
assert 'MRD1' in c and 'MRD2' in c
assert 'snapback' in c.lower()
assert '20 mm' in c
assert 'Hering' in c
print('OK — 5 measurements + snapback + 20mm + Hering all present')
"
```

- [ ] **Step 4: Commit**

```bash
git add content/rag/estetica-facial/blefaroplastia.md
git commit -m "$(cat <<'EOF'
feat(rag): blefaroplastia pre-op evaluation expansion (5 ptosis measurements, snapback, 20mm rule)

Adds expanded pre-operative evaluation sub-sections covering MRD1/MRD2/PFH/
crease/levator function with frontalis negation, Hering's law for masked
contralateral ptosis, snapback and distraction tests for lower lid laxity,
pinch test, inviolable 20mm rule for residual skin after upper lid excision,
and red flags (malar hypoplasia, thyroid eye disease, chronic frontalis).

Citations from Oculofacial cap.12 pp.241-261.

Phase 7.6b.1 — sub-phase 1 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.6b.1.3: RAG complications expansion (retrobulbar blindness, retraction, lacrimal pump)

**Files:**
- Modify: `content/rag/estetica-facial/blefaroplastia.md` (Complications section)

- [ ] **Step 1: Locate Complications section**

```bash
grep -n "Complica\|Riscos\|Compl" content/rag/estetica-facial/blefaroplastia.md
```

- [ ] **Step 2: Append severe complications sub-section**

```markdown
### Hemorragia retrobulbar e cegueira pós-blefaroplastia (complicação catastrófica)

A perda de visão é a complicação mais temida da blefaroplastia, embora rara, e está mais frequentemente associada à **blefaroplastia inferior** (Oculofacial cap.12, p.262). O mecanismo dominante:

1. Hemorragia retrobulbar pós-operatória → **síndrome compartimental orbital** → aumento da pressão intra-orbital → compressão isquêmica das artérias ciliares que suprem o nervo óptico.
2. Mecanismos secundários: isquemia por retração cirúrgica excessiva, vasoconstrição pela epinefrina do anestésico local.

**Fatores de risco:** hipertensão arterial não controlada, dyscrasias sanguíneas, uso de anticoagulantes/antiagregantes não suspensos.

**Sinal/sintoma de alarme:** dor desproporcional, swelling assimétrico significativo, proptose nova, **escurecimento ou borramento visual visualmente assimétrico**. Avaliação imediata e tratamento sem aguardar.

**Manejo emergencial — síndrome compartimental orbital aguda** (Oculofacial cap.6):
- **Cantotomia lateral + cantólise inferior** à beira do leito (descomprime o compartimento orbital).
- Manitol IV.
- Acetazolamida.
- Considerar paracentese / orbitotomia descompressiva se não houver melhora.

**Regra inviolável de prevenção:** **curativo compressivo é CONTRA-INDICADO** após blefaroplastia (Oculofacial cap.12, p.262). Mascara o quadro inicial e aumenta a pressão orbital. O paciente deve ser observado no pós-op imediato; instruções de retorno emergencial à equipe diante de dor desproporcional, edema assimétrico ou alteração visual.

#### Diplopia por lesão muscular extra-ocular

A blefaroplastia pode lesar três músculos extra-oculares (Oculofacial cap.12, p.262):
- **Oblíquo inferior** — entre pad medial e central da pálpebra inferior; lesão na remoção/manipulação da gordura inferior.
- **Reto inferior** — origem anterior do oblíquo inferior; lesão por tração ou eletrocauterização excessiva no plano profundo.
- **Tróclea do oblíquo superior** — dissecção profunda no quadrante súpero-medial da pálpebra superior pode danificá-la.

A diplopia resultante pode ser permanente; identificar landmarks antes de qualquer manipulação profunda é não-negociável.

### Retração/ectrópio iatrogênico e retração lamelar média

Excesso de ressecção cutânea, scarring lamelar médio (septo) e laxidade lower lid não tratada são as três causas iatrogênicas (Oculofacial cap.12, p.252-253, fig 12-21B). Apresentação:

- **Lagoftalmo** superior — pele superior insuficiente.
- **Ectrópio cicatricial inferior** — déficit anterior cutâneo.
- **Retração lamelar média** — fibrose septal pós-trauma cirúrgico; pálpebra "presa" sem deslizar livremente.
- **Scleral show inferior** — lamela média ou anterior insuficiente; também malar hypoplasia, hematoma orbicular, scarring septal.

**Tratamento escalonado:**
1. Lubrificação tópica + massagem (resolução espontânea em ~50% dos casos leves nas primeiras semanas).
2. Esteroide intralesional ou 5-fluorouracil intralesional para cicatriz hipertrófica média.
3. Liberação cirúrgica + enxerto de pele de espessura total se déficit cutâneo + lateral canthoplasty.
4. Spacer graft (cartilagem auricular, palato duro, dermis matrix acelular) na lamela média se houver retração documentada.

### Bomba lacrimal e blefaroplastia agressiva

A drenagem lacrimal é um sistema bombeado ativo, dependente da contração orbicular durante o blink (Oculofacial cap.14, fig 14-4):

1. Estado relaxado — pontos lacrimais alinhados ao tear lake; saco lacrimal cheio.
2. Fechamento — orbicular pré-tarsal fecha pontos e canalículos; orbicular preseptal (inserção no saco) comprime o saco gerando **pressão positiva** que propele lágrimas pelo NLD ao meato inferior.
3. Abertura — orbicular relaxa; pontos e saco abrem; **pressão negativa** aspira lágrimas para canalículos e saco.

**Implicação cirúrgica:** blefaroplastia agressiva ou denervação do CN VII gera blink fraco → bomba lacrimal ineficiente → epífora funcional crônica (sem obstrução estrutural). Cuidado especial com a manipulação da inserção pré-septal do orbicular ao saco lacrimal e com pacientes com função facial limítrofe pré-existente.
```

- [ ] **Step 3: Verify**

```bash
python -c "
c = open('content/rag/estetica-facial/blefaroplastia.md', encoding='utf-8').read()
assert 'retrobulbar' in c.lower()
assert 'cantotomia lateral' in c.lower()
assert 'CONTRA-INDICADO' in c, 'pressure dressing rule missing'
assert 'oblíquo inferior' in c
assert 'bomba lacrimal' in c.lower()
print('OK — all complication expansions present')
"
```

- [ ] **Step 4: Commit**

```bash
git add content/rag/estetica-facial/blefaroplastia.md
git commit -m "$(cat <<'EOF'
feat(rag): blefaroplastia complications expansion (retrobulbar blindness, retraction, lacrimal pump)

Adds severe complications coverage: retrobulbar hemorrhage → compartment syndrome
→ blindness (mechanism, risk factors, alarm signs, lateral cantotomy + cantholysis
emergency management, pressure dressing CONTRAINDICATED rule); diplopia by
extraocular muscle injury (inferior oblique, inferior rectus, superior oblique
trochlea); iatrogenic retraction/ectropion with stepwise treatment ladder; and
lacrimal pump mechanics with implication for aggressive blepharoplasty.

Citations from Oculofacial caps. 6, 12, 14.

Phase 7.6b.1 — sub-phase 1 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.6b.1.4: RAG technique expansion (transconjunctival vs transcutaneous, brow ptosis primer, rejuvenation context)

**Files:**
- Modify: `content/rag/estetica-facial/blefaroplastia.md` (Técnicas section)

- [ ] **Step 1: Append technique sub-sections**

```markdown
### Transconjuntival vs transcutâneo na blefaroplastia inferior

Duas vias principais (Oculofacial cap.12, p.261):

**Transconjuntival (preferencial cosmética):**
- Sem cicatriz externa.
- Menor risco de retração pós-op.
- Acesso direto aos 3 compartimentos adiposos inferiores.
- **Atenção:** a expansão arcuada do oblíquo inferior separa o pad central do lateral; sua incisão controlada melhora o acesso lateral.
- Indicação: paciente sem excesso real de pele a ressecar.

**Transcutâneo (infraciliar):**
- Indicação: excesso real de pele cutânea inferior precisando de ressecção.
- Cicatriz subciliar pode ficar imperceptível, mas há **risco aumentado de retração** se ressecção agressiva ou laxidade não tratada.
- Após estruturalmente alterar pálpebra inferior (remoção/transposição de gordura, suspensão midfacial, lateral canthal tightening), apenas então ressecar pele.
- **Sempre acompanhar de tightening horizontal** quando há laxidade.

### Brow ptosis: avaliação e tratamento prévio/concomitante obrigatório

Brow ptosis frequentemente acompanha dermatocálase e contribui para a aparência envelhecida periorbital (Oculofacial cap.12, p.263). **Reconhecer e tratar antes ou junto da blefaroplastia superior** — blefaroplastia agressiva isolada com brow ptosis subjacente leva a maior rebaixamento do supercílio e resultado pior.

A sobrancelha está normalmente ao nível ou acima do rebordo orbital superior. Sobrancelha feminina é tipicamente mais alta e arqueada que a masculina. Considera-se ptótica quando cai abaixo do rebordo. Opções de correção:

- **Browpexy (mínima)** — via incisão de blefaroplastia superior; reesposiciona tecidos sub-sobrancelha por sutura ao periósteo frontal acima do rebordo orbital. Elevação modesta; previne descida do ROOF.
- **Direct brow elevation** — incisões na borda superior dos cabelos da sobrancelha; eficaz em ptose lateral; pode produzir cicatriz visível ou paresthesia.
- **Endoscopic forehead-lift** — incisões ~1 cm atrás da hairline; dissecção sub-periosteal; fixação por túnel ósseo, âncoras absorvíveis ou parafusos. Vantagens: cicatrizes pequenas, recuperação mais rápida, risco facial nerve.
- **Pretrichial brow- e forehead-lift** — incisão pretrichial; ressecção de pele da fronte; útil quando hairline alta. Vantagem: lifting potente sem elevar hairline; desvantagens: paresthesias frequentes, cicatriz pretrichial visível.

### Contexto integrado de rejuvenescimento

Blefaroplastia raramente é isolada do quadro periorbital total (Oculofacial cap.13):

- **Rejuvenescimento midfacial** (preperiosteal vs subperiosteal) frequentemente combinado com blefaroplastia inferior; restaura projeção anterior da bochecha e suaviza junção pálpebra-bochecha.
- **Laser resurfacing** CO2 ou Er:YAG: eficaz como adjuvante; **Fitzpatrick I-III** ideal; tipos IV-VI risco de hiperpigmentação inflamatória pós-op.
- **Toxina botulínica** estética: rugas glabelares, crow's feet, fronte (FDA-aprovadas); elevação química do supercílio quando injetada nos depressores.
- **Preenchedores de ácido hialurônico**: nasolabial, lábio, periocular off-label (tear trough). **Zonas de risco arterial:** glabela, supraorbital, supratrochlear, infraorbital, angular. **Complicação devastadora:** oclusão retrógrada da artéria oftálmica → cegueira permanente. Sinais precoces: dor + palidez cutânea (arterial), dor + descoloração tardia (venoso).
- **Fat grafting autólogo**: alternativa biocompatível; mesmas zonas tratáveis com fillers; risco intravascular permanece.
- **Rhytidectomia (face-lift)**: vintage subcutâneo, com elevação SMAS, deep-plane. Mais profundo = resultado mais durável + maior risco de lesão facial nerve.
```

- [ ] **Step 2: Verify**

```bash
python -c "
c = open('content/rag/estetica-facial/blefaroplastia.md', encoding='utf-8').read()
assert 'Transconjuntival' in c
assert 'expansão arcuada' in c
assert 'brow' in c.lower() or 'sobrancelha' in c.lower()
assert 'Fitzpatrick' in c
assert 'oftálmica' in c
print('OK — technique + brow + rejuvenation expansions present')
"
```

- [ ] **Step 3: Commit**

```bash
git add content/rag/estetica-facial/blefaroplastia.md
git commit -m "$(cat <<'EOF'
feat(rag): blefaroplastia technique + brow ptosis + rejuvenation context

Adds technique section: transconjunctival vs transcutaneous indications with
arcuate expansion of inferior oblique; mandatory brow ptosis recognition and
treatment (browpexy, direct, endoscopic, pretrichial); integrated rejuvenation
context (midface lift, laser CO2/Er:YAG with Fitzpatrick caveats, neuromodulators,
HA fillers with arterial danger zones and ophthalmic artery retrograde occlusion
risk, fat grafting, rhytidectomy planes).

Citations from Oculofacial caps. 12 and 13.

Phase 7.6b.1 — sub-phase 1 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.6b.1.5: New cards — anatomy_v2 Whitnall + Müller and fat pads

**Files:**
- Modify: `content/cards/estetica-facial/blefaroplastia/anatomia.json` (append 2 new entries)

- [ ] **Step 1: Inspect last existing anatomy ID and structure**

```bash
python -c "
import json
d = json.load(open('content/cards/estetica-facial/blefaroplastia/anatomia.json', encoding='utf-8'))
print('count:', len(d))
print('last id:', d[-1]['id'])
print('last type:', d[-1]['type'])
print('last keys:', list(d[-1].keys()))
"
```

Confirm last ID is `blef-anat-020`. Next IDs will be `blef-anat-021` and `blef-anat-022`. Check whether the existing entries use `type: anatomy` (legacy) or `type: anatomy_v2`.

- [ ] **Step 2: Read schema for anatomy_v2 required fields**

```bash
python -c "
import json
s = json.load(open('content/cards/schema.json', encoding='utf-8'))
v2 = s['\$defs']['anatomy_v2']
print('required:', v2.get('required', []))
print('keys:', list(v2.get('properties', {}).keys()))
"
```

Note required fields. Use them in the new cards verbatim.

- [ ] **Step 3: Append anatomy_v2 card — Whitnall + Müller**

Read the file, parse, append, write back. Use a Python helper:

```python
import json, pathlib
path = pathlib.Path('content/cards/estetica-facial/blefaroplastia/anatomia.json')
data = json.loads(path.read_text(encoding='utf-8'))

new_card = {
    "id": "blef-anat-021",
    "type": "anatomy_v2",
    "title": "Whitnall + Müller + Arcada Periférica",
    "topic": "blefaroplastia",
    "area": "estética-facial",
    "labels": [
        {"n": 1, "label": "Ligamento de Whitnall", "description": "Sleeve elástico ao redor do levator; fulcrum que transfere vetor de força ântero-posterior para superior-inferior."},
        {"n": 2, "label": "Músculo levator (corpo)", "description": "40 mm; origina-se no ápice orbital; aponeurose continua por 14-20 mm até o tarso."},
        {"n": 3, "label": "Aponeurose levator", "description": "Divide-se em porção anterior (insere-se em septos do orbicular pré-tarsal — forma o sulco) e posterior (firme à metade inferior do tarso, especialmente 3 mm acima da margem)."},
        {"n": 4, "label": "Músculo de Müller", "description": "Liso; simpático; origina-se 12-14 mm acima da borda tarsal superior; provê 2-3 mm de elevação adicional."},
        {"n": 5, "label": "Arcada arterial periférica", "description": "Entre aponeurose levator e Müller, logo acima da borda tarsal superior; landmark cirúrgico para identificar plano do Müller."},
        {"n": 6, "label": "Tarso superior", "description": "10-12 mm vertical na pálpebra superior; placa densa de tecido conjuntivo com glândulas meibomianas."}
    ],
    "clinical_hook": "Síndrome de Horner causa interrupção sympathetic ao Müller → ptose leve (~2 mm). Disinserção da aponeurose levator (involução, trauma, pós-cirurgia ocular) → ptose aponeurótica (forma mais comum de ptose adquirida). Arcada periférica é o landmark anatômico para localizar o Müller intra-op.",
    "images": [],
    "citations": [
        "Oculofacial Plastic and Orbital Surgery (BCSC Section 7, 2019-2020) cap.9, pp.164-167",
        "Neligan vol.2 cap. blefaroplastia"
    ],
    "tags": ["anatomia", "whitnall", "muller", "arcada-periferica", "lamela-posterior", "anatomy-v2"]
}

data.append(new_card)
path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'appended; new count: {len(data)}; last id: {data[-1]["id"]}')
```

Save the script as `tools/_tmp_add_blef_021.py` (gitignore via `.tmp/`) and run, OR inline-execute.

- [ ] **Step 4: Append anatomy_v2 card — Fat pads + inferior oblique landmark**

```python
import json, pathlib
path = pathlib.Path('content/cards/estetica-facial/blefaroplastia/anatomia.json')
data = json.loads(path.read_text(encoding='utf-8'))

new_card = {
    "id": "blef-anat-022",
    "type": "anatomy_v2",
    "title": "Compartimentos Adiposos: 2 Sup vs 3 Inf e o Oblíquo Inferior",
    "topic": "blefaroplastia",
    "area": "estética-facial",
    "labels": [
        {"n": 1, "label": "Pad medial superior", "description": "Cor mais branca/pálida que o pad central; mais profundo na fossa nasal."},
        {"n": 2, "label": "Pad central superior (preaponeurótico)", "description": "Amarelo intenso; landmark anatômico atrás do septo orbital, anterior à aponeurose levator."},
        {"n": 3, "label": "Pad medial inferior", "description": "Mais branco/pálido que central e lateral inferiores."},
        {"n": 4, "label": "Pad central inferior", "description": "Separado do pad medial pelo músculo oblíquo inferior."},
        {"n": 5, "label": "Pad lateral inferior", "description": "Separado do central pela expansão arcuada do oblíquo inferior; acessível via incisão controlada."},
        {"n": 6, "label": "Músculo oblíquo inferior", "description": "Corre entre pads medial e central inferiores; origem na fossa lacrimal anterior; lesão → diplopia em downgaze."}
    ],
    "clinical_hook": "Identificar o oblíquo inferior antes de manipular pads adiposos inferiores é mandatório — está entre os pads medial e central. A expansão arcuada separa central de lateral; sua incisão controlada melhora acesso lateral. Manipulação cega do pad medial ou central inferior arrisca lesar o oblíquo, causando diplopia permanente em downgaze.",
    "images": [],
    "citations": [
        "Oculofacial Plastic and Orbital Surgery (BCSC Section 7, 2019-2020) cap.9, p.164",
        "Oculofacial cap.12, p.261 (arcuate expansion)"
    ],
    "tags": ["anatomia", "fat-pads", "obliquo-inferior", "blefaroplastia-inferior", "anatomy-v2"]
}

data.append(new_card)
path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'appended; new count: {len(data)}; last id: {data[-1]["id"]}')
```

- [ ] **Step 5: Validate AJV schema**

```bash
node tools/validate_cards_schema.mjs 2>&1 | tail -5
```

Expected: `OK: 574 | FAIL: 0` (572 baseline + 2 new). If FAIL>0, the new card fields don't match anatomy_v2 schema — fix and re-validate.

- [ ] **Step 6: Commit**

```bash
git add content/cards/estetica-facial/blefaroplastia/anatomia.json
git commit -m "$(cat <<'EOF'
feat(cards): blefaroplastia +2 anatomy_v2 cards (Whitnall+Müller, Fat pads+inf oblique)

Adds blef-anat-021 (Whitnall ligament + Müller muscle + peripheral arcade
landmark) and blef-anat-022 (2 superior vs 3 inferior fat pads with inferior
oblique between medial and central as critical surgical landmark).

Both type=anatomy_v2 with labels[] structured for numeric overlay rendering;
images[] empty for now (filled in Phase 7.6b.3 separately).

Phase 7.6b.1 — sub-phase 1 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.6b.1.6: New cards — clinical pearls (retrobulbar blindness, lacrimal pump)

**Files:**
- Modify: `content/cards/estetica-facial/blefaroplastia/notas.json` (append 2 new entries)

- [ ] **Step 1: Inspect notas.json structure and last ID**

```bash
python -c "
import json
d = json.load(open('content/cards/estetica-facial/blefaroplastia/notas.json', encoding='utf-8'))
print('count:', len(d))
print('last id:', d[-1]['id'])
print('last type:', d[-1]['type'])
print('schema keys (last entry):', list(d[-1].keys()))
"
```

Confirm last ID format and `type` value (likely `note` or `clinical_pearl`).

- [ ] **Step 2: Append retrobulbar blindness pearl**

```python
import json, pathlib
path = pathlib.Path('content/cards/estetica-facial/blefaroplastia/notas.json')
data = json.loads(path.read_text(encoding='utf-8'))

# Determine next ID
last_id = data[-1]['id']  # e.g., 'blef-not-012'
parts = last_id.rsplit('-', 1)
next_num = int(parts[1]) + 1
next_id = f"{parts[0]}-{next_num:03d}"

new_pearl = {
    "id": next_id,
    "type": "note",  # ADJUST if schema requires different type
    "title": "Hemorragia Retrobulbar: Cegueira Pós-Blefaroplastia",
    "topic": "blefaroplastia",
    "area": "estética-facial",
    "context": "Complicação mais temida da blefaroplastia. Mais frequente após blefaroplastia INFERIOR.",
    "key_points": [
        "Mecanismo: hemorragia retrobulbar pós-op → síndrome compartimental orbital → compressão isquêmica das ciliares → cegueira",
        "Fatores de risco: HAS não controlada, dyscrasias, anticoagulantes/antiagregantes não suspensos",
        "Sinais de alarme: dor desproporcional, swelling assimétrico, proptose nova, escurecimento/borramento visual",
        "Manejo emergencial: cantotomia lateral + cantólise inferior à beira do leito + manitol IV + acetazolamida",
        "Considerar paracentese / orbitotomia descompressiva se sem melhora",
        "REGRA INVIOLÁVEL: curativo compressivo é CONTRA-INDICADO após blefaroplastia (mascara o quadro e aumenta a pressão orbital)"
    ],
    "citations": [
        "Oculofacial Plastic and Orbital Surgery (BCSC Section 7) cap.12, p.262",
        "Oculofacial cap.6 (orbital compartment syndrome)"
    ],
    "tags": ["complicacao", "cegueira", "hemorragia-retrobulbar", "compartment-syndrome", "emergencia", "clinical-pearl"]
}

data.append(new_pearl)
next_id_2 = f"{parts[0]}-{(next_num+1):03d}"

new_pearl_2 = {
    "id": next_id_2,
    "type": "note",
    "title": "Bomba Lacrimal e Risco de Epífora Funcional",
    "topic": "blefaroplastia",
    "area": "estética-facial",
    "context": "A drenagem lacrimal é sistema bombeado ATIVO, dependente da contração orbicular durante o blink.",
    "key_points": [
        "Estado relaxado: pontos lacrimais alinhados ao tear lake; saco lacrimal cheio",
        "Fechamento: orbicular pré-tarsal fecha pontos+canalículos; preseptal (inserção no saco) cria pressão POSITIVA → propele lágrimas pelo NLD",
        "Abertura: orbicular relaxa; pontos e saco abrem; pressão NEGATIVA aspira lágrimas",
        "Implicação cirúrgica: blefaroplastia agressiva ou denervação CN VII → blink fraco → bomba lacrimal ineficiente → EPÍFORA FUNCIONAL crônica (sem obstrução estrutural)",
        "Cuidado especial com a inserção pré-septal do orbicular ao saco lacrimal e pacientes com função facial limítrofe pré-existente"
    ],
    "citations": [
        "Oculofacial Plastic and Orbital Surgery (BCSC Section 7) cap.14, fig 14-4"
    ],
    "tags": ["bomba-lacrimal", "epifora", "orbicular", "blink", "fisiologia", "clinical-pearl"]
}

data.append(new_pearl_2)
path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'appended 2; new count: {len(data)}; ids: {next_id}, {next_id_2}')
```

- [ ] **Step 3: Validate AJV**

```bash
node tools/validate_cards_schema.mjs 2>&1 | tail -5
```

Expected: `OK: 576 | FAIL: 0`. If schema requires different `type` value or missing fields, adjust per schema definition (`tools/validate_cards_schema.mjs` errors will indicate exact field).

- [ ] **Step 4: Commit**

```bash
git add content/cards/estetica-facial/blefaroplastia/notas.json
git commit -m "$(cat <<'EOF'
feat(cards): blefaroplastia +2 clinical pearls (retrobulbar blindness, lacrimal pump)

Adds two notes to blefaroplastia/notas.json: retrobulbar hemorrhage → orbital
compartment syndrome → blindness with mechanism, risk factors, alarm signs,
emergency lateral cantotomy + cantholysis management, and INVIOLABLE rule that
pressure dressing is CONTRAINDICATED; lacrimal pump mechanics with implication
for aggressive blepharoplasty causing functional epiphora.

Citations from Oculofacial caps. 6, 12, 14.

Phase 7.6b.1 — sub-phase 1 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.6b.1.7: Bump _meta.json card counts and version

**Files:**
- Modify: `content/cards/estetica-facial/blefaroplastia/_meta.json`

- [ ] **Step 1: Read current _meta and update**

```python
import json, pathlib, datetime
path = pathlib.Path('content/cards/estetica-facial/blefaroplastia/_meta.json')
meta = json.loads(path.read_text(encoding='utf-8'))

# Bump version
meta['version'] = 'v1.2'
meta['date'] = '2026-04-26'

# Update card counts based on actual JSON file lengths
import json as J
for cat, fname in [('anatomia', 'anatomia.json'), ('tecnicas', 'tecnicas.json'),
                    ('decisoes', 'decisoes.json'), ('notas', 'notas.json'),
                    ('flashcards', 'flashcards.json')]:
    p = pathlib.Path(f'content/cards/estetica-facial/blefaroplastia/{fname}')
    cnt = len(J.loads(p.read_text(encoding='utf-8')))
    meta['cardCounts'][cat] = cnt

# Append references for the new sources
sources_added = [
    'Oculofacial Plastic and Orbital Surgery (BCSC Section 7, 2019-2020) caps. 9, 12, 13, 14'
]
for s in sources_added:
    if s not in meta['references']:
        meta['references'].append(s)

path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
print('updated _meta:', json.dumps(meta, ensure_ascii=False, indent=2))
```

- [ ] **Step 2: Verify**

```bash
cat content/cards/estetica-facial/blefaroplastia/_meta.json
```

Confirm version `v1.2`, date `2026-04-26`, anatomia 22, notas 14, BCSC reference present.

- [ ] **Step 3: Commit**

```bash
git add content/cards/estetica-facial/blefaroplastia/_meta.json
git commit -m "$(cat <<'EOF'
chore(meta): blefaroplastia v1.1 → v1.2 (anatomia 20→22, notas 12→14, +BCSC)

Bumps version, updates card counts to reflect 4 new cards added in Phase 7.6b.1
(anatomia +2 anatomy_v2, notas +2 clinical pearls). Adds BCSC Section 7 to
references.

Phase 7.6b.1 — sub-phase 1 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.6b.1.8: Rebuild RAG index and verify

**Files:**
- Modify: `content/rag/_index.json` (regenerated)

- [ ] **Step 1: Rebuild BM25 index**

```bash
node tools/build_rag_index.js 2>&1 | tail -5
```

Expected: chunks count goes from `811` baseline to ~`820-830` (RAG expansion adds ~5-10 chunks).

- [ ] **Step 2: Validate all cards still pass schema**

```bash
node tools/validate_cards_schema.mjs 2>&1 | tail -5
```

Expected: `OK: 576 | FAIL: 0`.

- [ ] **Step 3: Validate briefings**

```bash
node tools/validate_briefings.mjs 2>&1 | tail -5
```

Expected: zero broken refs, zero issues.

- [ ] **Step 4: Audit images** (no new images yet, just confirm baseline integrity)

```bash
python tools/audit_images.py 2>&1 | tail -10
```

Expected: no new duplicates, no non-ASCII filenames introduced.

- [ ] **Step 5: Commit rag-index**

```bash
git add content/rag/_index.json
git commit -m "$(cat <<'EOF'
chore(rag-index): rebuild after Phase 7.6b.1 blefaroplastia enrichment

BM25 chunks count delta from 7.6b.1 RAG expansion (~6k tokens of new content
across anatomy, pre-op, complications, technique sections).

Phase 7.6b.1 — sub-phase 1 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 7.6b.1.9: Code-review-board + close sub-phase 7.6b.1

- [ ] **Step 1: Run /code-review-board on the branch**

Use the `/code-review-board` skill against `master..HEAD` of `feature/phase-7-6b-1-blefaro-enrichment`. Output report to `docs/reviews/PR-<N>-2026-04-26.md` (skill numbers PR automatically; if no PR yet, use branch name).

- [ ] **Step 2: Apply all blocker + important + suggested findings via `superpowers:receiving-code-review`**

Iterate until zero blocker findings. Re-run validation gates after each round.

- [ ] **Step 3: Final report**

Report:
```
=== Phase 7.6b.1 status ===
- AJV: OK: 576 | FAIL: 0
- BM25 chunks: 811 → <N>
- audit_images: 0 new duplicates, 0 non-ASCII
- validate_briefings: 0 broken refs
- /code-review-board: docs/reviews/PR-<N>-2026-04-26.md, 0 blockers
- Files changed: 4 (RAG, anatomia.json, notas.json, _meta.json) + rag-index
- Commits: 8 atomic + 1 docs(review)
- Branch ready for squash-merge — awaiting Dr. Arthur authorization
```

- [ ] **Step 4: PAUSE — wait for Dr. Arthur's explicit merge authorization**

Per CLAUDE.md §10: this is the **único ponto de pausa do checklist**. Do not proceed without explicit "merge autorizado", "pode mergear", "siga adiante".

- [ ] **Step 5: Squash-merge to master**

```bash
cd /c/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git checkout master
git merge --squash feature/phase-7-6b-1-blefaro-enrichment
git commit -m "$(cat <<'EOF'
Phase 7.6b.1: Blefaroplastia enrichment (Oculofacial-based)

RAG estetica-facial/blefaroplastia.md expanded ~7k → ~13k tokens with new
sub-sections covering Whitnall+horns distinction, Müller+peripheral arcade,
fat pads with inferior oblique landmark, Asian eyelid variant, SOOF/ROOF,
expanded pre-op evaluation (5 ptosis measurements + Hering's law + snapback +
20mm rule + red flags), severe complications (retrobulbar blindness mechanism +
emergency cantotomy + pressure dressing CONTRAINDICATED + diplopia by EOM
injury), iatrogenic retraction with stepwise treatment, lacrimal pump mechanics,
transconjunctival vs transcutaneous, mandatory brow ptosis recognition, and
integrated rejuvenation context.

4 new cards: blef-anat-021 (Whitnall+Müller anatomy_v2), blef-anat-022 (fat
pads anatomy_v2 with inferior oblique landmark), 2 notes (retrobulbar
blindness pearl, lacrimal pump pearl).

Card count: 119 → 123. AJV strict gate 572 → 576 OK. BM25 811 → <N> chunks.
_meta.json v1.1 → v1.2.

Phase 7.6b sub-phase 1 of 3 (no Jackson dependency); 7.6b.2 (palpebra
reconstruction) and 7.6b.3 (palpebra images) follow after this squash.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git branch -d feature/phase-7-6b-1-blefaro-enrichment
git worktree remove .worktrees/phase-7-6b-1-blefaro-enrichment
```

- [ ] **Step 6: Memory entry**

Create `~/.claude/projects/c--Users-absay-Documents-Biblioteca-CirurgiaPlastica/memory/project_phase7_6b_1_done.md`:

```markdown
---
name: Phase 7.6b.1 done
description: Sub-phase 7.6b.1 (blefaroplastia enrichment) merged to master
type: project
---

Phase 7.6b.1 squashed to master 2026-04-26 — SHA <abbreviated>.

RAG `content/rag/estetica-facial/blefaroplastia.md` expanded ~7k → ~13k tokens
based on Oculofacial BCSC Section 7 caps. 9, 12, 13, 14. Added 5 anatomy
sub-sections (Whitnall+horns, Müller+peripheral arcade, fat pads+inferior
oblique landmark, Asian variant, SOOF/ROOF), expanded pre-op evaluation
(5 ptosis measurements, Hering, snapback, 20mm rule, red flags), severe
complications (retrobulbar blindness emergency management, pressure dressing
CONTRAINDICATED rule, diplopia EOM injury), iatrogenic retraction stepwise
treatment, lacrimal pump physiology, transconjunctival vs transcutaneous,
mandatory brow ptosis recognition, integrated rejuvenation context.

4 new cards (blef-anat-021 Whitnall+Müller, blef-anat-022 fat pads, 2 clinical
pearls in notas.json). _meta.json v1.1 → v1.2. AJV 572 → 576 OK. BM25 chunks
811 → <N>.

**Why:** First sub-phase of Phase 7.6b expanded scope (frente B per spec),
chosen to start first because it has zero Jackson dependency and could begin
immediately while OCR ran in background.

**How to apply:** Reference for blefaroplastia clinical content; future palpebra
reconstruction work (7.6b.2) cross-references some of these anatomy expansions
without duplicating content.
```

Update `MEMORY.md` with one-line index entry pointing to this file.

- [ ] **Step 7: Report final status and proceed to 7.6b.2**

---

# Sub-phase 7.6b.2 — Reconstrução de Pálpebra: RAG + cards text-only

**Branch:** `feature/phase-7-6b-2-palpebra-reconstruction-text`
**Worktree:** `.worktrees/phase-7-6b-2-palpebra-reconstruction-text`
**Prerequisites:** 7.6b.1 squashed; **Jackson cap.7 OCR complete** (verify via `grep -c '^=== PAGE 4[0-9][0-9]' 00-Livros-Texto/_extracted/jackson-local-flaps-head-neck.ocr.txt` — expect ≥80 pages from cap.7 range; current state: cap.7 already done at OCR resume, full book continuing).

### Task 7.6b.2.0: Verify prerequisites

- [ ] **Step 1: Confirm 7.6b.1 merged**

```bash
git log master --oneline | head -5
```

Expect to see "Phase 7.6b.1: Blefaroplastia enrichment" in recent commits.

- [ ] **Step 2: Confirm Jackson cap.7 OCR available**

```bash
grep -c "^=== PAGE 3[4-9][0-9] ===\|^=== PAGE 4[0-1][0-9] ===\|^=== PAGE 42[0-2] ===" \
  00-Livros-Texto/_extracted/jackson-local-flaps-head-neck.ocr.txt
```

Expect ≥80 (cap.7 range PDF p.341-422). If <80, OCR did not complete priority window — re-launch `python tools/ocr_jackson.py` if needed (script is resumable).

- [ ] **Step 3: Create worktree**

```bash
cd /c/Users/absay/Documents/Biblioteca-CirurgiaPlastica
git worktree add .worktrees/phase-7-6b-2-palpebra-reconstruction-text -b feature/phase-7-6b-2-palpebra-reconstruction-text master
cd .worktrees/phase-7-6b-2-palpebra-reconstruction-text
git rev-parse --show-toplevel && git branch --show-current
```

- [ ] **Step 4: Inspect existing reconstruction-X precedent**

```bash
ls content/cards/reconstrucao-facial/reconstrucao-de-bochecha/
cat content/cards/reconstrucao-facial/reconstrucao-de-bochecha/_meta.json
head -20 content/cards/reconstrucao-facial/reconstrucao-de-bochecha/anatomia.json
head -20 content/cards/reconstrucao-facial/reconstrucao-de-bochecha/tecnicas.json
```

Note: ID prefix used by bochecha (e.g., `bochecha-anat-` or `bochreconr-anat-`); pálpebra prefix derived analogously. Confirm expected prefix `palpreconr-` or actual precedent `palpebra-`.

### Task 7.6b.2.1: Create RAG `reconstrucao-de-palpebra.md` via Opus subagent

**Files:**
- Create: `content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md`

**Process:** Use `superpowers:subagent-driven-development` to dispatch a single Opus subagent. Subagent receives:

- Spec at `docs/superpowers/specs/2026-04-26-phase-7-6b-palpebra-blefaro-expanded-design.md` (RAG structure section §3)
- Template `content/rag/_template.md`
- Reference RAGs: `content/rag/reconstrucao-facial/reconstrucao-de-labio.md`, `reconstrucao-de-bochecha.md`, `reconstrucao-de-nariz.md`, `_principios-reconstrucao.md`, `_atlas-retalhos.md`
- Source materials: read these specific extracted files
  - `00-Livros-Texto/_extracted/oculofacial-bcsc-section7.txt` (Cap.9 lines 5877-6692, Cap.10 lines 6697-7944, Cap.11 lines 7945-8376, Cap.12 reactions section, Cap.14 lines 9965-10173)
  - `00-Livros-Texto/_extracted/jackson-local-flaps-head-neck.ocr.txt` (Cap.7 PDF pages 341-422 — eyelid+canthal region reconstruction; OCR has minor errors ~5%, accept)
  - Neligan vol.3 PDF — extract chapter on palpebra (use `python -c "import fitz; doc = fitz.open('00-Livros-Texto/Neligan 5ed 2023 vol3 craniofacial e pediatrica.pdf'); print('TOC:'); [print(t) for t in doc.get_toc()[:50]]"` then read targeted pages)
  - Practical Facial Reconstruction PDF — same approach
- Image slug whitelist: as listed in spec §6 with naming convention

Subagent delivers ~10-12k tokens following spec §3 ToC structure. Cites every claim inline `(Source cap.X, p.Y)` or `(PMID: NNNNNNNN)`. References `_principios-reconstrucao.md` and `_atlas-retalhos.md` as cross-references for shared concepts (do not duplicate). Output language: Portuguese with correct accents.

- [ ] **Step 1: Dispatch subagent**

Subagent prompt template per existing pattern from 7.6a (Phase 7.6a Step 2). Output to `content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md`. Word count target: 4000-7000 (similar to bochecha/lábio).

- [ ] **Step 2: Verify subagent output**

```bash
wc -w content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md
grep -c "Oculofacial cap" content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md  # ≥10
grep -c "Jackson cap.7" content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md  # ≥3
grep -c "Neligan vol.3" content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md  # ≥3
grep -c "PMID" content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md  # ≥5
grep -c "\[Imagem:" content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md  # ≥10 (image whitelist for harvest)
```

- [ ] **Step 3: Commit RAG**

```bash
git add content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md
git commit -m "feat(rag): Phase 7.6b.2 reconstrucao-de-palpebra (Oculofacial cap.11 + Jackson cap.7 + Neligan vol.3 + Practical FR + Grabb)

[~10-12k tokens, ≥10 Oculofacial cites, ≥3 Jackson, ≥3 Neligan, image whitelist with ASCII slugs]

Phase 7.6b.2 — sub-phase 2 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

### Task 7.6b.2.2: Create cards directory + 12 cards via Sonnet subagent

**Files:**
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/_meta.json`
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/anatomia.json` (2 anatomy_v2 cards)
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/tecnicas.json` (10 technique cards)
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/decisoes.json` (empty array `[]`)
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/notas.json` (empty array `[]`)
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/flashcards.json` (empty array `[]`)

**Process:** Sonnet subagent with same precedent inputs (existing reconstrucao-de-bochecha JSONs as exemplars + AJV schema + RAG just created + spec §4 cards list).

- [ ] **Step 1: Create directory**

```bash
mkdir -p content/cards/reconstrucao-facial/reconstrucao-de-palpebra
```

- [ ] **Step 2: Dispatch Sonnet subagent**

Subagent generates the 6 JSONs. Cards text-only (zero `images` populated; Phase 7.6b.3 fills these). All 12 cards pass AJV strict.

ID prefix derived from precedent (likely `palpreconr-` or similar — confirm Step 7.6b.2.0). Numbering: anatomia `palpreconr-anat-001` and `-002`; technique `palpreconr-tec-001` through `-010`.

`_meta.json`:
```json
{
  "topic": "reconstrucao-de-palpebra",
  "area": "reconstrução-facial",
  "displayName": "Reconstrução de Pálpebra",
  "version": "v1.0",
  "date": "2026-04-26",
  "status": "complete",
  "references": [
    "Oculofacial Plastic and Orbital Surgery (BCSC Section 7, 2019-2020) caps. 9, 10, 11",
    "Jackson — Local Flaps in Head and Neck Reconstruction 2ed cap. 7",
    "Neligan 5ed vol.3 cap. de pálpebra",
    "Practical Facial Reconstruction: Theory and Practice",
    "Grabb and Smith's Plastic Surgery 9ed (2024)"
  ],
  "articles": [],
  "cardCounts": {
    "anatomia": 2,
    "tecnicas": 10,
    "decisoes": 0,
    "notas": 0,
    "flashcards": 0
  }
}
```

- [ ] **Step 3: Validate AJV strict gate**

```bash
node tools/validate_cards_schema.mjs 2>&1 | tail -5
```

Expected: `OK: 588 | FAIL: 0` (576 from 7.6b.1 + 12 new).

- [ ] **Step 4: Commit cards**

```bash
git add content/cards/reconstrucao-facial/reconstrucao-de-palpebra/
git commit -m "feat(cards): Phase 7.6b.2 reconstrucao-de-palpebra (12 cards text-only)

2 anatomy_v2 (lamelas funcionais, suprimento vascular) + 10 technique cards
(fechamento direto sup/inf, Tenzel, Hughes modificado, Cutler-Beard, Mustardé
bochecha-rotação, canto lateral periosteal, canto medial FTSG/glabelar,
tarsoconjuntival grafts, FTSG doadores).

All AJV strict valid; images[] empty for 7.6b.3 separately.

Phase 7.6b.2 — sub-phase 2 of 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

### Task 7.6b.2.3: Update manifest.json + roadmap

**Files:**
- Modify: `content/cards/manifest.json`
- Modify: `docs/superpowers/plans/2026-04-18-phase-7-reconstrucao-facial-roadmap.md`

- [ ] **Step 1: Append entry to manifest.json**

```python
import json, pathlib
p = pathlib.Path('content/cards/manifest.json')
m = json.loads(p.read_text(encoding='utf-8'))
m.append({
    "area": "reconstrucao-facial",
    "topic": "reconstrucao-de-palpebra",
    "displayName": "Reconstrução de Pálpebra",
    "status": "complete"
})
p.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'manifest entries: {len(m)}')
```

- [ ] **Step 2: Update roadmap** — mark 7.6b row in progress, link to plan

Edit `docs/superpowers/plans/2026-04-18-phase-7-reconstrucao-facial-roadmap.md`: change 7.6b row from "⏳ não iniciada" to "🔄 em execução" with link to current plan.

- [ ] **Step 3: Commit**

```bash
git add content/cards/manifest.json docs/superpowers/plans/2026-04-18-phase-7-reconstrucao-facial-roadmap.md
git commit -m "chore(manifest+roadmap): register reconstrucao-de-palpebra; mark 7.6b in execution

Phase 7.6b.2 — sub-phase 2 of 3."
```

### Task 7.6b.2.4: Rebuild RAG index + validate + close 7.6b.2

- [ ] **Step 1: Rebuild BM25**

```bash
node tools/build_rag_index.js 2>&1 | tail -5
```

Expected: chunks 7.6b.1 baseline → ~baseline+60-70 (palpebra RAG ~10-12k tokens adds many chunks).

- [ ] **Step 2: All gates**

```bash
node tools/validate_cards_schema.mjs 2>&1 | tail -3
node tools/validate_briefings.mjs 2>&1 | tail -5
python tools/audit_images.py 2>&1 | tail -5
```

All zero issues.

- [ ] **Step 3: Commit rag-index**

```bash
git add content/rag/_index.json
git commit -m "chore(rag-index): rebuild after Phase 7.6b.2 reconstrucao-de-palpebra"
```

- [ ] **Step 4: /code-review-board → auto-apply findings → final report**

Same pattern as 7.6b.1.9.

- [ ] **Step 5: PAUSE — wait for explicit merge authorization**

- [ ] **Step 6: Squash-merge + cleanup + memory entry**

Same pattern as 7.6b.1.9 Step 5-6, with appropriate Phase 7.6b.2 commit message and memory file `project_phase7_6b_2_done.md`.

---

# Sub-phase 7.6b.3 — Reconstrução de Pálpebra: Imagens

**Branch:** `feature/phase-7-6b-3-palpebra-images`
**Worktree:** `.worktrees/phase-7-6b-3-palpebra-images`
**Prerequisites:** 7.6b.2 squashed; full Jackson OCR complete (cap.7 already done in 7.6b.2).

### Task 7.6b.3.0: Verify prereqs + create worktree

Same pattern as 7.6b.2.0.

### Task 7.6b.3.1: Image whitelist extraction + harvester for palpebra (subagent: Opus B)

**Files:**
- Create: `tools/harvest_palpebra_images.py`
- Create: ~17 PNGs in `assets/images/reconstrucao-facial/reconstrucao-de-palpebra/`
- Create: ~3 PNGs in `assets/images/estetica-facial/blefaroplastia/` (for the 4 new cards from 7.6b.1 — but cards already merged; image add is separate concern)

**Process:** Subagent reads RAG `[Imagem: <slug>]` tokens, extracts whitelist, renders each from the source PDF page identified by the harvester logic, saves with ASCII filename.

- [ ] **Step 1: Extract image whitelist**

```bash
python -c "
import re, pathlib
text = pathlib.Path('content/rag/reconstrucao-facial/reconstrucao-de-palpebra.md').read_text(encoding='utf-8')
slugs = sorted(set(re.findall(r'\[Imagem: ([^\]]+)\]', text)))
print(f'{len(slugs)} unique slugs:')
for s in slugs: print(' ', s)
"
```

- [ ] **Step 2: Create harvester script**

`tools/harvest_palpebra_images.py` follows precedent from `harvest_*.py` of phase 7.4-7.6a. Takes: source PDF + page numbers + slug → output. Renders at 300dpi; ASCII filename validation; no PNG+JPG duplicates.

(Detailed implementation derived from `tools/harvest_bochecha_images.py` if it exists; otherwise template after the cheek phase pattern.)

- [ ] **Step 3: Run harvester via subagent**

Output: 17 PNGs in `assets/images/reconstrucao-facial/reconstrucao-de-palpebra/` with names from spec §6.

- [ ] **Step 4: Visual review of each PNG**

```bash
ls -la assets/images/reconstrucao-facial/reconstrucao-de-palpebra/
ls assets/images/reconstrucao-facial/reconstrucao-de-palpebra/ | grep -P '[^\x00-\x7F]'  # zero non-ASCII
```

Read each PNG via `Read` tool; verify the figure matches the slug semantically (no mismatches as in Phase 6 otoplastia incident).

- [ ] **Step 5: Audit for duplicates**

```bash
python tools/audit_images.py 2>&1 | tail -10
```

- [ ] **Step 6: Commit raw images**

```bash
git add assets/images/reconstrucao-facial/reconstrucao-de-palpebra/ tools/harvest_palpebra_images.py
git commit -m "feat(images): harvest 17 PNGs for reconstrucao-de-palpebra

Source figures from Oculofacial cap.11, Jackson cap.7 (OCR-validated pages),
Neligan vol.3 cap. pálpebra, Practical FR. ASCII filenames; no duplicates;
pre-overlay (annotation in next step for anatomy_v2 cards 00 and 01).

Phase 7.6b.3 — sub-phase 3 of 3."
```

### Task 7.6b.3.2: Annotate anatomy_v2 cards (numeric overlays)

**Files:**
- Modify: `assets/images/reconstrucao-facial/reconstrucao-de-palpebra/lamelas-funcionais-corte-sagital.png` (replace with annotated)
- Modify: `assets/images/reconstrucao-facial/reconstrucao-de-palpebra/suprimento-vascular-arcadas.png`

- [ ] **Step 1: Confirm annotation tool exists**

```bash
ls tools/annotate_figure.py
```

If missing, follow Phase 6 pattern (overlays at runtime via x,y coords). Otherwise overlay directly via PIL/OpenCV.

- [ ] **Step 2: Generate overlays for cards 00 and 01**

For each anatomy_v2 card, the `labels[]` array `n` numbers must appear positioned over the corresponding structure in the figure. Either bake into PNG (preferred for offline) or store x,y in JSON for runtime overlay (project established this pattern in Phase 6).

- [ ] **Step 3: Visual verify**

Read each annotated PNG, confirm numbers align with structures.

- [ ] **Step 4: Commit**

```bash
git add assets/images/reconstrucao-facial/reconstrucao-de-palpebra/lamelas-funcionais-corte-sagital.png \
       assets/images/reconstrucao-facial/reconstrucao-de-palpebra/suprimento-vascular-arcadas.png \
       content/cards/reconstrucao-facial/reconstrucao-de-palpebra/anatomia.json
git commit -m "feat(images): annotate 2 anatomy_v2 cards (numeric overlays)

Phase 7.6b.3 — sub-phase 3 of 3."
```

### Task 7.6b.3.3: Populate `images[]` in cards

**Files:**
- Modify: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/anatomia.json`
- Modify: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/tecnicas.json`

- [ ] **Step 1: Wire each card to its image(s)**

Each card's `images: []` becomes `images: [{file: "...", caption: "...", credit: "..."}]`. Use information from spec §4 mapping (card 00 → lamelas-funcionais-corte-sagital.png; card 05 Hughes → 2 PNGs estágio 1+2; etc.).

- [ ] **Step 2: AJV gate**

```bash
node tools/validate_cards_schema.mjs 2>&1 | tail -3
```

Expected `OK: 588 | FAIL: 0`.

- [ ] **Step 3: Commit**

```bash
git add content/cards/reconstrucao-facial/reconstrucao-de-palpebra/
git commit -m "feat(cards): wire images[] for 12 reconstrucao-de-palpebra cards

Phase 7.6b.3 — sub-phase 3 of 3."
```

### Task 7.6b.3.4: SW bump + final validation + close 7.6b.3

**Files:**
- Modify: `webapp/library/sw.js` (`v30` → `v31`)
- Modify: `content/cards/reconstrucao-facial/reconstrucao-de-palpebra/_meta.json` (bump version if applicable)

- [ ] **Step 1: Bump SW**

```bash
sed -i "s/'briefing-preop-v30'/'briefing-preop-v31'/" webapp/library/sw.js
grep CACHE_NAME webapp/library/sw.js | head -1
```

Expected: `const CACHE_NAME = 'briefing-preop-v31';`

- [ ] **Step 2: Final gates**

```bash
node tools/validate_cards_schema.mjs 2>&1 | tail -3
node tools/validate_briefings.mjs 2>&1 | tail -5
python tools/audit_images.py 2>&1 | tail -5
node tools/build_rag_index.js 2>&1 | tail -3
```

- [ ] **Step 3: Commit SW + final**

```bash
git add webapp/library/sw.js
git commit -m "fix(pwa): bump sw cache v30 → v31 for Phase 7.6b.3 palpebra images + cards

Phase 7.6b.3 — sub-phase 3 of 3."
```

- [ ] **Step 4: /code-review-board + apply findings + report → PAUSE → squash → memory**

Same pattern as 7.6b.1.9.

### Task 7.6b.3.5: Phase 7.6b closure

After 7.6b.3 squashed:

- [ ] **Step 1: Update roadmap** — mark 7.6b ✅ concluída with merge SHAs

```markdown
| 7.6b | Onda 2 — Reconstrução de pálpebra | [`2026-04-26-phase-7-6b-palpebra-blefaro-expanded.md`](2026-04-26-phase-7-6b-palpebra-blefaro-expanded.md) | local merges <SHA1>+<SHA2>+<SHA3> | ✅ concluída |
```

- [ ] **Step 2: Consolidated memory entry** `project_phase7_6b_done.md`

```markdown
---
name: Phase 7.6b done (palpebra + blefaro enrichment)
description: Sub-phase 7.6b expanded scope merged to master across 3 sequential PRs
type: project
---

Phase 7.6b complete 2026-04-26 — three sequential squashes:
- 7.6b.1 SHA <abbreviated> — blefaroplastia enrichment
- 7.6b.2 SHA <abbreviated> — reconstrucao-de-palpebra RAG + 12 cards text-only
- 7.6b.3 SHA <abbreviated> — palpebra images + SW bump v30→v31

Final: 588 cards AJV OK; BM25 chunks 811 → ~880 (final number); manifest +1
entry; roadmap-7 marks 7.6b ✅; sources Oculofacial BCSC Section 7 +
Jackson Local Flaps cap.7 (OCR via easyocr) added permanently to project
toolkit.

**Why:** Palpebra was the next sub-unit of Phase 7 reconstruction roadmap;
two new books (Oculofacial + Jackson) were added by Dr. Arthur on 2026-04-26
prompting expanded scope (frente A reconstrução + frente B blefaro
enrichment) since both books fed both areas.

**How to apply:** Future work on ptosis (Phase 7.7?), ectropion/entropion
(Phase 7.8?), facial paralysis, lacrimal system can reuse Oculofacial caps.
12 (malpositions), 14-15 (lacrimal), 1 (orbital anatomy).

**Deferred fronts:** ptose stand-alone, ectropion/entropion stand-alone, lacrimal
stand-alone, orbital anatomy area — all queued for Phase 7.7+ or Phase 8.
```

Update `MEMORY.md` index.

- [ ] **Step 3: Final report**

```
=== Phase 7.6b COMPLETE ===
- 3 squash-merges (7.6b.1, 7.6b.2, 7.6b.3)
- Card count delta: +16 (4 blefaro + 12 palpebra) → 588 total cards
- AJV strict gate: 572 → 588 OK
- BM25 chunks: 811 → ~880
- New theme registered: reconstrucao-de-palpebra
- Existing theme version bumped: blefaroplastia v1.1 → v1.2
- New images: ~20 PNGs (~17 palpebra + ~3 blefaro)
- SW: v30 → v31
- New books permanently added: Oculofacial BCSC + Jackson Local Flaps
- Memory entries: project_phase7_6b_1_done.md, project_phase7_6b_2_done.md,
                  project_phase7_6b_3_done.md, project_phase7_6b_done.md
```

---

## Self-Review Notes

**Spec coverage:**
- §1 Goal/scope → covered in plan header + sub-phase structure
- §2 Architecture → covered Tasks 7.6b.1.0 (worktree), 7.6b.2.0-2.4, 7.6b.3.0-3.5
- §3 RAG structure → Task 7.6b.2.1 references spec §3 ToC
- §4 Cards → Task 7.6b.2.2 references spec §4 list
- §5 Blefaroplastia enrichment → Tasks 7.6b.1.1-1.4 (RAG) + 7.6b.1.5-1.7 (cards)
- §6 Image strategy → Tasks 7.6b.3.1-3.3
- §7 Citations → emphasized inline throughout
- §8 Phasing → 3 sub-phases mapped 1:1
- §9 Validation → gates run at each task close

**Placeholder scan:** No "TBD", "TODO", "implement later". Concrete code blocks for each step. Where exact card schema fields depend on inspection (anatomy_v2 vs anatomy_legacy), explicit inspection step precedes the change.

**Type consistency:** ID prefix `palpreconr-` is a hypothesis; Step 7.6b.2.0 verifies precedent. Method paths consistent (`tools/validate_cards_schema.mjs`, `tools/build_rag_index.js`, `webapp/library/sw.js`).

**Possible gap:** Blefaroplastia images (3 PNGs for new cards from 7.6b.1) — current plan adds them in 7.6b.3. If preferable, those could be done immediately after 7.6b.1.7 within 7.6b.1; tradeoff is Jackson OCR not needed for those (Oculofacial figs only). For simplicity and matching past sub-phase patterns (text → text → images), keeping all images in 7.6b.3 is fine.
