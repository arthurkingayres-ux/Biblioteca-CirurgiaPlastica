# Card Uniformity Phase 4 — Anatomy Sweep (Contorno + Face) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar os 65 cards de anatomia dos 7 temas contorno+face (Perfil A) para schema v2, com 30 library entries novas, precedido por PR de hardening do pipeline que quita o débito de acentos do piloto e endurece o validador.

**Architecture:** Três PRs sequenciais. PR 4.0 (prep) é pré-requisito duro: sem ele, os 7 temas seguintes replicariam o mesmo débito. PR 4A agrupa contorno corporal (lipo → gluteo → pós-bariátrico). PR 4B agrupa estética facial (blefaro → rino → oto → ritido). Cada tema segue um ciclo fixo de 7 passos. Cards legacy são 100% migrados para v2; 5 por tema recebem `images[]`, demais ficam `images: []` rastreados em `content/cards/_pending_images.md`.

**Tech Stack:** Node 20 (scripts, validate_briefings.mjs, Playwright), Python 3.11 (build_image_manifest, lint_acronyms, extract_figures, audit_images, report_pending_images), ajv-cli v5 (`--spec=draft2020`), pytest (testes Python), Claude Haiku via `Agent` tool (subagent de migração v2 por tema), PIL/Pillow (imagens).

---

## File Structure

### PR 4.0 — Preparação do pipeline

**Criados:**
- `docs/superpowers/templates/anatomy-v2-tema.md` — template canônico (prompt do subagente Haiku)
- `tools/report_pending_images.mjs` — varre cards v2 e gera markdown com `images: []`
- `tools/tests/test_report_pending_images.py` — testes pytest do relatório
- `tools/tests/test_validate_briefings_image_counts.py` — testes pytest da extensão do validador
- `content/cards/_pending_images.md` — manifesto gerado (commit inicial com estado pós-abdomino)

**Modificados:**
- `content/cards/contorno-corporal/abdominoplastia/anatomia.json` — acentuação restaurada (JSON único, 5 cards)
- `content/images/abdominoplastia/img-abdominal-layers-001.json` — acentuação
- `content/images/abdominoplastia/img-huger-zones-001.json` — acentuação
- `content/images/abdominoplastia/img-scarpa-lymphatics-001.json` — acentuação
- `content/images/abdominoplastia/img-aesthetic-subunits-001.json` — acentuação
- `content/images/abdominoplastia/img-pdsea-preservation-001.json` — acentuação
- `tools/validate_briefings.mjs` — adiciona assertion de contagem de imagens por tópico + relatório de pendências
- `content/rag/_structure.json` — bloco `anatomy` alinhado a v2 (remove campos legacy de `purpose`/`required_fields`)

### PR 4A — Contorno corporal

**Criados (por tema):**
- `content/images/<tema>/img-*.json` — library entries (4 para lipo, 5 para gluteo, 5 para pós-bariátrico)
- `assets/images/<tema>/*.png` — figuras novas conforme extração (reutilizar disco primeiro)

**Modificados (por tema):**
- `content/cards/contorno-corporal/<tema>/anatomia.json` — reescrito 100% em v2
- `content/images/manifest.json` — regen após cada tema
- `content/cards/_pending_images.md` — regen após cada tema
- `webapp/library/sw.js` — cache bump v18 → v19 no último commit do PR

### PR 4B — Estética facial

**Criados (por tema):**
- `content/images/<tema>/img-*.json` — library entries (5 para blefaro, 5 para rino, 2 para oto, 4 para ritido)
- `assets/images/<tema>/*.png` — figuras novas conforme extração

**Modificados (por tema):**
- `content/cards/estetica-facial/<tema>/anatomia.json` — reescrito 100% em v2
- `content/images/manifest.json` — regen após cada tema
- `content/cards/_pending_images.md` — regen após cada tema
- `webapp/library/sw.js` — cache bump v19 → v20 no último commit do PR

---

## Convenções usadas neste plano

- `<tema>` placeholder resolvido em cada task (nunca deixar literal no commit)
- Commits seguem convenção existente: `feat(cards)`, `feat(images)`, `chore(images)`, `fix(cards)`, `test(tools)`, `feat(tools)`, `docs(plans)`
- Sempre rodar `npx ajv ... --spec=draft2020 --strict=false` (schema draft-2020-12; default do ajv-cli é draft-07)
- Sempre rodar `node tools/validate_briefings.mjs --theme=both` após reescrita de anatomia
- Imagens: nomes ASCII, sem diacríticos (regra CLAUDE.md)
- Textos: sempre com diacríticos portugueses (regra CLAUDE.md)
- Nunca fazer amend em commit publicado; criar commit novo se hook falhar
- Cada subagente Haiku dispatchado via `Agent` tool, subagent_type=general-purpose, model=haiku

---

## PR 4.0 — Preparação do pipeline

### Task 0.1: Branch setup

**Files:** nenhum arquivo modificado; apenas git.

- [ ] **Step 1: Sincronizar master e criar branch**

Run:
```bash
git fetch origin
git checkout master
git pull origin master
git checkout -b feature/card-uniformity-phase-4-prep
```
Expected: branch `feature/card-uniformity-phase-4-prep` criada a partir de `origin/master`.

---

### Task 0.2: Corrigir acentuação de abdominoplastia

**Files:**
- Modify: `content/cards/contorno-corporal/abdominoplastia/anatomia.json` (5 cards)
- Modify: `content/images/abdominoplastia/img-abdominal-layers-001.json`
- Modify: `content/images/abdominoplastia/img-huger-zones-001.json`
- Modify: `content/images/abdominoplastia/img-scarpa-lymphatics-001.json`
- Modify: `content/images/abdominoplastia/img-aesthetic-subunits-001.json`
- Modify: `content/images/abdominoplastia/img-pdsea-preservation-001.json`

**Contexto de execução:** Passada manual, não automatizada. Leitura contextual — nem todo "c" antes de "a" vira "ç"; "e" em "Scarpa" nunca vira "é". Termos técnicos que **NÃO** levam acento: Scarpa, Huger, PDSEA, SAT, DAT, Matarasso, Neligan, Grabb, Smith, Colwell, NEJM.

- [ ] **Step 1: Ler cada JSON e listar palavras-alvo**

Para cada um dos 6 arquivos listados acima, ler com `Read` e identificar os campos `one_liner`, `structures[].description`, `clinical_hook`, `how_to_identify`, `subject`, `default_caption`, `labels[].text`, `credit`, `source`. Fazer uma lista mental (ou rascunho) das palavras PT-BR a acentuar.

Exemplos esperados:
- "fascia" → "fáscia"
- "musculo" → "músculo"
- "disseccao" → "dissecação"
- "histologia" → "histologia" (não muda)
- "umbigo" → "umbigo" (não muda)
- "perfusao" → "perfusão"
- "estetica" / "esteticas" → "estética" / "estéticas"
- "camadas" → "camadas" (não muda)
- "anteroinferior" → "anteroinferior" (sem hífen; consultar Neligan pt-br)
- "linfaticos" → "linfáticos"
- "subcutanea" → "subcutânea"

- [ ] **Step 2: Aplicar correções em `anatomia.json`**

Use `Edit` com `replace_all: false` em cada ocorrência para garantir unicidade. Se uma palavra aparece em múltiplos pontos do mesmo arquivo, pode-se usar `replace_all: true` **apenas** quando a forma correta é sempre a mesma (ex: `"fascia"` → `"fáscia"` é seguro; `"palpebra"` → `"pálpebra"` idem).

Exemplo de Edit:
```
Edit(
  file_path: "content/cards/contorno-corporal/abdominoplastia/anatomia.json",
  old_string: "fascia de Scarpa",
  new_string: "fáscia de Scarpa",
  replace_all: true
)
```

Não tocar em nomes próprios (Scarpa, Huger, PDSEA, SAT, DAT, Matarasso).

- [ ] **Step 3: Aplicar correções nos 5 library entries**

Mesma abordagem, um arquivo por vez. Cuidado especial com `labels[].text` — descrições podem misturar termos PT/EN (ex: `"SAT (superficial adipose tissue) - gordura subcutânea superficial."`), manter o EN em inglês e acentuar só o PT.

- [ ] **Step 4: Validar JSONs via ajv**

Run:
```bash
npx ajv validate --spec=draft2020 --strict=false \
  -s content/cards/schema.json \
  -d "content/cards/contorno-corporal/abdominoplastia/anatomia.json"
npx ajv validate --spec=draft2020 --strict=false \
  -s content/images/_schema.json \
  -d "content/images/abdominoplastia/*.json"
```
Expected: todos `valid`.

- [ ] **Step 5: Rodar validate_briefings.mjs**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: abdominoplastia passa light+dark, 14 imgs, 0 broken/placeholder. Text-level mudanças não devem afetar conteudo visual.

- [ ] **Step 6: Commit**

Run:
```bash
git add content/cards/contorno-corporal/abdominoplastia/anatomia.json \
        content/images/abdominoplastia/*.json
git commit -m "fix(cards): restore Portuguese diacritics in abdominoplastia v2 pilot

Piloto anatomy v2 foi entregue sem acentos (débito registrado em
project_debt_abdominoplastia_v2_accents.md). Passada manual nos 10
JSONs para restaurar fáscia/músculo/dissecação/etc. Termos técnicos
em inglês (Scarpa, Huger, PDSEA, SAT, DAT) mantidos sem acento.

Viola regra #2 do CLAUDE.md se não corrigido antes do sweep Fase 4."
```

---

### Task 0.3: Criar template canônico do subagente

**Files:**
- Create: `docs/superpowers/templates/anatomy-v2-tema.md`

- [ ] **Step 1: Criar o diretório de templates (se não existir)**

Run: `test -d docs/superpowers/templates || mkdir -p docs/superpowers/templates`
Expected: diretório existe.

- [ ] **Step 2: Escrever o template**

Create `docs/superpowers/templates/anatomy-v2-tema.md`:

````markdown
# Template Canônico — Migração de Anatomia para Schema v2

Este documento é o **prompt operacional** do subagente Haiku que reescreve `anatomia.json` de cada tema no formato v2 durante a Fase 4.

## Contexto passado ao subagente

Você vai receber três artefatos:
1. O arquivo `anatomia.json` legacy do tema a ser migrado
2. Os library entries já criados para o tema (em `content/images/<tema>/img-*.json`)
3. A lista de quais cards legacy devem receber `images[]` referenciando as library entries

Seu trabalho: produzir um **novo `anatomia.json`** contendo todos os cards legacy migrados para schema v2.

## Regras invioláveis

1. **Português brasileiro com acentuação correta** em todos os campos textuais (`one_liner`, `structures[].description`, `clinical_hook`, `how_to_identify`, `aliases`). Exemplos:
   - `fáscia` (não `fascia`)
   - `músculo` (não `musculo`)
   - `dissecação` (não `disseccao`)
   - `perfusão` (não `perfusao`)
   - `estética` (não `estetica`)
   - `técnica` (não `tecnica`)
   - `artéria`, `veia`, `nervo` (nomes anatômicos preservam acento)

2. **Termos técnicos em inglês ou siglas NÃO levam acento português:** Scarpa, Huger, PDSEA, SAT, DAT, Matarasso, Neligan, Grabb, Smith, Colwell, DIEA, SIEA, SMAS, TCA. Mantenha exatamente como no material-fonte.

3. **Preserve o `id` do card legacy.** `lipo-anat-001` continua `lipo-anat-001`. Não renumere.

4. **Mapeamento de campos legacy → v2:**

| Campo legacy | Campo v2 | Regra |
|---|---|---|
| `definition` | `one_liner` | Condensar para ≤160 caracteres |
| `location` | `how_to_identify` OU 1 entry em `structures[]` | Decisão editorial: se a location é uma região espacial numerável na figura, vira structure; caso contrário, integra how_to_identify |
| `relations` | `clinical_hook` OU `structures[].description` | Mesma lógica |
| `surgical_relevance` | `clinical_hook` | Condensar para ≤200 caracteres, preservar vírgulas e acentos |
| `how_to_identify` | `how_to_identify` | Mantém (limpar acentos se necessário) |
| `id` | `id` | Preservado |
| `tags`, `aliases`, `citations`, `updates` | Idem | Mantém |
| `images[{file,caption,credit}]` | `images[{ref}]` via library entry | Apenas nos cards escolhidos |

5. **Para cards SEM anatomia espacial clara** (ex: "PMI", "Zonas de Segurança e Perigo", "Melanócito epidérmico"): use `structures[]` com **uma única entry** representando o conceito principal.

   Exemplo:
   ```json
   "structures": [
     { "label": "PMI", "description": "Ponto mais côncavo da silhueta lateral." }
   ]
   ```

6. **Respeitar limites de caracteres do schema:**
   - `structures[].label`: ≤60 chars
   - `structures[].description`: ≤80 chars
   - `one_liner`: ≤160 chars (recomendado)
   - `clinical_hook`: ≤200 chars (recomendado)

7. **Output:** JSON válido puro. Sem comentários, sem prosa, sem markdown. O arquivo de saída deve ser aceito por `ajv validate` contra `content/cards/schema.json`.

## Estrutura esperada de cada card v2

```json
{
  "id": "<preservado-do-legacy>",
  "type": "anatomy",
  "title": "<título do card>",
  "aliases": ["...", "..."],
  "topic": "<tema>",
  "area": "<area>",
  "one_liner": "Frase-resumo em português com acentos.",
  "structures": [
    { "label": "...", "description": "..." }
  ],
  "clinical_hook": "Por que isto importa cirurgicamente, em português.",
  "how_to_identify": "Como reconhecer a estrutura no campo operatório.",
  "images": [
    { "ref": "img-<slug>-NNN" }
  ],
  "citations": ["Neligan ...", "Grabb ..."],
  "updates": [],
  "tags": ["anatomia", "<tema>", ...]
}
```

Cards que **não** devem receber imagens: `"images": []`.

## Checklist antes de retornar o JSON

- [ ] Todos os `id` legacy preservados
- [ ] Nenhum campo `definition`, `location`, `relations`, `surgical_relevance` restante
- [ ] Textos em português com diacríticos corretos
- [ ] Termos técnicos em inglês sem acento
- [ ] `structures[]` presente em cada card (min 1 entry para cards conceituais)
- [ ] `images` preenchido só nos cards escolhidos
- [ ] JSON sintaticamente válido (array de objetos)
````

- [ ] **Step 3: Commit**

Run:
```bash
git add docs/superpowers/templates/anatomy-v2-tema.md
git commit -m "docs(templates): add anatomy v2 migration subagent template

Template canônico consumido pelo subagente Haiku durante Fase 4 em
cada migração de tema. Cobre regras de acentuação, mapeamento
legacy → v2, regra Opção A para cards conceituais, e limites de
schema. Endurecido para evitar o débito do piloto abdominoplastia."
```

---

### Task 0.4: Teste vermelho — validate_briefings.mjs image counts (falha)

**Files:**
- Create: `tools/tests/test_validate_briefings_image_counts.py`

**Contexto:** A extensão do validador (Task 0.5) recebe um novo parâmetro `--expected-image-counts=<path>` ou lê uma constante interna. Aqui, escrevemos o teste primeiro, ele falha porque a feature não existe. Usamos pytest + subprocess para rodar o validador como caixa-preta.

- [ ] **Step 1: Escrever o teste**

Create `tools/tests/test_validate_briefings_image_counts.py`:

```python
import json
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "tools" / "validate_briefings.mjs"


def run_validator(extra_args=None):
    """Invoca o validator em modo dry-run (sem abrir Playwright)."""
    args = ["node", str(VALIDATOR), "--check-image-counts-only"]
    if extra_args:
        args.extend(extra_args)
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True)


def test_image_count_flag_exists():
    """validator aceita --check-image-counts-only sem crashar."""
    result = run_validator()
    # Ainda que falhe por contagem, NÃO deve falhar por flag desconhecida.
    assert "unknown option" not in result.stderr.lower(), result.stderr
    assert "check-image-counts-only" not in result.stderr or \
        "unknown" not in result.stderr.lower()


def test_v2_cards_with_images_pass():
    """Topico com todos os v2 cards tendo images[] passa."""
    # Abdominoplastia pos-4.0 tem 5 cards v2, todos com images[].
    result = run_validator(["--topic", "abdominoplastia"])
    assert result.returncode == 0, f"stderr: {result.stderr}\nstdout: {result.stdout}"


def test_v2_cards_with_empty_images_are_flagged_as_pending(tmp_path):
    """Cards v2 com images: [] nao quebram CI mas aparecem em pendencias."""
    result = run_validator(["--topic", "abdominoplastia", "--report-pending"])
    assert result.returncode == 0
    # Se abdomino tem 5 com imagem, pendencias sao 0 nele.
    assert "abdominoplastia: 0 pendentes" in result.stdout or \
           "abdominoplastia" not in [line for line in result.stdout.split("\n") if "pendentes" in line]


def test_legacy_cards_are_ignored_by_image_count_check():
    """Cards legacy (pele-tumores) nao entram na metrica v2."""
    # melanoma-cutaneo ainda e legacy. Validator nao deve falhar por ele.
    result = run_validator(["--topic", "melanoma-cutaneo"])
    assert result.returncode == 0, result.stderr
```

- [ ] **Step 2: Rodar pytest, confirmar que falha**

Run: `python -m pytest tools/tests/test_validate_briefings_image_counts.py -v`
Expected: todos os 4 tests falham com "unknown option --check-image-counts-only" ou similar. Se algum teste passar por acaso (ex: exit 0 quando deveria exit 1), revise o teste.

- [ ] **Step 3: Commit do teste vermelho**

Run:
```bash
git add tools/tests/test_validate_briefings_image_counts.py
git commit -m "test(tools): failing tests for validate_briefings image count check

Red tests pre-implementation. Cobre: flag aceito, temas v2 com
imagens passam, cards v2 vazios reportam pendencias, cards legacy
sao ignorados pela metrica nova."
```

---

### Task 0.5: Implementar assertion de contagem de imagens no validador

**Files:**
- Modify: `tools/validate_briefings.mjs`

**Contexto:** Adicionar flags `--check-image-counts-only` e `--report-pending`, além de lógica que varre cada `anatomia.json`, filtra cards v2 (`one_liner` presente), e compara `images.length > 0` vs total. Para abdomino: 5/5 cards com imagem → OK.

- [ ] **Step 1: Ler o validador atual**

Run: leia `tools/validate_briefings.mjs` completo para entender a estrutura (parsing de args, loop de temas, modos).

- [ ] **Step 2: Adicionar função de checagem de imagens v2**

Add ao topo do arquivo (abaixo dos imports, acima do main):

```javascript
import fs from 'node:fs';
import path from 'node:path';

const CARDS_ROOT = 'content/cards';

function readAnatomia(area, topic) {
  const p = path.join(CARDS_ROOT, area, topic, 'anatomia.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function isV2Card(card) {
  // v2 tem one_liner; legacy tem definition.
  return typeof card.one_liner === 'string';
}

function countImages(cards) {
  let withImages = 0;
  let pending = 0;
  for (const c of cards) {
    if (!isV2Card(c)) continue;
    if (Array.isArray(c.images) && c.images.length > 0) withImages++;
    else pending++;
  }
  return { withImages, pending, totalV2: withImages + pending };
}

function checkImageCounts(topics) {
  const report = [];
  let hardFail = false;

  for (const { area, topic } of topics) {
    const cards = readAnatomia(area, topic);
    if (!cards) continue;
    const { withImages, pending, totalV2 } = countImages(cards);

    // Se NENHUM card v2 no tema, nao exigimos imagens (tema ainda legacy).
    if (totalV2 === 0) {
      report.push(`${topic}: legacy (sem metrica v2)`);
      continue;
    }

    // Regra: topico com v2 cards deve ter >= min(5, totalV2) com imagens.
    const required = Math.min(5, totalV2);
    const passes = withImages >= required;
    if (!passes) {
      hardFail = true;
      report.push(`${topic}: FAIL ${withImages}/${required} com imagem (${pending} pendentes)`);
    } else {
      report.push(`${topic}: OK ${withImages} com imagem, ${pending} pendentes`);
    }
  }

  return { report, hardFail };
}
```

- [ ] **Step 3: Adicionar parsing dos novos flags**

Onde o validator já parseia argumentos (procure por `--theme` no código atual), adicione:

```javascript
const args = process.argv.slice(2);
const checkImageCountsOnly = args.includes('--check-image-counts-only');
const reportPending = args.includes('--report-pending');
const topicFlagIdx = args.indexOf('--topic');
const onlyTopic = topicFlagIdx >= 0 ? args[topicFlagIdx + 1] : null;
```

- [ ] **Step 4: Conectar modo early-exit**

Após o parse, antes do loop principal de Playwright, adicione:

```javascript
if (checkImageCountsOnly) {
  const manifest = JSON.parse(fs.readFileSync('content/cards/manifest.json', 'utf8'));
  const topics = onlyTopic
    ? manifest.filter(m => m.topic === onlyTopic)
    : manifest;
  const { report, hardFail } = checkImageCounts(topics);
  for (const line of report) console.log(line);
  process.exit(hardFail ? 1 : 0);
}
```

- [ ] **Step 5: Integrar ao modo normal do validador**

No fim do loop principal de Playwright (após todos os temas serem verificados), adicione:

```javascript
const manifest = JSON.parse(fs.readFileSync('content/cards/manifest.json', 'utf8'));
const { report: imgReport, hardFail: imgFail } = checkImageCounts(manifest);
console.log('\n=== Image count check ===');
for (const line of imgReport) console.log(line);
if (imgFail) {
  console.error('\nâŒ Image count check failed');
  process.exit(1);
}
```

- [ ] **Step 6: Rodar pytest**

Run: `python -m pytest tools/tests/test_validate_briefings_image_counts.py -v`
Expected: todos os 4 tests passam.

- [ ] **Step 7: Rodar validator em modo normal para garantir não-regressão**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: como antes + nova seção "Image count check" no final reportando abdominoplastia com 5 com imagem, 0 pendentes; demais temas como "legacy (sem métrica v2)".

- [ ] **Step 8: Commit**

Run:
```bash
git add tools/validate_briefings.mjs
git commit -m "feat(tools): image count assertion in validate_briefings

Nova flag --check-image-counts-only + --report-pending + --topic.
Valida que cada topico com cards v2 tenha min(5, totalV2) cards com
images[]. Legacy e ignorado. Passa 4/4 testes pytest."
```

---

### Task 0.6: Teste vermelho — report_pending_images.mjs

**Files:**
- Create: `tools/tests/test_report_pending_images.py`

- [ ] **Step 1: Escrever o teste**

Create `tools/tests/test_report_pending_images.py`:

```python
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools" / "report_pending_images.mjs"
OUTPUT = ROOT / "content" / "cards" / "_pending_images.md"


def test_script_exists():
    assert SCRIPT.exists(), f"{SCRIPT} nao existe"


def test_script_runs_and_writes_output(tmp_path, monkeypatch):
    result = subprocess.run(
        ["node", str(SCRIPT)],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    assert OUTPUT.exists()
    content = OUTPUT.read_text(encoding="utf-8")
    assert "# Pendencias de imagem" in content or "# Pendências de imagem" in content


def test_output_lists_abdominoplastia_with_zero_pending():
    subprocess.run(["node", str(SCRIPT)], cwd=ROOT, check=True)
    content = OUTPUT.read_text(encoding="utf-8")
    # abdominoplastia tem 5/5 com imagens
    assert "abdominoplastia" in content
    # Encontrar a linha de abdominoplastia e checar que diz "0 pendentes" ou equivalente
    for line in content.split("\n"):
        if "abdominoplastia" in line and "pendente" in line.lower():
            assert "0" in line, f"Expected 0 pendentes em abdominoplastia, got: {line}"
            break
```

- [ ] **Step 2: Rodar pytest, confirmar que falha**

Run: `python -m pytest tools/tests/test_report_pending_images.py -v`
Expected: `test_script_exists` falha (arquivo ainda não existe).

- [ ] **Step 3: Commit do teste vermelho**

Run:
```bash
git add tools/tests/test_report_pending_images.py
git commit -m "test(tools): failing tests for report_pending_images script"
```

---

### Task 0.7: Implementar report_pending_images.mjs

**Files:**
- Create: `tools/report_pending_images.mjs`

- [ ] **Step 1: Escrever o script**

Create `tools/report_pending_images.mjs`:

```javascript
#!/usr/bin/env node
// Varre content/cards/**/anatomia.json, detecta cards v2 com images: [],
// e escreve content/cards/_pending_images.md agrupado por topico.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CARDS_ROOT = path.join(ROOT, 'content', 'cards');
const OUTPUT = path.join(CARDS_ROOT, '_pending_images.md');
const MANIFEST = path.join(CARDS_ROOT, 'manifest.json');

function isV2(card) {
  return typeof card.one_liner === 'string';
}

function walk() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const results = [];
  for (const { area, topic, displayName } of manifest) {
    const p = path.join(CARDS_ROOT, area, topic, 'anatomia.json');
    if (!fs.existsSync(p)) continue;
    const cards = JSON.parse(fs.readFileSync(p, 'utf8'));
    const v2 = cards.filter(isV2);
    if (v2.length === 0) continue;
    const pending = v2.filter(c => !Array.isArray(c.images) || c.images.length === 0);
    results.push({ topic, displayName, area, total: v2.length, pending });
  }
  return results;
}

function render(results) {
  const lines = [];
  lines.push('# Pendências de imagem — cards anatomia v2');
  lines.push('');
  lines.push('Gerado automaticamente por `tools/report_pending_images.mjs`. Rode o script e commite junto com cada PR de tema.');
  lines.push('');
  lines.push('| Tema | v2 cards | Com imagem | Pendentes |');
  lines.push('|---|---|---|---|');

  let totalPending = 0;
  for (const r of results) {
    const withImg = r.total - r.pending.length;
    totalPending += r.pending.length;
    lines.push(`| ${r.displayName} | ${r.total} | ${withImg} | ${r.pending.length} |`);
  }
  lines.push(`| **Total** | | | **${totalPending}** |`);
  lines.push('');

  for (const r of results) {
    if (r.pending.length === 0) continue;
    lines.push(`## ${r.displayName} (${r.area}/${r.topic})`);
    lines.push('');
    for (const c of r.pending) {
      lines.push(`- \`${c.id}\` — ${c.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const results = walk();
  const md = render(results);
  fs.writeFileSync(OUTPUT, md, 'utf8');
  const totalPending = results.reduce((a, r) => a + r.pending.length, 0);
  console.log(`Wrote ${OUTPUT} (${totalPending} pendentes)`);
}

main();
```

- [ ] **Step 2: Rodar pytest**

Run: `python -m pytest tools/tests/test_report_pending_images.py -v`
Expected: 3/3 passam. `_pending_images.md` criado, contém abdominoplastia com 0 pendentes.

- [ ] **Step 3: Commit do script + primeiro manifesto**

Run:
```bash
git add tools/report_pending_images.mjs content/cards/_pending_images.md
git commit -m "feat(tools): report_pending_images.mjs + initial manifest

Script standalone que varre cards v2 e gera
content/cards/_pending_images.md agrupando por topico. Primeira
versao commitada com estado atual (abdominoplastia: 0 pendentes)."
```

---

### Task 0.8: Alinhar content/rag/_structure.json anatomy

**Files:**
- Modify: `content/rag/_structure.json`

**Contexto:** Memória das Fases 0-2 sinalizou que o bloco `anatomy` em `_structure.json` ainda lista campos legacy em `purpose` e `required_fields`, enquanto `example` já é v2. Corrigir.

- [ ] **Step 1: Ler o arquivo**

Run: `Read content/rag/_structure.json`, localizar o bloco do tipo `anatomy`.

- [ ] **Step 2: Atualizar `purpose` e `required_fields`**

Substitua os campos obsoletos (`definition`, `location`, `relations`, `surgical_relevance`) por equivalentes v2 (`one_liner`, `structures`, `clinical_hook`, `how_to_identify`) na descrição textual e no array `required_fields`. Preservar `example` (já em v2).

Exemplo de edit:
```
Edit:
  old: "required_fields": ["id", "type", "title", "definition", "surgical_relevance"]
  new: "required_fields": ["id", "type", "title", "one_liner", "structures", "clinical_hook", "how_to_identify"]
```

Ajustar `purpose` para narrar o propósito do card v2 (estrutura numerada + clinical hook + image via library ref) em vez de legacy.

- [ ] **Step 3: Validar JSON**

Run: `python -c "import json; json.load(open('content/rag/_structure.json', encoding='utf-8'))"`
Expected: sem erros de sintaxe.

- [ ] **Step 4: Commit**

Run:
```bash
git add content/rag/_structure.json
git commit -m "docs(rag): align _structure.json anatomy block with v2 schema

Debito carregado da Fase 2: purpose + required_fields ainda
listavam campos legacy (definition, surgical_relevance). Alinhado
a v2 (one_liner, structures, clinical_hook, how_to_identify)."
```

---

### Task 0.9: Verificação end-to-end do PR 4.0

**Files:** nenhum; apenas execução.

- [ ] **Step 1: Rodar todos os testes pytest**

Run: `python -m pytest tools/tests/ -v`
Expected: todos passam (novos + existentes).

- [ ] **Step 2: Rodar ajv em todos os cards**

Run:
```bash
npx ajv validate --spec=draft2020 --strict=false \
  -s content/cards/schema.json \
  -d "content/cards/**/anatomia.json"
```
Expected: todos `valid`.

- [ ] **Step 3: Rodar validate_briefings full**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: 8 temas × 2 themes pass, abdominoplastia 14 imgs 0 broken/placeholder, image count check verde (abdominoplastia: 5/5; demais: legacy).

- [ ] **Step 4: Rodar report_pending_images e confirmar inalterado**

Run: `node tools/report_pending_images.mjs`
Expected: `content/cards/_pending_images.md` regerado idêntico; git status limpo.

- [ ] **Step 5: Push e abrir PR**

Run:
```bash
git push -u origin feature/card-uniformity-phase-4-prep
gh pr create --title "PR 4.0: Card uniformity Phase 4 prep — harden pipeline + fix pilot accents" \
  --body "$(cat <<'EOF'
## Summary
- Corrige débito de acentuação dos 10 JSONs do piloto abdominoplastia
- Endurece `validate_briefings.mjs` com assertion de contagem de imagens por tópico v2
- Adiciona `tools/report_pending_images.mjs` + primeiro `_pending_images.md`
- Cria template canônico do subagente Haiku para Fase 4
- Alinha `content/rag/_structure.json` bloco anatomy com v2

## Test plan
- [x] pytest tools/tests/ todos verdes
- [x] ajv validate todos cards valid
- [x] validate_briefings.mjs --theme=both verde, image count OK
- [x] report_pending_images regenera manifesto sem diff

Prepara terreno para PR 4A (contorno) e PR 4B (face).
EOF
)"
```
Expected: PR criado, URL retornada.

---

## PR 4A — Contorno corporal (lipo → gluteo → pós-bariátrico)

**Pré-requisito:** PR 4.0 mergeado em master.

### Task A.0: Branch setup

- [ ] **Step 1: Atualizar master e criar branch**

Run:
```bash
git checkout master
git pull origin master
git checkout -b feature/card-uniformity-phase-4a-contorno
```

---

### Ciclo padrão intra-tema (aplicado a cada um dos 3 temas)

Para economizar espaço, o ciclo de 7 passos é documentado uma vez e referenciado depois. Cada tema gera ~6 commits (1 por passo de execução, exceto inventário que não commita).

#### Passo 1: Inventário legacy (sem commit)

1. Ler `content/cards/contorno-corporal/<tema>/anatomia.json`
2. Listar todos os cards (id + title)
3. **Escolher os N cards que receberão imagem** (N = min(5, total)). Critério editorial: cards que ancoram planejamento pré-op (camadas, zonas vasculares, landmarks centrais, subunidades, estruturas preservação-crítica).
4. Anotar decisão no rascunho do commit message do passo 5.

#### Passo 2: Extrair/reaproveitar figuras

1. `ls assets/images/<tema>/` — listar imagens já em disco.
2. Para cada um dos N cards escolhidos, identificar se há imagem adequada no disco.
3. Se faltam figuras: `python tools/extract_figures.py --chapter <cap> --page-range <XXX-YYY>` (referência ao capítulo Neligan correspondente).
4. Rodar `python tools/audit_images.py --topic <tema>` para sanity check.
5. Commit das figuras novas (se houver):
```bash
git add assets/images/<tema>/*.png
git commit -m "feat(images): extract <tema> anatomy figures for Phase 4A"
```

#### Passo 3: Criar library entries

1. Para cada uma das N imagens escolhidas, criar `content/images/<tema>/img-<slug>-NNN.json` seguindo o schema `content/images/_schema.json` e o padrão de `content/images/abdominoplastia/*.json`.
2. Campos obrigatórios: `id`, `file`, `subject`, `role`, `source`, `credit`, `default_caption`, `labels[]` (numeradas), `applicable_topics`, `status: "available"`.
3. Textos em português com acentuação. Nomes técnicos em inglês sem acento.
4. Validar: `npx ajv validate --spec=draft2020 --strict=false -s content/images/_schema.json -d "content/images/<tema>/*.json"` → todos `valid`.
5. Commit:
```bash
git add content/images/<tema>/
git commit -m "feat(images): add <tema> library entries for Phase 4A"
```

#### Passo 4: Regenerar manifest de imagens

Run:
```bash
python tools/build_image_manifest.py
git add content/images/manifest.json
git commit -m "chore(images): regenerate manifest including <tema>"
```

#### Passo 5: Reescrever anatomia.json em v2 via subagente Haiku

Dispatch:
```
Agent(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Migrar <tema> anatomy legacy para v2",
  prompt: `<conteúdo de docs/superpowers/templates/anatomy-v2-tema.md>

## Tarefa específica

Tema: <tema>
Área: contorno-corporal
Arquivo legacy: content/cards/contorno-corporal/<tema>/anatomia.json
Library entries disponíveis: content/images/<tema>/img-*.json

Cards que devem receber images[]:
- <id-1> → img-<slug>-001
- <id-2> → img-<slug>-002
...

Cards que ficam images: [] (pendentes):
- <id-6> ...

Leia os arquivos, aplique o template, retorne o novo anatomia.json completo como JSON puro.`
)
```

Revisão humana do output:
1. Abrir diff em editor
2. Conferir acentuação
3. Conferir preservação de `id`
4. Conferir ausência de campos legacy
5. Salvar arquivo revisado

Validar:
```bash
npx ajv validate --spec=draft2020 --strict=false \
  -s content/cards/schema.json \
  -d content/cards/contorno-corporal/<tema>/anatomia.json
python tools/lint_acronyms.py content/cards/contorno-corporal/<tema>/anatomia.json
```

Commit:
```bash
git add content/cards/contorno-corporal/<tema>/anatomia.json
git commit -m "feat(cards): migrate <tema> anatomy to v2 schema

<N> cards migrados, <M> com images[], <P> pendentes registrados
em _pending_images.md. Criterio editorial de imagens: <...>."
```

#### Passo 6: Validate_briefings

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: `<tema>` passa light+dark, 0 broken, image count verde.

Se falhar: corrigir e commit amend no mesmo passo (nunca no passo 5).

#### Passo 7: Auditar órfãs + regenerar manifesto pendências

Run:
```bash
python tools/audit_images.py --topic <tema>
# Se houver orfas: git rm <arquivos> e commit separado
node tools/report_pending_images.mjs
git add content/cards/_pending_images.md
git commit -m "chore(cards): regenerate _pending_images.md after <tema>"
```

---

### Task A.1: Lipoaspiracao (4 cards → 4 com imagem, 0 pendentes)

**Capítulo Neligan:** Vol. 2, cap. 26 (Liposuction — Hoyos/Millard/Matarasso mix; confirmar no TOC PyMuPDF).

- [ ] **Step 1: Inventário** (Passo 1 do ciclo) — todos os 4 cards recebem imagem
- [ ] **Step 2: Figuras** (Passo 2) — reutilizar `assets/images/lipoaspiracao/` (13 imgs em disco); extrair só se algum dos 4 cards não tem figura adequada
- [ ] **Step 3: Library entries** (Passo 3) — 4 entries em `content/images/lipoaspiracao/`
- [ ] **Step 4: Manifest** (Passo 4)
- [ ] **Step 5: Subagente Haiku + revisão + commit** (Passo 5)
- [ ] **Step 6: Validate_briefings** (Passo 6)
- [ ] **Step 7: Órfãs + pending manifest** (Passo 7)

---

### Task A.2: Gluteoplastia (8 cards → 5 com imagem, 3 pendentes)

**Capítulo Neligan:** Vol. 2, cap. 29 (Buttock augmentation / gluteoplasty).

- [ ] **Step 1: Inventário** — escolher 5 dos 8 cards. Critério sugerido: anatomia muscular (glúteo máximo/médio/mínimo), vasculatura (perfurador superior/inferior), relevância para aug/lift. Os 3 pendentes ficam `images: []`.
- [ ] **Step 2: Figuras** — 13 imgs em disco; extrair o que faltar
- [ ] **Step 3: Library entries** — 5 entries
- [ ] **Step 4: Manifest**
- [ ] **Step 5: Subagente Haiku + revisão + commit**
- [ ] **Step 6: Validate_briefings**
- [ ] **Step 7: Órfãs + pending manifest**

---

### Task A.3: Contorno-pos-bariatrico (12 cards → 5 com imagem, 7 pendentes)

**Capítulo Neligan:** Vol. 2, caps. 30-32 (body contouring pós-massive-weight-loss).

- [ ] **Step 1: Inventário** — escolher 5 dos 12. Critério: belt lipectomy anatomy, torsoplasty landmarks, medial thigh lift, brachioplasty key structures. 7 pendentes.
- [ ] **Step 2: Figuras** — 23 imgs em disco; extrair o que faltar
- [ ] **Step 3: Library entries** — 5 entries
- [ ] **Step 4: Manifest**
- [ ] **Step 5: Subagente Haiku + revisão + commit**
- [ ] **Step 6: Validate_briefings**
- [ ] **Step 7: Órfãs + pending manifest**

---

### Task A.4: Bump Service Worker cache v18 → v19

**Files:**
- Modify: `webapp/library/sw.js`

- [ ] **Step 1: Localizar constante de versão**

Run: `grep -n 'v18\|CACHE' webapp/library/sw.js`

- [ ] **Step 2: Atualizar para v19**

Edit onde estiver `biblioteca-v18` ou similar → `biblioteca-v19`. Único ponto no arquivo.

- [ ] **Step 3: Commit**

Run:
```bash
git add webapp/library/sw.js
git commit -m "chore(pwa): bump service worker cache v18 -> v19 for 4A"
```

---

### Task A.5: Verificação end-to-end PR 4A + push

- [ ] **Step 1: Rodar todos os gates**

Run:
```bash
python -m pytest tools/tests/ -v
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d "content/cards/**/anatomia.json"
python tools/lint_acronyms.py content/cards/**/anatomia.json
node tools/validate_briefings.mjs --theme=both
python tools/audit_images.py
```
Expected: tudo verde. _pending_images.md reflete 0+3+7 = 10 novas pendências (contorno).

- [ ] **Step 2: Verificar ausência de legacy nos 4 temas contorno+abdomino**

Run: `grep -rn '"definition"' content/cards/contorno-corporal --include='anatomia.json'`
Expected: 0 matches.

- [ ] **Step 3: Push + PR**

Run:
```bash
git push -u origin feature/card-uniformity-phase-4a-contorno
gh pr create --title "PR 4A: Card uniformity Phase 4 — contorno corporal sweep (lipo, gluteo, pos-bariatrico)" \
  --body "$(cat <<'EOF'
## Summary
- Migra 3 temas de contorno corporal para anatomy v2: lipoaspiracao (4), gluteoplastia (8), contorno-pos-bariatrico (12)
- Cria 14 library entries novas (4+5+5)
- 10 pendencias de imagem registradas em _pending_images.md para follow-ups
- SW cache bump v18 -> v19

## Test plan
- [x] pytest verde
- [x] ajv validate todos cards
- [x] lint_acronyms exit 0
- [x] validate_briefings.mjs --theme=both verde
- [x] audit_images sem orfas
- [x] grep "definition" em contorno-corporal = 0

## Follow-up
- PR 4B (estetica facial) pode comecar apos merge
EOF
)"
```

---

## PR 4B — Estética facial (blefaro → rino → oto → ritido)

**Pré-requisito:** PR 4A mergeado em master.

### Task B.0: Branch setup

- [ ] **Step 1: Atualizar master e criar branch**

Run:
```bash
git checkout master
git pull origin master
git checkout -b feature/card-uniformity-phase-4b-face
```

---

### Task B.1: Blefaroplastia (20 cards → 5 com imagem, 15 pendentes)

**Capítulo Neligan:** Vol. 3, cap. 11 (Upper/lower blepharoplasty).
**Rationale ordem:** tema mais denso primeiro — se o pipeline falha, falha cedo.

- [ ] **Step 1: Inventário** — 47 imagens no disco, 20 cards legacy. Escolher 5 cards ancora. Sugestão: camadas da pálpebra, septo orbital + gordura, tarso + elevadores, compartimentos gordurosos, ligamentos cantais. 15 pendentes.
- [ ] **Step 2: Figuras** — priorizar reuso do disco (muitas já disponíveis)
- [ ] **Step 3: Library entries** — 5 entries
- [ ] **Step 4: Manifest**
- [ ] **Step 5: Subagente Haiku + revisão + commit**
- [ ] **Step 6: Validate_briefings**
- [ ] **Step 7: Órfãs + pending manifest**

---

### Task B.2: Rinoplastia (15 cards → 5 com imagem, 10 pendentes)

**Capítulo Neligan:** Vol. 3, caps. 22-26 (rhinoplasty).

- [ ] **Step 1: Inventário** — escolher 5. Sugestão: osso nasal/ULCs/LLCs, septo nasal + perpendicular da etmoide, SMAS nasal, tip support, valva nasal interna/externa. 10 pendentes.
- [ ] **Step 2: Figuras** — 24 imgs em disco
- [ ] **Step 3: Library entries** — 5 entries
- [ ] **Step 4: Manifest**
- [ ] **Step 5: Subagente Haiku + revisão + commit**
- [ ] **Step 6: Validate_briefings**
- [ ] **Step 7: Órfãs + pending manifest**

---

### Task B.3: Otoplastia (2 cards → 2 com imagem, 0 pendentes)

**Capítulo Neligan:** Vol. 3, cap. 27 (Prominent ear).

- [ ] **Step 1: Inventário** — ambos recebem imagem
- [ ] **Step 2: Figuras** — 15 imgs em disco
- [ ] **Step 3: Library entries** — 2 entries
- [ ] **Step 4: Manifest**
- [ ] **Step 5: Subagente Haiku + revisão + commit**
- [ ] **Step 6: Validate_briefings**
- [ ] **Step 7: Órfãs + pending manifest**

---

### Task B.4: Ritidoplastia (4 cards → 4 com imagem, 0 pendentes)

**Capítulo Neligan:** Vol. 3, caps. 8-10 (facelift / SMAS).

- [ ] **Step 1: Inventário** — todos recebem imagem
- [ ] **Step 2: Figuras** — 20 imgs em disco
- [ ] **Step 3: Library entries** — 4 entries
- [ ] **Step 4: Manifest**
- [ ] **Step 5: Subagente Haiku + revisão + commit**
- [ ] **Step 6: Validate_briefings**
- [ ] **Step 7: Órfãs + pending manifest**

---

### Task B.5: Bump Service Worker cache v19 → v20

**Files:** Modify `webapp/library/sw.js`

- [ ] **Step 1: Atualizar versão**

Edit `biblioteca-v19` → `biblioteca-v20` no único ponto do arquivo.

- [ ] **Step 2: Commit**

Run:
```bash
git add webapp/library/sw.js
git commit -m "chore(pwa): bump service worker cache v19 -> v20 for 4B"
```

---

### Task B.6: Verificação final end-to-end

- [ ] **Step 1: Todos os gates**

Run:
```bash
python -m pytest tools/tests/ -v
npx ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d "content/cards/**/anatomia.json"
python tools/lint_acronyms.py content/cards/**/anatomia.json
node tools/validate_briefings.mjs --theme=both
python tools/audit_images.py
```
Expected: tudo verde. _pending_images.md acumula 10 (contorno) + 15+10+0+0 = 35 pendências totais.

- [ ] **Step 2: Verificar ausência de legacy em contorno + face**

Run:
```bash
grep -rn '"definition"' content/cards/contorno-corporal content/cards/estetica-facial --include='anatomia.json'
```
Expected: 0 matches.

- [ ] **Step 3: Spot-check manual no PWA iPhone**

Dr. Arthur abre PWA em iPhone, navega para 2-3 temas aleatórios pós-merge, confere visual. Não bloqueante do CI, mas é critério declarado de sucesso.

- [ ] **Step 4: Push + PR**

Run:
```bash
git push -u origin feature/card-uniformity-phase-4b-face
gh pr create --title "PR 4B: Card uniformity Phase 4 — estetica facial sweep (blefaro, rino, oto, ritido)" \
  --body "$(cat <<'EOF'
## Summary
- Migra 4 temas de estetica facial para anatomy v2: blefaroplastia (20), rinoplastia (15), otoplastia (2), ritidoplastia (4)
- Cria 16 library entries novas (5+5+2+4)
- 25 novas pendencias de imagem em _pending_images.md (35 total somando com 4A)
- SW cache bump v19 -> v20

## Test plan
- [x] pytest verde
- [x] ajv validate todos cards
- [x] lint_acronyms exit 0
- [x] validate_briefings.mjs --theme=both verde
- [x] audit_images sem orfas
- [x] grep "definition" em contorno-corporal + estetica-facial = 0
- [x] Spot-check manual no PWA iPhone

## Habilita
- Phase 5 (remocao do branch legacy em schema.json + renderer.js)

## Follow-ups
- 35 cards pendentes de imagem, rastreados em _pending_images.md; expansoes incrementais
- Phase 4C (pele/tumores) em spec separada
EOF
)"
```

---

## Cross-Phase Checklist

### Sucesso pós-PR 4B

- [ ] Todos os 3 PRs mergeados em master (4.0 → 4A → 4B) em ordem
- [ ] `ajv validate` sobre `content/cards/**/anatomia.json` → 0 erros
- [ ] `grep '"definition"' content/cards/contorno-corporal content/cards/estetica-facial --include='anatomia.json'` → 0 matches
- [ ] `validate_briefings.mjs --theme=both` → 8 temas × 2 themes pass, 0 broken, 0 placeholders nos cards com imagem
- [ ] `lint_acronyms.py content/cards/**/anatomia.json` → exit 0
- [ ] `audit_images.py` → nenhuma órfã nos 7 temas tocados
- [ ] `content/cards/_pending_images.md` existe e lista 35 pendências
- [ ] Spot-check manual no PWA iPhone OK para ≥2 temas

### Memória a atualizar após PR 4B mergeado

- [ ] Criar memória `project_fase_4_done.md` registrando data, commits de merge, deliverables
- [ ] Remover débito `project_debt_abdominoplastia_v2_accents.md` (foi quitado em PR 4.0)
- [ ] Atualizar `MEMORY.md` index
- [ ] Sinalizar Phase 5 como próximo passo habilitado

---

## Out of Scope (explicit)

- **6 temas de pele/tumores** (melanoma, CBC, CEC, enxertos, retalhos, princípios) — Phase 4C dedicada, design separado
- **Expansão de imagens para os 35 cards pendentes** — follow-ups incrementais, um card ou um tema por PR, fora desta fase
- **Remoção do `oneOf` legacy** em `schema.json` e do branch legacy em `renderer.js` — Phase 5
- **Subseções técnicas/decisões/notas/flashcards** — fora desta fase; Phase 6+ se houver
- **CSS novo ou mudanças no renderer** — renderer v2 já está pronto desde Phase 2; esta fase só alimenta dados
- **Tooling novo além de `report_pending_images.mjs` e extensão de `validate_briefings.mjs`** — não introduzir ferramentas para resolver casos-borda que não apareceram
