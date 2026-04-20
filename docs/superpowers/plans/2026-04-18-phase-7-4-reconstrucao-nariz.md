# Phase 7.4 — Reconstrução de Nariz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir o primeiro sub-unit (reconstrução de nariz) da área `reconstrucao-facial/`, com RAG unificado + 6 cards text-only + harvest de figuras para a biblioteca de imagens (sem wiring no PWA).

**Architecture:** Pipeline de 5 etapas — (1) render Kaufman Cap. 5 + Neligan Vol. 3 cap. nasal com `tools/render_pdf_pages.py`; (2) subagente Opus A autora `reconstrucao-de-nariz.md` marcando figuras via `[Imagem: nariz-<slug>.png]`; (3) subagente Opus B faz harvest da whitelist de figuras para `assets/images/` + manifest light; (4) subagente Sonnet C deriva 6 JSONs de cards text-only; (5) controller registra tema, rebuild BM25, valida, abre PR.

**Tech Stack:** Python 3 + PyMuPDF (render PDF→PNG), Node.js (build_rag_index.js), subagents (Opus authoring/harvest, Sonnet card derivation), git worktree.

**Spec de referência:** [docs/superpowers/specs/2026-04-18-phase-7-4-reconstrucao-nariz-design.md](docs/superpowers/specs/2026-04-18-phase-7-4-reconstrucao-nariz-design.md)

---

## File Structure

### Criados

- `.worktrees/phase-7-4-reconstrucao-nariz/` — worktree isolada
- `tools/_cache/kaufman_cap5/` — ~70 PNGs, scratch (apagado ao fim)
- `tools/_cache/neligan_vol3_nariz/` — ~30-50 PNGs, scratch (apagado ao fim)
- `content/rag/reconstrucao-facial/reconstrucao-de-nariz.md` — RAG unificado do sub-unit
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/_meta.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/anatomia.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/tecnicas.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/decisoes.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/notas.json`
- `content/cards/reconstrucao-facial/reconstrucao-de-nariz/flashcards.json`
- `content/images/reconstrucao-de-nariz/<slug>.json` × N (manifest light por figura)
- `assets/images/reconstrucao-de-nariz/<slug>.png` × N (harvest de páginas)
- `webapp/library/assets/images/reconstrucao-de-nariz/<slug>.png` × N (mirror)

### Modificados

- `content/cards/manifest.json` — entry nova `reconstrucao-facial/reconstrucao-de-nariz` status `complete`
- `content/images/manifest.json` — append de entries novas
- `webapp/library/rag-index.json` — regenerado

### Não tocados

- Demais sub-unidades em `reconstrucao-facial/`
- Área `pele-tumores/`
- `preop.js`, `renderer.js`, `style.css`, `sw.js`, `index.html`
- Cards JSON sem campo `images` (doutrina Phase 7.2 estendida)

---

## Task 1 — Worktree setup

**Files:**
- Workspace: `.worktrees/phase-7-4-reconstrucao-nariz/`

- [ ] **Step 1: Create worktree and branch**

```bash
git worktree add .worktrees/phase-7-4-reconstrucao-nariz -b feature/phase-7-4-reconstrucao-nariz
cd .worktrees/phase-7-4-reconstrucao-nariz
```

Expected: branch criado a partir de `origin/master` (contém spec `df30117`), cwd na worktree.

- [ ] **Step 2: Verify baseline**

```bash
git log --oneline -5
ls "00-Livros-Texto/" | grep -iE "kaufman|practical|neligan.*vol3|craniofacial"
ls tools/render_pdf_pages.py
ls content/rag/reconstrucao-facial/
```

Expected: HEAD inclui `df30117` (spec). PDFs presentes (Kaufman + Neligan Vol. 3). `render_pdf_pages.py` presente. `_principios-reconstrucao.md` + `_atlas-retalhos.md` presentes em `content/rag/reconstrucao-facial/`.

---

## Task 2 — Probe page ranges

**Files:**
- Create (scratch): `tools/_cache/_probe_kaufman/`, `tools/_cache/_probe_neligan/`

Não sabemos os offsets exatos PDF↔impresso. Este task localiza empiricamente os ranges antes do render em massa.

- [ ] **Step 1: Probe Kaufman — rasterizar candidatos de início/fim do Cap. 5**

O livro tem Cap. 5 "Nasal Reconstruction". Kaufman Cap. 1 começa em PDF idx 16 (páginas 3-18 impressas → ofsset ≈ 13). Kaufman Cap. 5 deve estar ~idx 100-120 (páginas 95-163 impressas).

```bash
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Practical Facial Reconstruction_ Theory and Practice.pdf" \
  --start 100 --end 105 \
  --dpi 100 \
  --output tools/_cache/_probe_kaufman/start/
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Practical Facial Reconstruction_ Theory and Practice.pdf" \
  --start 170 --end 180 \
  --dpi 100 \
  --output tools/_cache/_probe_kaufman/end/
```

Usar Read visual em cada PNG para identificar:
- Primeira página com título "Nasal Reconstruction" (abertura do Cap. 5) → anotar idx
- Primeira página do Cap. 6 seguinte → anotar idx; fim do Cap. 5 = idx − 1

Se o range não couber em [100, 180], ampliar: probar `[90, 100]` ou `[180, 200]` a 100 DPI.

- [ ] **Step 2: Probe Neligan Vol. 3 — localizar capítulo de reconstrução nasal**

Neligan Vol. 3 = "craniofacial e pediatrica". O capítulo de reconstrução nasal é tipicamente um dos capítulos intermediários (cap. 6, 7 ou 8 em Vol. 3 da 5ed).

Primeiro, abrir o sumário/índice renderizando as primeiras 10-15 páginas:

```bash
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Neligan 5ed 2023 vol3 craniofacial e pediatrica.pdf" \
  --start 0 --end 14 \
  --dpi 100 \
  --output tools/_cache/_probe_neligan/toc/
```

Read visual nos PNGs até achar a Table of Contents listando "Nose Reconstruction" ou similar, com número do capítulo + página impressa. Converter para idx PDF (offset ≈ 20-30 páginas de front-matter).

Probar os candidatos:

```bash
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Neligan 5ed 2023 vol3 craniofacial e pediatrica.pdf" \
  --start <candidato-inicio> --end <candidato-inicio+5> \
  --dpi 100 \
  --output tools/_cache/_probe_neligan/start/
```

Anotar idx inicial + final do capítulo.

- [ ] **Step 3: Registrar ranges confirmados**

Anotar no plano (editar este arquivo em comentário ou em notas de execução) os 4 idx:

```
Kaufman Cap. 5:        start=<K_START>  end=<K_END>  (total ≈ 70 pp)
Neligan Vol.3 nariz:   start=<N_START>  end=<N_END>  (total ≈ 30-50 pp)
```

Se total combinado > 150 páginas, acionar mitigação §6 da spec: split de autoria em 2 passes (ou trim de Neligan para páginas de anatomia vascular + anexo de técnicas ausentes em Kaufman).

- [ ] **Step 4: Limpar probes**

```bash
rm -rf tools/_cache/_probe_kaufman tools/_cache/_probe_neligan
```

Probes são scratch; só os ranges confirmados entram nas Tasks 3 e 4.

---

## Task 3 — Render Kaufman Cap. 5

**Files:**
- Create: `tools/_cache/kaufman_cap5/p001.png` .. `pNNN.png`

- [ ] **Step 1: Render range confirmado (`K_START`..`K_END`) a 150 DPI**

```bash
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Practical Facial Reconstruction_ Theory and Practice.pdf" \
  --start <K_START> --end <K_END> \
  --dpi 150 \
  --output tools/_cache/kaufman_cap5/
ls tools/_cache/kaufman_cap5/ | wc -l
```

Expected: número de PNGs = `K_END - K_START + 1` (~70). Cada PNG 300KB-2MB.

- [ ] **Step 2: Verificar visualmente primeira/última**

- `tools/_cache/kaufman_cap5/p001.png` → título "Nasal Reconstruction" visível
- `tools/_cache/kaufman_cap5/pNNN.png` (última) → ainda Cap. 5 (não virou Cap. 6)

Se qualquer página estiver errada, ajustar ranges e re-renderizar.

- [ ] **Step 3: Sanity do gitignore**

```bash
grep -E '^tools/_cache' .gitignore || echo "FALTA: adicionar tools/_cache/ ao .gitignore"
```

Se faltar, adicionar e commitar:

```bash
git add .gitignore
git commit -m "chore(gitignore): ensure tools/_cache scratch is ignored"
```

Sem commit de PNGs — cache permanece scratch.

---

## Task 4 — Render Neligan Vol. 3 capítulo nasal

**Files:**
- Create: `tools/_cache/neligan_vol3_nariz/p001.png` .. `pNNN.png`

- [ ] **Step 1: Render range Neligan (`N_START`..`N_END`) a 150 DPI**

```bash
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Neligan 5ed 2023 vol3 craniofacial e pediatrica.pdf" \
  --start <N_START> --end <N_END> \
  --dpi 150 \
  --output tools/_cache/neligan_vol3_nariz/
ls tools/_cache/neligan_vol3_nariz/ | wc -l
```

Expected: `N_END - N_START + 1` PNGs (~30-50).

- [ ] **Step 2: Verificar visualmente primeira/última**

- `p001.png` → título referente a reconstrução nasal (pode ser "Nose Reconstruction", "Nasal Reconstruction", ou "Reconstruction of the Nose")
- `pNNN.png` (última) → ainda dentro do capítulo de nariz (próxima página já é capítulo diferente)

---

## Task 5 — Criar diretórios alvo

**Files:**
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-nariz/.gitkeep`
- Create: `content/images/reconstrucao-de-nariz/.gitkeep`
- Create: `assets/images/reconstrucao-de-nariz/.gitkeep`
- Create: `webapp/library/assets/images/reconstrucao-de-nariz/.gitkeep`

- [ ] **Step 1: Criar 4 diretórios**

```bash
mkdir -p content/cards/reconstrucao-facial/reconstrucao-de-nariz
mkdir -p content/images/reconstrucao-de-nariz
mkdir -p assets/images/reconstrucao-de-nariz
mkdir -p webapp/library/assets/images/reconstrucao-de-nariz
touch content/cards/reconstrucao-facial/reconstrucao-de-nariz/.gitkeep
touch content/images/reconstrucao-de-nariz/.gitkeep
touch assets/images/reconstrucao-de-nariz/.gitkeep
touch webapp/library/assets/images/reconstrucao-de-nariz/.gitkeep
```

- [ ] **Step 2: Commit scaffolding**

```bash
git add content/cards/reconstrucao-facial/reconstrucao-de-nariz/.gitkeep \
        content/images/reconstrucao-de-nariz/.gitkeep \
        assets/images/reconstrucao-de-nariz/.gitkeep \
        webapp/library/assets/images/reconstrucao-de-nariz/.gitkeep
git commit -m "chore: scaffold reconstrucao-de-nariz dirs"
```

`.gitkeep` será substituído/removido nas tasks seguintes quando o conteúdo real aparecer.

---

## Task 6 — Autorar `reconstrucao-de-nariz.md` (Subagente Opus A)

**Files:**
- Create: `content/rag/reconstrucao-facial/reconstrucao-de-nariz.md`

> **Delegação:** este task é executado via subagente Opus (vision + escrita densa). O subagent-driven-development dispara o subagente; este plano define o prompt.

- [ ] **Step 1: Dispatch Agent (subagent_type=general-purpose, modelo Opus)**

Prompt exato para o subagente:

```
Tarefa: escrever o arquivo `content/rag/reconstrucao-facial/reconstrucao-de-nariz.md`
— RAG unificado do sub-unit "reconstrucao de nariz" da area de reconstrucao facial.

FONTES PRIMARIAS (vision, uma pagina por PNG):
- Kaufman "Practical Facial Reconstruction" 2018, Cap. 5 "Nasal Reconstruction":
  tools/_cache/kaufman_cap5/p001.png .. pNNN.png
- Neligan 5ed 2023 Vol. 3 capitulo de reconstrucao nasal:
  tools/_cache/neligan_vol3_nariz/p001.png .. pNNN.png

REGRA CENTRAL DE COMPOSICAO:
- Kaufman e a SPINE NARRATIVA. A estrutura do documento segue Kaufman Cap. 5.
- Neligan COMPLEMENTA APENAS onde agrega: anatomia vascular profunda,
  variacoes tecnicas, passos que Kaufman omite. Nao duplicar conteudo.
- Cite os 2 RAGs horizontais em vez de repetir doutrina geral:
  * framework das 3 perguntas, unidades esteticas, RSTL, margens livres,
    biologia do retalho, wound care, post-op, revisao de cicatriz:
    referenciar `[ver _principios-reconstrucao.md]`
  * descricao tecnica de primary closure, STSG, FTSG, advancement/rotation/
    transposition genericos, bilobed Zitelli, interpolation melolabial/
    paramediano/retroauricular:
    referenciar `[ver _atlas-retalhos.md]`
  * Focar o conteudo novo na APLICACAO NASAL: qual retalho para qual defeito
    em qual sub-unidade nasal, passos especificos para nariz, pitfalls nasais.

ESTRUTURA DO DOCUMENTO (segue `content/rag/_template.md`):
1. Sinopse (1 paragrafo)
2. Referencias Primarias (bullets com bibliografia usada)
3. Introduction — por que reconstrucao nasal e propria, peso das sub-unidades
4. Anatomy — anatomia nasal cirurgica:
   - Sub-unidades nasais de Burget-Menick (dorso, flancos/paredes laterais,
     ponta, asas/alares, columela, triangulos moles, sulco alar)
   - Camadas (pele, musculos nasais, mucosa, arcabouco osteocartilaginoso)
   - Vascularizacao: aa. angular, dorsal nasal, lateral nasal, columelar,
     plexo subdermico (citar Neligan para atlas vascular, Kaufman para
     relevancia clinica)
   - Inervacao sensitiva relevante
5. Diagnosis / Defect Assessment — avaliacao do defeito nasal:
   - Quais camadas faltam (pele, cartilagem, mucosa)
   - Tamanho, sub-unidade, orientacao, tensao esperada
   - Regra do "mais da metade da sub-unidade → refazer a sub-unidade inteira"
6. Treatment / Surgical Technique — opcoes em ordem de complexidade:
   - Second intention / primary closure nasal (quando cabe, onde cabe)
   - STSG/FTSG para defeitos superficiais de dorso/flancos
   - Composite graft (da orelha) para defeitos small full-thickness de margem
     alar/rim
   - Bilobed de Zitelli para defeitos <1.5 cm em ponta/supra-tip
   - Dorsal rotation (Rieger/modified) para defeitos de dorso nasal
   - Island pedicle / V-Y para defeitos de dorso e parede lateral
   - Melolabial (nasolabial) flap — interpolated — para defeitos de asa
   - Paramediano frontal — interpolated — para grandes defeitos multi-sub-
     unidade (ponta, dorso, asa)
   - Reconstrucao multi-camada: quando precisa de cartilage graft (conchal,
     costal, septal) + lining (bipedicle, melolabial-lining, paramediano com
     septal hinge)
7. Decision Algorithm — arvore pratica: tamanho x sub-unidade x camadas
   faltando -> opcao primaria e alternativas
8. Complications — nasais especificas: notching de rim alar, distorcao de
   narina, colapso valvular interno, pincushioning de bilobed, necrose de
   ponta de paramediano, trap-door de melolabial, assimetria de columela
9. Pearls / Notes — gotas de sabedoria especificas ao nariz
10. References — lista completa

REGRAS EDITORIAIS:
- Portugues brasileiro, terminologia anatomica oficial
- Siglas com nome por extenso na primeira ocorrencia por secao (regra
  feedback_acronyms_expanded): STSG = Split-Thickness Skin Graft, FTSG,
  RSTL = Relaxed Skin Tension Lines, C/L = comprimento/largura, etc.
- Cada afirmacao com citacao inline:
  (Kaufman, 2018, cap. 5) OU (Neligan, 2023, vol. 3, cap. <N>)
  OU (Grabb & Smith, 2024, cap. XX) OU (ver _principios-reconstrucao.md)
  OU (ver _atlas-retalhos.md)
- Densidade alvo: 4000-7000 palavras (nivel de `content/rag/pele-tumores/
  retalhos-locais-face.md`; sub-unit denso porque nariz e capitulo-estrela)

HARVEST DE FIGURAS (ponto critico):
- Quando uma figura do livro for especialmente util para ilustrar um conceito,
  marque inline com `[Imagem: nariz-<slug>.png]`, slug em kebab-case ASCII sem
  acentos. Exemplos validos:
  * `[Imagem: nariz-subunidades-burget-menick.png]`
  * `[Imagem: nariz-bilobed-zitelli-geometria.png]`
  * `[Imagem: nariz-paramediano-passos.png]`
  * `[Imagem: nariz-vascularizacao.png]`
  * `[Imagem: nariz-melolabial-aplicacao.png]`
- O subagente de harvest (Task 7) vai processar essa whitelist. Nao crie
  PNGs nem JSONs aqui; apenas marque no texto.
- Seja seletivo: 8-15 figuras para o sub-unit inteiro. Evite redundancia.

SAIDA: o arquivo `.md` completo em
`content/rag/reconstrucao-facial/reconstrucao-de-nariz.md`.
```

- [ ] **Step 2: Revisão do arquivo gerado**

```bash
wc -w content/rag/reconstrucao-facial/reconstrucao-de-nariz.md
head -40 content/rag/reconstrucao-facial/reconstrucao-de-nariz.md
grep -c "Kaufman, 2018" content/rag/reconstrucao-facial/reconstrucao-de-nariz.md
grep -c "Neligan, 2023" content/rag/reconstrucao-facial/reconstrucao-de-nariz.md
grep -c "_principios-reconstrucao" content/rag/reconstrucao-facial/reconstrucao-de-nariz.md
grep -c "_atlas-retalhos" content/rag/reconstrucao-facial/reconstrucao-de-nariz.md
grep -oE '\[Imagem: nariz-[a-z0-9-]+\.png\]' content/rag/reconstrucao-facial/reconstrucao-de-nariz.md | sort -u
```

Expected:
- palavras entre 4000-7000
- header h1 começa com `# Reconstrução` (ou similar)
- ≥15 citações Kaufman
- ≥3 citações Neligan
- ≥2 referências a cada horizontal
- 8-15 slugs únicos `[Imagem: nariz-*.png]`

Se o subagente falhar qualquer critério (fora do range, cita pouco, ignora horizontais, imagens abaixo do piso), redispatch com correção específica.

- [ ] **Step 3: Commit**

```bash
git add content/rag/reconstrucao-facial/reconstrucao-de-nariz.md
git commit -m "feat(rag): reconstrucao-de-nariz.md (Kaufman cap.5 + Neligan vol.3)"
```

---

## Task 7 — Harvest de figuras (Subagente Opus B)

**Files:**
- Create: `assets/images/reconstrucao-de-nariz/<slug>.png` × N
- Create: `webapp/library/assets/images/reconstrucao-de-nariz/<slug>.png` × N (mirror)
- Create: `content/images/reconstrucao-de-nariz/<slug>.json` × N
- Modify: `content/images/manifest.json`

> **Delegação:** subagente Opus dedicado (vision + I/O de arquivos). A whitelist de slugs vem do RAG da Task 6.

- [ ] **Step 1: Extrair whitelist**

```bash
grep -oE '\[Imagem: nariz-[a-z0-9-]+\.png\]' content/rag/reconstrucao-facial/reconstrucao-de-nariz.md \
  | sort -u \
  | sed -E 's/^\[Imagem: (.*)\]$/\1/' \
  > /tmp/nariz_whitelist.txt
cat /tmp/nariz_whitelist.txt
wc -l /tmp/nariz_whitelist.txt
```

Expected: 8-15 nomes de arquivo. Esta é a lista autoritativa para o subagente B.

- [ ] **Step 2: Dispatch Agent (subagent_type=general-purpose, modelo Opus)**

Prompt exato:

```
Tarefa: executar harvest de figuras para o sub-unit de reconstrucao de nariz.

CONTEXTO:
- O RAG `content/rag/reconstrucao-facial/reconstrucao-de-nariz.md` referencia figuras
  via marcadores `[Imagem: nariz-<slug>.png]`. Essa e uma whitelist AUTORITATIVA.
- Paginas renderizadas disponiveis:
  * tools/_cache/kaufman_cap5/p001.png .. pNNN.png (Kaufman cap. 5)
  * tools/_cache/neligan_vol3_nariz/p001.png .. pNNN.png (Neligan vol. 3 cap. nasal)

WHITELIST (arquivo): /tmp/nariz_whitelist.txt — uma linha por slug.
Exemplo de conteudo:
  nariz-subunidades-burget-menick.png
  nariz-bilobed-zitelli-geometria.png
  nariz-paramediano-passos.png

PARA CADA SLUG DA WHITELIST:

1. Ler o RAG e localizar o(s) paragrafo(s) onde o slug aparece. O texto ao
   redor descreve qual conceito a figura ilustra. Use isso como guia semantico.

2. Usar vision nos PNGs do cache (Kaufman primeiro, Neligan depois) e
   identificar a pagina que melhor representa o conceito. Preferencia:
   - Figuras diagramaticas de Kaufman (desenho esquematico de planejamento)
     sobre fotos intra-op do Neligan
   - Pagina que contenha a figura inteira + legenda original do livro
   - Se houver duas paginas candidatas, escolha a com legenda mais completa

3. Copiar a pagina identificada (PNG inteiro, sem recorte) para:
   - assets/images/reconstrucao-de-nariz/<slug>.png
   - webapp/library/assets/images/reconstrucao-de-nariz/<slug>.png (identica)

4. Criar content/images/reconstrucao-de-nariz/<slug>.json com o formato
   manifest light:

   {
     "id": "<slug-sem-extensao>",
     "file": "<slug>.png",
     "topic": "reconstrucao-de-nariz",
     "area": "reconstrucao-facial",
     "caption": "<descricao em PT-BR, 1-2 frases, citando a fonte>",
     "credit": "Kaufman, 2018, cap. 5, Fig. X.Y" OU "Neligan, 2023, vol. 3, cap. <N>, Fig. X.Y",
     "labels": []
   }

   - `labels: []` e obrigatorio (campo vazio reservado para pipeline curado futuro).
   - caption em portugues brasileiro, cita a fonte no final.
   - credit: tentar identificar o numero da figura no livro; se ilegivel,
     usar "Kaufman, 2018, cap. 5, pag. <impressa>" sem numero de figura.

REGRAS CRITICAS:
- NAO criar figuras fora da whitelist. Nao inventar slugs.
- NAO recortar as paginas: harvest captura PNG inteiro (doutrina Phase 7.4
  spec §3.3 e §9, "manifest light", "recorte cirurgico e responsabilidade do
  pipeline curado futuro").
- NAO atualizar content/images/manifest.json aqui — Task 7 Step 4 faz isso.
- Para cada slug, reportar no output final: qual PNG de cache foi usado,
  qual numero de pagina impressa, fonte.

SAIDA:
- Todos os PNGs em 2 locais (assets + mirror).
- Todos os JSONs em content/images/reconstrucao-de-nariz/.
- Sumario textual de {slug -> fonte, pagina PDF idx} para log.
```

- [ ] **Step 3: Verificar harvest**

```bash
# Contar arquivos criados
ls assets/images/reconstrucao-de-nariz/*.png | wc -l
ls webapp/library/assets/images/reconstrucao-de-nariz/*.png | wc -l
ls content/images/reconstrucao-de-nariz/*.json | wc -l
# Todos devem ser iguais a wc -l da whitelist

# Conferir integridade: cada slug do RAG tem 3 arquivos (asset, mirror, json)
while read slug; do
  slug_noext="${slug%.png}"
  [ -f "assets/images/reconstrucao-de-nariz/$slug" ] || echo "MISSING asset: $slug"
  [ -f "webapp/library/assets/images/reconstrucao-de-nariz/$slug" ] || echo "MISSING mirror: $slug"
  [ -f "content/images/reconstrucao-de-nariz/${slug_noext}.json" ] || echo "MISSING json: $slug_noext"
done < /tmp/nariz_whitelist.txt
```

Expected: zero "MISSING". Counts batem com a whitelist.

- [ ] **Step 4: Append em `content/images/manifest.json`**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const manifestPath = 'content/images/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const jsonsDir = 'content/images/reconstrucao-de-nariz';
const files = fs.readdirSync(jsonsDir).filter(f => f.endsWith('.json'));
let added = 0;
for (const f of files) {
  const rec = JSON.parse(fs.readFileSync(path.join(jsonsDir, f), 'utf8'));
  const id = rec.id;
  if (!manifest.images) manifest.images = [];
  if (manifest.images.some(i => i.id === id)) continue;
  manifest.images.push({
    id,
    file: rec.file,
    topic: rec.topic,
    area: rec.area,
    path: 'reconstrucao-de-nariz/' + rec.file
  });
  added++;
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('appended', added, 'entries to', manifestPath);
"
```

Se o schema do `manifest.json` divergir deste formato, o script deve ser ajustado para ecoar o formato existente. Inspecionar:

```bash
head -40 content/images/manifest.json
```

E ajustar o script acima para igualar a forma dos registros já presentes.

- [ ] **Step 5: Commit harvest**

```bash
# Remover .gitkeep dos dirs que agora tem conteudo
git rm --cached -f \
  content/images/reconstrucao-de-nariz/.gitkeep \
  assets/images/reconstrucao-de-nariz/.gitkeep \
  webapp/library/assets/images/reconstrucao-de-nariz/.gitkeep 2>/dev/null || true
rm -f \
  content/images/reconstrucao-de-nariz/.gitkeep \
  assets/images/reconstrucao-de-nariz/.gitkeep \
  webapp/library/assets/images/reconstrucao-de-nariz/.gitkeep

git add assets/images/reconstrucao-de-nariz/ \
        webapp/library/assets/images/reconstrucao-de-nariz/ \
        content/images/reconstrucao-de-nariz/ \
        content/images/manifest.json
git commit -m "feat(images): harvest de figuras nasais (biblioteca, sem wiring PWA)"
```

---

## Task 8 — Derivar cards (Subagente Sonnet C)

**Files:**
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-nariz/_meta.json`
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-nariz/anatomia.json`
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-nariz/tecnicas.json`
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-nariz/decisoes.json`
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-nariz/notas.json`
- Create: `content/cards/reconstrucao-facial/reconstrucao-de-nariz/flashcards.json`

> **Delegação:** subagente Sonnet (derivação estrutural — rápido e barato). Entrada: RAG + schema + exemplar de formato.

- [ ] **Step 1: Dispatch Agent (subagent_type=general-purpose, modelo Sonnet)**

Prompt exato:

```
Tarefa: derivar 6 arquivos JSON de cards a partir do RAG
`content/rag/reconstrucao-facial/reconstrucao-de-nariz.md` para consumo no
PWA de briefing pre-op.

ARQUIVOS A CRIAR (em content/cards/reconstrucao-facial/reconstrucao-de-nariz/):
- _meta.json        (metadados do tema)
- anatomia.json     (array de cards tipo "anatomy")
- tecnicas.json     (array de cards tipo "technique")
- decisoes.json     (array de cards tipo "decision")
- notas.json        (array de cards tipo "note")
- flashcards.json   (array de cards tipo "flashcard")

REFERENCIAS OBRIGATORIAS (ler antes de escrever):
1. `content/cards/_structure.json` — descricao do formato
2. `content/cards/schema.json` — schema JSON formal
3. `content/cards/estetica-facial/rinoplastia/` — exemplar de formato (os 6
   arquivos). Use APENAS como molde de estrutura; o conteudo e de
   reconstrucao, nao de estetica.

REGRAS CRITICAS:
1. NENHUM card tem campo `images`. Omitir o campo completamente. (Doutrina
   Phase 7.2 estendida a Phase 7.4; ver spec 2026-04-18-phase-7-4-*.md §2.2
   e §9.)
2. Todos os cards derivam do RAG — nenhuma afirmacao sem base textual no
   RAG. Se o RAG cita `(Kaufman, 2018, cap. 5)`, o card preserva a citacao.
3. Portugues brasileiro, terminologia anatomica oficial, acentuacao
   correta (regra projeto: material de ensino).
4. Siglas expandidas na primeira ocorrencia por card (STSG = Split-Thickness
   Skin Graft, etc.).
5. Seguir o schema v2 existente:
   - anatomy: campos `structures[]` (com name/role), `clinical_hook`,
     `how_to_identify`, `key_points[]`, `one_liner`, `title`, `aliases[]`,
     `citations[]`, `tags[]`, `updates[]`. ID format: `nariz-anat-NNN`.
   - technique: `steps[]`, `indications[]`, `contraindications[]`,
     `complications[]`, `citations[]`, `tags[]`. ID: `nariz-tec-NNN`.
   - decision: `context`, `question`, `options[]` com `criteria[]`,
     `recommendation`, `citations[]`. ID: `nariz-dec-NNN`.
   - note: `body` (texto markdown curto), `citations[]`, `tags[]`.
     ID: `nariz-nota-NNN`.
   - flashcard: `question`, `answer`, `source`, `tags[]`.
     ID: `nariz-fc-NNN`.

COBERTURA MINIMA (ajustar quantidade ao que o RAG suportar):
- anatomia: 6-10 cards (sub-unidades nasais, camadas, vascularizacao,
  inervacao, arcabouco cartilaginoso, ponto de distorcao de margem alar)
- tecnicas: 8-12 cards (um card por tecnica maior: bilobed Zitelli,
  dorsal rotation, melolabial, paramediano, composite graft, STSG/FTSG,
  primary closure, multi-layer com cartilage + lining)
- decisoes: 3-5 arvores (sub-unidade x tamanho; camadas faltando;
  quando refazer sub-unidade inteira)
- notas: 4-6 notas curtas (pitfalls, unidades esteticas no nariz,
  regra dos >50%, wound care nasal especifico)
- flashcards: 12-20 pares Q/A

_META.JSON: mesmo formato que `content/cards/estetica-facial/rinoplastia/
_meta.json` — `version` (ex: "1.0.0"), `last_updated` (hoje),
`rag_source`, `citations_summary` por fonte, `card_counts` por tipo, etc.

ENTRADA: o RAG completo esta em content/rag/reconstrucao-facial/
reconstrucao-de-nariz.md. Leia-o integralmente antes de comecar.

SAIDA: 6 JSONs validos (conforme schema.json), sem campo `images`, cada um
com o conteudo derivado.

APOS ESCREVER: validar JSON sintaxe com `node -e "JSON.parse(require('fs').
readFileSync('<path>', 'utf8'))"` em cada arquivo; reportar OK no output.
```

- [ ] **Step 2: Verificar cards**

```bash
# Sintaxe de JSON
for f in content/cards/reconstrucao-facial/reconstrucao-de-nariz/*.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f', 'utf8')); console.log('OK', '$f')" \
    || echo "INVALID $f"
done

# Nenhum card deve ter campo "images"
grep -l '"images"' content/cards/reconstrucao-facial/reconstrucao-de-nariz/*.json && \
  echo "VIOLACAO: algum card tem campo images" || echo "OK: nenhum campo images"

# Contagens minimas
node -e "
const fs = require('fs');
const base = 'content/cards/reconstrucao-facial/reconstrucao-de-nariz';
for (const f of ['anatomia','tecnicas','decisoes','notas','flashcards']) {
  const arr = JSON.parse(fs.readFileSync(base + '/' + f + '.json', 'utf8'));
  console.log(f, '=', Array.isArray(arr) ? arr.length : 'NOT_ARRAY');
}
"
```

Expected: todos OK, nenhum VIOLACAO, contagens dentro do range declarado no prompt.

- [ ] **Step 3: Commit cards**

```bash
git rm --cached -f content/cards/reconstrucao-facial/reconstrucao-de-nariz/.gitkeep 2>/dev/null || true
rm -f content/cards/reconstrucao-facial/reconstrucao-de-nariz/.gitkeep
git add content/cards/reconstrucao-facial/reconstrucao-de-nariz/
git commit -m "feat(cards): reconstrucao-de-nariz text-only (6 JSONs, sem images)"
```

---

## Task 9 — Registrar tema no `content/cards/manifest.json`

**Files:**
- Modify: `content/cards/manifest.json`

- [ ] **Step 1: Inspecionar formato atual**

```bash
head -30 content/cards/manifest.json
node -e "
const m = JSON.parse(require('fs').readFileSync('content/cards/manifest.json','utf8'));
console.log(Object.keys(m));
const first = (m.themes || m.topics || [])[0];
console.log('first entry:', JSON.stringify(first, null, 2));
"
```

- [ ] **Step 2: Adicionar entry**

```bash
node -e "
const fs = require('fs');
const path = 'content/cards/manifest.json';
const m = JSON.parse(fs.readFileSync(path, 'utf8'));
const list = m.themes || m.topics;
const key = list === m.themes ? 'themes' : 'topics';
const newEntry = {
  id: 'reconstrucao-de-nariz',
  area: 'reconstrucao-facial',
  label: 'Reconstrução de Nariz',
  status: 'complete',
  rag: 'content/rag/reconstrucao-facial/reconstrucao-de-nariz.md',
  cards_dir: 'content/cards/reconstrucao-facial/reconstrucao-de-nariz/'
};
if (!m[key].some(e => e.id === newEntry.id)) m[key].push(newEntry);
fs.writeFileSync(path, JSON.stringify(m, null, 2) + '\n');
console.log('added entry; total now:', m[key].length);
"
```

Se a forma dos entries existentes diferir (ex: `procedure_id` em vez de `id`, ou chave diferente), ajustar o objeto `newEntry` para ecoar exatamente o formato presente no manifest. Ler um entry existente de `estetica-facial/rinoplastia` como referência.

- [ ] **Step 3: Commit manifest**

```bash
git add content/cards/manifest.json
git commit -m "feat(manifest): registrar reconstrucao-de-nariz como complete"
```

---

## Task 10 — Rebuild RAG index

**Files:**
- Modify: `webapp/library/rag-index.json`

- [ ] **Step 1: Rodar build**

```bash
node tools/build_rag_index.js
```

Expected: log mostrando `reconstrucao-facial/reconstrucao-de-nariz` como nova fonte. Tamanho do `rag-index.json` aumenta.

- [ ] **Step 2: Confirmar chunks**

```bash
node -e "
const idx = JSON.parse(require('fs').readFileSync('webapp/library/rag-index.json', 'utf8'));
const chunks = idx.chunks || idx;
const nariz = chunks.filter(c => (c.source || c.file || '').includes('reconstrucao-de-nariz'));
console.log('chunks from reconstrucao-de-nariz:', nariz.length);
console.log('sample:', JSON.stringify(nariz[0] || null, null, 2).slice(0, 400));
"
```

Expected: ≥5 chunks. Se 0 chunks, revisar o filtro de `build_rag_index.js` (Phase 7.3 removeu filtro `_*.md`; garantir que RAGs sem prefixo também entram — deveriam, por default).

- [ ] **Step 3: Commit index**

```bash
git add webapp/library/rag-index.json
git commit -m "chore(rag-index): regenerar com reconstrucao-de-nariz"
```

---

## Task 11 — Verificação end-to-end

- [ ] **Step 1: Validators existentes sem regressão**

```bash
node tools/validate_briefings.mjs
node tools/validate_anatomy_opener.mjs
node tools/validate_anatomy_image_purge.mjs
```

Expected: todos PASS. `validate_anatomy_image_purge` permanece 8/8 (tema novo não entra no escopo de purge — escopo = 8 temas contorno+face).

- [ ] **Step 2: Template conformance RAG**

```bash
node -e "
const fs = require('fs');
const f = 'content/rag/reconstrucao-facial/reconstrucao-de-nariz.md';
const c = fs.readFileSync(f, 'utf8');
const h1 = (c.match(/^# /gm) || []).length;
const h2 = (c.match(/^## /gm) || []).length;
const h3 = (c.match(/^### /gm) || []).length;
const words = c.split(/\s+/).length;
console.log('h1:', h1, 'h2:', h2, 'h3:', h3, 'words:', words);
const required = ['Anatomy', 'Treatment', 'Complications', 'References'];
for (const r of required) if (!c.includes(r)) console.log('MISSING header fragment:', r);
"
```

Expected: h1=1, h2≥5, words entre 4000-7000, nenhum MISSING.

- [ ] **Step 3: Smoke manual do PWA (mobile viewport)**

```bash
# Dev server
cd webapp/library && python -m http.server 8080 &
SERVER_PID=$!
sleep 2
```

Abrir via browser (ou Playwright headless) em iPhone viewport: `http://localhost:8080/index.html` → Briefings → "Reconstrução de Nariz".

Checar:
- Briefing monta sem erro (console limpo)
- 6 seções renderizam (Anatomia Relevante, Técnica, Decisões, Notas, Flashcards, etc. conforme renderer)
- Seção Anatomia: cards **sem figura**, text-only; chapter-opener editorial Phase 7.1 presente (wordmark + itálico + régua)
- Seção Técnica: cards text-only
- Nenhum erro 404 de imagem no console

```bash
kill $SERVER_PID
```

- [ ] **Step 4: Smoke Chat IA**

No mesmo PWA (ou outra aba), navegar para Chat IA e perguntar:

> "Como planejar um retalho paramediano frontal para defeito de ponta nasal?"

Expected: a resposta cita conteúdo do novo RAG (passos específicos de paramediano, pedicle supratroclear, 3 estágios, etc.). Se o chat ignora o novo RAG, revisar `rag-index.json` Task 10 Step 2.

- [ ] **Step 5: Biblioteca de imagens — inspeção amostral**

```bash
ls -la assets/images/reconstrucao-de-nariz/ | head -20
# Read 2-3 PNGs para sanity visual (via IDE ou Read tool)
```

Expected: PNGs presentes, não-vazios, conteúdo coerente com slugs (figura da página correta).

- [ ] **Step 6: Revisão editorial pelo Dr. Arthur**

Pausar aqui. Pedir ao Dr. Arthur para ler o RAG (`content/rag/reconstrucao-facial/reconstrucao-de-nariz.md`) e amostrar 2-3 cards (ex: `tecnicas.json`). Se solicitar alterações:

- Para RAG: redispatch subagente Opus A com correções específicas → Task 6 Step 2 → re-Task 10 (rebuild) → re-Step 2.
- Para cards: redispatch Sonnet C → Task 8 Step 2 → recommit.

Só seguir para Task 12 com OK explícito.

---

## Task 12 — Cleanup + PR

- [ ] **Step 1: Apagar cache scratch**

```bash
rm -rf tools/_cache/kaufman_cap5 tools/_cache/neligan_vol3_nariz 2>/dev/null
ls tools/_cache/ 2>&1 | head
```

Expected: diretórios scratch removidos. Gitignored, nada para commitar.

- [ ] **Step 2: Log final**

```bash
git log --oneline origin/master..HEAD
```

Expected: 7-8 commits — scaffold dirs, gitignore (se aplicável), RAG, harvest, cards, manifest, rag-index, eventuais fix.

- [ ] **Step 3: Atualizar memória (após merge, NÃO no PR)**

Criar após merge `C:/Users/absay/.claude/projects/c--Users-absay-Documents-Biblioteca-CirurgiaPlastica/memory/project_phase7_4_done.md` com status CONCLUIDA + ID do PR + slug list de figuras. Adicionar linha no MEMORY.md.

- [ ] **Step 4: Push + code review + PR**

```bash
git push -u origin feature/phase-7-4-reconstrucao-nariz
```

Invocar `/code-review:code-review` antes de abrir PR. Depois:

```bash
gh pr create --title "Phase 7.4: Reconstrucao de Nariz (Wave 1, sub-unit 1)" --body "$(cat <<'EOF'
## Summary
- Novo sub-unit `reconstrucao-facial/reconstrucao-de-nariz`:
  - RAG unificado `content/rag/reconstrucao-facial/reconstrucao-de-nariz.md` (Kaufman cap. 5 + Neligan vol. 3, cita `_principios-reconstrucao.md` e `_atlas-retalhos.md`)
  - 6 cards JSON text-only em `content/cards/reconstrucao-facial/reconstrucao-de-nariz/`
  - Harvest de N figuras para biblioteca de imagens (`assets/images/reconstrucao-de-nariz/` + mirror webapp)
  - Manifest light: `file + caption + credit` (sem `labels[]` com x,y)
- Registrado em `content/cards/manifest.json` (status `complete`)
- `webapp/library/rag-index.json` regenerado

## Doutrina capturada (aplicavel a Waves 7.5+)
- Cards seguem sem `images` (Phase 7.2 estendida)
- Harvest de figuras acumula materia-prima na biblioteca
- Pipeline curado futuro faz recorte + overlays + wiring de `images` nos cards

## Fora de escopo
- Labio, bochecha, palpebra, orelha, fronte, couro cabeludo, queixo — planos futuros (7.5+)
- Wiring de imagens no PWA — pipeline curado futuro
- Mudanca visual, SW bump, CSS — zero mudanca de codigo

## Test plan
- [x] `node tools/validate_briefings.mjs` + `validate_anatomy_opener.mjs` + `validate_anatomy_image_purge.mjs` todos PASS
- [x] Template conformance RAG (h1=1, h2>=5, 4000-7000 palavras)
- [x] JSON sintaxe valida em todos os 6 cards + zero campo `images`
- [x] `rag-index.json` contem chunks do novo RAG
- [x] Smoke PWA mobile: briefing monta, secoes text-only, sem 404
- [x] Smoke Chat IA: pergunta nasal puxa contexto do novo RAG
- [x] Revisao editorial do Dr. Arthur

Spec: `docs/superpowers/specs/2026-04-18-phase-7-4-reconstrucao-nariz-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

- **Spec coverage §3.1 (render):** Tasks 2 (probe), 3 (Kaufman), 4 (Neligan) cobrem os dois ranges.
- **Spec coverage §3.2 (Opus A autoria):** Task 6 com prompt completo e regras de composição (Kaufman spine, Neligan complemento, cita horizontais, marca `[Imagem:]` inline).
- **Spec coverage §3.3 (Opus B harvest):** Task 7 com whitelist extraction (Step 1), prompt completo (Step 2), verificação de integridade (Step 3), append em manifest (Step 4).
- **Spec coverage §3.4 (Sonnet C cards):** Task 8 com prompt que reforça "sem `images`" e schema v2.
- **Spec coverage §3.5 (controller):** Tasks 9 (manifest), 10 (rag-index), 11 (verificação), 12 (cleanup+PR).
- **Spec §2.2 (fora):** zero CSS/SW/renderer tocado; preop.js, index.html, sw.js não aparecem em nenhum Task.
- **Spec §5 (verificação):** cobrido em Task 11 (validators automatizados + smoke manual + editorial).
- **Spec §6 (riscos):** vision budget mitigado em Task 2 Step 3 (registrar ranges e avaliar se >150 pp); split de autoria é fallback documentado na spec.
- **Placeholders scan:** zero "TBD". Prompts dos 3 subagentes completos. Ranges (`<K_START>`, `<N_START>`) são variáveis a preencher durante Task 2 — necessário pela natureza do probe, não é placeholder de conteúdo.
- **Type consistency:** slug formato `nariz-<slug>.png` usado em Tasks 6, 7. JSON schema `{id, file, topic, area, caption, credit, labels}` consistente entre harvest e manifest. ID pattern `nariz-{anat,tec,dec,nota,fc}-NNN` consistente com schema v2.
- **Doutrina Phase 7.2 estendida:** Task 8 prompt explicita "NENHUM card tem campo `images`" e cita spec §2.2 + §9. Verificação em Task 8 Step 2 grep `"images"`.
- **Alinhamento CLAUDE.md:** usa `subagent-driven-development` (3 subagentes), `test-driven-development` implícito nos validators, `verification-before-completion` em Task 11, `/code-review:code-review` antes de PR (Task 12).
