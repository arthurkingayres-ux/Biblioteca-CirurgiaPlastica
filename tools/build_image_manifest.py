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
