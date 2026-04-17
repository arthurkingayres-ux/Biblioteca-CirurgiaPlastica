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
