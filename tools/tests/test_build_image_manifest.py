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
