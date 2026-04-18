# Phase 6 — Anatomy Visual Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 3 problemas de qualidade visual dos 65 anatomy cards v2 no PWA: overlays numéricos ausentes (global), mismatch imagem/card em otoplastia, duplicação visual em CPB (12→6 cards).

**Architecture:** Dois PRs sequenciais. 6A corrige conteúdo (otoplastia + CPB merge) sem mexer em schema ou renderer. 6B adiciona coordenadas `x,y` ao schema de labels, renderiza markers CSS absolutamente posicionados sobre a imagem no PWA, e popula coords nas 53 library entries via 7 subagents Haiku vision em paralelo.

**Tech Stack:** JSON (schema 2020-12 via AJV), Python 3 (scripts de batch), JavaScript vanilla (renderer PWA), CSS, Playwright (smoke tests), subagentes Claude Haiku/Sonnet (dispatch via Agent tool).

---

## PR 6A — Conteúdo (otoplastia + CPB)

### Task A1: Setup worktree 6A

**Files:**
- Create: `.worktrees/phase-6a-content/` (via `git worktree add`)

- [ ] **Step 1: Criar worktree**

```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"
git worktree add .worktrees/phase-6a-content -b feature/phase-6a-content
cd .worktrees/phase-6a-content
```

Expected: worktree criado, branch `feature/phase-6a-content` ativo.

- [ ] **Step 2: Verificar baseline**

```bash
python tools/build_image_manifest.py --check
node tools/report_pending_images.mjs --check 2>/dev/null || node tools/report_pending_images.mjs
```

Expected: comandos rodam sem erro (baseline limpo do master).

---

### Task A2: Auditar otoplastia — oto-anat-001 (Pavilhão)

**Files:**
- Read: `assets/images/otoplastia/oto-anat-pavilhao-anatomia.jpg`
- Modify (se mismatch): `content/images/otoplastia/img-auricular-landmarks-001.json`, `assets/images/otoplastia/oto-anat-pavilhao-anatomia.jpg`

- [ ] **Step 1: Read multimodal da imagem atual**

Usar o Read tool com `file_path: assets/images/otoplastia/oto-anat-pavilhao-anatomia.jpg`. Comparar conteúdo visual contra `subject` e `labels[]` da library entry:

```bash
cat content/images/otoplastia/img-auricular-landmarks-001.json
```

Expected: `subject` diz "marcos de superfície do pavilhão auricular"; labels citam hélice, anti-hélice, tragus, concha, lóbulo, crus helicis. Se a imagem mostrar isso, PASS — pular para Task A3. Senão, segue.

- [ ] **Step 2: Se mismatch — extrair figura correta do Neligan vol 3, cap. 28**

```bash
python tools/extract_figures.py \
  --pdf "00-Livros-Texto/Neligan-vol3-2023.pdf" \
  --chapter 28 \
  --outdir tools/_extract_tmp/otoplastia-ch28
```

Abrir o diretório resultante, identificar figura com marcos de superfície (hélice, tragus, etc.). Copiar para assets:

```bash
cp tools/_extract_tmp/otoplastia-ch28/fig28-<N>.jpeg assets/images/otoplastia/oto-anat-pavilhao-anatomia.jpg
```

- [ ] **Step 3: Atualizar library entry se labels mudaram**

Edit em `content/images/otoplastia/img-auricular-landmarks-001.json` ajustando `subject`, `default_caption`, `labels[]` pra refletir a nova figura. Preservar diacríticos (`hélice`, `anti-hélice`, `lóbulo`).

- [ ] **Step 4: Validar**

```bash
npx ajv validate --spec=draft2020 --strict=false -s content/images/_schema.json -d content/images/otoplastia/img-auricular-landmarks-001.json
```

Expected: valid.

- [ ] **Step 5: Commit (se algo mudou)**

```bash
git add content/images/otoplastia/img-auricular-landmarks-001.json assets/images/otoplastia/oto-anat-pavilhao-anatomia.jpg
git commit -m "fix(otoplastia): corrigir mismatch imagem/card em oto-anat-001"
```

Se o Step 1 deu PASS, nenhum commit aqui.

---

### Task A3: Auditar otoplastia — oto-anat-002 (Cartilagem Auricular)

**Files:**
- Read: `assets/images/otoplastia/oto-anat-cartilagem-deformidades.jpg`
- Modify (se mismatch): `content/images/otoplastia/img-auricular-cartilage-001.json`, `assets/images/otoplastia/oto-anat-cartilagem-deformidades.jpg`

- [ ] **Step 1: Read multimodal da imagem atual**

```bash
cat content/images/otoplastia/img-auricular-cartilage-001.json
```

Expected labels: "Cartilagem auricular — elástica", "Pericôndrio", "Anti-hélice hipoplásica", "Excesso conchal", "Lóbulo".

Usar Read tool em `assets/images/otoplastia/oto-anat-cartilagem-deformidades.jpg`. Dr. Arthur reportou que esta imagem **não** representa cartilagem auricular — espera-se mismatch aqui.

- [ ] **Step 2: Extrair figura correta**

Rodar extract_figures.py em Neligan vol 3 cap. 28 (já extraído na Task A2 Step 2 se aquela rodou; reusar). Buscar figura de dissecção/esquema da cartilagem auricular (peça única com dobras) ou de deformidades (anti-hélice hipoplásica).

Fallbacks se Neligan não serve:
- `01-Documentos-Estudo/Imagens/otoplastia/` (inbox curado)
- Grabb & Smith's 9ed cap. Otoplasty
- Kaufman *Practical Facial Reconstruction* (cap. ear)

```bash
cp <fig-escolhida> assets/images/otoplastia/oto-anat-cartilagem-deformidades.jpg
```

- [ ] **Step 3: Atualizar library entry**

Edit em `content/images/otoplastia/img-auricular-cartilage-001.json` com `subject`, `default_caption` e `labels[]` correspondentes à figura nova. Preservar diacríticos (`elástica`, `pericôndrio`, `anti-hélice`, `lóbulo`).

- [ ] **Step 4: Validar**

```bash
npx ajv validate --spec=draft2020 --strict=false -s content/images/_schema.json -d content/images/otoplastia/img-auricular-cartilage-001.json
```

Expected: valid.

- [ ] **Step 5: Commit**

```bash
git add content/images/otoplastia/img-auricular-cartilage-001.json assets/images/otoplastia/oto-anat-cartilagem-deformidades.jpg
git commit -m "fix(otoplastia): corrigir imagem de cartilagem auricular em oto-anat-002"
```

---

### Task A4: Ler os 6 pares CPB antes de fundir

**Files:**
- Read only: `content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json`

- [ ] **Step 1: Listar pares e capturar conteúdo**

```bash
python -c "
import json
d = json.load(open('content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json', encoding='utf-8'))
pairs = [('cpb-anat-001','cpb-anat-007'),('cpb-anat-002','cpb-anat-008'),
         ('cpb-anat-003','cpb-anat-009'),('cpb-anat-004','cpb-anat-010'),
         ('cpb-anat-005','cpb-anat-011'),('cpb-anat-006','cpb-anat-012')]
by_id = {c['id']:c for c in d}
for main_id, comp_id in pairs:
    print(f'=== {main_id} + {comp_id} ===')
    for k in ('one_liner','clinical_hook','how_to_identify'):
        print(f'  [{main_id}.{k}]: {by_id[main_id].get(k,\"\")[:120]}')
        print(f'  [{comp_id}.{k}]: {by_id[comp_id].get(k,\"\")[:120]}')
    print()
"
```

Expected: printout dos 6 pares lado a lado. Ler e identificar: (a) qual conteúdo é puramente duplicado, (b) qual é genuinamente complementar e deve ser preservado no merge.

---

### Task A5: Executar merge CPB (12 → 6 cards)

**Files:**
- Modify: `content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json`

- [ ] **Step 1: Para cada par, fundir manualmente via Edit**

Para cada um dos 6 pares (001+007 até 006+012), editar o arquivo `anatomia.json`:

Política de merge:
- `one_liner`: do principal; se complementar agregar, appendar uma frase.
- `structures[]`: união deduplicada (mesma estrutura → manter descrição mais completa).
- `clinical_hook`: fundir preservando ambos os ângulos num parágrafo. Se complementar foca em tema específico (ex: ramos vasculares), incorporar como subponto.
- `how_to_identify`: fundir, preservando pontos distintos.
- `images[]`: manter 1 (já é mesmo ref).
- Deletar o objeto do card complementar.

Preservar diacríticos portugueses em todo texto (`pálpebra`, `sínfise`, `fáscia`, `ressecção`, `monte púbico`, `pós-bariátrico`).

- [ ] **Step 2: Verificar contagem**

```bash
python -c "
import json
d = json.load(open('content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json', encoding='utf-8'))
print('total:', len(d))
print('ids:', [c['id'] for c in d])
"
```

Expected: `total: 6`, ids são `cpb-anat-001..006` (sem 007..012).

- [ ] **Step 3: Validar**

```bash
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json
python tools/lint_acronyms.py
```

Expected: AJV valid; lint_acronyms sem warnings em CPB.

- [ ] **Step 4: Commit**

```bash
git add content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json
git commit -m "refactor(cpb): fundir 6 pares principal+complementar em 6 cards consolidados"
```

---

### Task A6: Regenerar manifest, pending, SW bump

**Files:**
- Regenerate: `content/images/manifest.json`, `content/cards/_pending_images.md`
- Modify: `webapp/library/sw.js`

- [ ] **Step 1: Regenerar manifest**

```bash
python tools/build_image_manifest.py
```

Expected: `content/images/manifest.json` atualizado (se labels mudaram em otoplastia, o manifest reflete).

- [ ] **Step 2: Regenerar pending report**

```bash
node tools/report_pending_images.mjs
```

Expected: `content/cards/_pending_images.md` atualizado. Total pending = 2 residuais conhecidos (abdo-anat-005 + rino-anat-011) — não piorar.

- [ ] **Step 3: Bump SW cache v22 → v23**

Edit em `webapp/library/sw.js`, linha 1:

```javascript
const CACHE_NAME = 'briefing-preop-v23';
```

Expected: só linha 1 muda.

- [ ] **Step 4: Smoke test Playwright**

```bash
npx node tools/validate_briefings.mjs --tema otoplastia
npx node tools/validate_briefings.mjs --tema contorno-pos-bariatrico
```

Expected: nenhum 404 no console; imagens carregam; CPB mostra 6 cards (não 12).

- [ ] **Step 5: Commit**

```bash
git add content/images/manifest.json content/cards/_pending_images.md webapp/library/sw.js
git commit -m "chore(phase-6a): regen manifest + pending, SW v22->v23"
```

---

### Task A7: Abrir PR 6A, review, merge

**Files:** no file changes; repo-level operations.

- [ ] **Step 1: Push branch**

```bash
git push -u origin feature/phase-6a-content
```

- [ ] **Step 2: Abrir PR**

```bash
gh pr create --title "feat(phase-6a): conteudo - otoplastia fix + CPB merge 12->6" --body "$(cat <<'EOF'
## Phase 6A — Conteudo

### Otoplastia
- `oto-anat-001` (Pavilhao) — auditoria/correcao conforme mismatch encontrado
- `oto-anat-002` (Cartilagem Auricular) — imagem corrigida (Dr. Arthur reportou que nao representava cartilagem)

### CPB merge 12 -> 6
- 6 pares principal+complementar fundidos em 6 cards consolidados preservando texto rico de ambos
- 1 imagem por card (antes duplicada)

### Verificacoes
- [x] AJV valid (otoplastia + CPB)
- [x] lint_acronyms sem warnings
- [x] manifest regenerado
- [x] pending report: 2 residuais (abdo-anat-005 + rino-anat-011) mantidos
- [x] Playwright smoke test OK
- [x] SW cache v22 -> v23

## Test plan
- [ ] Abrir briefing otoplastia no PWA — imagens batem com cards
- [ ] Abrir briefing CPB — 6 cards (nao 12), 1 imagem cada, texto rico

Gerado com Claude Code
EOF
)"
```

- [ ] **Step 3: Aguardar aprovação, rodar code-review, mergear**

```bash
/code-review:code-review
```

Após aprovação do Dr. Arthur:

```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"  # voltar ao repo principal
gh pr merge <PR-NUM> --merge --delete-branch
```

Expected: merge sucesso; branch remota deletada. Se falhar delete de branch local por causa do worktree: ignorar, será resolvido na Task A8.

---

### Task A8: Cleanup worktree 6A

**Files:** no file changes.

- [ ] **Step 1: Voltar ao repo principal**

```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"
git checkout master
git pull origin master
```

- [ ] **Step 2: Remover worktree e branch local**

```bash
git worktree remove .worktrees/phase-6a-content
git branch -d feature/phase-6a-content
```

Expected: worktree removido, branch deletada. Se `-d` reclamar que não está merged (raro após PR merge), usar `-D` com cuidado.

---

## PR 6B — Overlays runtime (infra visual)

### Task B1: Setup worktree 6B

**Files:**
- Create: `.worktrees/phase-6b-overlays/`

- [ ] **Step 1: Criar worktree**

```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"
git worktree add .worktrees/phase-6b-overlays -b feature/phase-6b-overlays
cd .worktrees/phase-6b-overlays
```

Expected: worktree criado com master atualizado (pós-6A merge).

---

### Task B2: Atualizar schema de labels (x,y opcionais)

**Files:**
- Modify: `content/images/_schema.json:17-29`

- [ ] **Step 1: Edit schema**

Edit em `content/images/_schema.json`, substituir o bloco `labels.items.properties`:

```json
    "labels": {
      "type": "array",
      "default": [],
      "items": {
        "type": "object",
        "required": ["num", "text"],
        "additionalProperties": false,
        "properties": {
          "num": { "type": "integer", "minimum": 1, "maximum": 99 },
          "text": { "type": "string", "minLength": 2, "maxLength": 200 },
          "x": { "type": "number", "minimum": 0, "maximum": 1 },
          "y": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    },
```

Apenas `x` e `y` adicionados ao bloco `properties`; `required` continua `["num","text"]` (coords opcionais).

- [ ] **Step 2: Validar schema contra entries existentes**

```bash
for f in content/images/*/img-*.json; do
  npx ajv validate --spec=draft2020 --strict=false -s content/images/_schema.json -d "$f" 2>&1 | grep -v "valid$" || true
done
```

Expected: nenhuma saída (ou só "valid" em todas). Back-compat preservada.

- [ ] **Step 3: Commit**

```bash
git add content/images/_schema.json
git commit -m "feat(schema): labels.x and labels.y optional (0..1) for runtime overlays"
```

---

### Task B3: Criar script `tools/apply_label_coords.py`

**Files:**
- Create: `tools/apply_label_coords.py`

- [ ] **Step 1: Escrever o script**

```python
#!/usr/bin/env python3
"""apply_label_coords.py — aplica coords (x,y) em library entries a partir de JSON batch.

Input: JSON no formato
  [{"image_id": "img-foo-001", "num": 1, "x": 0.42, "y": 0.38}, ...]

Edita in-place cada content/images/<tema>/<image_id>.json,
inserindo x e y no label com `num` correspondente.
"""
import json
import sys
from pathlib import Path

def apply(coords_path: Path, images_root: Path) -> None:
    coords = json.loads(coords_path.read_text(encoding="utf-8"))
    by_image: dict[str, list[dict]] = {}
    for c in coords:
        by_image.setdefault(c["image_id"], []).append(c)

    applied = 0
    skipped = 0
    for image_id, entries in by_image.items():
        # Localiza arquivo pelo id (tema inferido pela estrutura de pastas)
        matches = list(images_root.glob(f"*/{image_id}.json"))
        if not matches:
            print(f"[skip] {image_id}: file not found", file=sys.stderr)
            skipped += len(entries)
            continue
        target = matches[0]
        data = json.loads(target.read_text(encoding="utf-8"))
        by_num = {lbl["num"]: lbl for lbl in data.get("labels", [])}
        for c in entries:
            lbl = by_num.get(c["num"])
            if lbl is None:
                print(f"[skip] {image_id}.{c['num']}: label num not found", file=sys.stderr)
                skipped += 1
                continue
            lbl["x"] = round(float(c["x"]), 3)
            lbl["y"] = round(float(c["y"]), 3)
            applied += 1
        target.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(f"applied={applied} skipped={skipped}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: apply_label_coords.py <coords.json>", file=sys.stderr)
        sys.exit(2)
    apply(Path(sys.argv[1]), Path("content/images"))
```

- [ ] **Step 2: Smoke test do script com input vazio**

```bash
echo '[]' > /tmp/empty_coords.json
python tools/apply_label_coords.py /tmp/empty_coords.json
```

Expected: `applied=0 skipped=0`. Nenhum arquivo alterado.

- [ ] **Step 3: Smoke test com 1 coord real**

```bash
echo '[{"image_id":"img-auricular-cartilage-001","num":1,"x":0.5,"y":0.5}]' > /tmp/test_coord.json
python tools/apply_label_coords.py /tmp/test_coord.json
git diff content/images/otoplastia/img-auricular-cartilage-001.json
```

Expected: diff mostra `"x": 0.5, "y": 0.5` adicionados ao label num=1.

- [ ] **Step 4: Reverter smoke test**

```bash
git checkout -- content/images/otoplastia/img-auricular-cartilage-001.json
```

- [ ] **Step 5: Commit**

```bash
git add tools/apply_label_coords.py
git commit -m "feat(tools): apply_label_coords.py — batch insert of label x,y"
```

---

### Task B4: Produzir coords via 7 subagents Haiku vision (paralelo)

**Files:**
- Create: `tools/_coords/<tema>.json` (7 arquivos temporários, não commitados)

- [ ] **Step 1: Dispatch 7 subagents em paralelo (single message, 7 Agent tool calls)**

Cada subagente recebe o seguinte prompt (substituir `<TEMA>` pelo nome do tema). Um Agent call por tema, todos em paralelo no mesmo message:

```
Você é um especialista em localização de estruturas anatômicas em imagens médicas. Tema: <TEMA>.

TAREFA:
Para cada library entry em `content/images/<TEMA>/img-*.json`, abrir a imagem
referenciada (`assets/images/` + entry.file) via Read multimodal e, para cada
label em `entry.labels[]`, determinar a coordenada (x, y) do CENTRO da estrutura
mencionada em `label.text`, onde x e y são frações (0.0–1.0) da largura e altura
da imagem respectivamente.

- x = 0: borda esquerda. x = 1: borda direita.
- y = 0: borda superior. y = 1: borda inferior.
- Ponto (0.5, 0.5) = centro geométrico da imagem.
- Se a estrutura abrange várias regiões, usar o centroide da região principal.
- Se a estrutura citada não for visível na imagem (ex: label descreve conceito,
  não ponto visual concreto), OMITIR essa entrada.

FORMATO DE SAÍDA:
Retornar JSON estrito (sem prosa) no formato:
```json
[
  {"image_id": "img-foo-001", "num": 1, "x": 0.42, "y": 0.38},
  {"image_id": "img-foo-001", "num": 2, "x": 0.60, "y": 0.55},
  ...
]
```

EXEMPLO calibrado (orelha em vista lateral, imagem com hélice em cima e lóbulo
embaixo):
- "Hélice — borda cartilaginosa superior" → x=0.55, y=0.15
- "Lóbulo — tecido fibroadiposo inferior" → x=0.50, y=0.90

ESCOPO DO SEU JOB: somente `content/images/<TEMA>/`. Ignorar outros temas.

Salvar o JSON final em `tools/_coords/<TEMA>.json` via Write (pasta será criada
se não existir). Não commitar. Reportar em 1 linha: "N coords produzidas em M labels
(P skipped)".
```

Temas (substituir `<TEMA>` em cada call):
- abdominoplastia
- blefaroplastia
- contorno-pos-bariatrico
- gluteoplastia
- lipoaspiracao
- otoplastia
- rinoplastia
- ritidoplastia

Total = 8 subagents (não 7; contei errado antes — confirme `ls content/images/`).

- [ ] **Step 2: Garantir pasta de saída**

```bash
mkdir -p tools/_coords
```

- [ ] **Step 3: Após todos subagentes retornarem, conferir arquivos**

```bash
ls tools/_coords/
wc -l tools/_coords/*.json
```

Expected: 8 arquivos JSON, cada com 20-100 coords.

---

### Task B5: Aplicar coords nas 53 library entries

**Files:**
- Modify: `content/images/<tema>/img-*.json` (~53 arquivos)

- [ ] **Step 1: Merger arquivos de coord**

```bash
python -c "
import json, glob, pathlib
all_coords = []
for f in sorted(glob.glob('tools/_coords/*.json')):
    all_coords.extend(json.loads(pathlib.Path(f).read_text(encoding='utf-8')))
pathlib.Path('tools/_coords/all.json').write_text(
    json.dumps(all_coords, indent=2, ensure_ascii=False),
    encoding='utf-8'
)
print('total coords:', len(all_coords))
"
```

Expected: "total coords: ~250" (53 imagens × ~5 labels).

- [ ] **Step 2: Aplicar**

```bash
python tools/apply_label_coords.py tools/_coords/all.json
```

Expected: `applied=~250 skipped=<pequeno>`.

- [ ] **Step 3: Validar que entries continuam válidas**

```bash
for f in content/images/*/img-*.json; do
  npx ajv validate --spec=draft2020 --strict=false -s content/images/_schema.json -d "$f" 2>&1 | grep -v "valid$" || true
done
```

Expected: nenhuma saída de erro.

- [ ] **Step 4: Commit**

```bash
git add content/images/
git commit -m "feat(images): populate x,y coords in 53 library entries via Haiku vision"
```

---

### Task B6: Renderer — overlay markers

**Files:**
- Modify: `webapp/library/renderer.js:117-140`

- [ ] **Step 1: Substituir função `_libraryImages`**

Edit em `webapp/library/renderer.js`, substituir linhas 117-140:

```javascript
  function _libraryImages(card) {
    const items = card.images || [];
    if (items.length === 0) return '';
    return items.map(item => {
      const entry = _resolveImageRef(item.ref);
      if (!entry) {
        return `<figure class="card-figure placeholder"><figcaption>Imagem pendente: ${item.ref}</figcaption></figure>`;
      }
      const src = '../../assets/images/' + entry.file;
      const caption = item.caption_override || entry.default_caption;
      const rawLabels = entry.labels || [];
      const markers = rawLabels
        .filter(l => typeof l.x === 'number' && typeof l.y === 'number')
        .map(l => `<span class="fig-marker" style="left:${(l.x * 100).toFixed(2)}%;top:${(l.y * 100).toFixed(2)}%">${l.num}</span>`)
        .join('');
      const legendItems = rawLabels.map(l =>
        `<span class="legend-item"><span class="legend-num">${l.num}</span>${_formatText(l.text)}</span>`
      ).join('');
      const legend = legendItems ? `<div class="fig-legend">${legendItems}</div>` : '';
      return `<figure class="card-figure">
        <div class="fig-container">
          <img src="${src}" alt="${caption}" loading="lazy">
          ${markers}
        </div>
        <figcaption>
          <span class="caption">${caption}</span>
          <span class="credit">${entry.credit}</span>
        </figcaption>
        ${legend}
      </figure>`;
    }).join('');
  }
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/renderer.js
git commit -m "feat(renderer): overlay numeric markers on anatomy figures via CSS absolute"
```

---

### Task B7: CSS — `.fig-container` + `.fig-marker`

**Files:**
- Modify: `webapp/library/style.css` (append bloco)

- [ ] **Step 1: Append CSS**

Adicionar ao final de `webapp/library/style.css`:

```css
/* Phase 6B — runtime overlay markers */
.fig-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
}
.fig-container img {
  display: block;
  width: 100%;
  height: auto;
}
.fig-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  font-family: var(--font-sans);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/style.css
git commit -m "feat(style): .fig-container + .fig-marker for overlay markers"
```

---

### Task B8: Smoke test Playwright + correção manual

**Files:**
- Create (screenshots temporários): `tools/_screenshots/phase-6b/<tema>.png`
- Modify (conforme achados): `content/images/<tema>/img-*.json` (ajustes inline)

- [ ] **Step 1: Rodar smoke test em cada tema**

```bash
mkdir -p tools/_screenshots/phase-6b
for tema in abdominoplastia blefaroplastia contorno-pos-bariatrico gluteoplastia lipoaspiracao otoplastia rinoplastia ritidoplastia; do
  npx node tools/validate_briefings.mjs --tema "$tema" --screenshot "tools/_screenshots/phase-6b/$tema.png" --eager
done
```

Expected: 8 PNGs gerados, sem 404 no console.

- [ ] **Step 2: Revisão visual**

Abrir cada PNG em `tools/_screenshots/phase-6b/`. Checar:
- Markers aparecem sobre as estruturas (não fora da imagem).
- Nenhum marker no canto 0,0 (indica coord não populada ou x=0/y=0 errado).
- Números correspondem aos da legenda abaixo.

Para cada marker fora de lugar, identificar `image_id` + `num` + coord correta (olhando a figura). Anotar numa lista.

- [ ] **Step 3: Corrigir coords inline**

Para cada correção, Edit direto na library entry ajustando `x` e `y`. Reprocessar screenshot daquele tema.

- [ ] **Step 4: Commit das correções (se houver)**

```bash
git add content/images/
git commit -m "fix(overlays): reposicionar markers fora de lugar pós-Haiku"
```

---

### Task B9: Regenerar manifest + SW bump + validate briefings

**Files:**
- Regenerate: `content/images/manifest.json`
- Modify: `webapp/library/sw.js:1`

- [ ] **Step 1: Regenerar manifest**

```bash
python tools/build_image_manifest.py
```

Expected: manifest.json atualizado incluindo x,y nas entries.

- [ ] **Step 2: Bump SW cache v23 → v24**

Edit em `webapp/library/sw.js:1`:

```javascript
const CACHE_NAME = 'briefing-preop-v24';
```

- [ ] **Step 3: Validar**

```bash
npx node tools/validate_briefings.mjs
```

Expected: todos os briefings carregam sem 404.

- [ ] **Step 4: Commit**

```bash
git add content/images/manifest.json webapp/library/sw.js
git commit -m "chore(phase-6b): regen manifest + SW v23->v24"
```

---

### Task B10: Abrir PR 6B, review, merge

**Files:** no file changes.

- [ ] **Step 1: Push**

```bash
git push -u origin feature/phase-6b-overlays
```

- [ ] **Step 2: Abrir PR**

```bash
gh pr create --title "feat(phase-6b): runtime numeric overlays on anatomy figures" --body "$(cat <<'EOF'
## Phase 6B — Overlays runtime

### Schema
- labels.x e labels.y opcionais (floats 0..1) em `content/images/_schema.json`

### Dados
- 53 library entries populadas com x,y via 8 subagentes Haiku vision em paralelo
- Correcoes manuais pos-review visual onde Haiku errou

### Renderer + CSS
- `_libraryImages()` emite `<div class="fig-container">` com `<span class="fig-marker">` absolutos
- CSS: circulo preto com borda branca, 24x24, centralizado em (x,y) via translate(-50%,-50%)
- Fallback: labels sem x,y nao geram marker (so sidebar)

### Verificacoes
- [x] AJV valid (schema + 53 entries)
- [x] 8 smoke tests Playwright OK
- [x] Screenshots revisadas visualmente
- [x] SW cache v23 -> v24

## Test plan
- [ ] Abrir briefing de cada tema no PWA iPhone
- [ ] Confirmar que numeros aparecem SOBRE as estruturas (nao so na legenda)
- [ ] Confirmar que numeros batem com a legenda numerada abaixo

Gerado com Claude Code
EOF
)"
```

- [ ] **Step 3: Code review + merge**

```bash
/code-review:code-review
```

Após aprovação:

```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"
gh pr merge <PR-NUM> --merge --delete-branch
```

---

### Task B11: Cleanup worktree 6B + memória

**Files:**
- Create: `C:\Users\absay\.claude\projects\c--Users-absay-Documents-Biblioteca-CirurgiaPlastica\memory\project_phase6_done.md`
- Modify: `C:\Users\absay\.claude\projects\c--Users-absay-Documents-Biblioteca-CirurgiaPlastica\memory\MEMORY.md`

- [ ] **Step 1: Cleanup**

```bash
cd "c:/Users/absay/Documents/Biblioteca-CirurgiaPlastica"
git checkout master
git pull origin master
git worktree remove .worktrees/phase-6b-overlays
git branch -d feature/phase-6b-overlays
```

Expected: tudo limpo, master atualizado com 6A + 6B.

- [ ] **Step 2: Criar memória de conclusão**

Write em `C:\Users\absay\.claude\projects\c--Users-absay-Documents-Biblioteca-CirurgiaPlastica\memory\project_phase6_done.md`:

```markdown
---
name: Phase 6 Qualidade Visual Anatomia v2 CONCLUIDA
description: 2026-04-18 PRs 6A (otoplastia + CPB merge 12->6) + 6B (runtime numeric overlays) mergeados; SW v24
type: project
---

# Phase 6 — Qualidade Visual Anatomia v2 CONCLUIDA

PR 6A mergeado — otoplastia mismatch corrigido (oto-anat-001 + oto-anat-002); CPB fundido de 12 para 6 cards preservando texto rico de ambos os pares.
PR 6B mergeado — schema labels ganhou x,y opcionais; 53 library entries populadas via 8 subagents Haiku vision; renderer emite markers CSS absolutos sobre as figuras; correcoes manuais pos-review visual.

**Why:** Dr. Arthur reportou 3 problemas consumindo o PWA: legendas numeradas sem numeros na imagem (global), foto errada em cartilagem auricular (otoplastia), duplicacao visual em CPB (mesma imagem em 2 cards por estrutura).
**How to apply:** anatomia v2 agora com qualidade visual completa. Proximo: Phase 7 (reconstrucao facial por sub-unidade, Kaufman).
```

- [ ] **Step 3: Atualizar MEMORY.md**

Edit em `MEMORY.md`, adicionar após a linha de débito Phase 6:

```markdown
- [Phase 6 Qualidade Visual CONCLUIDA](project_phase6_done.md) — 2026-04-18 PRs 6A + 6B mergeados; otoplastia + CPB + overlays resolvidos; SW v24
```

Também marcar como obsoleta a memória `feedback_image_numeric_overlays_required` → renomear descrição ou deixar (a regra continua válida: toda imagem com labels precisa x,y).

---

## Arquivos críticos (resumo)

| Arquivo | PR | Tarefas |
|---|---|---|
| `content/cards/estetica-facial/otoplastia/anatomia.json` | 6A | A2, A3 |
| `content/images/otoplastia/img-*.json` | 6A | A2, A3 |
| `assets/images/otoplastia/*.jpg` | 6A | A2, A3 |
| `content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json` | 6A | A4, A5 |
| `content/images/_schema.json` | 6B | B2 |
| `tools/apply_label_coords.py` (novo) | 6B | B3 |
| `tools/_coords/*.json` (temp) | 6B | B4 |
| `content/images/<tema>/img-*.json` (x53) | 6B | B5, B8 |
| `webapp/library/renderer.js` | 6B | B6 |
| `webapp/library/style.css` | 6B | B7 |
| `content/images/manifest.json` | 6A + 6B | A6, B9 |
| `content/cards/_pending_images.md` | 6A | A6 |
| `webapp/library/sw.js` | 6A + 6B | A6, B9 |

---

## Verificação end-to-end

Após ambos PRs mergeados, abrir o PWA no iPhone (ou simulador mobile viewport) e:

1. Home → Briefings → cada um dos 8 temas → scroll até seção Anatomia.
2. Confirmar que cada figura mostra círculos pretos numerados sobre as estruturas.
3. Confirmar que os números batem com a legenda numerada abaixo da figura.
4. Otoplastia: card de Cartilagem Auricular mostra cartilagem (não pavilhão externo).
5. CPB: 6 cards, cada um com 1 imagem, texto mais rico do que antes.
6. Nenhum 404 de imagem no console.
