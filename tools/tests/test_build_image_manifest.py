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
