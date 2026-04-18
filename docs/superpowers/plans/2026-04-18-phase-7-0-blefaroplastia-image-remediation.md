# Phase 7.0 — Remediação de imagens de anatomia em blefaroplastia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auditar visualmente e remediar os 20 cards de anatomia de blefaroplastia no PWA (figuras adequadas + labels x,y corretas + zero reciclagem do corte sagital), entregando em um PR único com SW bump.

**Architecture:** Pipeline card-a-card, Read visual → decisão (keep/relabel/replace) → atualização de `anatomia.json` + `content/images/manifest.json` → validação Playwright → SW bump → PR. Escopo focal: **somente** blefaroplastia, sem tocar nos outros 7 temas v2.

**Tech Stack:** JSON cards/manifest (schema v2), vision Read tool, Python para scripts ad-hoc, Playwright script standalone (`tools/validate_briefings.mjs` padrão), Service Worker v24 → v25.

---

## Scope & Fontes

**Cards em escopo (todos os 20 de `content/cards/estetica-facial/blefaroplastia/anatomia.json`):**

| # | ID | Título | Ref atual | Status inicial |
|---|---|---|---|---|
| 1 | blef-anat-001 | Pele Palpebral | img-upper-lid-sagittal-001 | **RECICLADO** + labels erradas (flagado) |
| 2 | blef-anat-002 | Músculo Orbicular | img-periorbital-muscles-001 | Labels erradas (flagado) |
| 3 | blef-anat-003 | Septo Orbital | img-orbital-septum-001 | Labels erradas (flagado) |
| 4 | blef-anat-004 | Gordura Orbitária Sup | img-upper-orbital-fat-001 | Figura inadequada (flagado) |
| 5 | blef-anat-005 | Gordura Orbitária Inf | img-lower-orbital-fat-001 | Labels erradas (flagado) |
| 6 | blef-anat-006 | LPS/Aponeurose | img-upper-lid-sagittal-001 | **RECICLADO** |
| 7 | blef-anat-007 | Müller | img-upper-lid-sagittal-001 | **RECICLADO** |
| 8 | blef-anat-008 | Capsulopalpebral/Lockwood | img-capsulopalpebral-fascia-001 | Auditar |
| 9 | blef-anat-009 | Tarso | img-upper-lid-sagittal-001 | **RECICLADO** |
| 10 | blef-anat-010 | Cantal Medial | img-medial-canthal-tendon-001 | Auditar |
| 11 | blef-anat-011 | Cantal Lateral | img-lateral-canthal-tendon-001 | Auditar |
| 12 | blef-anat-012 | Whitnall | img-whitnall-ligament-001 | Auditar |
| 13 | blef-anat-013 | Vascularização | img-periorbital-vasculature-001 | Auditar |
| 14 | blef-anat-014 | Inervação | img-periorbital-innervation-001 | Auditar |
| 15 | blef-anat-015 | Tear Trough | img-tear-trough-001 | Auditar |
| 16 | blef-anat-016 | ORL | img-orbicular-retaining-ligament-001 | Auditar |
| 17 | blef-anat-017 | Pálpebra Asiática | img-asian-eyelid-001 | Auditar |
| 18 | blef-anat-018 | Ossos Órbita | img-orbital-bones-001 | Auditar |
| 19 | blef-anat-019 | ROOF | img-upper-lid-sagittal-001 | **RECICLADO** |
| 20 | blef-anat-020 | Retináculo Lateral | img-lateral-retinaculum-001 | Auditar |

**Fontes aprovadas (ordem de preferência):**

1. Assets já no repo: `assets/images/blefaroplastia/` (46 arquivos — ex.: `fig13-9`, `blef-13-X`, `blef-box13-X`, `blef-p0592-*`)
2. Neligan Vol 2, Cap 13 (Blefaroplastia) — render via PyMuPDF se novo recorte for necessário
3. Kaufman Cap 8 "Eyelid" — render via PyMuPDF/vision (pipeline já provado em `tools/_cache/`)
4. KenHub (download manual, atribuir `credit: "KenHub"`)
5. Ellis & Zide "Acessos Cirúrgicos ao Esqueleto Facial" — órbita óssea

**Meta final:**

- Zero card com `img-upper-lid-sagittal-001` fora de blef-anat-006 (LPS — único onde o corte sagital é canônico e correto). Todos os outros 4 recicladores (001/007/009/019) recebem figura dedicada.
- Cada card tem figura cuja estrutura-alvo é claramente identificável
- Cada label tem x,y numéricos, texto em português correto, corresponde a estrutura real da imagem

**Fora de escopo:**

- Qualquer outro tema v2 (ritidoplastia, CPB, contorno, etc.)
- Técnicas/decisões/notas de blefaroplastia (só `anatomia.json`)
- Refatoração do renderer
- Chat IA / RAG enrichment

---

### Task 1: Criar diretório scratch e baseline do manifest

**Files:**

- Create: `tools/_cache/phase7_0_audit/` (scratch, ignorado pelo git)
- Read: `content/cards/estetica-facial/blefaroplastia/anatomia.json`
- Read: `content/images/manifest.json`

- [ ] **Step 1: Criar diretório scratch**

```bash
mkdir -p tools/_cache/phase7_0_audit
```

- [ ] **Step 2: Dump do estado inicial para comparação posterior**

```bash
cp content/cards/estetica-facial/blefaroplastia/anatomia.json tools/_cache/phase7_0_audit/anatomia.before.json
python -c "
import json
m = json.load(open('content/images/manifest.json', encoding='utf-8'))
blef = [e for e in m['entries'] if e.get('file','').startswith('blefaroplastia/')]
json.dump({'entries': blef}, open('tools/_cache/phase7_0_audit/manifest.blefaro.before.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'baseline: {len(blef)} blefaro entries')
"
```

Expected: `baseline: 17 blefaro entries`

- [ ] **Step 3: Commit do baseline**

```bash
git add -A
git commit -m "chore(phase7.0): scratch baseline do estado pre-remediacao blefaro"
```

---

### Task 2: Auditar visualmente cada figura atual (20 cards)

**Files:**

- Read (vision): cada arquivo PNG/JPEG referenciado por `anatomia.json`
- Create: `tools/_cache/phase7_0_audit/audit.md`

Cada card passa por três perguntas:

1. **Figura adequada?** A imagem mostra o conceito do card (sim/não)
2. **Labels x,y corretas?** Os marcadores numéricos pousam sobre as estruturas reais (sim/não)
3. **Reciclado?** Usa `img-upper-lid-sagittal-001` fora do card LPS (blef-anat-006)

- [ ] **Step 1: Criar template do audit.md**

```markdown
# Audit Phase 7.0 — Blefaroplastia Anatomia

Formato por card:

## blef-anat-XXX — <titulo>
- **Ref atual:** img-xxx → path/arquivo.png
- **Figura adequada:** SIM | NÃO (justificar)
- **Labels corretas:** SIM | NÃO (listar labels erradas)
- **Reciclado:** NÃO | SIM (card canônico do corte sagital = 006)
- **Ação:** KEEP | RELABEL | REPLACE (fonte proposta: ...)
```

- [ ] **Step 2: Executar o audit card-a-card, uma vision Read por figura**

Para cada entrada do manifest acima, abrir o arquivo físico com Read tool e comparar contra o `title` + `structures[]` + labels atuais. Registrar verdicto em `audit.md`.

Regra de priorização rígida:

- Cards 001/007/009/019 já entram como REPLACE (recicladores — figura dedicada obrigatória)
- Cards 002/003/004/005 foram flagados pelo Dr. Arthur → tratar como REPLACE ou RELABEL conforme vision read indicar
- Demais 12 cards: veredicto conforme evidência visual

- [ ] **Step 3: Resumo final no fim do audit.md**

```markdown
## Sumário
- KEEP: N cards
- RELABEL: N cards (card IDs)
- REPLACE: N cards (card IDs)
- Fontes novas necessárias: [Neligan X, Kaufman Y, KenHub Z]
```

- [ ] **Step 4: Commit do audit**

```bash
git add tools/_cache/phase7_0_audit/audit.md
git commit -m "chore(phase7.0): audit visual dos 20 cards de anatomia blefaro"
```

---

### Task 3: Sourcing de figuras novas (para cards marcados REPLACE)

**Files:**

- Create: `assets/images/blefaroplastia/<novo>.png` (um por card REPLACE)
- Create: `tools/_cache/phase7_0_audit/sourcing.md` (registro de origem)

Para cada card REPLACE:

- [ ] **Step 1: Identificar fonte**

Ordem:

1. Já existe em `assets/images/blefaroplastia/` mas não está mapeado? Listar `ls assets/images/blefaroplastia/` e cruzar contra manifest.
2. Neligan Vol 2 Cap 13 — render página específica via `python -c "import fitz; doc=fitz.open('00-Livros-Texto/Neligan Volume 2 - Aesthetic.pdf'); pix=doc[PG].get_pixmap(dpi=200); pix.save('tools/_cache/phase7_0_audit/neligan_pNNN.png')"` (substituir PG pelo índice 0-based)
3. Kaufman Cap 8 — mesmo pipeline de `tools/_cache/kaufman_toc/` já existente
4. KenHub — download manual pelo Dr. Arthur se necessário (pausar task e pedir)

- [ ] **Step 2: Crop/rotate se necessário**

Usar Python + Pillow (scratch em `tools/_cache/phase7_0_audit/`):

```python
from PIL import Image
img = Image.open('tools/_cache/phase7_0_audit/neligan_p0592.png')
cropped = img.crop((x0, y0, x1, y1))
cropped.save('assets/images/blefaroplastia/<nome-ascii-sem-acento>.png')
```

Nome do arquivo: ASCII sem acentos, padrão `blef-anat-<conceito>.png` (ex.: `blef-anat-pele-palpebral.png`). Regra fundamental do CLAUDE.md.

- [ ] **Step 3: Registrar em sourcing.md**

```markdown
## <card-id> — <titulo>
- Fonte: Neligan Vol 2 Cap 13 fig 13-X, pg NNN
- Arquivo final: assets/images/blefaroplastia/<nome>.png
- Crédito: Neligan Plastic Surgery, 5th Ed. Elsevier 2023
```

- [ ] **Step 4: Commit incremental a cada 3-4 imagens sourced**

```bash
git add assets/images/blefaroplastia/<novos>.png tools/_cache/phase7_0_audit/sourcing.md
git commit -m "assets(phase7.0): sourcing lote N — <conceitos>"
```

---

### Task 4: Atualizar `content/images/manifest.json` com novas entradas + labels relabeladas

**Files:**

- Modify: `content/images/manifest.json`

Para cada card REPLACE: criar nova entrada no manifest.
Para cada card RELABEL: reescrever `labels[]` da entrada existente.
Para cada card KEEP: nenhuma alteração.

- [ ] **Step 1: Ler o arquivo da figura com Read tool (vision) e identificar x,y de cada estrutura**

Para cada label novo, medir posição aproximada da estrutura-alvo na imagem. Usar coordenadas normalizadas 0.0–1.0 (padrão do renderer, `renderer.js:128-130`).

- [ ] **Step 2: Editar manifest.json entrada por entrada**

Exemplo de nova entrada (para card REPLACE):

```json
{
  "id": "img-eyelid-skin-001",
  "file": "blefaroplastia/blef-anat-pele-palpebral.png",
  "default_caption": "Pele palpebral — espessura e transições regionais",
  "credit": "Neligan Plastic Surgery, 5th Ed. Elsevier 2023",
  "labels": [
    {"num": 1, "text": "Pele pré-tarsal (0.3–0.5 mm)", "x": 0.32, "y": 0.41},
    {"num": 2, "text": "Pele pré-septal (0.5–0.8 mm)", "x": 0.48, "y": 0.55},
    {"num": 3, "text": "Transição pálpebra-bochecha", "x": 0.62, "y": 0.78}
  ]
}
```

Regra: cada label com x,y numéricos; texto em português com diacríticos corretos; números ascendentes começando em 1.

- [ ] **Step 3: Validar JSON estrutural após edições**

```bash
python -c "
import json
m = json.load(open('content/images/manifest.json', encoding='utf-8'))
blef = [e for e in m['entries'] if e.get('file','').startswith('blefaroplastia/')]
for e in blef:
    assert 'id' in e and 'file' in e and 'labels' in e, e['id']
    for l in e['labels']:
        assert isinstance(l.get('x'), (int,float)) and 0 <= l['x'] <= 1, (e['id'], l)
        assert isinstance(l.get('y'), (int,float)) and 0 <= l['y'] <= 1, (e['id'], l)
print(f'OK: {len(blef)} blefaro entries valid')
"
```

Expected: `OK: N blefaro entries valid` (N ≥ 17)

- [ ] **Step 4: Commit do manifest**

```bash
git add content/images/manifest.json
git commit -m "feat(phase7.0): manifest blefaro — novas figuras + labels reescritas"
```

---

### Task 5: Atualizar `anatomia.json` — trocar refs dos cards REPLACE

**Files:**

- Modify: `content/cards/estetica-facial/blefaroplastia/anatomia.json`

- [ ] **Step 1: Trocar `images[].ref` para os cards REPLACE**

Exemplo de edição (blef-anat-001):

```json
"images": [
  { "ref": "img-eyelid-skin-001" }
]
```

(Remove `img-upper-lid-sagittal-001` do card 001 e análogos para 007/009/019 + os flagados que viraram REPLACE.)

- [ ] **Step 2: Verificar que `img-upper-lid-sagittal-001` só aparece em blef-anat-006**

```bash
python -c "
import json
cards = json.load(open('content/cards/estetica-facial/blefaroplastia/anatomia.json', encoding='utf-8'))
sag = [c['id'] for c in cards['cards'] if any(i.get('ref')=='img-upper-lid-sagittal-001' for i in c.get('images',[]))]
print('Cards usando img-upper-lid-sagittal-001:', sag)
assert sag == ['blef-anat-006'], f'Reciclagem residual: {sag}'
print('OK')
"
```

Expected: `Cards usando img-upper-lid-sagittal-001: ['blef-anat-006']` + `OK`

- [ ] **Step 3: Verificar que toda ref existe no manifest**

```bash
python -c "
import json
cards = json.load(open('content/cards/estetica-facial/blefaroplastia/anatomia.json', encoding='utf-8'))
m = json.load(open('content/images/manifest.json', encoding='utf-8'))
ids = {e['id'] for e in m['entries']}
missing = []
for c in cards['cards']:
    for i in c.get('images',[]):
        if i['ref'] not in ids:
            missing.append((c['id'], i['ref']))
print('Missing refs:', missing)
assert not missing
print('OK')
"
```

Expected: `Missing refs: []` + `OK`

- [ ] **Step 4: Commit**

```bash
git add content/cards/estetica-facial/blefaroplastia/anatomia.json
git commit -m "feat(phase7.0): anatomia.json blefaro — refs atualizadas, zero reciclagem"
```

---

### Task 6: Validação visual no PWA (Playwright)

**Files:**

- Use: `tools/validate_briefings.mjs` (script standalone existente, padrão da casa — CLAUDE.md seção 7)
- Create (se não existir blefaro): parametrizar o script para abrir briefing de blefaroplastia

- [ ] **Step 1: Servir o PWA localmente**

```bash
cd webapp/library && python -m http.server 8765 &
```

- [ ] **Step 2: Rodar script de validação**

```bash
node tools/validate_briefings.mjs blefaroplastia
```

Expected: todas as 20 figuras carregam (`img.complete === true`, `naturalWidth > 0`), todos os `.fig-marker` renderizam, zero erros no console.

Se o script não aceitar argumento de tema ainda, adaptar minimamente:

```javascript
const topic = process.argv[2] || 'abdominoplastia';
await page.goto(`http://localhost:8765/?topic=${topic}`);
```

- [ ] **Step 3: Capturar screenshots dos 20 cards**

Salvar em `tools/_cache/phase7_0_audit/screenshots/blef-anat-XXX.png`. Revisão visual pelo autor + Dr. Arthur (eyeball pass).

- [ ] **Step 4: Derrubar servidor e commit**

```bash
# matar o server (ver PID via jobs)
kill %1
git add -A
git commit -m "test(phase7.0): validacao Playwright + screenshots dos 20 cards"
```

---

### Task 7: SW bump v24 → v25

**Files:**

- Modify: `webapp/library/sw.js:1`

- [ ] **Step 1: Edit**

```javascript
const CACHE_NAME = 'briefing-preop-v25';
```

- [ ] **Step 2: Commit**

```bash
git add webapp/library/sw.js
git commit -m "chore(sw): cache v24 -> v25 (phase 7.0 blefaro images)"
```

---

### Task 8: PR único + cleanup scratch

**Files:**

- Delete: `tools/_cache/phase7_0_audit/` (scratch)

- [ ] **Step 1: Revisar diff completo**

```bash
git log --oneline master..HEAD
git diff master --stat
```

- [ ] **Step 2: Remover scratch (não deve ir pro repo final)**

```bash
rm -rf tools/_cache/phase7_0_audit
git add -A
git commit -m "chore(phase7.0): cleanup scratch de auditoria"
```

- [ ] **Step 3: Push e abrir PR**

```bash
git push -u origin <branch-name>
gh pr create --title "Phase 7.0: remediacao de imagens de anatomia blefaro" --body "$(cat <<'EOF'
## Summary
- Audit visual dos 20 cards de anatomia de blefaroplastia
- Sourcing de figuras dedicadas para os 4 cards que reciclavam o corte sagital (mantido apenas em blef-anat-006 LPS)
- Relabel de todos os cards flagados pelo Dr. Arthur (pele palpebral, orbicular, septo, gorduras sup/inf)
- Manifest atualizado com x,y numéricos corretos
- SW bump v24 -> v25

## Test plan
- [x] Validate script rodado em blefaroplastia (20/20 figuras OK)
- [x] Screenshots dos 20 cards em tools/_cache (antes do cleanup)
- [x] Zero reciclagem residual de img-upper-lid-sagittal-001 fora de blef-anat-006
- [x] Todo ref em anatomia.json existe no manifest

Desbloqueia Phases 7.1-7.6 (reconstrucao facial por sub-unidade).
EOF
)"
```

- [ ] **Step 4: Reportar URL do PR ao Dr. Arthur**

---

## Verificação final (antes de marcar done)

- [x] 20 cards auditados com vision Read
- [x] `img-upper-lid-sagittal-001` usado só em blef-anat-006
- [x] Todo card tem x,y nos labels
- [x] Manifest e anatomia.json em sincronia (zero refs quebradas)
- [x] Script Playwright passa sem erro
- [x] Nenhum outro tema v2 tocado (git diff só sob `blefaroplastia/` + `sw.js` + `content/images/manifest.json` + scratch deletado)
- [x] PR aberto com descrição completa
