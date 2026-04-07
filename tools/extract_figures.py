#!/usr/bin/env python3
"""
tools/extract_figures.py — Fase 2 Parte 1: Extrai candidatos de figuras de PDFs

Estratégia dupla:
  1. Imagens embedded (raster) — extraídas diretamente do PDF estrutural (JPEG/PNG nativas)
  2. Regiões visuais vetoriais — renderiza página e detecta blocos gráficos grandes com OpenCV

Uso:
  python tools/extract_figures.py \\
    --pdf "00-Livros-Texto/Neligan 5ed 2023 vol2 estetica.pdf" \\
    --topic blefaroplastia \\
    --pages 591-625

  python tools/extract_figures.py \\
    --pdf "00-Livros-Texto/Neligan 5ed 2023 vol2 estetica.pdf" \\
    --topic blefaroplastia \\
    --pages 591-625 \\
    --min-size 150 \\      # px mínimos em cada dimensão
    --no-vector           # pular detecção vetorial

Saída:
  .tmp/figures/<topic>/emb_<pag>_<n>.<ext>     → imagens embedded
  .tmp/figures/<topic>/vec_<pag>_<n>.png       → regiões vetoriais
  .tmp/figures/<topic>/candidates.json         → metadados de todos os candidatos
"""

import argparse
import io
import json
import sys
from pathlib import Path

import fitz  # PyMuPDF
import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).parent.parent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_pages(pages_str: str) -> list[int]:
    """Converte '591-625' ou '591,600,610' em lista de índices 0-based."""
    result = []
    for part in pages_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            result.extend(range(int(start) - 1, int(end)))
        else:
            result.append(int(part) - 1)
    return sorted(set(result))


def image_dimensions(img_bytes: bytes) -> tuple[int, int]:
    """Retorna (largura, altura) de uma imagem em bytes."""
    try:
        img = Image.open(io.BytesIO(img_bytes))
        return img.size  # (w, h)
    except Exception:
        return (0, 0)


def save_progress(topic_dir: Path, candidates: list[dict], topic: str, pdf: str, pages: str):
    data = {
        "topic": topic,
        "pdf": pdf,
        "pages": pages,
        "total": len(candidates),
        "pending_review": sum(1 for c in candidates if c["approved"] is None),
        "candidates": candidates,
    }
    (topic_dir / "candidates.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Extração 1: Imagens embedded (raster nativas do PDF)
# ---------------------------------------------------------------------------

def extract_embedded(doc: fitz.Document, page_idx: int, topic_dir: Path,
                     min_size: int, seen_xrefs: set, candidates: list) -> int:
    """Extrai imagens raster embedded na página. Retorna número extraído."""
    page = doc[page_idx]
    images = page.get_images(full=True)
    count = 0

    for img_idx, img_info in enumerate(images):
        xref = img_info[0]
        if xref in seen_xrefs:
            continue  # dedup: mesma imagem em várias páginas

        try:
            base_image = doc.extract_image(xref)
        except Exception as e:
            print(f"    [warn] xref {xref}: {e}", file=sys.stderr)
            continue

        img_bytes = base_image["image"]
        ext = base_image["ext"]
        w, h = image_dimensions(img_bytes)

        if w < min_size or h < min_size:
            continue  # descarta decorações/ícones pequenos

        seen_xrefs.add(xref)
        filename = f"emb_{page_idx + 1:04d}_{img_idx:02d}.{ext}"
        (topic_dir / filename).write_bytes(img_bytes)

        candidates.append({
            "filename": filename,
            "page": page_idx + 1,
            "source": "embedded",
            "width_px": w,
            "height_px": h,
            "approved": None,
            "label": None,
            "type": None,
            "card_id": None,
            "dest_filename": None,
        })
        count += 1

    return count


# ---------------------------------------------------------------------------
# Extração 2: Regiões visuais vetoriais (OpenCV sobre página renderizada)
# ---------------------------------------------------------------------------

def extract_vector_regions(doc: fitz.Document, page_idx: int, topic_dir: Path,
                            min_size: int, candidates: list, render_dpi: int = 150) -> int:
    """Detecta blocos gráficos grandes em páginas com conteúdo vetorial."""
    page = doc[page_idx]

    # Pular páginas sem desenhos vetoriais
    drawings = page.get_drawings()
    if not drawings:
        return 0

    # Renderizar página
    mat = fitz.Matrix(render_dpi / 72, render_dpi / 72)
    pix = page.get_pixmap(matrix=mat)
    img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)

    # Máscara de regiões não-brancas
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    _, binary = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    # Dilatar para fundir regiões próximas
    kernel = np.ones((25, 25), np.uint8)
    dilated = cv2.dilate(binary, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Blocos de texto (em coordenadas PDF) para filtrar regiões predominantemente textuais
    text_blocks = [(b[0], b[1], b[2], b[3]) for b in page.get_text("blocks") if b[6] == 0]
    scale = render_dpi / 72

    count = 0
    for cnt_idx, cnt in enumerate(contours):
        x, y, w, h = cv2.boundingRect(cnt)

        if w < min_size or h < min_size:
            continue
        if w > pix.width * 0.97:  # pular largura total (cabeçalho/rodapé)
            continue

        # Verificar sobreposição com blocos de texto
        pdf_x0, pdf_y0 = x / scale, y / scale
        pdf_x1, pdf_y1 = (x + w) / scale, (y + h) / scale
        region_area = w * h

        text_overlap = 0.0
        for tb in text_blocks:
            ix0 = max(tb[0], pdf_x0) * scale
            iy0 = max(tb[1], pdf_y0) * scale
            ix1 = min(tb[2], pdf_x1) * scale
            iy1 = min(tb[3], pdf_y1) * scale
            if ix1 > ix0 and iy1 > iy0:
                text_overlap += (ix1 - ix0) * (iy1 - iy0)

        if region_area > 0 and text_overlap / region_area > 0.6:
            continue  # região majoritariamente textual

        # Salvar recorte
        crop = img_array[y : y + h, x : x + w]
        filename = f"vec_{page_idx + 1:04d}_{cnt_idx:02d}.png"
        cv2.imwrite(str(topic_dir / filename), cv2.cvtColor(crop, cv2.COLOR_RGB2BGR))

        candidates.append({
            "filename": filename,
            "page": page_idx + 1,
            "source": "vector",
            "width_px": w,
            "height_px": h,
            "bbox_pdf": [round(pdf_x0, 1), round(pdf_y0, 1), round(pdf_x1, 1), round(pdf_y1, 1)],
            "approved": None,
            "label": None,
            "type": None,
            "card_id": None,
            "dest_filename": None,
        })
        count += 1

    return count


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Extrai candidatos de figuras de PDFs (Fase 2 Parte 1)")
    parser.add_argument("--pdf", required=True,
                        help="Caminho relativo ao PDF (a partir da raiz do projeto)")
    parser.add_argument("--topic", required=True,
                        help="Tópico, ex: blefaroplastia")
    parser.add_argument("--pages", required=True,
                        help="Páginas PDF (ex: 591-625 ou 591,600,610)")
    parser.add_argument("--min-size", type=int, default=120,
                        help="Dimensão mínima em pixels para aceitar candidato (padrão: 120)")
    parser.add_argument("--no-vector", action="store_true",
                        help="Pular detecção de regiões vetoriais")
    parser.add_argument("--clear", action="store_true",
                        help="Apagar candidatos anteriores antes de rodar")
    args = parser.parse_args()

    pdf_path = ROOT / args.pdf
    if not pdf_path.exists():
        print(f"Erro: PDF não encontrado: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    topic_dir = ROOT / ".tmp" / "figures" / args.topic
    topic_dir.mkdir(parents=True, exist_ok=True)

    page_idxs = parse_pages(args.pages)

    # Limpar candidatos anteriores se solicitado
    if args.clear:
        removed = 0
        for f in topic_dir.iterdir():
            if f.suffix in {".png", ".jpeg", ".jpg", ".bmp", ".tiff"}:
                f.unlink()
                removed += 1
        if removed:
            print(f"Removidos {removed} candidatos anteriores.")

    print(f"PDF   : {pdf_path.name}")
    print(f"Tópico: {args.topic}")
    print(f"Págs  : {min(p+1 for p in page_idxs)}–{max(p+1 for p in page_idxs)} ({len(page_idxs)} páginas)")
    print(f"Saída : {topic_dir}")
    print()

    doc = fitz.open(str(pdf_path))
    candidates: list[dict] = []
    seen_xrefs: set[int] = set()

    total_emb = 0
    total_vec = 0

    for page_idx in page_idxs:
        if page_idx >= len(doc):
            print(f"  [aviso] página {page_idx + 1} inexistente (total: {len(doc)})", file=sys.stderr)
            continue

        n_emb = extract_embedded(doc, page_idx, topic_dir, args.min_size, seen_xrefs, candidates)

        n_vec = 0
        if not args.no_vector:
            n_vec = extract_vector_regions(doc, page_idx, topic_dir, args.min_size, candidates)

        if n_emb + n_vec > 0:
            label = f"  Pág {page_idx + 1}: {n_emb} embedded"
            if not args.no_vector:
                label += f" + {n_vec} vetoriais"
            print(label)

        total_emb += n_emb
        total_vec += n_vec

    doc.close()

    save_progress(topic_dir, candidates, args.topic, args.pdf, args.pages)

    print()
    suffix = f" + {total_vec} vetoriais" if not args.no_vector else ""
    print(f"Total : {total_emb} embedded{suffix} = {len(candidates)} candidatos")
    print(f"JSON  : {topic_dir / 'candidates.json'}")
    print()
    print("Próximo passo:")
    print(f"  python tools/classify_figures.py --topic {args.topic}")


if __name__ == "__main__":
    main()
