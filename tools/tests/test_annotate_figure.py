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
    probe = out_img.getpixel((181 - 8, 18 - 8))
    assert max(probe) < 80, f"expected near-black, got {probe}"
