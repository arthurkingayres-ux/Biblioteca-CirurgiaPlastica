# Card Uniformity Fase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Executar Fase 3 do plano card-uniformity (piloto abdominoplastia anatomia end-to-end em v2), precedida por PR de tooling hardening que resolve dois itens não-bloqueantes e introduz pipeline de anotação via Haiku + PIL.

**Architecture:** Dois PRs sequenciais. PR #1 landa infra pura (annotate_figure.py, testes, _structure.json alignment, validate_briefings.mjs com gate duro + soft warning). PR #2 usa o tooling para extrair figuras do Neligan vol.2 cap.27 (pp. 930-972), anotar via Haiku subagent, escrever 6 library entries, migrar anatomia.json para v2, limpar órfãos.

**Tech Stack:** Python 3 + Pillow (annotate_figure), pytest (testes unitários), Node.js + Playwright (validate_briefings), PyMuPDF (extract_figures), ajv-cli v5 com `--spec=draft2020` (validação JSON Schema), Agent tool com `model=haiku` (identificação de coordenadas de estruturas em imagens).

**Specs:** `docs/superpowers/specs/2026-04-17-card-uniformity-phase-3-design.md`
**Plano pai:** `docs/superpowers/plans/2026-04-16-card-uniformity-anatomy-pilot.md`

---

## File Structure

**PR #1 — Tooling hardening:**

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `tools/annotate_figure.py` | Create | CLI: desenhar círculos numerados em imagem a partir de JSON de coords |
| `tools/tests/test_annotate_figure.py` | Create | 3 testes pytest do annotator (no-op, coord válida, clamp) |
| `content/cards/_structure.json` | Modify | Alinhar `anatomy.purpose` + `required_fields` com exemplo v2 |
| `tools/validate_briefings.mjs` | Modify | Adicionar abdominoplastia a TOPICS; gate duro de `.card-figure.placeholder === 0`; soft warning de `EXPECTED_IMAGE_COUNTS` |

**PR #2 — Piloto abdominoplastia:**

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `assets/images/abdominoplastia/huger-zones-overview.png` | Create | Figura 1 (Zonas Huger) extraída + anotada |
| `assets/images/abdominoplastia/abdominal-layers-schematic.png` | Create | Figura 2 (Camadas) extraída + anotada |
| `assets/images/abdominoplastia/umbilicus-pedicle.png` | Create | Figura 3 (Umbigo) extraída + anotada |
| `assets/images/abdominoplastia/scarpa-lymphatics.png` | Create | Figura 4 (Scarpa + linfáticos) extraída + anotada |
| `assets/images/abdominoplastia/aesthetic-subunits-female.png` | Create | Figura 5 (Unidades estéticas) extraída + anotada |
| `assets/images/abdominoplastia/lateral-perforators-surgical.png` | Create | Figura 6 (Perfuradores laterais) extraída + anotada |
| `content/images/abdominoplastia/img-*-001.json` (×6) | Create | Library entries (6), uma por figura |
| `content/images/manifest.json` | Regenerate | Aggregator output (6 entries) |
| `content/cards/contorno-corporal/abdominoplastia/anatomia.json` | Rewrite | 6 cards em shape v2 (one_liner, structures, clinical_hook, images por ref) |
| `tools/validate_briefings.mjs` | Modify | `abdominoplastia: null` → `abdominoplastia: 6` em `EXPECTED_IMAGE_COUNTS` |
| `assets/images/abdominoplastia/abdo-anat-*.jpg` | Delete | Imagens legacy órfãs (identificadas via `audit_images.py`) |

---

## PR #1 — Tooling hardening

### Task 1.1: Branch setup

**Files:** (nenhum)

- [ ] **Step 1: Criar branch de feature**

```bash
git checkout master
git pull origin master
git checkout -b feature/card-uniformity-phase-3-tooling
```

Expected: branch `feature/card-uniformity-phase-3-tooling` criado a partir de master limpo.

---

### Task 1.2: Alinhar `_structure.json` anatomy (purpose + required_fields)

**Files:**
- Modify: `content/cards/_structure.json:24-26`

- [ ] **Step 1: Editar o bloco anatomy**

Em `content/cards/_structure.json`, localizar as linhas:

```json
"anatomy": {
  "purpose": "1 card por estrutura anatomica — landmarks, relevancia cirurgica, como identificar",
  "required_fields": ["id", "type", "title", "topic", "area", "definition", "location", "surgical_relevance"],
```

Substituir por:

```json
"anatomy": {
  "purpose": "1 card por estrutura anatomica — one-liner clinico, tabela de estruturas, hook cirurgico (schema v2)",
  "required_fields": ["id", "type", "title", "topic", "area", "one_liner", "structures", "clinical_hook"],
```

Não alterar o bloco `example` (já está em v2).

- [ ] **Step 2: Validar que o JSON segue válido**

Run: `python -c "import json; json.load(open('content/cards/_structure.json', encoding='utf-8')); print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add content/cards/_structure.json
git commit -m "docs(cards): align _structure.json anatomy purpose/required_fields with v2 example"
```

---

### Task 1.3: Escrever teste 1 (no-op) para annotate_figure

**Files:**
- Create: `tools/tests/test_annotate_figure.py`

- [ ] **Step 1: Criar arquivo de teste com um caso**

```python
import json
from pathlib import Path

import pytest
from PIL import Image

from tools import annotate_figure


def _make_white_png(path: Path, size: tuple[int, int] = (200, 200)) -> None:
    img = Image.new("RGB", size, color=(255, 255, 255))
    img.save(path)


def test_empty_coords_is_noop(tmp_path):
    src = tmp_path / "in.png"
    out = tmp_path / "out.png"
    coords = tmp_path / "coords.json"
    _make_white_png(src)
    coords.write_text("[]", encoding="utf-8")

    annotate_figure.annotate(src, coords, out)

    src_bytes = src.read_bytes()
    out_bytes = out.read_bytes()
    # Pillow may re-encode, so compare pixel content instead of bytes.
    src_img = Image.open(src).convert("RGB")
    out_img = Image.open(out).convert("RGB")
    assert list(src_img.getdata()) == list(out_img.getdata())
```

- [ ] **Step 2: Rodar o teste para garantir que falha**

Run: `python -m pytest tools/tests/test_annotate_figure.py -v`
Expected: `ImportError: cannot import name 'annotate_figure'` ou `ModuleNotFoundError` — o módulo ainda não existe.

---

### Task 1.4: Implementação mínima do annotate_figure (passa teste 1)

**Files:**
- Create: `tools/annotate_figure.py`

- [ ] **Step 1: Escrever implementação mínima**

```python
#!/usr/bin/env python3
"""
tools/annotate_figure.py — Desenha círculos numerados sobre uma imagem.

Uso CLI:
  python tools/annotate_figure.py \
    --image X.png --coords coords.json --out Y.png \
    [--radius 18] [--stroke 1.5] [--font-size 16]

coords.json = [{ "num": int, "x": float 0-1, "y": float 0-1 }, ...]
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

log = logging.getLogger(__name__)


def _load_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size=size)
    except OSError:
        return ImageFont.load_default()


def annotate(
    image_path: Path,
    coords_path: Path,
    out_path: Path,
    radius: int = 18,
    stroke: float = 1.5,
    font_size: int = 16,
) -> None:
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    coords = json.loads(Path(coords_path).read_text(encoding="utf-8"))

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = _load_font(font_size)

    for entry in coords:
        nx = float(entry["x"])
        ny = float(entry["y"])
        num = int(entry["num"])
        clamped_x = max(0.0, min(1.0, nx))
        clamped_y = max(0.0, min(1.0, ny))
        if clamped_x != nx or clamped_y != ny:
            log.warning("coord %s clamped from (%s,%s) to (%s,%s)", num, nx, ny, clamped_x, clamped_y)
        px = int(round(clamped_x * w))
        py = int(round(clamped_y * h))
        bbox = [px - radius, py - radius, px + radius, py + radius]
        draw.ellipse(bbox, fill=(0, 0, 0, 255), outline=(255, 255, 255, 255), width=max(1, int(round(stroke))))
        text = str(num)
        tbbox = draw.textbbox((0, 0), text, font=font)
        tw = tbbox[2] - tbbox[0]
        th = tbbox[3] - tbbox[1]
        draw.text((px - tw / 2, py - th / 2 - tbbox[1]), text, fill=(255, 255, 255, 255), font=font)

    merged = Image.alpha_composite(img, overlay)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.suffix.lower() in (".jpg", ".jpeg"):
        merged.convert("RGB").save(out_path, quality=90)
    else:
        merged.save(out_path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--coords", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--radius", type=int, default=18)
    parser.add_argument("--stroke", type=float, default=1.5)
    parser.add_argument("--font-size", type=int, default=16)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.WARNING)
    annotate(args.image, args.coords, args.out, args.radius, args.stroke, args.font_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Rodar o teste 1 para confirmar que passa**

Run: `python -m pytest tools/tests/test_annotate_figure.py::test_empty_coords_is_noop -v`
Expected: 1 PASS.

---

### Task 1.5: Teste 2 (coord válida desenha círculo)

**Files:**
- Modify: `tools/tests/test_annotate_figure.py`

- [ ] **Step 1: Acrescentar segundo teste**

Adicionar ao fim do arquivo:

```python
def test_center_coord_draws_black_pixel(tmp_path):
    src = tmp_path / "in.png"
    out = tmp_path / "out.png"
    coords = tmp_path / "coords.json"
    _make_white_png(src, size=(200, 200))
    coords.write_text(json.dumps([{"num": 1, "x": 0.5, "y": 0.5}]), encoding="utf-8")

    annotate_figure.annotate(src, coords, out)

    out_img = Image.open(out).convert("RGB")
    # Inside the circle, most pixels are black-ish; the exact center can be
    # covered by the white numeric glyph, so sample an offset point that is
    # within the circle but outside the text.
    probe = out_img.getpixel((100 - 8, 100 - 8))
    assert max(probe) < 80, f"expected near-black, got {probe}"
```

- [ ] **Step 2: Rodar testes**

Run: `python -m pytest tools/tests/test_annotate_figure.py -v`
Expected: 2 PASS.

---

### Task 1.6: Teste 3 (clamp de coord fora de [0,1])

**Files:**
- Modify: `tools/tests/test_annotate_figure.py`

- [ ] **Step 1: Acrescentar terceiro teste**

Adicionar ao fim do arquivo:

```python
def test_out_of_range_coord_is_clamped_and_warns(tmp_path, caplog):
    src = tmp_path / "in.png"
    out = tmp_path / "out.png"
    coords = tmp_path / "coords.json"
    _make_white_png(src, size=(200, 200))
    coords.write_text(json.dumps([{"num": 1, "x": 1.5, "y": -0.2}]), encoding="utf-8")

    with caplog.at_level("WARNING", logger="tools.annotate_figure"):
        annotate_figure.annotate(src, coords, out)

    assert any("clamped" in rec.message for rec in caplog.records)
    # The circle should have landed near (200, 0) — clamped corner.
    out_img = Image.open(out).convert("RGB")
    probe = out_img.getpixel((199, 0))
    assert max(probe) < 120, f"expected dark pixel near clamp, got {probe}"
```

- [ ] **Step 2: Rodar os três testes**

Run: `python -m pytest tools/tests/test_annotate_figure.py -v`
Expected: 3 PASS.

- [ ] **Step 3: Commit**

```bash
git add tools/annotate_figure.py tools/tests/test_annotate_figure.py
git commit -m "feat(tools): add annotate_figure.py with numbered-callout renderer + 3 tests"
```

---

### Task 1.7: Adicionar abdominoplastia a `TOPICS` e coletar `placeholders`

**Files:**
- Modify: `tools/validate_briefings.mjs:9`
- Modify: `tools/validate_briefings.mjs:56-71` (bloco `page.evaluate` dentro de `validateTopic`)

- [ ] **Step 1: Atualizar TOPICS**

Localizar a linha 9:

```javascript
const TOPICS = ['lipoaspiracao', 'gluteoplastia', 'contorno-pos-bariatrico', 'otoplastia'];
```

Substituir por:

```javascript
const TOPICS = ['lipoaspiracao', 'gluteoplastia', 'contorno-pos-bariatrico', 'otoplastia', 'abdominoplastia'];

const EXPECTED_IMAGE_COUNTS = {
  lipoaspiracao: null,
  gluteoplastia: null,
  'contorno-pos-bariatrico': null,
  otoplastia: null,
  abdominoplastia: null, // flipa para 6 no PR #2
};
```

- [ ] **Step 2: Coletar placeholders no `page.evaluate`**

Dentro de `validateTopic`, no bloco `page.evaluate` (linhas 56-71), localizar:

```javascript
    const heroCount = document.querySelectorAll('.briefing-hero .role-hero').length;
    const badgeTypes = [...new Set(Array.from(document.querySelectorAll('.card-badge')).map(b => [...b.classList].find(c => c.startsWith('badge-'))))];
    return { total: imgs.length, broken, theme, bodyBg, heroCount, badgeTypes };
```

Substituir por:

```javascript
    const heroCount = document.querySelectorAll('.briefing-hero .role-hero').length;
    const badgeTypes = [...new Set(Array.from(document.querySelectorAll('.card-badge')).map(b => [...b.classList].find(c => c.startsWith('badge-'))))];
    const placeholders = document.querySelectorAll('.card-figure.placeholder').length;
    return { total: imgs.length, broken, theme, bodyBg, heroCount, badgeTypes, placeholders };
```

- [ ] **Step 3: Atualizar verdict + logs**

Localizar o bloco do loop de verdict (linhas ~97-103):

```javascript
      try {
        const r = await validateTopic(page, t, theme);
        const pass = r.broken.length === 0 && r.total > 0 && r.heroCount === 1 && r.theme === theme;
        if (!pass) ok = false;
        console.log(`${pass ? 'PASS' : 'FAIL'} ${t} [${theme}]: ${r.total} img, ${r.broken.length} broken, hero=${r.heroCount}, bg=${r.bodyBg}, badges=${r.badgeTypes.join(',')}`);
        if (r.broken.length) console.log('  broken:', r.broken.slice(0, 5));
      } catch (e) { ok = false; console.log(`FAIL ${t} [${theme}]: ${e.message}`); }
```

Substituir por:

```javascript
      try {
        const r = await validateTopic(page, t, theme);
        const pass = r.broken.length === 0 && r.total > 0 && r.heroCount === 1 && r.theme === theme && r.placeholders === 0;
        if (!pass) ok = false;
        console.log(`${pass ? 'PASS' : 'FAIL'} ${t} [${theme}]: ${r.total} img, ${r.broken.length} broken, ${r.placeholders} placeholder, hero=${r.heroCount}, bg=${r.bodyBg}, badges=${r.badgeTypes.join(',')}`);
        if (r.broken.length) console.log('  broken:', r.broken.slice(0, 5));
        const expected = EXPECTED_IMAGE_COUNTS[t];
        if (expected !== null && expected !== undefined && r.total !== expected) {
          console.log(`  WARN expected ${expected} images for ${t}, got ${r.total}`);
        }
      } catch (e) { ok = false; console.log(`FAIL ${t} [${theme}]: ${e.message}`); }
```

- [ ] **Step 4: Rodar validator contra estado atual**

Start local server and run validator. Run:

```bash
node tools/validate_briefings.mjs --theme=light
```

Expected: 5 tópicos PASS (inclusive abdominoplastia em estado legacy), `0 placeholder` em todos, sem linhas `WARN`, toggle smoke PASS, `ALL PASS`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add tools/validate_briefings.mjs
git commit -m "test(pwa): add placeholder gate + expected-count soft warning + abdominoplastia to TOPICS"
```

---

### Task 1.8: Verificação PR #1

**Files:** (nenhum)

- [ ] **Step 1: Rodar todos os testes pytest**

Run: `python -m pytest tools/tests -v`
Expected: ≥10 PASS (7 antigos + 3 novos).

- [ ] **Step 2: Rodar testes de schema Node**

Run: `node --test tools/tests/test_schema_anatomy.mjs`
Expected: 4 PASS.

- [ ] **Step 3: Rodar validator em ambos os temas**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: `ALL PASS`, 10 linhas `PASS` (5×2), zero WARN.

- [ ] **Step 4: Push + abrir PR**

```bash
git push -u origin feature/card-uniformity-phase-3-tooling
gh pr create --title "feat: card uniformity phase 3 tooling (annotate_figure + validator gate)" --body "$(cat <<'EOF'
## Summary
- Adiciona `tools/annotate_figure.py` — renderer de calloutsnumerados via Pillow, com 3 testes pytest (no-op, coord válida, clamp).
- Alinha `content/cards/_structure.json` bloco `anatomy` ao schema v2 (purpose + required_fields).
- `tools/validate_briefings.mjs` ganha:
  - `abdominoplastia` em TOPICS
  - gate duro `r.placeholders === 0`
  - soft warning `EXPECTED_IMAGE_COUNTS` (null = sem gate)

Precede PR #2 (piloto abdominoplastia end-to-end).

## Test plan
- [x] `python -m pytest tools/tests -v` → 10 PASS
- [x] `node --test tools/tests/test_schema_anatomy.mjs` → 4 PASS
- [x] `node tools/validate_briefings.mjs --theme=both` → ALL PASS, zero WARN

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Aguardar review + merge via ff**

Após aprovação:

```bash
gh pr merge --merge
git checkout master
git pull origin master
```

Expected: commits do PR #1 presentes em master.

---

## PR #2 — Piloto abdominoplastia

### Task 2.1: Branch setup

**Files:** (nenhum)

- [ ] **Step 1: Criar branch a partir de master atualizado**

```bash
git checkout master
git pull origin master
git checkout -b feature/card-uniformity-phase-3-pilot
```

Expected: branch novo a partir do master com PR #1 mergeado.

---

### Task 2.2: Extrair figuras do Neligan vol. 2 cap. 27

**Files:**
- Output transient: `.tmp/figures/abdominoplastia/`

- [ ] **Step 1: Rodar o extractor**

```bash
python tools/extract_figures.py \
  --pdf "00-Livros-Texto/Neligan 5ed 2023 vol2 estetica.pdf" \
  --topic abdominoplastia \
  --pages 930-972
```

Expected: `.tmp/figures/abdominoplastia/` populado com PNGs `emb_*` e `vec_*`, + `candidates.json`.

- [ ] **Step 2: Inspecionar candidatos visualmente**

Abrir `.tmp/figures/abdominoplastia/` em qualquer viewer. Identificar as seis figuras que cobrem:

1. Zonas de Huger (overview da parede, 3 zonas)
2. Camadas da parede abdominal (schematic 7 camadas)
3. Umbigo (triplice vascularizacao)
4. Scarpa + linfáticos (secção transversal infraumbilical)
5. Unidades estéticas femininas (vista anterior c/ subdivisões)
6. Perfuradores laterais (visão intraoperatória / em V invertido)

---

### Task 2.3: Copiar as 6 figuras para assets + dedup check

**Files:**
- Create: `assets/images/abdominoplastia/huger-zones-overview.png`
- Create: `assets/images/abdominoplastia/abdominal-layers-schematic.png`
- Create: `assets/images/abdominoplastia/umbilicus-pedicle.png`
- Create: `assets/images/abdominoplastia/scarpa-lymphatics.png`
- Create: `assets/images/abdominoplastia/aesthetic-subunits-female.png`
- Create: `assets/images/abdominoplastia/lateral-perforators-surgical.png`

- [ ] **Step 1: Copiar cada figura escolhida para assets**

Para cada candidato selecionado em Task 2.2 Step 2, copiar com o filename final (ASCII):

```bash
cp .tmp/figures/abdominoplastia/<cand1> assets/images/abdominoplastia/huger-zones-overview.png
cp .tmp/figures/abdominoplastia/<cand2> assets/images/abdominoplastia/abdominal-layers-schematic.png
cp .tmp/figures/abdominoplastia/<cand3> assets/images/abdominoplastia/umbilicus-pedicle.png
cp .tmp/figures/abdominoplastia/<cand4> assets/images/abdominoplastia/scarpa-lymphatics.png
cp .tmp/figures/abdominoplastia/<cand5> assets/images/abdominoplastia/aesthetic-subunits-female.png
cp .tmp/figures/abdominoplastia/<cand6> assets/images/abdominoplastia/lateral-perforators-surgical.png
```

- [ ] **Step 2: Confirmar que não há duplicatas com nomes diferentes**

Run: `python tools/audit_images.py`
Expected: nenhum warning de duplicata novo. Se houver, reconsiderar o candidato.

- [ ] **Step 3: Verificar dimensões**

Run:

```bash
python -c "from PIL import Image; import pathlib; [print(p.name, Image.open(p).size) for p in sorted(pathlib.Path('assets/images/abdominoplastia').glob('*.png'))]"
```

Expected: cada arquivo reporta tamanho, width ≤ 1800 px.

- [ ] **Step 4: Commit raw assets**

```bash
git add assets/images/abdominoplastia/huger-zones-overview.png \
        assets/images/abdominoplastia/abdominal-layers-schematic.png \
        assets/images/abdominoplastia/umbilicus-pedicle.png \
        assets/images/abdominoplastia/scarpa-lymphatics.png \
        assets/images/abdominoplastia/aesthetic-subunits-female.png \
        assets/images/abdominoplastia/lateral-perforators-surgical.png
git commit -m "feat(assets): add six source figures for abdominoplastia anatomy (Neligan vol.2 cap.27)"
```

---

### Task 2.4: Anotar figura 1 — Huger zones

**Files:**
- Modify: `assets/images/abdominoplastia/huger-zones-overview.png`

- [ ] **Step 1: Dispachar Agent com Haiku para obter coords**

Invocar `Agent`:

```
subagent_type: general-purpose
model: haiku
prompt: "Examinar a imagem em assets/images/abdominoplastia/huger-zones-overview.png. A figura mostra a parede abdominal anterior com as três zonas de perfusão de Huger (1979). Localizar visualmente o centroide de cada zona e retornar APENAS um JSON array exatamente no formato:
[
  {\"num\": 1, \"x\": <float 0-1>, \"y\": <float 0-1>},
  {\"num\": 2, \"x\": <float 0-1>, \"y\": <float 0-1>},
  {\"num\": 3, \"x\": <float 0-1>, \"y\": <float 0-1>}
]

Convenção:
- num 1 = Zona I (central/umbilical)
- num 2 = Zona II (inguinal, inferior bilateral)
- num 3 = Zona III (flancos/lateral, superior)
- x = 0 à esquerda da imagem, 1 à direita
- y = 0 no topo, 1 no fundo

Se a imagem tiver múltiplas vistas, use a principal (maior). Retorne apenas o JSON, sem comentário."
```

- [ ] **Step 2: Salvar resposta em coords.json temporário**

Gravar o JSON retornado em `.tmp/coords-huger.json`.

- [ ] **Step 3: Rodar annotate_figure**

```bash
python tools/annotate_figure.py \
  --image assets/images/abdominoplastia/huger-zones-overview.png \
  --coords .tmp/coords-huger.json \
  --out assets/images/abdominoplastia/huger-zones-overview.png
```

- [ ] **Step 4: Revisar visualmente**

Abrir o PNG. Se círculo estiver sobre a zona correta, seguir. Se não, editar `.tmp/coords-huger.json` manualmente (ajustar x,y), recopiar o PNG original de `.tmp/figures/` e re-rodar Step 3. NÃO re-dispachar Haiku.

---

### Task 2.5: Anotar figura 2 — Camadas da parede

**Files:**
- Modify: `assets/images/abdominoplastia/abdominal-layers-schematic.png`

- [ ] **Step 1: Dispachar Agent Haiku**

Mesmo padrão do Task 2.4 Step 1, adaptado:

```
subagent_type: general-purpose
model: haiku
prompt: "Examinar assets/images/abdominoplastia/abdominal-layers-schematic.png. Figura schematic mostra 7 camadas da parede abdominal anterior, do superficial ao profundo: (1) pele, (2) gordura subcutânea superficial, (3) fáscia de Scarpa, (4) gordura subscarpal (profunda), (5) bainha anterior do reto, (6) músculo reto, (7) bainha posterior do reto.

Retornar APENAS JSON array:
[{\"num\": 1, \"x\": <float 0-1>, \"y\": <float 0-1>}, ... , {\"num\": 7, ...}]

x,y são o centroide de cada camada na imagem. Sem comentário."
```

- [ ] **Step 2: Salvar + anotar + revisar**

Idêntico a Task 2.4 Steps 2-4, com `.tmp/coords-layers.json` e o arquivo `abdominal-layers-schematic.png`.

---

### Task 2.6: Anotar figura 3 — Umbigo

**Files:**
- Modify: `assets/images/abdominoplastia/umbilicus-pedicle.png`

- [ ] **Step 1: Dispachar Agent Haiku**

Prompt análogo, com 3 estruturas:

1. Plexo subdermal superficial
2. Ligamento redondo (remanescente do teres hepatis)
3. Perfuradores das DIEAs

- [ ] **Step 2: Anotar e revisar**

Idêntico ao padrão acima, `.tmp/coords-umbilicus.json`.

---

### Task 2.7: Anotar figura 4 — Scarpa + linfáticos

**Files:**
- Modify: `assets/images/abdominoplastia/scarpa-lymphatics.png`

- [ ] **Step 1: Dispachar Agent Haiku**

Quatro estruturas:

1. Gordura subcutânea superficial
2. Fáscia de Scarpa
3. Gordura subscarpal (profunda)
4. Plexo linfático subdermico

- [ ] **Step 2: Anotar e revisar**

`.tmp/coords-scarpa.json`.

---

### Task 2.8: Anotar figura 5 — Unidades estéticas

**Files:**
- Modify: `assets/images/abdominoplastia/aesthetic-subunits-female.png`

- [ ] **Step 1: Dispachar Agent Haiku**

Sete estruturas (1 abdome superior, 2 umbigo, 3 abdome inferior, 4 monte pubiano, 5 flancos, 6-7 rolos dorsais — se rolos não aparecem na vista anterior, orientar Haiku a retornar apenas até num=5).

- [ ] **Step 2: Anotar e revisar**

`.tmp/coords-aesthetic.json`.

---

### Task 2.9: Anotar figura 6 — Perfuradores laterais

**Files:**
- Modify: `assets/images/abdominoplastia/lateral-perforators-surgical.png`

- [ ] **Step 1: Dispachar Agent Haiku**

Três estruturas:

1. Perfurantes intercostais laterais (Zona III)
2. Linha axilar anterior (limite externo)
3. Retalho abdominoplástico descolado medialmente

- [ ] **Step 2: Anotar e revisar**

`.tmp/coords-perforators.json`.

---

### Task 2.10: Commit das anotações

**Files:**
- Modify: `assets/images/abdominoplastia/*.png` (6 arquivos)

- [ ] **Step 1: Revisão final dos 6 PNGs anotados**

Abrir cada um e confirmar que os círculos estão sobre as estruturas descritas. Se qualquer imagem estiver errada, voltar à task correspondente (2.4-2.9) e corrigir manualmente.

- [ ] **Step 2: Commit**

```bash
git add assets/images/abdominoplastia/huger-zones-overview.png \
        assets/images/abdominoplastia/abdominal-layers-schematic.png \
        assets/images/abdominoplastia/umbilicus-pedicle.png \
        assets/images/abdominoplastia/scarpa-lymphatics.png \
        assets/images/abdominoplastia/aesthetic-subunits-female.png \
        assets/images/abdominoplastia/lateral-perforators-surgical.png
git commit -m "feat(assets): annotate abdominoplastia figures with numbered callouts"
```

---

### Task 2.11: Library entries — Huger zones

**Files:**
- Create: `content/images/abdominoplastia/img-huger-zones-overview-001.json`

- [ ] **Step 1: Criar o arquivo**

```json
{
  "id": "img-huger-zones-overview-001",
  "file": "abdominoplastia/huger-zones-overview.png",
  "subject": "zonas de perfusao de Huger",
  "role": "overview",
  "source": "Neligan 2023, vol. 2, cap. 27 - Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 27 - Matarasso",
  "default_caption": "Tres zonas de perfusao da parede abdominal anterior (Huger, 1979).",
  "labels": [
    { "num": 1, "text": "Zona I - arterias epigastrica inferior profunda (DIEA) e superficial (SIEA); dominante no abdome nao operado." },
    { "num": 2, "text": "Zona II - arterias circunflexa iliaca superficial (SCIA) e SIEA; territorio inguinal." },
    { "num": 3, "text": "Zona III - intercostais, subcostais e lombares; dominante apos disseccao do retalho." }
  ],
  "applicable_topics": ["abdominoplastia", "dermolipectomia"],
  "status": "available"
}
```

---

### Task 2.12: Library entries — camadas, umbigo, Scarpa, unidades, perfuradores

**Files:**
- Create: `content/images/abdominoplastia/img-abdominal-layers-001.json`
- Create: `content/images/abdominoplastia/img-umbilicus-pedicle-001.json`
- Create: `content/images/abdominoplastia/img-scarpa-lymphatics-001.json`
- Create: `content/images/abdominoplastia/img-aesthetic-subunits-001.json`
- Create: `content/images/abdominoplastia/img-lateral-perforators-001.json`

- [ ] **Step 1: Camadas**

`content/images/abdominoplastia/img-abdominal-layers-001.json`:

```json
{
  "id": "img-abdominal-layers-001",
  "file": "abdominoplastia/abdominal-layers-schematic.png",
  "subject": "camadas da parede abdominal anterior",
  "role": "schematic",
  "source": "Neligan 2023, vol. 2, cap. 27 - Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 27",
  "default_caption": "Sete camadas da parede abdominal anterior, do superficial ao profundo.",
  "labels": [
    { "num": 1, "text": "Pele." },
    { "num": 2, "text": "Gordura subcutanea superficial." },
    { "num": 3, "text": "Fascia de Scarpa (fascia membranosa superficial)." },
    { "num": 4, "text": "Gordura subscarpal (profunda)." },
    { "num": 5, "text": "Bainha anterior do reto abdominal." },
    { "num": 6, "text": "Musculo reto abdominal." },
    { "num": 7, "text": "Bainha posterior do reto abdominal." }
  ],
  "applicable_topics": ["abdominoplastia"],
  "status": "available"
}
```

- [ ] **Step 2: Umbigo**

`content/images/abdominoplastia/img-umbilicus-pedicle-001.json`:

```json
{
  "id": "img-umbilicus-pedicle-001",
  "file": "abdominoplastia/umbilicus-pedicle.png",
  "subject": "triplice vascularizacao do umbigo",
  "role": "detail",
  "source": "Neligan 2023, vol. 2, cap. 27 - Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 27",
  "default_caption": "Triplice vascularizacao do umbigo: plexo subdermal, ligamento redondo e perfuradores da DIEA.",
  "labels": [
    { "num": 1, "text": "Plexo subdermal superficial." },
    { "num": 2, "text": "Remanescente do ligamento redondo (ligamentum teres hepatis)." },
    { "num": 3, "text": "Perfuradores das arterias epigastricas inferiores profundas (DIEA)." }
  ],
  "applicable_topics": ["abdominoplastia"],
  "status": "available"
}
```

- [ ] **Step 3: Scarpa**

`content/images/abdominoplastia/img-scarpa-lymphatics-001.json`:

```json
{
  "id": "img-scarpa-lymphatics-001",
  "file": "abdominoplastia/scarpa-lymphatics.png",
  "subject": "fascia de Scarpa e plexo linfatico subdermico inferior",
  "role": "detail",
  "source": "Neligan 2023, vol. 2, cap. 27 - Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 27",
  "default_caption": "Fascia de Scarpa como substrato do plexo linfatico subdermico infraumbilical.",
  "labels": [
    { "num": 1, "text": "Gordura subcutanea superficial." },
    { "num": 2, "text": "Fascia de Scarpa (fascia membranosa superficial)." },
    { "num": 3, "text": "Gordura subscarpal (profunda)." },
    { "num": 4, "text": "Plexo linfatico subdermico - drenagem para linfonodos inguinais." }
  ],
  "applicable_topics": ["abdominoplastia"],
  "status": "available"
}
```

- [ ] **Step 4: Unidades estéticas**

`content/images/abdominoplastia/img-aesthetic-subunits-001.json`:

```json
{
  "id": "img-aesthetic-subunits-001",
  "file": "abdominoplastia/aesthetic-subunits-female.png",
  "subject": "unidades esteticas do abdome feminino",
  "role": "schematic",
  "source": "Neligan 2023, vol. 2, cap. 27 - Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 27",
  "default_caption": "Sete unidades esteticas do abdome feminino relevantes ao planejamento cirurgico.",
  "labels": [
    { "num": 1, "text": "Abdome superior." },
    { "num": 2, "text": "Umbigo." },
    { "num": 3, "text": "Abdome inferior." },
    { "num": 4, "text": "Monte pubiano." },
    { "num": 5, "text": "Flancos bilaterais." },
    { "num": 6, "text": "Rolo dorsal (lado direito)." },
    { "num": 7, "text": "Rolo dorsal (lado esquerdo)." }
  ],
  "applicable_topics": ["abdominoplastia"],
  "status": "available"
}
```

- [ ] **Step 5: Perfuradores**

`content/images/abdominoplastia/img-lateral-perforators-001.json`:

```json
{
  "id": "img-lateral-perforators-001",
  "file": "abdominoplastia/lateral-perforators-surgical.png",
  "subject": "perfuradores laterais da Zona III expostos intraoperatoriamente",
  "role": "surgical",
  "source": "Neligan 2023, vol. 2, cap. 27 - Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 27",
  "default_caption": "Perfuradores laterais intercostais expostos em disseccao seletiva em V invertido.",
  "labels": [
    { "num": 1, "text": "Perfurantes intercostais laterais - Zona III." },
    { "num": 2, "text": "Linha axilar anterior (limite externo da preservacao)." },
    { "num": 3, "text": "Retalho abdominoplastico descolado medialmente." }
  ],
  "applicable_topics": ["abdominoplastia"],
  "status": "available"
}
```

- [ ] **Step 6: Validar contra o schema**

```bash
npx ajv validate -s content/images/_schema.json --spec=draft2020 \
  -d "content/images/abdominoplastia/*.json" --strict=false
```

Expected: 6 arquivos printed como `valid`.

- [ ] **Step 7: Commit**

```bash
git add content/images/abdominoplastia/
git commit -m "feat(images): add six abdominoplastia library entries"
```

---

### Task 2.13: Regenerar image manifest

**Files:**
- Regenerate: `content/images/manifest.json`

- [ ] **Step 1: Rodar aggregator**

```bash
python tools/build_image_manifest.py
```

Expected: saída `wrote .../content/images/manifest.json (6 entries)`.

- [ ] **Step 2: Spot-check**

```bash
python -c "import json, pathlib; d = json.loads(pathlib.Path('content/images/manifest.json').read_text('utf-8')); print(d['count']); print([e['id'] for e in d['entries']])"
```

Expected: `6` + lista dos 6 IDs em ordem alfabética.

- [ ] **Step 3: Commit**

```bash
git add content/images/manifest.json
git commit -m "chore(images): regenerate manifest with 6 abdominoplastia entries"
```

---

### Task 2.14: Reescrever `anatomia.json` em v2

**Files:**
- Modify: `content/cards/contorno-corporal/abdominoplastia/anatomia.json`

- [ ] **Step 1: Sobrescrever com 6 cards v2**

Substituir o conteúdo do arquivo por:

```json
[
  {
    "id": "abdo-anat-001",
    "type": "anatomy",
    "title": "Camadas da Parede Abdominal",
    "aliases": ["parede abdominal", "layers of abdominal wall"],
    "topic": "abdominoplastia",
    "area": "contorno-corporal",
    "one_liner": "Sete camadas da parede abdominal anterior; a fascia de Scarpa separa as duas gorduras subcutaneas.",
    "structures": [
      { "label": "Camada 1", "description": "Pele." },
      { "label": "Camada 2", "description": "Gordura subcutanea superficial." },
      { "label": "Camada 3", "description": "Fascia de Scarpa (fascia membranosa superficial)." },
      { "label": "Camada 4", "description": "Gordura subscarpal (profunda)." },
      { "label": "Camada 5", "description": "Bainha anterior do reto abdominal." },
      { "label": "Camada 6", "description": "Musculo reto abdominal." },
      { "label": "Camada 7", "description": "Bainha posterior do reto abdominal." }
    ],
    "clinical_hook": "Dissecar profundamente a fascia de Scarpa e o plano classico; preserva-la reduz seroma por manter os linfaticos subdermicos intactos.",
    "how_to_identify": "Camada membranosa esbranquicada entre as duas gorduras, mais nitida em regiao infraumbilical.",
    "images": [
      { "ref": "img-abdominal-layers-001" }
    ],
    "citations": [
      "Neligan 2023, vol. 2, cap. 27 - Matarasso",
      "Grabb & Smith 2024, cap. 75 - Colwell"
    ],
    "updates": [],
    "tags": ["anatomia", "parede-abdominal", "camadas", "fascia", "gordura-subcutanea"]
  },
  {
    "id": "abdo-anat-002",
    "type": "anatomy",
    "title": "Zonas de Huger",
    "aliases": ["zonas vasculares de Huger", "Huger zones", "vascularizacao abdominal"],
    "topic": "abdominoplastia",
    "area": "contorno-corporal",
    "one_liner": "Tres zonas de perfusao da parede abdominal anterior (Huger, 1979); Zona III sustenta o retalho apos disseccao.",
    "structures": [
      { "label": "Zona I", "description": "DIEA + SIEA . central . ligada na disseccao." },
      { "label": "Zona II", "description": "SCIA + SIEA . inguinal . tambem comprometida." },
      { "label": "Zona III", "description": "Intercostais + subcostais + lombares . dominante pos-op." }
    ],
    "relations": [
      "Perfurantes da Zona III entram entre linha axilar anterior e hemiclavicular.",
      "Arcada de Thompson conecta DIEA a toracica interna (supraumbilical)."
    ],
    "clinical_hook": "Descolagem em V invertido preserva perfurantes da Zona III - chave da viabilidade do retalho.",
    "images": [
      { "ref": "img-huger-zones-overview-001" },
      { "ref": "img-lateral-perforators-001" }
    ],
    "citations": ["Neligan 2023, vol. 2, cap. 27 - Matarasso"],
    "updates": [],
    "tags": ["anatomia", "vascularizacao", "zonas-huger", "perfuradores", "retalho", "isquemia"]
  },
  {
    "id": "abdo-anat-003",
    "type": "anatomy",
    "title": "Fascia de Scarpa e Linfaticos",
    "aliases": ["fascia superficial", "linfaticos abdominais"],
    "topic": "abdominoplastia",
    "area": "contorno-corporal",
    "one_liner": "A fascia de Scarpa e substrato do plexo linfatico subdermico inferior; preserva-la reduz seroma.",
    "structures": [
      { "label": "Superficial", "description": "Gordura subcutanea superficial." },
      { "label": "Fascia", "description": "Fascia de Scarpa (membranosa)." },
      { "label": "Profunda", "description": "Gordura subscarpal." },
      { "label": "Linfaticos", "description": "Plexo subdermico com drenagem inguinal ipsilateral." }
    ],
    "location": "Regiao infra-umbilical; continua-se com fascia de Colles (perineo) e Buck (penis).",
    "clinical_hook": "Fechamento por camadas incorporando a fascia de Scarpa reduz significativamente a incidencia de seroma.",
    "how_to_identify": "Camada membranosa distinta entre as duas gorduras, evidente em regiao infraumbilical.",
    "images": [
      { "ref": "img-scarpa-lymphatics-001" }
    ],
    "citations": [
      "Neligan 2023, vol. 2, cap. 27 - Matarasso",
      "Grabb & Smith 2024, cap. 75 - Colwell"
    ],
    "updates": [],
    "tags": ["anatomia", "fascia-scarpa", "linfaticos", "seroma", "disseccao"]
  },
  {
    "id": "abdo-anat-004",
    "type": "anatomy",
    "title": "Anatomia do Umbigo",
    "aliases": ["umbilicus", "navel", "cicatriz umbilical"],
    "topic": "abdominoplastia",
    "area": "contorno-corporal",
    "one_liner": "Umbigo tem triplice vascularizacao: plexo subdermal, ligamento redondo e perfuradores da DIEA.",
    "structures": [
      { "label": "Plexo", "description": "Plexo subdermal superficial." },
      { "label": "Ligamento", "description": "Remanescente do ligamento redondo (ligamentum teres hepatis)." },
      { "label": "Perfuradores", "description": "Ramos da DIEA (arteria epigastrica inferior profunda) ao redor do coto." }
    ],
    "location": "Juncao da linha media com linha horizontal ao nivel das cristas iliacas.",
    "clinical_hook": "Na tecnica float, seccione o pediculo profundo mas preserve o dermal; nao ancorar o umbigo a fascia (evita distorcao unilateral).",
    "how_to_identify": "Cicatriz cutanea natural; intraop, palpar botao ocular plastico suturado ao coto apos liberacao.",
    "images": [
      { "ref": "img-umbilicus-pedicle-001" }
    ],
    "citations": ["Neligan 2023, vol. 2, cap. 27 - Matarasso"],
    "updates": [],
    "tags": ["anatomia", "umbigo", "umbilicoplastia", "vascularizacao", "pediculo"]
  },
  {
    "id": "abdo-anat-005",
    "type": "anatomy",
    "title": "Unidades Esteticas do Abdome",
    "aliases": ["aesthetic units", "subunidades abdominais"],
    "topic": "abdominoplastia",
    "area": "contorno-corporal",
    "one_liner": "Mulheres: sete unidades esteticas abdominais; homens: seis (raramente rolos dorsais).",
    "structures": [
      { "label": "1 Abdome superior", "description": "Supraumbilical." },
      { "label": "2 Umbigo", "description": "Unidade central." },
      { "label": "3 Abdome inferior", "description": "Infraumbilical." },
      { "label": "4 Monte pubiano", "description": "Unidade pubica." },
      { "label": "5 Flancos", "description": "Bilaterais." },
      { "label": "6-7 Rolos dorsais", "description": "Mulher; raramente em homens." }
    ],
    "clinical_hook": "Trate unidades adjacentes na mesma cirurgia: nao abordar flancos/monte/rolos gera insatisfacao por resultado incompleto.",
    "how_to_identify": "Inspecao em pe, de frente, perfil e posterior; limites definidos pela transicao de contorno.",
    "images": [
      { "ref": "img-aesthetic-subunits-001" }
    ],
    "citations": ["Neligan 2023, vol. 2, cap. 27 - Matarasso"],
    "updates": [],
    "tags": ["anatomia", "unidades-esteticas", "planejamento", "lipoaspiracao", "contorno"]
  },
  {
    "id": "abdo-anat-006",
    "type": "anatomy",
    "title": "Gordura Visceral",
    "aliases": ["gordura omental", "gordura intra-abdominal", "visceral fat"],
    "topic": "abdominoplastia",
    "area": "contorno-corporal",
    "one_liner": "Gordura visceral e firme, nao tratavel por lipoaspiracao e nao se beneficia de plicatura muscular.",
    "structures": [
      { "label": "Compartimento", "description": "Intraperitoneal - omento maior e mesenterio." },
      { "label": "Distincao", "description": "Distinta da subcutanea; firme a palpacao." }
    ],
    "relations": [
      "Musculo reto abdominal + bainha posterior como barreira anatomica.",
      "Associacao com risco cardiometabolico, cancer e demencia."
    ],
    "clinical_hook": "Abdome que permanece convexo em decubito dorsal indica predominio visceral - plicatura do reto esta contraindicada.",
    "how_to_identify": "Palpacao firme e profunda, nao pincavel; diferencia da subcutanea macia e depressivel.",
    "citations": ["Neligan 2023, vol. 2, cap. 27 - Matarasso"],
    "updates": [],
    "tags": ["anatomia", "gordura-visceral", "contraindicacao", "plicatura", "avaliacao"]
  }
]
```

- [ ] **Step 2: Validar contra o schema de cards**

```bash
npx ajv validate -s content/cards/schema.json --spec=draft2020 \
  -d "content/cards/contorno-corporal/abdominoplastia/anatomia.json" --strict=false
```

Expected: `valid`.

- [ ] **Step 3: Lint de acrônimos**

```bash
python tools/lint_acronyms.py content/cards/contorno-corporal/abdominoplastia/anatomia.json
```

Expected: exit 0, sem issues. Se algum acrônimo for flagged, adicionar `(expansão)` na primeira ocorrência do campo e re-rodar.

- [ ] **Step 4: Commit**

```bash
git add content/cards/contorno-corporal/abdominoplastia/anatomia.json
git commit -m "feat(cards): migrate abdominoplastia anatomy to v2 schema"
```

---

### Task 2.15: Flip do EXPECTED_IMAGE_COUNTS

**Files:**
- Modify: `tools/validate_briefings.mjs` (bloco `EXPECTED_IMAGE_COUNTS`)

- [ ] **Step 1: Editar valor**

Localizar:

```javascript
  abdominoplastia: null, // flipa para 6 no PR #2
```

Substituir por:

```javascript
  abdominoplastia: 6,
```

- [ ] **Step 2: Commit**

```bash
git add tools/validate_briefings.mjs
git commit -m "test(pwa): set abdominoplastia expected image count to 6"
```

---

### Task 2.16: Playwright gate + screenshot review

**Files:** (somente output transient em `tools/_validation/`)

- [ ] **Step 1: Regenerar manifest (garantia)**

```bash
python tools/build_image_manifest.py
```

Expected: `6 entries`.

- [ ] **Step 2: Rodar validator com ambos os temas**

```bash
node tools/validate_briefings.mjs --theme=both
```

Expected: `ALL PASS`, 10 linhas `PASS`, `0 placeholder` em abdominoplastia, WARN vazio.

- [ ] **Step 3: Revisão visual dos screenshots**

Abrir `tools/_validation/abdominoplastia-light.png` e `abdominoplastia-dark.png`. Confirmar:

- Card `abdo-anat-002 Zonas de Huger` mostra lead-line + struct-table (3 linhas) + hook-box dourado + duas imagens numeradas com legendas.
- Acrônimos DIEA, SIEA, SCIA aparecem expandidos na primeira ocorrência.
- Nenhuma imagem quebrada / placeholder visível.

Se algo errado, voltar à task pertinente (2.4-2.14) e corrigir.

---

### Task 2.17: Remover imagens legacy órfãs

**Files:**
- Delete: `assets/images/abdominoplastia/abdo-anat-*.jpg` (legacy, não referenciadas)

- [ ] **Step 1: Listar e identificar órfãos**

```bash
python tools/audit_images.py --topic abdominoplastia
```

Expected: relatório lista quais arquivos são referenciados por cards e quais não. Os `abdo-anat-*.jpg` legacy (ex. `abdo-anat-camadas-histologia.jpg`, `abdo-anat-huger-zonas.jpg`, etc.) devem aparecer como órfãos.

- [ ] **Step 2: Remover cada órfão**

Para cada arquivo órfão reportado, rodar:

```bash
git rm assets/images/abdominoplastia/<nome-do-arquivo>.jpg
```

NÃO remover: `huger-zones-overview.png`, `abdominal-layers-schematic.png`, `umbilicus-pedicle.png`, `scarpa-lymphatics.png`, `aesthetic-subunits-female.png`, `lateral-perforators-surgical.png`.

- [ ] **Step 3: Re-rodar validator**

```bash
node tools/validate_briefings.mjs --theme=light
```

Expected: `ALL PASS`. Se falhar com imagem broken, significa que uma ref em anatomia.json apontava para um arquivo deletado — restaurar via `git checkout HEAD -- assets/images/...` e ajustar a ref.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(assets): remove orphan abdominoplastia images after v2 migration"
```

(Stage já efetivo via `git rm`.)

---

### Task 2.18: Verificação final end-to-end (PR #2)

**Files:** (nenhum)

- [ ] **Step 1: Testes pytest**

```bash
python -m pytest tools/tests -v
```

Expected: ≥10 PASS.

- [ ] **Step 2: Testes de schema Node**

```bash
node --test tools/tests/test_schema_anatomy.mjs
```

Expected: 4 PASS.

- [ ] **Step 3: Validação completa de cards**

```bash
npx ajv validate -s content/cards/schema.json --spec=draft2020 \
  -d "content/cards/**/*.json" --strict=false 2>&1 | grep -Ev "valid$" | head -20
```

Expected: sem saída (todos válidos).

- [ ] **Step 4: Validação completa de imagens**

```bash
npx ajv validate -s content/images/_schema.json --spec=draft2020 \
  -d "content/images/**/*.json" --strict=false 2>&1 | grep -Ev "valid$" | head -20
```

Expected: sem saída.

- [ ] **Step 5: Playwright final em ambos os temas**

```bash
node tools/validate_briefings.mjs --theme=both
```

Expected: `ALL PASS`, 10 linhas PASS, zero placeholders, zero WARN.

- [ ] **Step 6: Smoke manual iPhone viewport**

Subir server (o próprio validator usa `:8767`) e abrir no Chrome DevTools iPhone 13 viewport `http://localhost:8767/webapp/library/`. Navegar: home → abdominoplastia. Confirmar:

- `abdo-anat-002 Zonas de Huger` renderiza com lead-line, struct-table, hook-box, 2 imagens numeradas.
- DIEA/SIEA/SCIA expandidos em primeira ocorrência.
- Toggle offline no DevTools + reload → continua renderizando tudo (cache v18).

- [ ] **Step 7: Push + PR**

```bash
git push -u origin feature/card-uniformity-phase-3-pilot
gh pr create --title "feat: card uniformity phase 3 pilot (abdominoplastia anatomy v2)" --body "$(cat <<'EOF'
## Summary
- Extrai 6 figuras de abdominoplastia do Neligan vol.2 cap.27 (Matarasso, pp. 732-774).
- Anota cada figura com callouts numerados via Haiku subagent + `tools/annotate_figure.py`.
- Escreve 6 library entries em `content/images/abdominoplastia/`.
- Regenera `content/images/manifest.json` (6 entries).
- Reescreve `content/cards/contorno-corporal/abdominoplastia/anatomia.json` em shape v2 (6 cards: camadas, Huger, Scarpa+linfaticos, umbigo, unidades esteticas, gordura visceral).
- Ativa soft-warning `EXPECTED_IMAGE_COUNTS.abdominoplastia = 6`.
- Remove imagens legacy orfas.

## Test plan
- [x] `python -m pytest tools/tests -v` → PASS
- [x] `node --test tools/tests/test_schema_anatomy.mjs` → PASS
- [x] `npx ajv validate` em cards + images → todos valid
- [x] `node tools/validate_briefings.mjs --theme=both` → ALL PASS, zero placeholders, zero WARN
- [x] Smoke iPhone viewport: card Huger com 2 imagens numeradas, siglas expandidas, offline OK

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 8: Merge após review + atualizar memória**

Após aprovação:

```bash
gh pr merge --merge
git checkout master
git pull origin master
```

Atualizar `C:/Users/absay/.claude/projects/c--Users-absay-Documents-Biblioteca-CirurgiaPlastica/memory/MEMORY.md` com entrada "Fase 3 concluída (PR #N, piloto abdominoplastia anatomy v2)" apontando para `memory/project_card_uniformity_phase_3_done.md`.

---

## Cross-Phase Checklist

Após os dois PRs mergeados, confirmar:

- [ ] `content/cards/manifest.json` não precisou mudar (conteúdo de anatomy atualizado, não adicionou tema novo).
- [ ] `webapp/library/sw.js` cache version segue `v18` (nenhum arquivo novo no shell — apenas dados JSON e imagens, que já são fetched dinamicamente).
- [ ] Memória atualizada refletindo estado pós-Fase 3.

## Out of Scope (explicit)

- Fase 4 (sweep dos 7 outros temas: lipoaspiracao, gluteoplastia, contorno-pos-bariatrico, otoplastia, mastoplastia-redutora, blefaroplastia, rinoplastia ou similar) — próximo sprint.
- Fase 5 (remoção do branch legacy em `schema.json` e `renderer.js`) — após Fase 4.
- CI automatizado que rode pytest/validator em cada push — manual por enquanto.
- Suporte SVG no `annotate_figure.py`.
- Retry automático quando Haiku retorna coord claramente errada (fallback é edição manual do JSON).
