#!/usr/bin/env python3
"""
extract_pdf_images.py
Extrai imagens de páginas específicas de um PDF usando PyMuPDF.

Uso:
  python tools/extract_pdf_images.py --pdf "00-Livros-Texto/..." --pages 590-623 --output assets/images/blefaroplastia/ --min-size 200
"""
import sys
import os
import argparse
import fitz  # PyMuPDF


def parse_pages(pages_spec):
    """Parse page spec: '10-25' ou '10,12,15' ou '10-25,30,35-40'"""
    pages = set()
    for part in pages_spec.split(','):
        part = part.strip()
        if '-' in part:
            start, end = part.split('-')
            pages.update(range(int(start), int(end) + 1))
        else:
            pages.add(int(part))
    return sorted(pages)


def extract_images(pdf_path, pages, output_dir, min_size=150, prefix="fig"):
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    total = doc.page_count

    valid_pages = [p for p in pages if 1 <= p <= total]
    extracted = 0
    skipped = 0

    for p in valid_pages:
        page = doc[p - 1]
        image_list = page.get_images(full=True)

        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
            except Exception:
                continue

            if not base_image:
                continue

            width = base_image["width"]
            height = base_image["height"]
            ext = base_image["ext"]
            image_bytes = base_image["image"]

            # Filter tiny images (icons, bullets, etc.)
            if width < min_size or height < min_size:
                skipped += 1
                continue

            # Filter very small file sizes (likely artifacts)
            if len(image_bytes) < 5000:
                skipped += 1
                continue

            extracted += 1
            filename = f"{prefix}_p{p}_{img_idx+1}_{width}x{height}.{ext}"
            filepath = os.path.join(output_dir, filename)

            with open(filepath, "wb") as f:
                f.write(image_bytes)

            print(f"  [{extracted:3d}] p.{p} | {width}x{height} | {len(image_bytes)//1024:4d}KB | {filename}")

    doc.close()
    print(f"\nTotal: {extracted} imagens extraidas, {skipped} ignoradas (< {min_size}px ou < 5KB)")
    return extracted


def main():
    parser = argparse.ArgumentParser(description='Extrai imagens de PDFs')
    parser.add_argument('--pdf', required=True, help='Caminho do PDF')
    parser.add_argument('--pages', required=True, help='Paginas: "590-623" ou "590,600,610-620"')
    parser.add_argument('--output', required=True, help='Pasta de saida')
    parser.add_argument('--min-size', type=int, default=150, help='Tamanho minimo (px) para incluir (default: 150)')
    parser.add_argument('--prefix', default='fig', help='Prefixo dos nomes de arquivo (default: fig)')
    args = parser.parse_args()

    pages = parse_pages(args.pages)
    print(f"Extraindo imagens de {len(pages)} paginas...")
    print(f"PDF: {args.pdf}")
    print(f"Output: {args.output}")
    print(f"Min size: {args.min_size}px")
    print()

    extract_images(args.pdf, pages, args.output, args.min_size, args.prefix)


if __name__ == '__main__':
    main()
