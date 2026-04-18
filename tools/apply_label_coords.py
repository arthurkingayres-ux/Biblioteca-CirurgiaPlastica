#!/usr/bin/env python3
"""Apply numeric-overlay coords (x, y) to image library entries.

Reads coord payloads from `tools/_coords/*.json` and injects `x`/`y`
into matching `labels[]` entries of `content/images/<tema>/img-*.json`.

Expected coord payload format (flat list):
    [
      { "image_id": "img-auricular-cartilage-001",
        "label_num": 1,
        "x": 0.42,
        "y": 0.38 },
      ...
    ]

Coords are floats in 0.0–1.0 (fraction of image width/height).
Entries already carrying `x`/`y` are overwritten only when --force is set.
Diacritics are preserved (ensure_ascii=False).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
IMAGES_ROOT = REPO_ROOT / "content" / "images"
COORDS_DIR = REPO_ROOT / "tools" / "_coords"


def index_library() -> dict[str, Path]:
    """Map image id -> path of the library entry JSON."""
    out: dict[str, Path] = {}
    for entry in IMAGES_ROOT.rglob("img-*.json"):
        try:
            data = json.loads(entry.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            print(f"WARN: cannot parse {entry}: {exc}", file=sys.stderr)
            continue
        image_id = data.get("id")
        if image_id:
            out[image_id] = entry
    return out


def load_coords(coords_dir: Path) -> list[dict]:
    if not coords_dir.exists():
        print(f"ERROR: coords dir not found: {coords_dir}", file=sys.stderr)
        sys.exit(1)
    rows: list[dict] = []
    for f in sorted(coords_dir.glob("*.json")):
        try:
            payload = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"WARN: cannot parse {f}: {exc}", file=sys.stderr)
            continue
        if isinstance(payload, list):
            rows.extend(payload)
        elif isinstance(payload, dict) and isinstance(payload.get("coords"), list):
            rows.extend(payload["coords"])
        else:
            print(f"WARN: unexpected shape in {f}", file=sys.stderr)
    return rows


def apply(rows: list[dict], library: dict[str, Path], *, force: bool, dry_run: bool) -> tuple[int, int, int]:
    touched, skipped, missing = 0, 0, 0
    by_image: dict[str, list[dict]] = {}
    for row in rows:
        by_image.setdefault(row["image_id"], []).append(row)

    for image_id, coord_rows in by_image.items():
        entry_path = library.get(image_id)
        if entry_path is None:
            print(f"MISS {image_id}: no library entry")
            missing += 1
            continue
        data = json.loads(entry_path.read_text(encoding="utf-8"))
        labels = data.get("labels") or []
        by_num = {lab["num"]: lab for lab in labels}
        changed = False
        for row in coord_rows:
            num = row.get("label_num") or row.get("num")
            lab = by_num.get(num)
            if lab is None:
                print(f"MISS {image_id} label {num}: not found")
                continue
            if ("x" in lab or "y" in lab) and not force:
                continue
            x, y = float(row["x"]), float(row["y"])
            if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
                print(f"SKIP {image_id}#{num}: out-of-range ({x}, {y})")
                skipped += 1
                continue
            lab["x"] = round(x, 4)
            lab["y"] = round(y, 4)
            changed = True
        if changed:
            touched += 1
            if not dry_run:
                entry_path.write_text(
                    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
            print(f"OK   {image_id} ({entry_path.relative_to(REPO_ROOT)})")
        else:
            skipped += 1
    return touched, skipped, missing


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--coords-dir", default=str(COORDS_DIR), help="directory with coord JSON files")
    ap.add_argument("--force", action="store_true", help="overwrite existing x/y")
    ap.add_argument("--dry-run", action="store_true", help="report without writing")
    args = ap.parse_args()

    library = index_library()
    rows = load_coords(Path(args.coords_dir))
    touched, skipped, missing = apply(rows, library, force=args.force, dry_run=args.dry_run)
    print(f"\ntouched={touched} skipped={skipped} missing={missing}")
    return 0 if missing == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
