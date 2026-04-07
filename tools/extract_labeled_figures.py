#!/usr/bin/env python3
"""
extract_labeled_figures.py
Re-extracts figures from Neligan PDF by rendering page regions,
capturing the complete figure with all labels, arrows, and captions.

Unlike extract_pdf_images.py (which extracts raw embedded images),
this script renders the page as seen in the book, preserving all
text labels and vector annotations.

Usage:
  python tools/extract_labeled_figures.py
  python tools/extract_labeled_figures.py --tema blefaroplastia
  python tools/extract_labeled_figures.py --preview fig13-6
  python tools/extract_labeled_figures.py --dpi 200
"""
import sys
import os
import argparse
import fitz  # PyMuPDF

# Page dimensions for Neligan vol2: 610 x 780 points
PAGE_W = 610.0
PAGE_H = 780.0

PDF_PATH = "00-Livros-Texto/Neligan 5ed 2023 vol2 estetica.pdf"

# Figure definitions: each figure specifies:
#   page: 1-indexed page number
#   clip: (x0_frac, y0_frac, x1_frac, y1_frac) as fractions of page dimensions (0.0-1.0)
#   output: output filename
#   area: blefaroplastia or rinoplastia
#   pages: for multi-page figures, list of (page, clip) tuples to stitch vertically

FIGURES = {
    # ===== BLEFAROPLASTIA =====

    "fig13-1": {
        "page": 592,
        "clip": (0.03, 0.56, 0.50, 0.75),
        "output": "fig13-1-ossos-orbitarios.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-6": {
        "page": 594,
        "clip": (0.02, 0.05, 0.50, 0.38),
        "output": "fig13-6-musculos-periorbitarios.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-9": {
        "page": 594,
        "clip": (0.47, 0.40, 0.97, 0.78),
        "output": "fig13-9-anatomia-palpebral-sagital.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-10": {
        "area": "blefaroplastia",
        "output": "fig13-10-variacoes-palpebra-superior.jpeg",
        "pages": [
            (595, (0.03, 0.43, 0.97, 0.98)),
            (596, (0.03, 0.05, 0.97, 0.42)),
        ],
    },
    "fig13-11": {
        "page": 597,
        "clip": (0.02, 0.02, 0.50, 0.45),
        "output": "fig13-11-septo-orbital.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-14": {
        "page": 597,
        "clip": (0.49, 0.43, 0.97, 0.62),
        "output": "fig13-14-suprimento-arterial.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-15": {
        "page": 598,
        "clip": (0.02, 0.055, 0.52, 0.30),
        "output": "fig13-15-nervos-sensoriais.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-16": {
        "page": 598,
        "clip": (0.02, 0.37, 0.47, 0.59),
        "output": "fig13-16-anatomia-sobrancelha.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-20": {
        "page": 602,
        "clip": (0.03, 0.05, 0.97, 0.92),
        "output": "fig13-20-avaliacao-paciente.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-25": {
        "page": 608,
        "clip": (0.03, 0.05, 0.97, 0.71),
        "output": "fig13-25-blefaroplastia-superior.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-30": {
        "page": 612,
        "clip": (0.03, 0.05, 0.97, 0.73),
        "output": "fig13-30-acesso-transconjuntival.jpeg",
        "area": "blefaroplastia",
    },
    "fig13-37a": {
        "page": 617,
        "clip": (0.03, 0.05, 0.97, 0.52),
        "output": "fig13-37a-cantopexia-periosteal.jpeg",
        "area": "blefaroplastia",
    },

    # ===== RINOPLASTIA =====

    "fig18-1": {
        "page": 718,
        "clip": (0.03, 0.05, 0.97, 0.30),
        "output": "fig18-1-terminologia-nasal.jpeg",
        "area": "rinoplastia",
    },
    "fig18-15": {
        "page": 723,
        "clip": (0.47, 0.05, 0.97, 0.36),
        "output": "fig18-15-vascularizacao-nasal.jpeg",
        "area": "rinoplastia",
    },
    "fig18-20": {
        "page": 724,
        "clip": (0.49, 0.04, 0.97, 0.52),
        "output": "fig18-20-musculos-nasais.jpeg",
        "area": "rinoplastia",
    },
    "fig18-24": {
        "page": 725,
        "clip": (0.50, 0.47, 0.97, 0.63),
        "output": "fig18-24-arcabouco-cartilaginoso.jpeg",
        "area": "rinoplastia",
    },
    "fig18-25": {
        "page": 726,
        "clip": (0.02, 0.02, 0.50, 0.36),
        "output": "fig18-25-tres-abobadas-nasais.jpeg",
        "area": "rinoplastia",
    },
    "fig18-26": {
        "page": 726,
        "clip": (0.02, 0.37, 0.97, 0.97),
        "output": "fig18-26-septo-nasal-sagital.jpeg",
        "area": "rinoplastia",
    },
    "fig18-30": {
        "page": 727,
        "clip": (0.48, 0.50, 0.97, 0.96),
        "output": "fig18-30-cartilagens-laterais-3d.jpeg",
        "area": "rinoplastia",
    },
    "fig18-35": {
        "page": 729,
        "clip": (0.02, 0.05, 0.49, 0.38),
        "output": "fig18-35-cornetos-nasais.jpeg",
        "area": "rinoplastia",
    },
    "fig19-6": {
        "page": 739,
        "clip": (0.03, 0.05, 0.97, 0.35),
        "output": "fig19-6-spreader-grafts.jpeg",
        "area": "rinoplastia",
    },
    "fig19-15": {
        "page": 745,
        "clip": (0.03, 0.46, 0.97, 0.72),
        "output": "fig19-15-strut-columelar.jpeg",
        "area": "rinoplastia",
    },
    "fig19-19a": {
        "page": 747,
        "clip": (0.03, 0.54, 0.97, 0.97),
        "output": "fig19-19a-sutura-crura-medial.jpeg",
        "area": "rinoplastia",
    },
    "fig19-24": {
        "page": 749,
        "clip": (0.03, 0.30, 0.97, 0.75),
        "output": "fig19-24-alar-contour-grafts.jpeg",
        "area": "rinoplastia",
    },
    "fig19-27": {
        "page": 752,
        "clip": (0.03, 0.05, 0.97, 0.45),
        "output": "fig19-27-osteotomias-laterais.jpeg",
        "area": "rinoplastia",
    },
}


def render_figure(doc, fig_id, fig_def, dpi=300, preview=False):
    """Render a figure region from the PDF."""

    if "pages" in fig_def:
        # Multi-page figure: render each page clip and stitch vertically
        from PIL import Image
        import io

        strips = []
        for page_num, clip_frac in fig_def["pages"]:
            page = doc[page_num - 1]
            rect = fitz.Rect(
                clip_frac[0] * PAGE_W,
                clip_frac[1] * PAGE_H,
                clip_frac[2] * PAGE_W,
                clip_frac[3] * PAGE_H,
            )
            pix = page.get_pixmap(clip=rect, dpi=dpi)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            strips.append(img)

        # Stitch vertically
        total_w = max(s.width for s in strips)
        total_h = sum(s.height for s in strips)
        result = Image.new("RGB", (total_w, total_h), (255, 255, 255))
        y_offset = 0
        for s in strips:
            result.paste(s, (0, y_offset))
            y_offset += s.height

        return result
    else:
        page_num = fig_def["page"]
        clip_frac = fig_def["clip"]
        page = doc[page_num - 1]

        rect = fitz.Rect(
            clip_frac[0] * PAGE_W,
            clip_frac[1] * PAGE_H,
            clip_frac[2] * PAGE_W,
            clip_frac[3] * PAGE_H,
        )
        pix = page.get_pixmap(clip=rect, dpi=dpi)

        from PIL import Image
        import io
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        return img


def main():
    parser = argparse.ArgumentParser(description="Extract labeled figures from Neligan PDF")
    parser.add_argument("--tema", choices=["blefaroplastia", "rinoplastia"],
                        help="Extract only figures for this topic")
    parser.add_argument("--preview", help="Preview a single figure (e.g., fig13-6)")
    parser.add_argument("--dpi", type=int, default=300, help="Render DPI (default: 300)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be extracted")
    args = parser.parse_args()

    # Filter figures
    figures = FIGURES
    if args.preview:
        if args.preview not in FIGURES:
            print(f"Figure '{args.preview}' not found. Available: {', '.join(sorted(FIGURES.keys()))}")
            sys.exit(1)
        figures = {args.preview: FIGURES[args.preview]}
    elif args.tema:
        figures = {k: v for k, v in FIGURES.items() if v["area"] == args.tema}

    if args.dry_run:
        for fig_id, fig_def in sorted(figures.items()):
            page = fig_def.get("page", fig_def.get("pages", [[0]])[0][0])
            print(f"  {fig_id}: page {page} -> {fig_def['area']}/{fig_def['output']}")
        print(f"\nTotal: {len(figures)} figures")
        return

    print(f"Opening PDF: {PDF_PATH}")
    doc = fitz.open(PDF_PATH)
    print(f"Extracting {len(figures)} figures at {args.dpi} DPI...\n")

    for fig_id, fig_def in sorted(figures.items()):
        area = fig_def["area"]
        output_dir = f"assets/images/{area}"
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, fig_def["output"])

        if args.preview:
            # Save preview to .tmp/
            os.makedirs(".tmp/figure_preview", exist_ok=True)
            output_path = f".tmp/figure_preview/{fig_id}.png"

        img = render_figure(doc, fig_id, fig_def, dpi=args.dpi)

        if output_path.endswith(".jpeg"):
            img = img.convert("RGB")
            img.save(output_path, "JPEG", quality=92)
        else:
            img.save(output_path, "PNG")

        page_info = fig_def.get("page", "multi")
        print(f"  [{fig_id}] p.{page_info} | {img.width}x{img.height}px | {output_path}")

    doc.close()
    print(f"\nDone: {len(figures)} figures extracted.")


if __name__ == "__main__":
    main()
