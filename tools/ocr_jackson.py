"""OCR scanned pages of Jackson Local Flaps in Head and Neck Reconstruction.

Pages 1-58 of the PDF are text-layered (chapters 1-2). Pages 59-525 are
image-only scans (chapters 3-10). This script renders each image-only page
at 300 dpi, runs easyocr, and appends to the existing extracted .txt with
=== PAGE N === markers, preserving line ordering. Resumable via marker scan.
"""

from __future__ import annotations
import sys
import time
from pathlib import Path

import fitz  # PyMuPDF
import easyocr  # type: ignore

PDF = Path("00-Livros-Texto/Jackson - Local Flaps in Head and Neck Reconstruction (2nd Edition).pdf")
OUT = Path("00-Livros-Texto/_extracted/jackson-local-flaps-head-neck.ocr.txt")
PROGRESS = Path("00-Livros-Texto/_extracted/jackson-local-flaps-head-neck.ocr.progress.txt")
START_PAGE = 59  # first scanned page (1-indexed)
# Cap.7 (Eyelid + Canthal Region Reconstruction) lives in PDF pages ~341–422.
# Process this priority window first, then resume the rest of the scanned range.
PRIORITY_RANGES = [(341, 422)]


def main() -> int:
    if not PDF.exists():
        print(f"ERROR: PDF not found: {PDF}", file=sys.stderr)
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)

    # Resume: parse already-completed pages from OUT
    done = set()
    if OUT.exists():
        for line in OUT.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.startswith("=== PAGE ") and line.endswith(" ==="):
                try:
                    n = int(line[len("=== PAGE "):-len(" ===")])
                    done.add(n)
                except ValueError:
                    pass
    print(f"[resume] pages already OCRed: {len(done)}")

    print("[init] loading easyocr reader (CPU)...", flush=True)
    t0 = time.time()
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    print(f"[init] reader ready in {time.time() - t0:.1f}s", flush=True)

    doc = fitz.open(PDF)
    total = doc.page_count

    # Priority pages first (e.g., chapter of immediate interest), then the rest
    # in normal forward order. Each page only OCRed once thanks to `done`.
    priority = []
    for lo, hi in PRIORITY_RANGES:
        for p in range(lo, hi + 1):
            if START_PAGE <= p <= total and p not in done and p not in priority:
                priority.append(p)
    rest = [p for p in range(START_PAGE, total + 1) if p not in done and p not in priority]
    pending = priority + rest
    print(f"[plan] OCR {len(pending)} pages "
          f"(priority cap.7 first: {len(priority)}, then rest: {len(rest)})", flush=True)

    # Append mode so resume just adds more pages
    with OUT.open("a", encoding="utf-8") as f:
        for idx, page_num in enumerate(pending, 1):
            page = doc[page_num - 1]
            pix = page.get_pixmap(dpi=300)
            png_bytes = pix.tobytes("png")
            t0 = time.time()
            try:
                paragraphs = reader.readtext(png_bytes, detail=0, paragraph=True)
            except Exception as exc:  # noqa: BLE001
                paragraphs = [f"[OCR ERROR: {exc}]"]
            elapsed = time.time() - t0
            f.write(f"=== PAGE {page_num} ===\n")
            for para in paragraphs:
                f.write(para.strip() + "\n\n")
            f.flush()
            PROGRESS.write_text(f"{idx}/{len(pending)} (page {page_num}) {elapsed:.1f}s\n", encoding="utf-8")
            if idx == 1 or idx % 10 == 0 or idx == len(pending):
                avg = (time.time() - t0) if idx == 1 else elapsed
                eta_min = (len(pending) - idx) * elapsed / 60.0
                print(f"[ocr] {idx}/{len(pending)} done (page {page_num}, {elapsed:.1f}s, ETA {eta_min:.0f} min)", flush=True)

    doc.close()
    print("[done] OCR complete", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
