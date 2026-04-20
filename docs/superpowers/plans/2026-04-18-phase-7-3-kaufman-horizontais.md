# Phase 7.3 — Kaufman Horizontais (RAGs `_principios-reconstrucao` + `_atlas-retalhos`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir dois documentos RAG horizontais — `_principios-reconstrucao.md` (Kaufman Cap. 1) + `_atlas-retalhos.md` (Kaufman Cap. 2) — na nova área `content/rag/reconstrucao-facial/`, para servir como shared foundation das 8 sub-unidades faciais das Ondas 1–3.

**Architecture:** Raster de 36 páginas do PDF Kaufman via novo utilitário `tools/render_pdf_pages.py`, autoria via Opus-subagent com leitura vision das páginas + cross-reference em RAGs existentes de pele-tumores/face para estilo editorial. Zero impacto no PWA (prefixo `_` invisível ao `manifest.json`). Reuso direto de `tools/build_rag_index.js` para regenerar o índice BM25 do Chat IA.

**Tech Stack:** Python 3 + PyMuPDF (render PDF → PNG), Node.js (build_rag_index.js), subagents (Opus authoring, Sonnet verification), git worktree.

**Spec de referência:** [docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md](docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md) §3.3, §6.3.

**Nota de numeração:** A spec original numera este trabalho como "Phase 7.2 horizontais". PR #26 (mergeado 2026-04-18) usou o slot 7.2 para a image purge, portanto renumeramos: **Phase 7.3 = horizontais**, 7.4 = Onda 1 nariz+lábio, 7.5 = Onda 2, 7.6 = Onda 3, 7.7 = cleanup. Só o plano de horizontais é coberto aqui.

---

## File Structure

### Criados

- `.worktrees/phase-7-3-kaufman-horizontais/` — worktree isolada
- `tools/render_pdf_pages.py` — rasteriza range de páginas de um PDF para PNG (reusado em Waves 1–3)
- `tools/_cache/kaufman_cap1/` — 16 PNGs, scratch (apagado ao fim)
- `tools/_cache/kaufman_cap2/` — 20 PNGs, scratch (apagado ao fim)
- `content/rag/reconstrucao-facial/` — diretório novo
- `content/rag/reconstrucao-facial/_principios-reconstrucao.md` — RAG horizontal 1 (Kaufman Cap. 1 + Neligan Vol. 3 cap. 1)
- `content/rag/reconstrucao-facial/_atlas-retalhos.md` — RAG horizontal 2 (Kaufman Cap. 2 expandido, tipos de retalhos)

### Modificados

- `webapp/library/rag-index.json` — regenerado para incluir chunks dos 2 novos RAGs

### Não tocados

- `content/cards/manifest.json` — horizontais são invisíveis ao PWA (prefixo `_`)
- `content/cards/reconstrucao-facial/` — cards só nascem em Waves 1–3 (planos separados)
- Demais RAGs existentes

---

## Task 1 — Worktree setup

**Files:**
- Workspace: `.worktrees/phase-7-3-kaufman-horizontais/`

- [ ] **Step 1: Create worktree and branch**

Run:
```bash
git worktree add .worktrees/phase-7-3-kaufman-horizontais -b feature/phase-7-3-kaufman-horizontais
cd .worktrees/phase-7-3-kaufman-horizontais
```

Expected: branch criado a partir de `origin/master` (`a0e4ce5`), cwd na worktree.

- [ ] **Step 2: Verify baseline**

```bash
git log --oneline -3
ls 00-Livros-Texto/ | grep -i kaufman
```

Expected: HEAD = `a0e4ce5`. PDF Kaufman presente (`Practical Facial Reconstruction_ Theory and Practice.pdf`).

---

## Task 2 — Utilitário `tools/render_pdf_pages.py`

**Files:**
- Create: `tools/render_pdf_pages.py`

- [ ] **Step 1: Create rasterizer**

Conteúdo completo:

```python
#!/usr/bin/env python3
"""
tools/render_pdf_pages.py — Rasteriza um range de páginas de um PDF para PNG.

Uso:
  python tools/render_pdf_pages.py \\
    --pdf "00-Livros-Texto/<livro>.pdf" \\
    --start 16 --end 31 \\
    --dpi 150 \\
    --output tools/_cache/<nome>/

Convencao: --start e --end sao indices zero-based de paginas PDF (nao paginas
impressas). Saida: p001.png, p002.png, ... sequencial ordenado.
"""
import argparse
import os
import sys
import fitz  # PyMuPDF


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--start", type=int, required=True, help="PDF page index (0-based), inclusive")
    ap.add_argument("--end", type=int, required=True, help="PDF page index (0-based), inclusive")
    ap.add_argument("--dpi", type=int, default=150)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        print(f"PDF nao encontrado: {args.pdf}", file=sys.stderr)
        sys.exit(1)
    if args.end < args.start:
        print("--end deve ser >= --start", file=sys.stderr)
        sys.exit(2)

    os.makedirs(args.output, exist_ok=True)
    doc = fitz.open(args.pdf)
    total = args.end - args.start + 1
    for seq, idx in enumerate(range(args.start, args.end + 1), start=1):
        if idx >= doc.page_count:
            print(f"indice {idx} fora do PDF ({doc.page_count} paginas)", file=sys.stderr)
            sys.exit(3)
        page = doc[idx]
        pix = page.get_pixmap(dpi=args.dpi)
        out = os.path.join(args.output, f"p{seq:03d}.png")
        pix.save(out)
    doc.close()
    print(f"rendered {total} pages -> {args.output}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Smoke-test render 1 página do Kaufman**

```bash
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Practical Facial Reconstruction_ Theory and Practice.pdf" \
  --start 16 --end 16 \
  --dpi 100 \
  --output tools/_cache/_smoke/
ls tools/_cache/_smoke/
```

Expected: `p001.png` criado (~50-150KB). Removendo smoke depois: `rm -rf tools/_cache/_smoke/`.

- [ ] **Step 3: Commit**

```bash
git add tools/render_pdf_pages.py
git commit -m "feat(tool): render_pdf_pages.py rasterizador reutilizavel para Kaufman/Neligan"
```

---

## Task 3 — Render Kaufman Cap. 1

**Files:**
- Create: `tools/_cache/kaufman_cap1/p001.png` .. `p016.png`

- [ ] **Step 1: Render pages 16–31 (PDF idx, = printed pp. 3–18)**

```bash
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Practical Facial Reconstruction_ Theory and Practice.pdf" \
  --start 16 --end 31 \
  --dpi 150 \
  --output tools/_cache/kaufman_cap1/
ls tools/_cache/kaufman_cap1/ | wc -l
```

Expected: 16 PNGs, tamanho cada ~300KB-2MB.

- [ ] **Step 2: Verificar visualmente a primeira e última**

Usar ferramenta Read nos arquivos:
- `tools/_cache/kaufman_cap1/p001.png` → título "Principles, Design, Completion"
- `tools/_cache/kaufman_cap1/p016.png` → última página do capítulo

Se qualquer página for capa/branco/capítulo errado, corrigir ranges e re-renderizar.

- [ ] **Step 3 (no commit — cache scratch):**

`tools/_cache/` já está (ou deve estar) em `.gitignore`. Verificar:
```bash
grep -E '^tools/_cache' .gitignore || echo "adicionar tools/_cache/ ao .gitignore"
```

Se não estiver, adicionar linha `tools/_cache/` ao `.gitignore` e commitar:
```bash
git add .gitignore
git commit -m "chore(gitignore): ensure tools/_cache scratch is ignored"
```

---

## Task 4 — Render Kaufman Cap. 2

**Files:**
- Create: `tools/_cache/kaufman_cap2/p001.png` .. `p020.png`

- [ ] **Step 1: Render pages 32–51 (PDF idx, = printed pp. 19–38)**

```bash
python tools/render_pdf_pages.py \
  --pdf "00-Livros-Texto/Practical Facial Reconstruction_ Theory and Practice.pdf" \
  --start 32 --end 51 \
  --dpi 150 \
  --output tools/_cache/kaufman_cap2/
ls tools/_cache/kaufman_cap2/ | wc -l
```

Expected: 20 PNGs.

- [ ] **Step 2: Verify primeira e última com Read**

- `tools/_cache/kaufman_cap2/p001.png` → título "Practical Aspects of Facial Reconstruction"
- `tools/_cache/kaufman_cap2/p020.png` → última página do capítulo; página seguinte (idx 52) já deve ser início do Cap. 3 ("Cheek Reconstruction") — confirmar opcionalmente renderizando só essa:

```bash
python tools/render_pdf_pages.py --pdf "00-Livros-Texto/Practical Facial Reconstruction_ Theory and Practice.pdf" --start 52 --end 52 --dpi 100 --output tools/_cache/_boundary_check/
# Read tools/_cache/_boundary_check/p001.png
```

Esperado: Cap. 3 começa. Delete `tools/_cache/_boundary_check/`.

---

## Task 5 — Criar diretório `content/rag/reconstrucao-facial/`

**Files:**
- Create: `content/rag/reconstrucao-facial/.gitkeep`

- [ ] **Step 1: Criar diretório**

```bash
mkdir -p content/rag/reconstrucao-facial/
touch content/rag/reconstrucao-facial/.gitkeep
git add content/rag/reconstrucao-facial/.gitkeep
git commit -m "chore(rag): criar diretorio content/rag/reconstrucao-facial"
```

- [ ] **Step 2: Verificar**

```bash
ls content/rag/reconstrucao-facial/
```

Expected: `.gitkeep` presente; depois será substituído pelos 2 MDs.

---

## Task 6 — Autorar `_principios-reconstrucao.md` (Kaufman Cap. 1)

**Files:**
- Create: `content/rag/reconstrucao-facial/_principios-reconstrucao.md`

> **Delegação:** este task deve ser executado via subagente Opus (vision + escrita densa). O executing-plans dispara o subagente; este plano define o prompt.

- [ ] **Step 1: Dispatch Agent (subagent_type=general-purpose, modelo Opus)**

Prompt exato para o subagente:

```
Tarefa: escrever o arquivo `content/rag/reconstrucao-facial/_principios-reconstrucao.md`
a partir de 16 PNGs renderizados do Capitulo 1 do livro Practical Facial Reconstruction
(Kaufman 2018), complementado por Neligan Vol.3 cap.1 (Anatomy of head and neck) e
Grabb & Smith 9ed onde aplicavel.

PNGs fonte (uma pagina por arquivo, sequencial): tools/_cache/kaufman_cap1/p001.png ... p016.png

Template de estrutura: content/rag/_template.md

Referencia de estilo editorial aprovado (mesmo nivel de densidade + citacao inline):
content/rag/pele-tumores/retalhos-locais-face.md

Escopo do conteudo:
- Framework das 3 perguntas de Kaufman: "O que falta? Onde acho? Como movo sem
  distorcer margens livres?"
- Unidades esteticas da face (Gonzalez-Ulloa + Burget-Menick), com subunidades e
  linhas de juncao
- Margens livres (free margins): definicao, consequencias de distorcao, lista por
  regiao (palpebra, narina, labio, ponta, helice)
- RSTL (Relaxed Skin Tension Lines) e LME (Lines of Maximum Extensibility):
  planejamento, orientacao da cicatriz final
- Biologia do retalho: plexo subdermico, angiossoma de Taylor, razao C/L
- Wound care pre-op: anti-sepsia, anestesia, hemostasia, anticoagulantes
- Execucao: tracado pre-op, planejamento de backcut, desbridamento, sutura em
  camadas, manejo de dog-ear
- Post-op e revisao de cicatriz: cronograma (2-4-6 semanas), massagem, silicone,
  Z-plastia corretiva

Regras:
- Portugues brasileiro, terminologia anatomica oficial
- Siglas com nome por extenso na primeira ocorrencia por secao (regra feedback_acronyms_expanded)
- Cada afirmacao com citacao inline: (Kaufman, 2018, cap. 1) OU (Neligan, 2023, vol.
  3, cap. 1) OU (Grabb & Smith, 2024, cap. 35)
- Imagens: marcar como `[Imagem: <nome-sem-acentos>.png]` inline onde o texto
  referenciar o desenho de planejamento de Kaufman. Nao criar PNG — apenas referencia
  textual (a curadoria dos PNGs vem em planos futuros, nao neste).
- Nao substituir o `_template.md`; USAR ele como esqueleto. Se uma secao do template
  nao se aplica (ex: "Diagnosis / Patient Presentation" para um texto de principios),
  omitir sem deixar header vazio.
- Tamanho alvo: 2000-3500 palavras (equivalente a retalhos-locais-face.md em
  densidade de citacao e cobertura)

Saida: o arquivo `.md` completo, escrito diretamente em
`content/rag/reconstrucao-facial/_principios-reconstrucao.md`.
```

- [ ] **Step 2: Revisao rapida do arquivo gerado**

```bash
wc -w content/rag/reconstrucao-facial/_principios-reconstrucao.md
head -30 content/rag/reconstrucao-facial/_principios-reconstrucao.md
grep -c "Kaufman, 2018" content/rag/reconstrucao-facial/_principios-reconstrucao.md
grep -c "Neligan, 2023" content/rag/reconstrucao-facial/_principios-reconstrucao.md
```

Expected: `wc -w` entre 2000-3500; header = `# Princípios de Reconstrução Facial...`; ≥10 citações Kaufman; ≥3 citações Neligan.

- [ ] **Step 3: Commit**

```bash
git add content/rag/reconstrucao-facial/_principios-reconstrucao.md
git rm content/rag/reconstrucao-facial/.gitkeep 2>/dev/null || true
git commit -m "feat(rag): _principios-reconstrucao.md (Kaufman cap.1 + Neligan vol.3 cap.1)"
```

---

## Task 7 — Autorar `_atlas-retalhos.md` (Kaufman Cap. 2 expandido)

**Files:**
- Create: `content/rag/reconstrucao-facial/_atlas-retalhos.md`

> **Delegação:** Opus subagente dedicado. Vision nas 20 páginas do Cap. 2.

- [ ] **Step 1: Dispatch Agent (subagent_type=general-purpose, modelo Opus)**

Prompt exato:

```
Tarefa: escrever o arquivo `content/rag/reconstrucao-facial/_atlas-retalhos.md`
a partir de 20 PNGs renderizados do Capitulo 2 do livro Practical Facial Reconstruction
(Kaufman 2018), complementado por Neligan Vol.1 cap.23 (Flap classification), Vol.3
caps. 6-10 (sub-unidade especifica para mostrar aplicacao), e Grabb & Smith 9ed.

PNGs fonte: tools/_cache/kaufman_cap2/p001.png ... p020.png

Template: content/rag/_template.md
Referencia de estilo: content/rag/pele-tumores/retalhos-locais-face.md

Estrutura exigida (cada tipo de retalho com secao proprias em nivel H3 dentro de
H2 "Treatment / Surgical Technique"):

- Primary closure (fechamento primario)
- Second intention healing
- Split-thickness skin graft (STSG)
- Full-thickness skin graft (FTSG)
- Composite graft
- Advancement flap (avanco V-Y, V-Y island, unilateral, bilateral)
- Rotation flap (simples, dupla/back-to-back, O-Z)
- Transposition flap (rhombic de Limberg, Dufourmentel)
- Bilobed flap (Esser, refinamento de Zitelli)
- Island advancement (Burow's triangle, subcutaneous pedicle)
- Interpolation flap (forehead paramediano, melolabial, retroauricular)
- Combined / multi-stage flaps

Para cada tecnica:
- Indicacao (sub-unidade, tamanho, profundidade, orientacao)
- Contraindicacao
- Planejamento geometrico (angulos, razoes C/L especificas)
- Passos (numerados)
- Complicacoes especificas
- Referencia inline para imagem de planejamento de Kaufman:
  `[Imagem: kaufman-atlas-<slug>.png]` (nao criar PNG, so referenciar)

Regras:
- Portugues brasileiro
- Siglas expandidas na primeira ocorrencia (RSTL = Relaxed Skin Tension Lines,
  STSG, FTSG, C/L = comprimento/largura, etc.)
- Citacao inline a cada afirmacao
- Tamanho alvo: 4000-6000 palavras (atlas denso, mais que principios porque lista
  12+ tecnicas com subsecoes padrao)
- Omitir secoes do template que nao se apliquem (ex: "Diagnosis" - atlas e puro
  tecnica)

Saida: arquivo `.md` completo em `content/rag/reconstrucao-facial/_atlas-retalhos.md`.
```

- [ ] **Step 2: Revisao rapida**

```bash
wc -w content/rag/reconstrucao-facial/_atlas-retalhos.md
grep -c "^### " content/rag/reconstrucao-facial/_atlas-retalhos.md
grep -c "Kaufman, 2018" content/rag/reconstrucao-facial/_atlas-retalhos.md
```

Expected: `wc -w` entre 4000-6000; ≥12 H3 (um por técnica); ≥15 citações Kaufman.

- [ ] **Step 3: Commit**

```bash
git add content/rag/reconstrucao-facial/_atlas-retalhos.md
git commit -m "feat(rag): _atlas-retalhos.md (Kaufman cap.2 expandido + cross-ref Neligan)"
```

---

## Task 8 — Regenerar índice RAG BM25

**Files:**
- Modify: `webapp/library/rag-index.json`

- [ ] **Step 1: Rodar build**

```bash
node tools/build_rag_index.js
```

Expected: log sumário, `rag-index.json` atualizado. Tamanho deve subir em ~KB proporcionais às ~7000 palavras novas.

- [ ] **Step 2: Confirmar que os novos chunks existem**

```bash
node -e "
const idx = JSON.parse(require('fs').readFileSync('webapp/library/rag-index.json', 'utf8'));
const chunks = idx.chunks || idx;
const fromHoriz = chunks.filter(c => (c.source || c.file || '').includes('reconstrucao-facial'));
console.log('chunks from reconstrucao-facial:', fromHoriz.length);
console.log('sample:', JSON.stringify(fromHoriz[0] || null, null, 2).slice(0, 400));
"
```

Expected: `chunks from reconstrucao-facial:` ≥ 6 (ambos MDs chunkados em 3+ pedaços cada). Sample mostra ID/texto/termos.

- [ ] **Step 3: Commit**

```bash
git add webapp/library/rag-index.json
git commit -m "chore(rag-index): regenerar apos horizontais Kaufman"
```

---

## Task 9 — Verificação end-to-end

- [ ] **Step 1: Estrutura + template conformance**

```bash
node -e "
const fs = require('fs');
for (const f of [
  'content/rag/reconstrucao-facial/_principios-reconstrucao.md',
  'content/rag/reconstrucao-facial/_atlas-retalhos.md',
]) {
  const c = fs.readFileSync(f, 'utf8');
  const h1 = (c.match(/^# /m) || []).length;
  const h2 = (c.match(/^## /gm) || []).length;
  const h3 = (c.match(/^### /gm) || []).length;
  const words = c.split(/\s+/).length;
  console.log(f);
  console.log('  h1:', h1, 'h2:', h2, 'h3:', h3, 'words:', words);
  const required = ['Referências Primárias', 'Synopsis', 'Introduction'];
  for (const r of required) if (!c.includes(r)) console.log('  MISSING:', r);
}
"
```

Expected: ambos com h1=1, h2≥5, palavras dentro do range. Nenhum MISSING.

- [ ] **Step 2: Smoke chat IA (manual)**

Abrir `webapp/library/index.html` no browser (dev server ou arquivo local), navegar para Chat IA e perguntar:

> "Me explique os princípios de planejamento de retalhos em reconstrução facial"

Expected: resposta cita conteúdo de `_principios-reconstrucao.md` (framework das 3 perguntas, unidades estéticas, margens livres). Se o chat usa RAG via `rag-index.json` no cliente, os chunks novos devem entrar no top-K. Capturar screenshot ou log da resposta para o PR.

- [ ] **Step 3: Validators existentes sem regressão**

```bash
node tools/validate_briefings.mjs
node tools/validate_anatomy_opener.mjs
node tools/validate_anatomy_image_purge.mjs
```

Expected: todos PASS como no estado de `master` (horizontais não tocam briefings ou PWA).

- [ ] **Step 4: Revisão manual pelo Dr. Arthur**

Pausar e pedir para o Dr. Arthur ler ambos os MDs. Se solicitar alterações: aplicar, re-rodar Task 8 (rebuild index) e repetir Step 1. Só seguir para Task 10 com OK explícito.

---

## Task 10 — Cleanup + finalize branch

- [ ] **Step 1: Apagar cache scratch**

```bash
rm -rf tools/_cache/kaufman_cap1 tools/_cache/kaufman_cap2 tools/_cache/_smoke tools/_cache/_boundary_check 2>/dev/null
ls tools/_cache/ 2>&1 | head
```

Expected: diretórios Kaufman removidos. `_cache/` ignorado por `.gitignore` logo nada pra commit.

- [ ] **Step 2: Log final**

```bash
git log --oneline origin/master..HEAD
```

Expected: ~6 commits — render tool, gitignore, principios, atlas, rag-index, eventuais fix.

- [ ] **Step 3: Atualizar memória (após merge, não no PR)**

Criar após merge `C:/Users/absay/.claude/projects/c--Users-absay-Documents-Biblioteca-CirurgiaPlastica/memory/project_phase7_3_done.md` com status CONCLUIDA + ID do PR. Adicionar linha no MEMORY.md.

- [ ] **Step 4: Push + code review + PR**

```bash
git push -u origin feature/phase-7-3-kaufman-horizontais
```

Invocar `/code-review:code-review` antes de abrir PR. Depois:

```bash
gh pr create --title "Phase 7.3: RAGs horizontais Kaufman (principios + atlas)" --body "$(cat <<'EOF'
## Summary
- Novo diretorio `content/rag/reconstrucao-facial/` com 2 RAGs horizontais:
  - `_principios-reconstrucao.md` (Kaufman cap. 1 + Neligan Vol. 3 cap. 1)
  - `_atlas-retalhos.md` (Kaufman cap. 2 expandido + cross-ref Neligan)
- Arquivos prefixados com `_` permanecem invisiveis ao `manifest.json` do PWA (zero mudanca visivel ao Dr. Arthur na biblioteca)
- Indice BM25 do Chat IA regenerado
- Novo utilitario `tools/render_pdf_pages.py` reusado nas Waves 1-3

## Fora de escopo
- Waves 1-3 (sub-unidades especificas) sao planos separados
- Nenhum card PWA criado/modificado

## Test plan
- [x] `node tools/build_rag_index.js` executado; `rag-index.json` inclui chunks dos 2 novos MDs
- [x] `node tools/validate_briefings.mjs` + `validate_anatomy_opener.mjs` + `validate_anatomy_image_purge.mjs` todos PASS
- [x] Template conformance checado (h1/h2/h3 + palavras + secoes obrigatorias)
- [x] Smoke chat IA: pergunta sobre principios puxa contexto dos novos RAGs
- [x] Revisao manual do Dr. Arthur

Spec: `docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md` (secao 3.3 + 6.3)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

- **Spec coverage §3.3:** dois arquivos horizontais com `_` prefix — coberto (Tasks 6 e 7). Citação cross-ref nas Waves vem naturalmente quando Waves forem escritas.
- **Spec coverage §6.3:** render Kaufman Cap. 1 (16 pg) + Cap. 2 (20 pg) = ~36 pg — coberto (Tasks 3, 4). Ranges PDF idx validados empiricamente: 16-31 e 32-51.
- **Spec coverage §8 (verificação horizontais):** revisão manual + chat IA smoke cobertos em Task 9 Step 2 e Step 4.
- **Placeholders scan:** cada step tem comando ou código concreto. Prompts dos subagentes completos (Tasks 6, 7). Nenhum "TBD" / "similar to Task N".
- **Type consistency:** `tools/render_pdf_pages.py` assinatura (`--pdf --start --end --dpi --output`) reusada idêntica nas Tasks 3 e 4. `content/rag/reconstrucao-facial/_<name>.md` nomenclatura consistente.
- **Risco de custo vision (Kaufman 36 pg via Opus):** ~36 Read calls com PNG 150 DPI. Estimativa: 30k-80k tokens por documento gerado. Dentro do budget §9 do spec ("100-150 chamadas vision por tema"). Logar consumo ao final do Task 6 e Task 7 para callbacks em Waves.
- **Alinhamento com CLAUDE.md:** usa `subagent-driven-development` para vision-heavy authoring; `executing-plans` gerencia orquestração; `verification-before-completion` ancora Task 9; `/code-review:code-review` antes de PR (Task 10).
- **Renumeração:** header explicita Phase 7.3 (não 7.2); memory + MEMORY.md serão atualizados pós-merge (Task 10 Step 3).
