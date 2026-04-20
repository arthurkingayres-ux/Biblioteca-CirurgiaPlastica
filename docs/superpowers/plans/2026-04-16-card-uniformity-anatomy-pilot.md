# Atlas — Uniformidade de Cards (Piloto Anatomy) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor atomic `anatomy` cards to enforce a canonical structure (lead line → structures/numbers/relations → clinical hook → numbered image), wire a first-class image library as the source of truth for images, and migrate the abdominoplastia pilot end-to-end in the PWA.

**Architecture:** JSON Schema gains an anatomy-v2 shape via `oneOf` (legacy + v2 coexist during migration). A new image library (`content/images/<tema>/<id>.json` + generated `manifest.json`) is referenced from cards via `{ref}`. The PWA renderer detects schema version and renders the canonical order with new CSS primitives (`.lead-line`, `.chips-row`, `.hook-box`, `.struct-table`). Pilot migrates `abdominoplastia/anatomia.json` only; remaining 7 temas follow in a single sweep phase; legacy fallback is removed last.

**Tech Stack:** JSON Schema (draft 2020-12) + ajv CLI, Python 3 (PyMuPDF, Pillow — existing) + pytest (new dev dep), Node.js (existing Playwright harness `tools/validate_briefings.mjs`), vanilla JS/CSS for PWA renderer, service worker already caches `/content/*` and `/assets/*` (no change needed).

**Spec:** [`docs/superpowers/specs/2026-04-16-card-uniformity-anatomy-pilot-design.md`](../specs/2026-04-16-card-uniformity-anatomy-pilot-design.md) (commit `24d0f64`).

---

## File Structure

Files created or modified, grouped by responsibility.

**Image library (new domain):**
- `content/images/_schema.json` — JSON Schema for library entries (new)
- `content/images/abdominoplastia/*.json` — one entry per image (Phase 3; expanded in Phase 4)
- `content/images/manifest.json` — generated aggregate (Phase 0 stub; regenerated each phase)
- `tools/build_image_manifest.py` — aggregator with TDD tests (new)
- `tools/tests/test_build_image_manifest.py` — pytest for the aggregator (new)
- `tools/tests/__init__.py` — empty, marks the tests package (new)
- `tools/requirements.txt` — add `pytest` (modify)

**Editorial lint:**
- `tools/lint_acronyms.py` — checks siglas expanded on first occurrence per section (new)
- `tools/tests/test_lint_acronyms.py` — pytest (new)

**Card schema:**
- `content/cards/schema.json` — anatomy rewritten as `oneOf: [anatomy_legacy, anatomy_v2]` (modify)
- `content/cards/_structure.json` — anatomy example replaced by v2 shape (modify)

**PWA renderer:**
- `webapp/library/renderer.js` — `anatomy()` branches on schema, resolves image `ref` via library (modify)
- `webapp/library/style.css` — new classes (modify)
- `webapp/library/sw.js` — bump `CACHE_NAME` to invalidate cache (modify)
- `webapp/library/app.js` — load and expose image manifest alongside cards manifest (modify)

**Content migration (Phase 3 pilot + Phase 4 sweep):**
- `content/cards/contorno-corporal/abdominoplastia/anatomia.json` — rewritten for v2 (Phase 3)
- `assets/images/abdominoplastia/*.png` — annotated bitmaps (Phase 3)
- `content/cards/*/*/anatomia.json` — remaining 7 temas (Phase 4)
- `content/images/<tema>/*.json` — library entries for each remaining tema (Phase 4)

**Validation harness:**
- `tools/validate_briefings.mjs` — `TOPICS` list updated to include `abdominoplastia` and run fine on new renderer (modify)

**Cleanup (Phase 5):**
- `webapp/library/renderer.js` — remove legacy branch
- `content/cards/schema.json` — remove `anatomy_legacy` from `oneOf`
- Memory entries updated

---

## Conventions Used in This Plan

- File paths are POSIX relative to the repo root.
- Commit messages follow the existing project style: `feat(cards): ...`, `fix(renderer): ...`, `chore(tools): ...`, `refactor(schema): ...`.
- Every task ends with a commit step. No batched commits across tasks.
- Python tests run via `python -m pytest tools/tests -v`.
- JS/PWA smoke runs via `node tools/validate_briefings.mjs --theme=light` from the repo root.
- When a step says "Expected: PASS" for a test, treat any other outcome as a failure; stop and fix before continuing.

---

## Phase 0 — Image Library Scaffold + Tooling Base

**Rationale:** Land the infrastructure for the image domain before any content changes, with tests proving the aggregator behaves correctly on empty, single, and many-entry inputs. This keeps Phase 3 focused on content only.

### Task 0.1: Add `pytest` as a Python dev dependency

**Files:**
- Modify: `tools/requirements.txt`

- [ ] **Step 1: Append pytest to requirements**

Edit `tools/requirements.txt` — add a blank line then:

```text
pytest>=8.0
```

Final file should end with:

```text
requests>=2.31
python-dotenv>=1.0
anthropic>=0.25
opencv-python>=4.9
Pillow>=10.0
pytest>=8.0
```

- [ ] **Step 2: Install it**

Run: `python -m pip install pytest>=8.0`
Expected: "Successfully installed pytest-…" or "Requirement already satisfied".

- [ ] **Step 3: Verify pytest is importable**

Run: `python -m pytest --version`
Expected: `pytest 8.x.x` printed.

- [ ] **Step 4: Commit**

```bash
git add tools/requirements.txt
git commit -m "chore(tools): add pytest to python dev requirements"
```

---

### Task 0.2: Create empty tests package

**Files:**
- Create: `tools/tests/__init__.py`

- [ ] **Step 1: Create the empty marker file**

Write `tools/tests/__init__.py` with empty content (zero bytes is fine; a single newline is fine).

- [ ] **Step 2: Verify pytest discovers the package**

Run: `python -m pytest tools/tests -v`
Expected: `no tests ran` (exit code 5). This confirms discovery works; collection errors would mean the package is malformed.

- [ ] **Step 3: Commit**

```bash
git add tools/tests/__init__.py
git commit -m "chore(tools): add tests package skeleton"
```

---

### Task 0.3: Define the image library JSON Schema

**Files:**
- Create: `content/images/_schema.json`

- [ ] **Step 1: Write the schema**

Create `content/images/_schema.json` with:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "biblioteca-cirurgia-plastica/image-library-schema",
  "title": "Image Library Entry",
  "description": "One JSON per image — first-class asset referenced from atomic cards",
  "type": "object",
  "required": ["id", "file", "subject", "role", "source", "credit", "default_caption", "applicable_topics", "status"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "string", "pattern": "^img-[a-z0-9-]+-[0-9]{3}$" },
    "file": { "type": "string", "pattern": "^[a-z0-9-]+/[a-z0-9._-]+\\.(png|jpg|jpeg|webp|svg)$" },
    "subject": { "type": "string", "minLength": 4 },
    "role": { "enum": ["overview", "detail", "surgical", "variation", "schematic"] },
    "source": { "type": "string", "minLength": 4 },
    "credit": { "type": "string", "minLength": 4 },
    "default_caption": { "type": "string", "minLength": 4, "maxLength": 200 },
    "labels": {
      "type": "array",
      "default": [],
      "items": {
        "type": "object",
        "required": ["num", "text"],
        "additionalProperties": false,
        "properties": {
          "num": { "type": "integer", "minimum": 1, "maximum": 99 },
          "text": { "type": "string", "minLength": 2, "maxLength": 200 }
        }
      }
    },
    "applicable_topics": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "status": { "enum": ["available", "placeholder"] }
  }
}
```

- [ ] **Step 2: Self-validate the schema using ajv**

Run: `npx ajv compile -s content/images/_schema.json`
Expected: `schema content/images/_schema.json is valid`.

- [ ] **Step 3: Commit**

```bash
git add content/images/_schema.json
git commit -m "feat(images): add json schema for image library entries"
```

---

### Task 0.4: Seed an empty manifest and the tema directory

**Files:**
- Create: `content/images/manifest.json`
- Create: `content/images/abdominoplastia/.gitkeep`

- [ ] **Step 1: Write an empty manifest**

Create `content/images/manifest.json` with:

```json
{
  "generatedAt": "1970-01-01T00:00:00Z",
  "count": 0,
  "entries": []
}
```

- [ ] **Step 2: Create the pilot tema directory with a gitkeep**

Create `content/images/abdominoplastia/.gitkeep` as an empty file.

- [ ] **Step 3: Commit**

```bash
git add content/images/manifest.json content/images/abdominoplastia/.gitkeep
git commit -m "feat(images): seed empty manifest and pilot tema dir"
```

---

### Task 0.5: Write failing test for `build_image_manifest.py` — empty directory

**Files:**
- Create: `tools/tests/test_build_image_manifest.py`

- [ ] **Step 1: Write the failing test**

Create `tools/tests/test_build_image_manifest.py` with:

```python
import json
from pathlib import Path

import pytest

from tools import build_image_manifest


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def test_empty_tree_produces_zero_entries(tmp_path):
    images_root = tmp_path / "content" / "images"
    images_root.mkdir(parents=True)

    manifest = build_image_manifest.build(images_root)

    assert manifest["count"] == 0
    assert manifest["entries"] == []
    assert "generatedAt" in manifest
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tools/tests/test_build_image_manifest.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tools.build_image_manifest'` (or similar import error).

- [ ] **Step 3: Commit the failing test**

```bash
git add tools/tests/test_build_image_manifest.py
git commit -m "test(tools): failing test for empty image manifest build"
```

---

### Task 0.6: Make `tools` importable as a package

**Files:**
- Create: `tools/__init__.py`

- [ ] **Step 1: Create the marker**

Write `tools/__init__.py` with empty content.

- [ ] **Step 2: Commit**

```bash
git add tools/__init__.py
git commit -m "chore(tools): mark tools as python package"
```

---

### Task 0.7: Implement the minimal aggregator to pass the empty-tree test

**Files:**
- Create: `tools/build_image_manifest.py`

- [ ] **Step 1: Write the minimal implementation**

Create `tools/build_image_manifest.py` with:

```python
"""Aggregate content/images/<tema>/*.json into content/images/manifest.json."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ROOT = REPO_ROOT / "content" / "images"
SKIP_NAMES = {"_schema.json", "manifest.json"}


def _iter_entry_files(images_root: Path):
    for path in sorted(images_root.rglob("*.json")):
        if path.name in SKIP_NAMES:
            continue
        yield path


def _load_entry(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path}: invalid JSON ({exc})") from exc


def build(images_root: Path) -> dict:
    entries = []
    for path in _iter_entry_files(images_root):
        entry = _load_entry(path)
        entries.append(entry)
    entries.sort(key=lambda e: e.get("id", ""))
    return {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(entries),
        "entries": entries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    out = args.out or (args.root / "manifest.json")
    manifest = build(args.root)
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out} ({manifest['count']} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Run the empty-tree test**

Run: `python -m pytest tools/tests/test_build_image_manifest.py -v`
Expected: PASS — `test_empty_tree_produces_zero_entries PASSED`.

- [ ] **Step 3: Commit**

```bash
git add tools/build_image_manifest.py
git commit -m "feat(tools): add build_image_manifest aggregator"
```

---

### Task 0.8: Add test — single valid entry aggregates correctly

**Files:**
- Modify: `tools/tests/test_build_image_manifest.py`

- [ ] **Step 1: Append the test**

Add at the bottom of `tools/tests/test_build_image_manifest.py`:

```python
def test_single_entry_is_preserved(tmp_path):
    images_root = tmp_path / "content" / "images"
    tema_dir = images_root / "abdominoplastia"
    tema_dir.mkdir(parents=True)

    entry = {
        "id": "img-huger-zones-overview-001",
        "file": "abdominoplastia/huger-zones-overview.png",
        "subject": "zonas de perfusao",
        "role": "overview",
        "source": "Neligan 5ed, Fig. 98.3",
        "credit": "Adaptado de Neligan 5ed",
        "default_caption": "Tres zonas de perfusao.",
        "labels": [{"num": 1, "text": "Zona I"}],
        "applicable_topics": ["abdominoplastia"],
        "status": "available",
    }
    _write(tema_dir / "img-huger-zones-overview-001.json", entry)

    manifest = build_image_manifest.build(images_root)

    assert manifest["count"] == 1
    assert manifest["entries"][0] == entry
```

- [ ] **Step 2: Run the test**

Run: `python -m pytest tools/tests/test_build_image_manifest.py::test_single_entry_is_preserved -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tools/tests/test_build_image_manifest.py
git commit -m "test(tools): manifest preserves single entry shape"
```

---

### Task 0.9: Add test — entries sorted by id, schema/manifest files skipped

**Files:**
- Modify: `tools/tests/test_build_image_manifest.py`

- [ ] **Step 1: Append the test**

Add at the bottom of `tools/tests/test_build_image_manifest.py`:

```python
def test_entries_sorted_and_infrastructure_skipped(tmp_path):
    images_root = tmp_path / "content" / "images"
    tema_dir = images_root / "abdominoplastia"
    tema_dir.mkdir(parents=True)

    base = {
        "file": "abdominoplastia/x.png",
        "subject": "s",
        "role": "overview",
        "source": "src",
        "credit": "c",
        "default_caption": "cap",
        "labels": [],
        "applicable_topics": ["abdominoplastia"],
        "status": "available",
    }
    _write(tema_dir / "img-b.json", {**base, "id": "img-b-001"})
    _write(tema_dir / "img-a.json", {**base, "id": "img-a-001"})
    _write(images_root / "_schema.json", {"ignored": True})
    _write(images_root / "manifest.json", {"ignored": True})

    manifest = build_image_manifest.build(images_root)

    ids = [e["id"] for e in manifest["entries"]]
    assert ids == ["img-a-001", "img-b-001"]
    assert manifest["count"] == 2
```

- [ ] **Step 2: Run the test**

Run: `python -m pytest tools/tests/test_build_image_manifest.py::test_entries_sorted_and_infrastructure_skipped -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tools/tests/test_build_image_manifest.py
git commit -m "test(tools): manifest sorts by id and skips infra files"
```

---

### Task 0.10: Add test — malformed JSON raises a clear error

**Files:**
- Modify: `tools/tests/test_build_image_manifest.py`

- [ ] **Step 1: Append the test**

Add at the bottom of `tools/tests/test_build_image_manifest.py`:

```python
def test_malformed_json_is_reported(tmp_path):
    images_root = tmp_path / "content" / "images"
    tema_dir = images_root / "abdominoplastia"
    tema_dir.mkdir(parents=True)
    (tema_dir / "img-broken.json").write_text("{not-json", encoding="utf-8")

    with pytest.raises(ValueError, match="img-broken.json"):
        build_image_manifest.build(images_root)
```

- [ ] **Step 2: Run the test**

Run: `python -m pytest tools/tests/test_build_image_manifest.py::test_malformed_json_is_reported -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tools/tests/test_build_image_manifest.py
git commit -m "test(tools): manifest raises ValueError on malformed entry"
```

---

### Task 0.11: Verify the CLI wrapper produces a valid manifest

**Files:** (no edits — smoke test)

- [ ] **Step 1: Run the CLI against the empty repo dir**

Run: `python tools/build_image_manifest.py`
Expected: `wrote .../content/images/manifest.json (0 entries)`.

- [ ] **Step 2: Confirm the file is well-formed JSON**

Run: `python -c "import json,pathlib; d=json.loads(pathlib.Path('content/images/manifest.json').read_text('utf-8')); print(d['count'])"`
Expected: `0`.

- [ ] **Step 3: Commit the regenerated manifest**

```bash
git add content/images/manifest.json
git commit -m "chore(images): regenerate empty manifest via build tool"
```

---

### Task 0.12: Add failing test — `lint_acronyms` flags unexpanded acronym

**Files:**
- Create: `tools/tests/test_lint_acronyms.py`

- [ ] **Step 1: Write the failing test**

Create `tools/tests/test_lint_acronyms.py` with:

```python
from tools import lint_acronyms


def test_unexpanded_acronym_is_flagged():
    text = "A DIEA e o vaso dominante."
    issues = lint_acronyms.scan_text(text, context="abdo-anat-002:definition")
    assert any("DIEA" in i["acronym"] for i in issues)


def test_expanded_first_use_is_ok():
    text = "DIEA (Arteria Epigastrica Profunda Inferior) e dominante; depois mencionamos DIEA novamente."
    issues = lint_acronyms.scan_text(text, context="abdo-anat-002:definition")
    assert issues == []


def test_non_acronym_word_is_ignored():
    text = "Paciente masculino com historia previa."
    issues = lint_acronyms.scan_text(text, context="abdo-anat-001:definition")
    assert issues == []
```

- [ ] **Step 2: Run the tests**

Run: `python -m pytest tools/tests/test_lint_acronyms.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tools.lint_acronyms'`.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tools/tests/test_lint_acronyms.py
git commit -m "test(tools): failing tests for acronym linter"
```

---

### Task 0.13: Implement `lint_acronyms.py` to pass the tests

**Files:**
- Create: `tools/lint_acronyms.py`

- [ ] **Step 1: Write the implementation**

Create `tools/lint_acronyms.py` with:

```python
"""Editorial lint: every 2-6 char all-caps acronym must be expanded on first use.

An acronym is considered "expanded" when it is immediately followed by a
parenthesised phrase whose first letter matches the first letter of the acronym,
e.g. DIEA (Arteria Epigastrica Profunda Inferior).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

ACRONYM_RE = re.compile(r"\b([A-Z]{2,6})\b")
EXPANSION_RE = re.compile(r"\s*\(([^)]+)\)")

ALLOWED = {"PRS", "ASJ", "CPS", "RBCP", "JPRAS", "RCT", "SBCP"}


@dataclass
class Issue:
    acronym: str
    context: str


def scan_text(text: str, context: str) -> list[dict]:
    seen_expanded: set[str] = set()
    issues: list[Issue] = []
    for match in ACRONYM_RE.finditer(text):
        acronym = match.group(1)
        if acronym in ALLOWED or acronym in seen_expanded:
            continue
        tail = text[match.end():]
        exp = EXPANSION_RE.match(tail)
        if exp:
            seen_expanded.add(acronym)
            continue
        issues.append(Issue(acronym=acronym, context=context))
    return [{"acronym": i.acronym, "context": i.context} for i in issues]


def scan_card(card: dict) -> list[dict]:
    out: list[dict] = []
    card_id = card.get("id", "?")
    for field in ("one_liner", "location", "clinical_hook", "how_to_identify", "definition", "surgical_relevance"):
        value = card.get(field)
        if isinstance(value, str):
            out.extend(scan_text(value, context=f"{card_id}:{field}"))
    return out


def main(argv: Iterable[str] | None = None) -> int:
    import argparse
    import json
    import sys
    from pathlib import Path

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args(list(argv) if argv is not None else None)

    total: list[dict] = []
    for path in args.paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        cards = data if isinstance(data, list) else [data]
        for card in cards:
            total.extend(scan_card(card))

    for issue in total:
        print(f"{issue['context']}: '{issue['acronym']}' used without expansion", file=sys.stderr)
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Run the tests**

Run: `python -m pytest tools/tests/test_lint_acronyms.py -v`
Expected: PASS — all three tests green.

- [ ] **Step 3: Commit**

```bash
git add tools/lint_acronyms.py
git commit -m "feat(tools): add acronym-expansion linter"
```

---

### Task 0.14: Phase 0 verification

- [ ] **Step 1: Run the full test suite**

Run: `python -m pytest tools/tests -v`
Expected: 7 tests, all PASS (4 for manifest builder, 3 for acronym linter).

- [ ] **Step 2: Validate the empty manifest against the schema**

Run: `npx ajv validate -s content/images/_schema.json -d "content/images/manifest.json" --strict=false`
Expected: Note — manifest is not a library entry, so this will fail. Instead confirm manifest is valid JSON:
Run: `python -c "import json; json.loads(open('content/images/manifest.json', encoding='utf-8').read()); print('ok')"`
Expected: `ok`.

- [ ] **Step 3: Confirm existing cards still validate**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false`
Expected: every card prints `valid`. No schema change yet — this is the baseline for Phase 1.

Phase 0 complete. Open PR `feature/card-uniformity-phase-0` and merge before starting Phase 1.

---

## Phase 1 — Anatomy Schema v2 + Backward Compatibility

**Rationale:** Land the schema for anatomy v2 while legacy cards keep validating. `oneOf` lets existing content stay green while new content uses the strict shape.

### Task 1.1: Write failing schema test — legacy anatomy card must still validate

**Files:**
- Create: `tools/tests/test_schema_anatomy.mjs`

This phase tests schema validation with Node. We pick Node because ajv ships there and we already use it for `validate_briefings.mjs`.

- [ ] **Step 1: Write the failing test**

Create `tools/tests/test_schema_anatomy.mjs` with:

```javascript
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';

const schema = JSON.parse(readFileSync('content/cards/schema.json', 'utf-8'));
const ajv = new Ajv({ strict: false, allErrors: true });
const validateAnatomy = ajv.compile({ ...schema, $ref: '#/$defs/anatomy' });

test('legacy anatomy card with definition still validates', () => {
  const legacy = {
    id: 'abdo-anat-001',
    type: 'anatomy',
    title: 'Camadas',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    definition: 'A parede abdominal tem sete camadas.',
    location: 'Abdome anterior.',
    citations: ['Neligan 2023'],
    tags: ['anatomia']
  };
  const ok = validateAnatomy(legacy);
  assert.equal(ok, true, JSON.stringify(validateAnatomy.errors));
});

test('v2 anatomy card with one_liner + clinical_hook validates', () => {
  const v2 = {
    id: 'abdo-anat-002',
    type: 'anatomy',
    title: 'Zonas de Huger',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    one_liner: 'Tres zonas de perfusao; Zona III sustenta o retalho.',
    clinical_hook: 'V invertido preserva Zona III — chave de viabilidade.',
    citations: ['Neligan 2023'],
    tags: ['anatomia']
  };
  const ok = validateAnatomy(v2);
  assert.equal(ok, true, JSON.stringify(validateAnatomy.errors));
});

test('v2 anatomy rejects one_liner over cap', () => {
  const tooLong = {
    id: 'abdo-anat-003',
    type: 'anatomy',
    title: 'X',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    one_liner: 'x'.repeat(161),
    clinical_hook: 'ok',
    citations: ['c'],
    tags: ['t']
  };
  const ok = validateAnatomy(tooLong);
  assert.equal(ok, false);
});

test('anatomy rejects card missing both definition and one_liner', () => {
  const bare = {
    id: 'abdo-anat-004',
    type: 'anatomy',
    title: 'X',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    citations: ['c'],
    tags: ['t']
  };
  const ok = validateAnatomy(bare);
  assert.equal(ok, false);
});
```

- [ ] **Step 2: Run the tests**

Run: `node --test tools/tests/test_schema_anatomy.mjs`
Expected: the v2 tests FAIL — current schema has only the legacy shape. Legacy test may pass.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tools/tests/test_schema_anatomy.mjs
git commit -m "test(schema): failing tests for anatomy v2 shape"
```

---

### Task 1.2: Extend `anatomy` in `schema.json` to `oneOf` legacy + v2

**Files:**
- Modify: `content/cards/schema.json`

- [ ] **Step 1: Replace the anatomy definition**

In `content/cards/schema.json`, replace the entire `"anatomy": { ... }` object in `$defs` (lines 43–77 in the current file) with:

```json
    "anatomy": {
      "oneOf": [
        { "$ref": "#/$defs/anatomy_legacy" },
        { "$ref": "#/$defs/anatomy_v2" }
      ]
    },
    "anatomy_legacy": {
      "type": "object",
      "required": ["id", "type", "title", "topic", "area", "definition", "location", "citations", "tags"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z]+-anat-" },
        "type": { "const": "anatomy" },
        "title": { "type": "string" },
        "aliases": { "type": "array", "items": { "type": "string" }, "default": [] },
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "definition": { "type": "string" },
        "location": { "type": "string" },
        "relations": { "type": "array", "items": { "type": "string" }, "default": [] },
        "surgical_relevance": { "type": "string" },
        "how_to_identify": { "type": "string" },
        "images": {
          "type": "array",
          "default": [],
          "items": {
            "type": "object",
            "required": ["file", "caption", "credit"],
            "additionalProperties": false,
            "properties": {
              "file":    { "type": "string", "pattern": "^[a-z0-9._-]+\\.(jpg|jpeg|png|webp|svg)$" },
              "caption": { "type": "string", "minLength": 4 },
              "credit":  { "type": "string", "minLength": 4 }
            }
          }
        },
        "citations": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "updates": { "type": "array", "items": { "$ref": "#/$defs/update" }, "default": [] },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "anatomy_v2": {
      "type": "object",
      "required": ["id", "type", "title", "topic", "area", "one_liner", "clinical_hook", "citations", "tags"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z]+-anat-" },
        "type": { "const": "anatomy" },
        "title": { "type": "string", "maxLength": 60 },
        "aliases": { "type": "array", "items": { "type": "string", "maxLength": 60 }, "default": [] },
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "one_liner": { "type": "string", "maxLength": 160 },
        "structures": {
          "type": "array",
          "default": [],
          "items": {
            "type": "object",
            "required": ["label", "description"],
            "additionalProperties": false,
            "properties": {
              "label": { "type": "string", "maxLength": 60 },
              "description": { "type": "string", "maxLength": 80 }
            }
          }
        },
        "numbers": {
          "type": "array",
          "default": [],
          "items": {
            "type": "object",
            "required": ["label", "value"],
            "additionalProperties": false,
            "properties": {
              "label": { "type": "string", "maxLength": 40 },
              "value": { "type": "string", "maxLength": 30 },
              "note": { "type": "string", "maxLength": 60 }
            }
          }
        },
        "relations": { "type": "array", "items": { "type": "string", "maxLength": 80 }, "default": [] },
        "location": { "type": "string", "maxLength": 200 },
        "clinical_hook": { "type": "string", "maxLength": 200 },
        "how_to_identify": { "type": "string", "maxLength": 150 },
        "images": {
          "type": "array",
          "default": [],
          "items": {
            "type": "object",
            "required": ["ref"],
            "additionalProperties": false,
            "properties": {
              "ref": { "type": "string", "pattern": "^img-[a-z0-9-]+-[0-9]{3}$" },
              "caption_override": { "type": "string", "minLength": 4, "maxLength": 200 }
            }
          }
        },
        "citations": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "updates": { "type": "array", "items": { "$ref": "#/$defs/update" }, "default": [] },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
```

The `anatomy_common` entry is reserved for future shared sub-refs if needed; for now both shapes inline their fields to keep `additionalProperties: false` simple.

- [ ] **Step 2: Run the schema tests**

Run: `node --test tools/tests/test_schema_anatomy.mjs`
Expected: all 4 tests PASS.

- [ ] **Step 3: Confirm existing cards still validate**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false`
Expected: every card prints `valid`. If any fail, fix the schema — legacy cards must not regress.

- [ ] **Step 4: Commit**

```bash
git add content/cards/schema.json
git commit -m "feat(schema): add anatomy v2 shape via oneOf with legacy fallback"
```

---

### Task 1.3: Update `_structure.json` docs with the v2 example

**Files:**
- Modify: `content/cards/_structure.json`

- [ ] **Step 1: Locate the anatomy example**

Open `content/cards/_structure.json`, find the entry describing the `anatomy` type (it contains the example card). Replace its `example` block with the v2 shape below and add a short note that both shapes are accepted during migration.

Replace the example with:

```json
      "example": {
        "id": "abdo-anat-002",
        "type": "anatomy",
        "title": "Zonas de Huger",
        "aliases": ["zonas vasculares de Huger", "Huger zones"],
        "topic": "abdominoplastia",
        "area": "contorno-corporal",
        "one_liner": "Tres zonas de perfusao da parede abdominal (Huger, 1979); Zona III sustenta o retalho apos disseccao.",
        "structures": [
          { "label": "Zona I", "description": "DIEA + SIEA · central · ligada na disseccao" },
          { "label": "Zona II", "description": "SCIA + SIEA · inguinal · tambem comprometida" },
          { "label": "Zona III", "description": "intercostais + subcostais + lombares · dominante pos-op" }
        ],
        "relations": [
          "Perfurantes da Zona III entram entre linha axilar anterior e hemiclavicular",
          "Arcada de Thompson conecta DIEA a toracica interna"
        ],
        "clinical_hook": "Descolagem em V invertido preserva perfurantes da Zona III — chave da viabilidade do retalho.",
        "images": [
          { "ref": "img-huger-zones-overview-001" }
        ],
        "citations": ["Neligan 2023, vol. 2, cap. 27"],
        "tags": ["anatomia", "vascularizacao", "zonas-huger"]
      }
```

If the file has an explicit `note` or `description` field for anatomy, append: `"Durante a migracao, cards anatomy aceitam tanto a shape legacy (definition/surgical_relevance) quanto a v2 (one_liner/clinical_hook + structures/numbers/images.ref)."`.

- [ ] **Step 2: Validate the example**

Run: `python -c "import json; d=json.load(open('content/cards/_structure.json', encoding='utf-8')); print('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add content/cards/_structure.json
git commit -m "docs(cards): update anatomy example to v2 shape"
```

---

### Task 1.4: Phase 1 verification

- [ ] **Step 1: Run all schema tests**

Run: `node --test tools/tests/test_schema_anatomy.mjs`
Expected: 4/4 PASS.

- [ ] **Step 2: Validate every existing card**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false 2>&1 | grep -v "valid$" | head -20`
Expected: no lines printed (all cards valid).

Phase 1 complete. Open PR `feature/card-uniformity-phase-1` and merge before starting Phase 2.

---

## Phase 2 — Renderer + CSS for v2 (with legacy fallback)

**Rationale:** The PWA must render both shapes until Phase 4 finishes the sweep. We ship CSS primitives (`.lead-line`, `.chips-row`, `.chip`, `.struct-table`, `.hook-box`) and a branched `anatomy()` renderer. The image library manifest is loaded alongside the cards manifest so `ref` resolution stays offline-friendly.

### Task 2.1: Load image manifest in `app.js` alongside cards manifest

**Files:**
- Modify: `webapp/library/app.js`

- [ ] **Step 1: Locate the manifest loader**

Open `webapp/library/app.js`. Find the `MANIFEST_URL` constant and the function that fetches it (search for `manifest.json`). Near that, add a sibling fetch for `content/images/manifest.json`.

- [ ] **Step 2: Add the image manifest fetch**

Immediately below the existing `const MANIFEST_URL = ...` line, add:

```javascript
const IMAGE_MANIFEST_URL = '../../content/images/manifest.json';
```

In the same module, add this helper at file scope (near other helpers, e.g. just before the main init function):

```javascript
let _imageIndex = null;

async function loadImageIndex() {
  if (_imageIndex) return _imageIndex;
  try {
    const resp = await fetch(IMAGE_MANIFEST_URL);
    if (!resp.ok) { _imageIndex = new Map(); return _imageIndex; }
    const data = await resp.json();
    _imageIndex = new Map((data.entries || []).map(e => [e.id, e]));
  } catch (_) {
    _imageIndex = new Map();
  }
  return _imageIndex;
}

window.Atlas = window.Atlas || {};
window.Atlas.loadImageIndex = loadImageIndex;
```

Also, in whatever bootstrap call already awaits the cards manifest (look for `await fetch(MANIFEST_URL)` and its surrounding function), add `await loadImageIndex();` on the line right after the cards manifest is parsed.

- [ ] **Step 3: Verify the page still boots**

Run: `node tools/validate_briefings.mjs --theme=light`
Expected: the harness passes for all four existing topics (no regressions).

- [ ] **Step 4: Commit**

```bash
git add webapp/library/app.js
git commit -m "feat(pwa): load image library manifest alongside cards manifest"
```

---

### Task 2.2: Add the new CSS primitives

**Files:**
- Modify: `webapp/library/style.css`

- [ ] **Step 1: Append the new rules**

At the end of `webapp/library/style.css`, add:

```css
/* === Anatomy v2 primitives === */
.lead-line {
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text);
  margin: 0.5rem 0 0.25rem;
}
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.5rem 0;
}
.chip {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  background: var(--chip-bg, #eef4ff);
  color: var(--chip-fg, #1d4ed8);
  border: 1px solid var(--chip-border, #bfdbfe);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}
.chip .chip-value { font-weight: 700; }
.chip .chip-note { color: var(--muted, #64748b); font-weight: 500; font-size: 0.72rem; }
[data-theme="dark"] .chip {
  background: rgba(59, 130, 246, 0.15);
  color: #bfdbfe;
  border-color: rgba(59, 130, 246, 0.35);
}
.struct-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin-top: 0.35rem;
}
.struct-table td {
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid var(--divider, #e5e7eb);
  vertical-align: top;
}
.struct-table td:first-child {
  font-weight: 700;
  width: 30%;
  white-space: nowrap;
}
.struct-table tr:last-child td { border-bottom: none; }
.hook-box {
  background: var(--hook-bg, #fef2f2);
  border-left: 4px solid var(--hook-border, #dc2626);
  padding: 0.65rem 0.85rem;
  border-radius: 0.35rem;
  margin-top: 0.75rem;
}
.hook-label {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--hook-label, #991b1b);
  font-weight: 700;
  margin-bottom: 0.2rem;
}
[data-theme="dark"] .hook-box {
  background: rgba(220, 38, 38, 0.12);
  border-left-color: #ef4444;
}
[data-theme="dark"] .hook-label { color: #fca5a5; }
.card-figure .fig-legend {
  background: var(--legend-bg, #f5f9ff);
  border-left: 3px solid var(--legend-border, #0891b2);
  padding: 0.55rem 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  line-height: 1.5;
}
.card-figure .fig-legend .legend-item { display: block; margin: 0.15rem 0; }
.card-figure .fig-legend .legend-num {
  display: inline-block;
  width: 1.1rem; height: 1.1rem;
  border-radius: 50%;
  background: #111; color: #fff;
  text-align: center; font-weight: 700; font-size: 0.7rem;
  line-height: 1.1rem;
  margin-right: 0.35rem;
  vertical-align: middle;
}
[data-theme="dark"] .card-figure .fig-legend {
  background: rgba(8, 145, 178, 0.12);
  border-left-color: #22d3ee;
}
```

- [ ] **Step 2: Smoke check in the browser**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: all four existing topics pass; no CSS errors in the browser console. Screenshots in `tools/_validation/` should be visually unchanged (new classes aren't used yet).

- [ ] **Step 3: Commit**

```bash
git add webapp/library/style.css
git commit -m "feat(pwa): add anatomy v2 css primitives (lead-line, chip, hook-box, struct-table)"
```

---

### Task 2.3: Rewrite `renderer.js` `anatomy()` with schema detection

**Files:**
- Modify: `webapp/library/renderer.js`

- [ ] **Step 1: Replace the `anatomy` function**

In `webapp/library/renderer.js`, locate the `function anatomy(card) { ... }` block (lines 88–102 in the current file). Replace it with:

```javascript
  function _chipRow(numbers) {
    if (!numbers || numbers.length === 0) return '';
    const chips = numbers.map(n => {
      const note = n.note ? `<span class="chip-note">${n.note}</span>` : '';
      return `<span class="chip">${n.label} <span class="chip-value">${n.value}</span>${note}</span>`;
    }).join('');
    return `<div class="chips-row">${chips}</div>`;
  }

  function _structTable(structures) {
    if (!structures || structures.length === 0) return '';
    const rows = structures.map(s => `<tr><td>${s.label}</td><td>${_formatText(s.description)}</td></tr>`).join('');
    return `<table class="struct-table">${rows}</table>`;
  }

  function _hookBox(hook) {
    if (!hook) return '';
    return `<div class="hook-box">
      <div class="hook-label">Gancho Clinico</div>
      <div>${_formatText(hook)}</div>
    </div>`;
  }

  function _resolveImageRef(ref) {
    const idx = (window.Atlas && window.Atlas._imageIndex) || null;
    if (idx && idx.get) return idx.get(ref) || null;
    return null;
  }

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
      const labels = (entry.labels || []).map(l =>
        `<span class="legend-item"><span class="legend-num">${l.num}</span>${_formatText(l.text)}</span>`
      ).join('');
      const legend = labels ? `<div class="fig-legend">${labels}</div>` : '';
      return `<figure class="card-figure">
        <img src="${src}" alt="${caption}" loading="lazy">
        <figcaption>
          <span class="caption">${caption}</span>
          <span class="credit">${entry.credit}</span>
        </figcaption>
        ${legend}
      </figure>`;
    }).join('');
  }

  function _isAnatomyV2(card) {
    return typeof card.one_liner === 'string' || typeof card.clinical_hook === 'string';
  }

  function anatomy(card) {
    if (_isAnatomyV2(card)) return _anatomyV2(card);
    return _anatomyLegacy(card);
  }

  function _anatomyLegacy(card) {
    return `<article class="card card-anatomy">
      ${_badge('anatomy')}
      <h2>${card.title}</h2>
      ${card.aliases ? `<div class="card-aliases">${card.aliases.join(' · ')}</div>` : ''}
      ${_section('Definição', card.definition)}
      ${_section('Localização', card.location)}
      ${_section('Relações', _list(card.relations))}
      ${_section('Relevância Cirúrgica', card.surgical_relevance, 'highlight')}
      ${_section('Como Identificar', card.how_to_identify, 'highlight')}
      ${_images(card.topic, card.images)}
      ${_updates(card.updates)}
      ${_citations(card.citations)}
    </article>`;
  }

  function _anatomyV2(card) {
    return `<article class="card card-anatomy card-anatomy-v2">
      ${_badge('anatomy')}
      <h2>${card.title}</h2>
      ${card.aliases ? `<div class="card-aliases">${card.aliases.join(' · ')}</div>` : ''}
      ${card.one_liner ? `<p class="lead-line">${_formatText(card.one_liner)}</p>` : ''}
      ${_chipRow(card.numbers)}
      ${_structTable(card.structures)}
      ${_section('Relações', _list(card.relations))}
      ${_section('Localização', card.location)}
      ${_section('Como Identificar', card.how_to_identify, 'highlight')}
      ${_hookBox(card.clinical_hook)}
      ${_libraryImages(card)}
      ${_updates(card.updates)}
      ${_citations(card.citations)}
    </article>`;
  }
```

- [ ] **Step 2: Expose the image index from `app.js` to the renderer**

In `webapp/library/app.js`, replace the `loadImageIndex` helper's last two lines:

```javascript
window.Atlas = window.Atlas || {};
window.Atlas.loadImageIndex = loadImageIndex;
```

with:

```javascript
window.Atlas = window.Atlas || {};
window.Atlas.loadImageIndex = loadImageIndex;
window.Atlas._imageIndex = _imageIndex;
```

Also, at the end of `loadImageIndex()` just before `return _imageIndex`, set `window.Atlas._imageIndex = _imageIndex;` so the renderer can read it after the async load completes.

Final shape of the helper:

```javascript
async function loadImageIndex() {
  if (_imageIndex) return _imageIndex;
  try {
    const resp = await fetch(IMAGE_MANIFEST_URL);
    if (!resp.ok) { _imageIndex = new Map(); }
    else {
      const data = await resp.json();
      _imageIndex = new Map((data.entries || []).map(e => [e.id, e]));
    }
  } catch (_) {
    _imageIndex = new Map();
  }
  window.Atlas._imageIndex = _imageIndex;
  return _imageIndex;
}
```

- [ ] **Step 3: Bump the service worker cache key**

In `webapp/library/sw.js`, change line 1:

```javascript
const CACHE_NAME = 'briefing-preop-v17';
```

to:

```javascript
const CACHE_NAME = 'briefing-preop-v18';
```

And add `./content/images/manifest.json` is NOT in `ASSETS` (it's fetched cross-scope). Instead update the asset version strings in the preload list by bumping the `?v=` query to `2026-04-16-anat2`:

```javascript
  './style.css?v=2026-04-16-anat2',
  './theme.js?v=2026-04-16-anat2',
  './app.js?v=2026-04-16-anat2',
  './search.js?v=2026-04-16-anat2',
  './renderer.js?v=2026-04-16-anat2',
  './preop.js?v=2026-04-16-anat2',
  './chat.js?v=2026-04-16-anat2',
  './icons/lucide.js?v=2026-04-16-anat2',
```

Apply the same `?v=` bump in `webapp/library/index.html` for the matching `<link>` and `<script>` tags (grep for `2026-04-16-atlas` and replace with `2026-04-16-anat2`).

- [ ] **Step 4: Run the Playwright harness against legacy topics**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: all four topics pass (no broken images, no renderer errors). The anatomy cards still render via legacy branch because no card has been migrated yet.

- [ ] **Step 5: Commit**

```bash
git add webapp/library/renderer.js webapp/library/app.js webapp/library/sw.js webapp/library/index.html
git commit -m "feat(pwa): anatomy v2 renderer with legacy fallback and library resolver"
```

---

### Task 2.4: Phase 2 verification

- [ ] **Step 1: Confirm non-regression on existing topics**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: 4 topics × 2 themes = 8 passes, 0 broken images.

- [ ] **Step 2: Diff screenshots against pre-phase baseline**

Compare `tools/_validation/*.png` to the pre-phase state (git stash them before running if needed). Expected: visually identical — no v2 cards exist yet.

- [ ] **Step 3: Confirm ajv still validates every card**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false 2>&1 | grep -v "valid$" | head -20`
Expected: no output.

Phase 2 complete. Open PR `feature/card-uniformity-phase-2` and merge before starting Phase 3.

---

## Phase 3 — Pilot: Abdominoplastia Anatomy End-to-End

**Rationale:** Prove the full loop — image extraction → annotation → library entry → card rewrite → PWA render — on one tema. Pick the six existing anatomy cards, migrate them, and replace seven raw images with library references.

### Task 3.1: Add `abdominoplastia` to the validation harness

**Files:**
- Modify: `tools/validate_briefings.mjs`

- [ ] **Step 1: Update the TOPICS list**

In `tools/validate_briefings.mjs`, change line 9:

```javascript
const TOPICS = ['lipoaspiracao', 'gluteoplastia', 'contorno-pos-bariatrico', 'otoplastia'];
```

to:

```javascript
const TOPICS = ['lipoaspiracao', 'gluteoplastia', 'contorno-pos-bariatrico', 'otoplastia', 'abdominoplastia'];
```

- [ ] **Step 2: Confirm abdominoplastia still passes in the legacy state**

Run: `node tools/validate_briefings.mjs --theme=light`
Expected: 5 topics pass — abdominoplastia renders with legacy cards unchanged.

- [ ] **Step 3: Commit**

```bash
git add tools/validate_briefings.mjs
git commit -m "test(pwa): add abdominoplastia to validate_briefings topics"
```

---

### Task 3.2: Extract source figures from Neligan chapter 98

**Files:** (tooling only; outputs into `.tmp/`)

- [ ] **Step 1: Run the existing extractor**

Locate the Neligan volume 2 PDF in `00-Livros-Texto/`. Run:

```bash
python tools/extract_figures.py --pdf "00-Livros-Texto/<Neligan vol 2 filename>.pdf" --topic abdominoplastia --pages 98
```

Adjust `--pages` to the actual chapter 98 range. Output lands in `.tmp/figures/abdominoplastia/`.

Expected: several PNGs extracted. Inspect them and identify candidates for: (a) Huger zones overview, (b) rectus sheath layers, (c) umbilical pedicle, (d) Scarpa fascia + lymphatics, (e) aesthetic subunits, (f) lateral perforators surgical view.

- [ ] **Step 2: Select and copy the winning images**

Copy the selected files into `assets/images/abdominoplastia/` using ASCII filenames (no accents):

- `huger-zones-overview.png`
- `abdominal-layers-schematic.png`
- `umbilicus-pedicle.png`
- `scarpa-lymphatics.png`
- `aesthetic-subunits-female.png`
- `lateral-perforators-surgical.png`

Keep the original file if it already has labels from the book; otherwise plan to annotate in Task 3.3.

- [ ] **Step 3: Deduplicate against existing images**

Run: `python tools/audit_images.py`
Expected: no new "duplicate" warnings. If any fire for an old abdominoplastia image, do NOT delete yet — Task 3.8 removes the old raw references after the card rewrite.

- [ ] **Step 4: Commit the raw assets**

```bash
git add assets/images/abdominoplastia/huger-zones-overview.png assets/images/abdominoplastia/abdominal-layers-schematic.png assets/images/abdominoplastia/umbilicus-pedicle.png assets/images/abdominoplastia/scarpa-lymphatics.png assets/images/abdominoplastia/aesthetic-subunits-female.png assets/images/abdominoplastia/lateral-perforators-surgical.png
git commit -m "feat(assets): add six source figures for abdominoplastia anatomy"
```

---

### Task 3.3: Annotate the six images with numbered callouts

**Files:** (overwrites in `assets/images/abdominoplastia/`)

- [ ] **Step 1: Open each file in an image editor**

For each of the six files, open it in an external editor (Photopea, GIMP, Affinity). Add numbered circular callouts matching the labels you intend to write in Task 3.4. Use:

- Black filled circle (~18 px radius at typical print size)
- White numeric 1-6 inside (sans-serif bold)
- White stroke 1.5 px around the circle

Save over the same filename (PNG, ≤600 KB after flattening — use PNG-8 if available).

- [ ] **Step 2: Sanity-check dimensions**

Run:

```bash
python -c "from PIL import Image; import pathlib; [print(p.name, Image.open(p).size) for p in pathlib.Path('assets/images/abdominoplastia').glob('*.png') if p.stat().st_size > 0]"
```

Expected: every new file reports a size (no zero-byte files), and width ≤ 1800 px (PWA viewport targets mobile).

- [ ] **Step 3: Commit the annotated versions**

```bash
git add assets/images/abdominoplastia/*.png
git commit -m "feat(assets): annotate abdominoplastia figures with numbered callouts"
```

---

### Task 3.4: Write six library JSON entries

**Files:**
- Create: `content/images/abdominoplastia/img-huger-zones-overview-001.json`
- Create: `content/images/abdominoplastia/img-abdominal-layers-001.json`
- Create: `content/images/abdominoplastia/img-umbilicus-pedicle-001.json`
- Create: `content/images/abdominoplastia/img-scarpa-lymphatics-001.json`
- Create: `content/images/abdominoplastia/img-aesthetic-subunits-001.json`
- Create: `content/images/abdominoplastia/img-lateral-perforators-001.json`

- [ ] **Step 1: Write the Huger entry**

Create `content/images/abdominoplastia/img-huger-zones-overview-001.json` with:

```json
{
  "id": "img-huger-zones-overview-001",
  "file": "abdominoplastia/huger-zones-overview.png",
  "subject": "zonas de perfusao de Huger",
  "role": "overview",
  "source": "Neligan 2023, vol. 2, cap. 98, Fig. 98.3",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 98 — Matarasso",
  "default_caption": "Tres zonas de perfusao da parede abdominal anterior (Huger, 1979).",
  "labels": [
    { "num": 1, "text": "Zona I — arterias epigastrica inferior profunda (DIEA) e superficial (SIEA); dominante no abdome nao operado." },
    { "num": 2, "text": "Zona II — arterias circunflexa iliaca superficial (SCIA) e SIEA; territorio inguinal." },
    { "num": 3, "text": "Zona III — intercostais, subcostais e lombares; dominante apos disseccao do retalho." }
  ],
  "applicable_topics": ["abdominoplastia", "dermolipectomia"],
  "status": "available"
}
```

- [ ] **Step 2: Write the abdominal layers entry**

Create `content/images/abdominoplastia/img-abdominal-layers-001.json` with:

```json
{
  "id": "img-abdominal-layers-001",
  "file": "abdominoplastia/abdominal-layers-schematic.png",
  "subject": "camadas da parede abdominal anterior",
  "role": "schematic",
  "source": "Neligan 2023, vol. 2, cap. 98 — Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 98",
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

- [ ] **Step 3: Write the umbilicus pedicle entry**

Create `content/images/abdominoplastia/img-umbilicus-pedicle-001.json` with:

```json
{
  "id": "img-umbilicus-pedicle-001",
  "file": "abdominoplastia/umbilicus-pedicle.png",
  "subject": "triplice vascularizacao do umbigo",
  "role": "detail",
  "source": "Neligan 2023, vol. 2, cap. 98 — Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 98",
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

- [ ] **Step 4: Write the Scarpa/lymphatics entry**

Create `content/images/abdominoplastia/img-scarpa-lymphatics-001.json` with:

```json
{
  "id": "img-scarpa-lymphatics-001",
  "file": "abdominoplastia/scarpa-lymphatics.png",
  "subject": "fascia de Scarpa e plexo linfatico subdermico inferior",
  "role": "detail",
  "source": "Neligan 2023, vol. 2, cap. 98 — Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 98",
  "default_caption": "Fascia de Scarpa como substrato do plexo linfatico subdermico infraumbilical.",
  "labels": [
    { "num": 1, "text": "Gordura subcutanea superficial." },
    { "num": 2, "text": "Fascia de Scarpa (fascia membranosa superficial)." },
    { "num": 3, "text": "Gordura subscarpal (profunda)." },
    { "num": 4, "text": "Plexo linfatico subdermico — drenagem para linfonodos inguinais." }
  ],
  "applicable_topics": ["abdominoplastia"],
  "status": "available"
}
```

- [ ] **Step 5: Write the aesthetic subunits entry**

Create `content/images/abdominoplastia/img-aesthetic-subunits-001.json` with:

```json
{
  "id": "img-aesthetic-subunits-001",
  "file": "abdominoplastia/aesthetic-subunits-female.png",
  "subject": "unidades esteticas do abdome feminino",
  "role": "schematic",
  "source": "Neligan 2023, vol. 2, cap. 98 — Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 98",
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

- [ ] **Step 6: Write the lateral perforators entry**

Create `content/images/abdominoplastia/img-lateral-perforators-001.json` with:

```json
{
  "id": "img-lateral-perforators-001",
  "file": "abdominoplastia/lateral-perforators-surgical.png",
  "subject": "perfuradores laterais da Zona III expostos intraoperatoriamente",
  "role": "surgical",
  "source": "Neligan 2023, vol. 2, cap. 98 — Matarasso",
  "credit": "Adaptado de Neligan 2023, vol. 2, cap. 98",
  "default_caption": "Perfuradores laterais intercostais expostos em disseccao seletiva em V invertido.",
  "labels": [
    { "num": 1, "text": "Perfurantes intercostais laterais — Zona III." },
    { "num": 2, "text": "Linha axilar anterior (limite externo da preservacao)." },
    { "num": 3, "text": "Retalho abdominoplastico descolado medialmente." }
  ],
  "applicable_topics": ["abdominoplastia"],
  "status": "available"
}
```

- [ ] **Step 7: Validate every entry against the library schema**

Run: `npx ajv validate -s content/images/_schema.json -d "content/images/abdominoplastia/*.json" --strict=false`
Expected: 6 files printed as `valid`.

- [ ] **Step 8: Commit**

```bash
git add content/images/abdominoplastia/*.json
git commit -m "feat(images): add six abdominoplastia library entries"
```

---

### Task 3.5: Regenerate the image manifest

- [ ] **Step 1: Run the aggregator**

Run: `python tools/build_image_manifest.py`
Expected: `wrote .../content/images/manifest.json (6 entries)`.

- [ ] **Step 2: Spot-check the output**

Run: `python -c "import json,pathlib; d=json.loads(pathlib.Path('content/images/manifest.json').read_text('utf-8')); print(d['count']); print([e['id'] for e in d['entries']])"`
Expected: `6` followed by the six IDs alphabetically.

- [ ] **Step 3: Commit**

```bash
git add content/images/manifest.json
git commit -m "chore(images): regenerate manifest with 6 abdominoplastia entries"
```

---

### Task 3.6: Rewrite `abdominoplastia/anatomia.json` into v2 shape

**Files:**
- Modify: `content/cards/contorno-corporal/abdominoplastia/anatomia.json`

- [ ] **Step 1: Replace the file contents**

Overwrite `content/cards/contorno-corporal/abdominoplastia/anatomia.json` with:

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
      "Neligan 2023, vol. 2, cap. 27 — Matarasso",
      "Grabb & Smith 2024, cap. 75 — Colwell"
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
      { "label": "Zona I", "description": "DIEA + SIEA · central · ligada na disseccao." },
      { "label": "Zona II", "description": "SCIA + SIEA · inguinal · tambem comprometida." },
      { "label": "Zona III", "description": "Intercostais + subcostais + lombares · dominante pos-op." }
    ],
    "relations": [
      "Perfurantes da Zona III entram entre linha axilar anterior e hemiclavicular.",
      "Arcada de Thompson conecta DIEA a toracica interna (supraumbilical)."
    ],
    "clinical_hook": "Descolagem em V invertido preserva perfurantes da Zona III — chave da viabilidade do retalho.",
    "images": [
      { "ref": "img-huger-zones-overview-001" },
      { "ref": "img-lateral-perforators-001" }
    ],
    "citations": ["Neligan 2023, vol. 2, cap. 27 — Matarasso"],
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
      "Neligan 2023, vol. 2, cap. 27 — Matarasso",
      "Grabb & Smith 2024, cap. 75 — Colwell"
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
    "citations": ["Neligan 2023, vol. 2, cap. 27 — Matarasso"],
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
    "citations": ["Neligan 2023, vol. 2, cap. 27 — Matarasso"],
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
      { "label": "Compartimento", "description": "Intraperitoneal — omento maior e mesenterio." },
      { "label": "Distincao", "description": "Distinta da subcutanea; firme a palpacao." }
    ],
    "relations": [
      "Musculo reto abdominal + bainha posterior como barreira anatomica.",
      "Associacao com risco cardiometabolico, cancer e demencia."
    ],
    "clinical_hook": "Abdome que permanece convexo em decubito dorsal indica predominio visceral — plicatura do reto esta contraindicada.",
    "how_to_identify": "Palpacao firme e profunda, nao pincavel; diferencia da subcutanea macia e depressivel.",
    "citations": ["Neligan 2023, vol. 2, cap. 27 — Matarasso"],
    "updates": [],
    "tags": ["anatomia", "gordura-visceral", "contraindicacao", "plicatura", "avaliacao"]
  }
]
```

Note the deliberate ASCII-only text: the PWA supports diacritics, but we're matching the project convention used for filenames and aligning with acronym linting. Diacritics may be added back in a later editorial pass if needed.

- [ ] **Step 2: Validate the rewritten file against the schema**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/contorno-corporal/abdominoplastia/anatomia.json" --strict=false`
Expected: `valid`.

- [ ] **Step 3: Lint acronyms**

Run: `python tools/lint_acronyms.py content/cards/contorno-corporal/abdominoplastia/anatomia.json`
Expected: exit code 0, no issues printed. If any acronym flagged, open the card, add `(expansion)` on first use in that field, and rerun.

- [ ] **Step 4: Commit**

```bash
git add content/cards/contorno-corporal/abdominoplastia/anatomia.json
git commit -m "feat(cards): migrate abdominoplastia anatomy to v2 schema"
```

---

### Task 3.7: Re-run Playwright against the pilot

- [ ] **Step 1: Regenerate the manifest (in case CI runs it)**

Run: `python tools/build_image_manifest.py`
Expected: `6 entries`.

- [ ] **Step 2: Run validation with screenshots**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: 5 topics pass. Inspect `tools/_validation/abdominoplastia-light.png` and `abdominoplastia-dark.png`:
- Card `abdo-anat-002` shows lead line, struct-table, hook-box, two numbered images with legends.
- Siglas DIEA, SIEA, SCIA appear expanded on first use.
- No broken image references.

- [ ] **Step 3: Test offline behavior**

Open `http://localhost:8767/webapp/library/` in Chrome DevTools iPhone viewport, load abdominoplastia, toggle offline, reload. Expected: content and images still render from cache.

- [ ] **Step 4: Commit the screenshots (optional)**

If the project tracks validation screenshots, run:

```bash
git add tools/_validation/abdominoplastia-*.png
git commit -m "chore(validation): pilot screenshots for abdominoplastia v2"
```

Otherwise skip.

---

### Task 3.8: Remove orphaned raw abdominoplastia images

**Files:** (deletions in `assets/images/abdominoplastia/`)

- [ ] **Step 1: List current images**

Run: `ls assets/images/abdominoplastia/`

- [ ] **Step 2: Identify orphans**

Run: `python tools/audit_images.py --topic abdominoplastia`
Expected: the tool reports which files are referenced by cards and which are not. Any old file (e.g. `abdo-anat-huger-zonas.jpg`, `abdo-anat-camadas-us.jpg`) not now referenced by the six library entries is an orphan.

- [ ] **Step 3: Delete orphans only after confirming all six library images are present**

For each orphan (let `<file>` stand in for the filename), run:

```bash
git rm assets/images/abdominoplastia/<file>
```

Do not delete `huger-zones-overview.png`, `abdominal-layers-schematic.png`, `umbilicus-pedicle.png`, `scarpa-lymphatics.png`, `aesthetic-subunits-female.png`, `lateral-perforators-surgical.png`.

- [ ] **Step 4: Re-run validation**

Run: `node tools/validate_briefings.mjs --theme=light`
Expected: all 5 topics pass. If abdominoplastia fails, it means a library entry still points to a deleted file — restore the file or fix the entry.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(assets): remove orphan abdominoplastia images after v2 migration"
```

---

### Task 3.9: Phase 3 verification

- [ ] **Step 1: Full test suite**

Run: `python -m pytest tools/tests -v`
Expected: 7 PASS.

Run: `node --test tools/tests/test_schema_anatomy.mjs`
Expected: 4 PASS.

- [ ] **Step 2: Full card validation**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false 2>&1 | grep -v "valid$" | head -20`
Expected: no output.

- [ ] **Step 3: Full PWA validation**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: 5 topics × 2 themes = 10 passes, 0 broken images.

- [ ] **Step 4: Manual smoke on iPhone viewport**

Open the PWA in Chrome DevTools at iPhone 13 viewport. Navigate: home → abdominoplastia. Confirm:
- `abdo-anat-002 Zonas de Huger` renders with lead line, struct-table, hook-box, two numbered images
- Legend expands DIEA, SIEA, SCIA on first occurrence
- Offline mode works after first load

Phase 3 complete. Open PR `feature/card-uniformity-phase-3` and merge before starting Phase 4.

---

## Phase 4 — Sweep the Remaining 7 Temas

**Rationale:** Apply the pilot pattern to the other temas. Each tema becomes its own task with the same shape — extract → annotate → library entries → card rewrite → validate. This is repetitive but each repetition is bounded.

Temas to migrate (from `content/cards/manifest.json`, excluding abdominoplastia):

1. lipoaspiracao
2. gluteoplastia
3. contorno-pos-bariatrico
4. otoplastia
5. blefaroplastia
6. mamoplastia (if present)
7. rinoplastia (if present)

(Confirm the exact list by running `python -c "import json; [print(t['topic']) for t in json.load(open('content/cards/manifest.json', encoding='utf-8'))['topics'] if t.get('status') in ('complete','draft')]"` before starting.)

### Task 4.N (for each tema): Full migration

Repeat the following sub-steps for each tema, substituting `<tema>` and the tema-specific files and IDs. Each tema gets its own commit at each sub-step — do NOT batch across temas.

- [ ] **Step 1: Read the current `content/cards/<area>/<tema>/anatomia.json`**

Catalog each card's existing `definition`, `surgical_relevance`, `how_to_identify`, images. Draft a one-sentence `one_liner` (≤160 chars) and `clinical_hook` (≤200 chars) for each card, plus at least one image library entry.

- [ ] **Step 2: Extract + annotate tema images (if new ones are needed)**

Reuse `tools/extract_figures.py` with the relevant chapter. Save to `assets/images/<tema>/<descriptive-name>.png`. Annotate with numbered callouts as in Task 3.3.

- [ ] **Step 3: Create library entries for tema**

Under `content/images/<tema>/img-<slug>-NNN.json`. Validate:

Run: `npx ajv validate -s content/images/_schema.json -d "content/images/<tema>/*.json" --strict=false`
Expected: all `valid`.

Commit:

```bash
git add content/images/<tema>/ assets/images/<tema>/
git commit -m "feat(images): add <tema> library entries and source figures"
```

- [ ] **Step 4: Regenerate manifest**

Run: `python tools/build_image_manifest.py`
Commit:

```bash
git add content/images/manifest.json
git commit -m "chore(images): regenerate manifest including <tema>"
```

- [ ] **Step 5: Rewrite tema anatomia cards in v2 shape**

Edit `content/cards/<area>/<tema>/anatomia.json`. Apply the same canonical fields as Task 3.6. Validate:

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/<area>/<tema>/anatomia.json" --strict=false`
Expected: `valid`.

Lint:

Run: `python tools/lint_acronyms.py content/cards/<area>/<tema>/anatomia.json`
Expected: exit code 0.

Commit:

```bash
git add content/cards/<area>/<tema>/anatomia.json
git commit -m "feat(cards): migrate <tema> anatomy to v2 schema"
```

- [ ] **Step 6: Validate PWA for this tema**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: all topics pass. Inspect the new screenshots for `<tema>-light.png` and `<tema>-dark.png`; confirm lead line + struct-table + hook-box render as expected.

- [ ] **Step 7: Remove orphan images for this tema**

Run: `python tools/audit_images.py --topic <tema>`. Delete and commit orphans as in Task 3.8.

### Task 4.LAST: Phase 4 verification

- [ ] **Step 1: All cards validate**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false 2>&1 | grep -v "valid$" | head -20`
Expected: no output.

- [ ] **Step 2: Every tema lints clean**

Run: `python tools/lint_acronyms.py content/cards/**/anatomia.json`
Expected: exit code 0.

- [ ] **Step 3: Playwright passes every topic**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: N topics × 2 themes pass with 0 broken images.

- [ ] **Step 4: Confirm no anatomy card still uses `definition`**

Run: `grep -rn '"definition"' content/cards --include='*.json' | grep anat`
Expected: no matches.

Phase 4 complete. Open PR `feature/card-uniformity-phase-4` and merge before starting Phase 5.

---

## Phase 5 — Remove Legacy Fallback

**Rationale:** Once no anatomy card uses the legacy shape, we can simplify the schema, renderer, and docs.

### Task 5.1: Drop legacy branch in the schema

**Files:**
- Modify: `content/cards/schema.json`

- [ ] **Step 1: Replace the anatomy definition**

In `content/cards/schema.json`, replace the current `anatomy` + `anatomy_common` + `anatomy_legacy` + `anatomy_v2` block with just:

```json
    "anatomy": {
      "type": "object",
      "required": ["id", "type", "title", "topic", "area", "one_liner", "clinical_hook", "citations", "tags"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z]+-anat-" },
        "type": { "const": "anatomy" },
        "title": { "type": "string", "maxLength": 60 },
        "aliases": { "type": "array", "items": { "type": "string", "maxLength": 60 }, "default": [] },
        "topic": { "type": "string" },
        "area": { "type": "string" },
        "one_liner": { "type": "string", "maxLength": 160 },
        "structures": {
          "type": "array",
          "default": [],
          "items": {
            "type": "object",
            "required": ["label", "description"],
            "additionalProperties": false,
            "properties": {
              "label": { "type": "string", "maxLength": 60 },
              "description": { "type": "string", "maxLength": 80 }
            }
          }
        },
        "numbers": {
          "type": "array",
          "default": [],
          "items": {
            "type": "object",
            "required": ["label", "value"],
            "additionalProperties": false,
            "properties": {
              "label": { "type": "string", "maxLength": 40 },
              "value": { "type": "string", "maxLength": 30 },
              "note": { "type": "string", "maxLength": 60 }
            }
          }
        },
        "relations": { "type": "array", "items": { "type": "string", "maxLength": 80 }, "default": [] },
        "location": { "type": "string", "maxLength": 200 },
        "clinical_hook": { "type": "string", "maxLength": 200 },
        "how_to_identify": { "type": "string", "maxLength": 150 },
        "images": {
          "type": "array",
          "default": [],
          "items": {
            "type": "object",
            "required": ["ref"],
            "additionalProperties": false,
            "properties": {
              "ref": { "type": "string", "pattern": "^img-[a-z0-9-]+-[0-9]{3}$" },
              "caption_override": { "type": "string", "minLength": 4, "maxLength": 200 }
            }
          }
        },
        "citations": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "updates": { "type": "array", "items": { "$ref": "#/$defs/update" }, "default": [] },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
```

- [ ] **Step 2: Update schema tests — drop the legacy-validates test**

In `tools/tests/test_schema_anatomy.mjs`, remove the `test('legacy anatomy card with definition still validates', …)` block. Keep the v2 tests and the "bare card rejected" test.

- [ ] **Step 3: Run the tests**

Run: `node --test tools/tests/test_schema_anatomy.mjs`
Expected: all remaining tests PASS.

- [ ] **Step 4: Validate every card**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false 2>&1 | grep -v "valid$" | head -20`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add content/cards/schema.json tools/tests/test_schema_anatomy.mjs
git commit -m "refactor(schema): drop legacy anatomy shape after full migration"
```

---

### Task 5.2: Remove legacy branch in `renderer.js`

**Files:**
- Modify: `webapp/library/renderer.js`

- [ ] **Step 1: Delete the legacy helpers and branch**

Remove `_anatomyLegacy` and the `_isAnatomyV2` + dispatch inside `anatomy(card)`. Replace the `anatomy` function with a direct v2 renderer — the same body that is currently in `_anatomyV2` — and delete the now-unused helpers.

Final shape of the `anatomy` function:

```javascript
  function anatomy(card) {
    return `<article class="card card-anatomy card-anatomy-v2">
      ${_badge('anatomy')}
      <h2>${card.title}</h2>
      ${card.aliases ? `<div class="card-aliases">${card.aliases.join(' · ')}</div>` : ''}
      ${card.one_liner ? `<p class="lead-line">${_formatText(card.one_liner)}</p>` : ''}
      ${_chipRow(card.numbers)}
      ${_structTable(card.structures)}
      ${_section('Relações', _list(card.relations))}
      ${_section('Localização', card.location)}
      ${_section('Como Identificar', card.how_to_identify, 'highlight')}
      ${_hookBox(card.clinical_hook)}
      ${_libraryImages(card)}
      ${_updates(card.updates)}
      ${_citations(card.citations)}
    </article>`;
  }
```

Also remove the old `_images(card.topic, card.images)` call from the anatomy path (it's already gone via the v2 branch, but double-check that legacy `_images()` is still used by `technique`, `decision`, and `note` — do NOT delete `_images` itself).

- [ ] **Step 2: Bump the service worker cache key again**

Change `CACHE_NAME` to `'briefing-preop-v19'` in `webapp/library/sw.js`. Update the `?v=` query strings to `2026-04-16-v2clean` in both `sw.js` ASSETS and `webapp/library/index.html`.

- [ ] **Step 3: Confirm no remaining references to legacy fields in renderer**

Run: `grep -nE "\.definition|\.surgical_relevance|_anatomyLegacy|_isAnatomyV2" webapp/library/renderer.js`
Expected: no matches.

- [ ] **Step 4: Validate PWA**

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: every topic passes.

- [ ] **Step 5: Commit**

```bash
git add webapp/library/renderer.js webapp/library/sw.js webapp/library/index.html
git commit -m "refactor(pwa): drop legacy anatomy renderer branch"
```

---

### Task 5.3: Update memory + spec linkage

**Files:**
- Create/Update: memory entry

- [ ] **Step 1: Update the user memory index**

Add an entry to `C:\Users\absay\.claude\projects\c--Users-absay-Documents-Biblioteca-CirurgiaPlastica\memory\MEMORY.md` pointing to a new project memory `project_card_uniformity_complete.md` that records:
- Date of completion
- That all anatomy cards are on v2 schema
- That `content/images/` is the canonical image library
- Reference to spec commit and this plan

Keep the entry to one line in `MEMORY.md` as per the memory format.

- [ ] **Step 2: Phase 5 verification**

Run: `npx ajv validate -s content/cards/schema.json -d "content/cards/**/*.json" --strict=false 2>&1 | grep -v "valid$" | head -20`
Expected: no output.

Run: `python tools/lint_acronyms.py content/cards/**/anatomia.json`
Expected: exit code 0.

Run: `python -m pytest tools/tests -v`
Expected: 7 PASS.

Run: `node tools/validate_briefings.mjs --theme=both`
Expected: every topic passes.

Run: `grep -rnE '"definition"|"surgical_relevance"' content/cards --include='*.json' | grep anat`
Expected: no matches.

Phase 5 complete. Final PR `feature/card-uniformity-phase-5`.

---

## Cross-Phase Checklist

- Every task makes its own commit (no batched commits).
- Every phase ends on a passing state for: `python -m pytest`, `node --test tools/tests/test_schema_anatomy.mjs`, `npx ajv validate`, `node tools/validate_briefings.mjs`.
- Each phase corresponds to one PR, keeping history clean.
- No diacritics in image filenames or library entry `id`s (CLAUDE.md §5).
- Every new image entry must have ≥1 applicable topic and a role.
- The service worker cache key is bumped any time cached JS/CSS changes.
- `tools/extract_figures.py` already exists — do not recreate it; reuse its CLI.

## Out of Scope (explicit)

- RAG document restructuring (RAG remains narrative — design decision #4).
- Automated label-coordinate placement (deferred post-pilot).
- Other card types (`technique`, `decision`, `note`, `flashcard`) — pilot is `anatomy` only.
- Global diacritics policy for card text — if the team wants rich Portuguese text in cards, that's a separate editorial pass.
