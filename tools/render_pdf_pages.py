#!/usr/bin/env python3
"""
tools/render_pdf_pages.py — Rasteriza um range de páginas de um PDF para PNG.

Uso:
  python tools/render_pdf_pages.py \
    --pdf "00-Livros-Texto/<livro>.pdf" \
    --start 16 --end 31 \
    --dpi 150 \
    --output tools/_cache/<nome>/

Convencao: --start e --end sao indices zero-based de paginas PDF (nao paginas
impressas). Saida: p001.png, p002.png, ... sequencial ordenado.
"""
import argparse
import os
import sys
import fitz  # PyMuPDF


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--start", type=int, required=True, help="PDF page index (0-based), inclusive")
    ap.add_argument("--end", type=int, required=True, help="PDF page index (0-based), inclusive")
    ap.add_argument("--dpi", type=int, default=150)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        print(f"PDF nao encontrado: {args.pdf}", file=sys.stderr)
        sys.exit(1)
    if args.end < args.start:
        print("--end deve ser >= --start", file=sys.stderr)
        sys.exit(2)

    os.makedirs(args.output, exist_ok=True)
    doc = fitz.open(args.pdf)
    total = args.end - args.start + 1
    for seq, idx in enumerate(range(args.start, args.end + 1), start=1):
        if idx >= doc.page_count:
            print(f"indice {idx} fora do PDF ({doc.page_count} paginas)", file=sys.stderr)
            sys.exit(3)
        page = doc[idx]
        pix = page.get_pixmap(dpi=args.dpi)
        out = os.path.join(args.output, f"p{seq:03d}.png")
        pix.save(out)
    doc.close()
    print(f"rendered {total} pages -> {args.output}")


if __name__ == "__main__":
    main()
