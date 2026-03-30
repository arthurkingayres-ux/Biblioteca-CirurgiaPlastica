#!/usr/bin/env python3
"""
extract_pdf_pages.py
Extrai texto de páginas específicas de um PDF usando PyMuPDF.

Uso:
  python tools/extract_pdf_pages.py --pdf "00-Livros-Texto/Neligan 5ed 2023 vol2 estetica.pdf" --pages 1-10
  python tools/extract_pdf_pages.py --pdf "..." --toc          # imprime sumário
  python tools/extract_pdf_pages.py --pdf "..." --search "abdominoplasty"  # busca termo e retorna páginas
"""
import sys
import argparse
import fitz  # PyMuPDF

def get_toc(pdf_path):
    doc = fitz.open(pdf_path)
    toc = doc.get_toc()
    if not toc:
        print("Sumário não disponível neste PDF.")
        return
    for level, title, page in toc:
        indent = "  " * (level - 1)
        print(f"{indent}[p.{page:4d}] {title}")
    doc.close()

def search_term(pdf_path, term, context_chars=300):
    doc = fitz.open(pdf_path)
    term_lower = term.lower()
    results = []
    for i, page in enumerate(doc):
        text = page.get_text()
        if term_lower in text.lower():
            # Encontra posição e extrai contexto
            idx = text.lower().find(term_lower)
            snippet = text[max(0, idx-100):idx+context_chars].replace('\n', ' ')
            results.append((i + 1, snippet))
    doc.close()
    if not results:
        print(f"Termo '{term}' não encontrado.")
    else:
        print(f"Encontrado em {len(results)} página(s):\n")
        for page_num, snippet in results[:20]:
            safe = snippet.encode('utf-8', errors='replace').decode('utf-8')
            sys.stdout.buffer.write(f"  [p.{page_num}] ...{safe}...\n\n".encode('utf-8', errors='replace'))

def extract_pages(pdf_path, pages_spec, output=None):
    doc = fitz.open(pdf_path)
    total = doc.page_count

    # Parse page spec: "10-25" ou "10,12,15" ou "10-25,30,35-40"
    pages = set()
    for part in pages_spec.split(','):
        part = part.strip()
        if '-' in part:
            start, end = part.split('-')
            pages.update(range(int(start), int(end) + 1))
        else:
            pages.add(int(part))

    pages = sorted(p for p in pages if 1 <= p <= total)
    text_parts = []

    for p in pages:
        page = doc[p - 1]  # 0-indexed
        text = page.get_text()
        if text.strip():
            text_parts.append(f"\n{'='*60}\nPÁGINA {p}\n{'='*60}\n{text}")

    doc.close()
    full_text = '\n'.join(text_parts)

    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(full_text)
        print(f"Salvo em: {output} ({len(full_text)} chars, {len(pages)} páginas)")
    else:
        print(full_text)

def main():
    parser = argparse.ArgumentParser(description='Extrai texto de PDFs médicos')
    parser.add_argument('--pdf', required=True, help='Caminho do PDF')
    parser.add_argument('--pages', help='Páginas a extrair: "10-25" ou "10,12,15-20"')
    parser.add_argument('--toc', action='store_true', help='Imprime sumário')
    parser.add_argument('--search', help='Busca um termo no PDF')
    parser.add_argument('--output', help='Salva resultado em arquivo')
    args = parser.parse_args()

    if args.toc:
        get_toc(args.pdf)
    elif args.search:
        search_term(args.pdf, args.search)
    elif args.pages:
        extract_pages(args.pdf, args.pages, args.output)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
