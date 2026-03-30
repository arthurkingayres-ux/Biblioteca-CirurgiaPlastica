"""
update_article_index.py
Adiciona ou atualiza entradas no índice de artigos (indice-artigos.csv).

Uso:
    # Adicionar a partir de arquivo JSON gerado por search_pubmed.py:
    python tools/update_article_index.py --input .tmp/pubmed_results.json --area "Contorno Corporal"

    # Adicionar um artigo manualmente:
    python tools/update_article_index.py --manual \
        --titulo "Título do artigo" \
        --autores "Autor A, Autor B" \
        --journal "Plastic and Reconstructive Surgery" \
        --ano 2024 \
        --doi "10.1097/PRS.0000000000000000" \
        --area "Abdominoplastia"

Saída:
    Atualiza 02-Artigos-Periodicos/indice-artigos.csv
"""

import argparse
import csv
import json
import os
from datetime import date

from dotenv import load_dotenv

load_dotenv()

ARTICLE_INDEX = os.getenv("ARTICLE_INDEX", "02-Artigos-Periodicos/indice-artigos.csv")

FIELDNAMES = [
    "titulo", "autores", "journal", "ano", "volume", "paginas",
    "doi", "data_download", "area_tematica", "incorporado_em_documento", "data_incorporacao"
]


def load_index() -> list[dict]:
    if not os.path.exists(ARTICLE_INDEX):
        return []
    with open(ARTICLE_INDEX, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def save_index(rows: list[dict]):
    with open(ARTICLE_INDEX, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def doi_exists(rows: list[dict], doi: str) -> bool:
    return any(r.get("doi") == doi for r in rows if doi)


def add_articles_from_json(json_path: str, area: str):
    with open(json_path, "r", encoding="utf-8") as f:
        articles = json.load(f)

    rows = load_index()
    added = 0
    skipped = 0

    for art in articles:
        doi = art.get("doi", "")
        if doi_exists(rows, doi):
            skipped += 1
            continue

        rows.append({
            "titulo": art.get("titulo", ""),
            "autores": art.get("autores", ""),
            "journal": art.get("journal", ""),
            "ano": art.get("ano", ""),
            "volume": art.get("volume", ""),
            "paginas": art.get("paginas", ""),
            "doi": doi,
            "data_download": date.today().isoformat(),
            "area_tematica": area,
            "incorporado_em_documento": "",
            "data_incorporacao": "",
        })
        added += 1

    save_index(rows)
    print(f"Adicionados: {added} | Ignorados (duplicados): {skipped}")
    print(f"Total no índice: {len(rows)}")


def add_article_manual(args):
    rows = load_index()
    doi = args.doi or ""

    if doi_exists(rows, doi):
        print(f"Artigo com DOI '{doi}' já existe no índice.")
        return

    rows.append({
        "titulo": args.titulo,
        "autores": args.autores,
        "journal": args.journal,
        "ano": args.ano,
        "volume": args.volume or "",
        "paginas": args.paginas or "",
        "doi": doi,
        "data_download": date.today().isoformat(),
        "area_tematica": args.area,
        "incorporado_em_documento": "",
        "data_incorporacao": "",
    })

    save_index(rows)
    print(f"Artigo adicionado ao índice: {args.titulo[:60]}...")


def main():
    parser = argparse.ArgumentParser(description="Atualiza índice de artigos")
    parser.add_argument("--manual", action="store_true", help="Inserir artigo manualmente")
    parser.add_argument("--input", help="JSON gerado por search_pubmed.py")
    parser.add_argument("--area", required=True, help="Área temática (ex: Abdominoplastia)")

    # Campos para inserção manual
    parser.add_argument("--titulo")
    parser.add_argument("--autores")
    parser.add_argument("--journal")
    parser.add_argument("--ano")
    parser.add_argument("--volume")
    parser.add_argument("--paginas")
    parser.add_argument("--doi")

    args = parser.parse_args()

    if args.manual:
        for required in ["titulo", "autores", "journal", "ano"]:
            if not getattr(args, required):
                parser.error(f"--{required} é obrigatório no modo manual")
        add_article_manual(args)
    elif args.input:
        add_articles_from_json(args.input, args.area)
    else:
        parser.error("Forneça --input ou use --manual")


if __name__ == "__main__":
    main()
