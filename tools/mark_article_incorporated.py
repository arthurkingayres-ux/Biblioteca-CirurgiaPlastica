"""
mark_article_incorporated.py
Marca artigos do índice como incorporados em um documento de estudo.

Uso:
    # Marcar por DOI:
    python tools/mark_article_incorporated.py \
        --doi "10.1097/PRS.0000000000000000" \
        --documento "11-1-Abdominoplastia.docx"

    # Marcar todos de uma área:
    python tools/mark_article_incorporated.py \
        --area "Abdominoplastia" \
        --documento "11-1-Abdominoplastia.docx" \
        --todos

Saída:
    Atualiza 02-Artigos-Periodicos/indice-artigos.csv
"""

import argparse
import csv
import os
from datetime import date

from dotenv import load_dotenv

load_dotenv()

ARTICLE_INDEX = os.getenv("ARTICLE_INDEX", "02-Artigos-Periodicos/indice-artigos.csv")

FIELDNAMES = [
    "titulo", "autores", "journal", "ano", "volume", "paginas",
    "doi", "data_download", "area_tematica", "incorporado_em_documento", "data_incorporacao"
]


def main():
    parser = argparse.ArgumentParser(description="Marca artigos como incorporados")
    parser.add_argument("--doi", help="DOI do artigo a marcar")
    parser.add_argument("--area", help="Área temática para marcar em lote")
    parser.add_argument("--documento", required=True, help="Nome do documento de destino")
    parser.add_argument("--todos", action="store_true", help="Marcar todos da área (requer --area)")
    args = parser.parse_args()

    if not os.path.exists(ARTICLE_INDEX):
        print(f"Índice não encontrado: {ARTICLE_INDEX}")
        return

    with open(ARTICLE_INDEX, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    updated = 0
    today = date.today().isoformat()

    for row in rows:
        match = False
        if args.doi and row.get("doi") == args.doi:
            match = True
        elif args.todos and args.area and row.get("area_tematica", "").lower() == args.area.lower():
            if not row.get("incorporado_em_documento"):
                match = True

        if match:
            row["incorporado_em_documento"] = args.documento
            row["data_incorporacao"] = today
            updated += 1

    with open(ARTICLE_INDEX, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Artigos marcados como incorporados: {updated}")
    print(f"Documento: {args.documento}")


if __name__ == "__main__":
    main()
