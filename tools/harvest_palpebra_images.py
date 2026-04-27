#!/usr/bin/env python3
"""
tools/harvest_palpebra_images.py

Harvester reproducivel para as 19 figuras do tema reconstrucao-de-palpebra
(Phase 7.6b.3). Renderiza paginas (ou crops bbox) dos PDFs-fonte a 300 dpi e
salva como PNG ASCII em assets/images/reconstrucao-de-palpebra/.

Uso:
    python tools/harvest_palpebra_images.py            # nao sobrescreve PNGs ja existentes
    python tools/harvest_palpebra_images.py --force    # regenera todos

Mapping (slug -> PDF + indice 0-based + bbox opcional em fracao 0-1):
    Oculofacial Plastic and Orbital Surgery (BCSC Section 7) — capitulos 9, 11, 14
    Jackson - Local Flaps in Head and Neck Reconstruction (2nd Ed) — capitulo 7

Convencao bbox:
    None = pagina inteira; (x0, y0, x1, y1) em fracao do tamanho da pagina
    (canto superior-esquerdo = (0,0); canto inferior-direito = (1,1)).

Decisao editorial (Phase 7.6b.3, Tarefa B — anotacoes numericas):
    Cards anatomy_v2 (palpebra-anat-001 lamelas e palpebra-anat-002 vascular)
    NAO recebem overlays numericos baked-in via PIL nem coords x,y em JSON.
    Justificativa:
      (a) o schema content/cards/schema.json define structures[] com
          additionalProperties=false e permite apenas {label, description}.
          Adicionar 'overlay' ou 'x'/'y' em cada structures[i] violaria o
          AJV strict (572/572 validar precisa permanecer).
      (b) o precedente direto e bochecha anatomia.json (Phase 7.6a, squash
          673fbe3): nem images[] populado, nem overlays — anatomia v2 e
          servida pelo renderer que monta legenda numerada lateral a partir
          de structures[] (ver reference_anatomy_v2_renderer_labels.md em
          memoria persistente).
    Em consequencia: as figuras Oculofacial Fig 9-14 (lamelas) e Fig 9-20
    (arcades) ja trazem labels textuais com leader lines do livro original
    e sao usadas sem modificacao. A Tarefa C populara images[] em todos os
    12 cards (incluindo os dois anatomy) e o renderer da PWA derivara a
    legenda numerada a partir de structures[] em runtime.
"""
from __future__ import annotations

import argparse
import sys
import unicodedata
from pathlib import Path
from typing import Optional, Tuple

import fitz  # PyMuPDF


REPO_ROOT = Path(__file__).resolve().parents[1]


def _resolve_pdf_root(repo_root: Path) -> Path:
    """Locate `00-Livros-Texto/`. PDFs are gitignored and live only in the
    main checkout, so worktrees must walk up to find them."""
    candidates = [
        repo_root / "00-Livros-Texto",          # main checkout
        repo_root.parent.parent / "00-Livros-Texto",  # worktree → main repo
    ]
    for c in candidates:
        if c.is_dir():
            return c
    return candidates[0]  # error message at runtime will point here


PDF_ROOT = _resolve_pdf_root(REPO_ROOT)
OUTPUT_DIR = REPO_ROOT / "assets" / "images" / "reconstrucao-de-palpebra"

OCULOFACIAL = "Oculofacial Plastic and Orbital Surgery.pdf"
JACKSON = "Jackson - Local Flaps in Head and Neck Reconstruction (2nd Edition).pdf"


# (slug, pdf_filename, page_idx_0based, bbox_or_none, source_label)
MAPPING: list[tuple[str, str, int, Optional[Tuple[float, float, float, float]], str]] = [
    # ---- Anatomia (cap.9 Oculofacial) ----
    ("lamelas-funcionais-corte-sagital.png",   OCULOFACIAL, 181, None,
     "Oculofacial cap.9, p.163, fig 9-14 (Eyelid margin anatomy)"),
    ("tarso-superior-vs-inferior.png",         OCULOFACIAL, 187, None,
     "Oculofacial cap.9, p.169, fig 9-22 (Tarsal plates and suspensory tendons)"),
    ("margem-palpebral-tres-linhas.png",       OCULOFACIAL, 188, None,
     "Oculofacial cap.9, p.170, fig 9-24 (Eyelid margin gray line)"),
    ("suprimento-vascular-arcadas.png",        OCULOFACIAL, 185, None,
     "Oculofacial cap.9, p.167, fig 9-20 (Müller muscle and peripheral arterial arcade)"),
    ("tendoes-cantais-lacrimal-crest.png",     OCULOFACIAL, 183, (0.0, 0.45, 1.0, 1.0),
     "Oculofacial cap.9, p.165, fig 9-18 (Suspensory and fibrous anatomy of the eyelid)"),
    ("zona-seguranca-frontal-cn-vii.png",      OCULOFACIAL, 175, None,
     "Oculofacial cap.9, p.157, fig 9-7 (Obliquely oriented muscles + frontal nerve danger zone)"),
    # ---- Fisiologia (cap.14) ----
    ("bomba-lacrimal-blink-cycle.png",         OCULOFACIAL, 302, None,
     "Oculofacial cap.14, p.284, fig 14-4 (Lacrimal pump mechanism)"),
    # ---- Algoritmos por tamanho (cap.11) ----
    ("defeito-parcial-fechamento-direto.png",       OCULOFACIAL, 241, (0.0, 0.30, 1.0, 1.0),
     "Oculofacial cap.11, p.223, fig 11-11 (Reconstructive ladder for lower eyelid defect)"),
    ("defeito-parcial-superior-fechamento-direto.png", OCULOFACIAL, 240, None,
     "Oculofacial cap.11, p.222, fig 11-9 (Reconstructive ladder for upper eyelid defect)"),
    ("tenzel-semicircular-passos.png",         JACKSON,     349, None,
     "Jackson cap.7, p.356 (Tenzel-style cantotomy + cantolysis sequence)"),
    ("hughes-modificado-estagio-1.png",        OCULOFACIAL, 242, (0.0, 0.55, 0.55, 1.0),
     "Oculofacial cap.11, p.224, fig 11-12 left panel (Hughes flap — stage 1: tarsoconjuntival flap in place)"),
    ("hughes-modificado-estagio-2.png",        OCULOFACIAL, 242, (0.45, 0.55, 1.0, 1.0),
     "Oculofacial cap.11, p.224, fig 11-12 right panel (Hughes flap — stage 2: donor harvest detail)"),
    ("cutler-beard-estagio-1.png",             OCULOFACIAL, 241, (0.0, 0.0, 1.0, 0.30),
     "Oculofacial cap.11, p.223, fig 11-10 (Upper eyelid Cutler-Beard reconstruction — clinical case)"),
    ("cutler-beard-estagio-2.png",             JACKSON,     376, None,
     "Jackson cap.7, p.383 (Lid switch flap upper lid — full-thickness reconstruction analogue)"),
    ("mustarde-bochecha-rotacao-marcacao.png", JACKSON,     348, None,
     "Jackson cap.7, p.355 (Cheek advancement/rotation flap marking — Mustardé)"),
    ("canto-lateral-periosteal.png",           OCULOFACIAL, 245, (0.0, 0.0, 1.0, 0.50),
     "Oculofacial cap.11, p.227, fig 11-15 (Reconstruction of lateral canthal defect with periosteal flap)"),
    ("canto-medial-glabelar.png",              OCULOFACIAL, 245, (0.0, 0.50, 1.0, 1.0),
     "Oculofacial cap.11, p.227, fig 11-16 (Reconstruction of medial canthal defect with FTSG)"),
    ("tarsoconjuntival-graft-doador.png",      JACKSON,     350, None,
     "Jackson cap.7, p.357 (Chondromucosal/posterior lamellar donor concept)"),
    ("ftsg-doadores-hierarquia.png",           OCULOFACIAL, 239, None,
     "Oculofacial cap.11, p.221, fig 11-8 (Possible donor sites for full-thickness skin grafts)"),
]


def _ensure_ascii(filename: str) -> None:
    """Reject filenames with diacritics / non-ASCII."""
    nfkd = unicodedata.normalize("NFKD", filename)
    if any(unicodedata.combining(ch) for ch in nfkd):
        raise ValueError(f"filename has diacritics: {filename!r}")
    try:
        filename.encode("ascii")
    except UnicodeEncodeError as exc:  # pragma: no cover - tested via raise
        raise ValueError(f"filename has non-ASCII: {filename!r}") from exc


def _render(doc: "fitz.Document", page_idx: int,
            bbox_frac: Optional[Tuple[float, float, float, float]],
            out_path: Path, dpi: int = 300) -> None:
    page = doc[page_idx]
    if bbox_frac is None:
        pix = page.get_pixmap(dpi=dpi)
    else:
        x0f, y0f, x1f, y1f = bbox_frac
        r = page.rect
        clip = fitz.Rect(
            r.x0 + x0f * r.width,
            r.y0 + y0f * r.height,
            r.x0 + x1f * r.width,
            r.y0 + y1f * r.height,
        )
        pix = page.get_pixmap(dpi=dpi, clip=clip)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(out_path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").split("\n")[0])
    parser.add_argument("--force", action="store_true", help="overwrite existing PNGs")
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--pdf-root", type=Path, default=None,
                        help="override location of 00-Livros-Texto/")
    args = parser.parse_args(argv)

    pdf_root = (args.pdf_root or PDF_ROOT).resolve()
    if not pdf_root.exists():
        print(f"ERROR: PDF root not found: {pdf_root}", file=sys.stderr)
        return 2

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    docs_cache: dict[Path, "fitz.Document"] = {}
    rendered = 0
    skipped = 0
    try:
        for slug, pdf_name, page_idx, bbox, label in MAPPING:
            _ensure_ascii(slug)
            out_path = OUTPUT_DIR / slug
            if out_path.exists() and not args.force:
                print(f"skip (exists): {slug}")
                skipped += 1
                continue
            pdf_path = pdf_root / pdf_name
            if not pdf_path.exists():
                print(f"ERROR: PDF missing: {pdf_path}", file=sys.stderr)
                return 3
            doc = docs_cache.get(pdf_path)
            if doc is None:
                doc = fitz.open(pdf_path)
                docs_cache[pdf_path] = doc
            print(f"render: {slug:55s} <- {pdf_name} idx={page_idx} bbox={bbox}")
            _render(doc, page_idx, bbox, out_path, dpi=args.dpi)
            rendered += 1
    finally:
        for doc in docs_cache.values():
            doc.close()

    print(f"\nDone. rendered={rendered} skipped={skipped} total={len(MAPPING)} -> {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
