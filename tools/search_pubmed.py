"""
search_pubmed.py
Busca artigos no PubMed usando a API do NCBI (Entrez).

Uso:
    python tools/search_pubmed.py --query "abdominoplasty outcomes" --max 20
    python tools/search_pubmed.py --query "liposuction complications" --max 10 --years 5

Saída:
    .tmp/pubmed_results.json  — lista de artigos encontrados
"""

import argparse
import json
import os
import time
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv

load_dotenv()

NCBI_API_KEY = os.getenv("NCBI_API_KEY")
NCBI_EMAIL = os.getenv("NCBI_EMAIL")
TMP_DIR = os.getenv("TMP_DIR", ".tmp")

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"


def search_pubmed(query: str, max_results: int = 20, years: int = None) -> list[dict]:
    """Busca artigos no PubMed e retorna metadados."""

    if years:
        min_date = (datetime.now() - timedelta(days=365 * years)).strftime("%Y/%m/%d")
        query = f"{query} AND ({min_date}[PDAT] : 3000/12/31[PDAT])"

    # Etapa 1: buscar IDs
    search_params = {
        "db": "pubmed",
        "term": query,
        "retmax": max_results,
        "retmode": "json",
        "email": NCBI_EMAIL,
    }
    if NCBI_API_KEY:
        search_params["api_key"] = NCBI_API_KEY

    resp = requests.get(f"{BASE_URL}/esearch.fcgi", params=search_params)
    resp.raise_for_status()
    ids = resp.json()["esearchresult"]["idlist"]

    if not ids:
        print("Nenhum artigo encontrado.")
        return []

    print(f"Encontrados {len(ids)} artigos. Buscando metadados...")

    # Etapa 2: buscar metadados dos IDs
    time.sleep(0.4)  # respeitar limite de taxa do NCBI
    fetch_params = {
        "db": "pubmed",
        "id": ",".join(ids),
        "retmode": "json",
        "rettype": "abstract",
        "email": NCBI_EMAIL,
    }
    if NCBI_API_KEY:
        fetch_params["api_key"] = NCBI_API_KEY

    resp = requests.get(f"{BASE_URL}/efetch.fcgi", params=fetch_params)
    resp.raise_for_status()

    # Para JSON estruturado, usar esummary
    summary_params = {
        "db": "pubmed",
        "id": ",".join(ids),
        "retmode": "json",
        "email": NCBI_EMAIL,
    }
    if NCBI_API_KEY:
        summary_params["api_key"] = NCBI_API_KEY

    time.sleep(0.4)
    resp = requests.get(f"{BASE_URL}/esummary.fcgi", params=summary_params)
    resp.raise_for_status()
    summaries = resp.json().get("result", {})

    articles = []
    for pmid in ids:
        art = summaries.get(pmid, {})
        authors = ", ".join(
            a.get("name", "") for a in art.get("authors", [])[:3]
        )
        if len(art.get("authors", [])) > 3:
            authors += " et al."

        articles.append({
            "pmid": pmid,
            "titulo": art.get("title", ""),
            "autores": authors,
            "journal": art.get("source", ""),
            "ano": art.get("pubdate", "")[:4],
            "volume": art.get("volume", ""),
            "paginas": art.get("pages", ""),
            "doi": next(
                (
                    i["value"]
                    for i in art.get("articleids", [])
                    if i["idtype"] == "doi"
                ),
                "",
            ),
        })

    return articles


def main():
    parser = argparse.ArgumentParser(description="Busca artigos no PubMed")
    parser.add_argument("--query", required=True, help="Termo de busca")
    parser.add_argument("--max", type=int, default=20, help="Número máximo de resultados")
    parser.add_argument("--years", type=int, default=None, help="Limitar aos últimos N anos")
    parser.add_argument("--output", default=None, help="Arquivo de saída (padrão: .tmp/pubmed_results.json)")
    args = parser.parse_args()

    output_path = args.output or os.path.join(TMP_DIR, "pubmed_results.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    articles = search_pubmed(args.query, args.max, args.years)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    print(f"\n{len(articles)} artigos salvos em: {output_path}")
    for i, a in enumerate(articles, 1):
        print(f"  {i}. {a['titulo'][:80]}... ({a['journal']}, {a['ano']})")


if __name__ == "__main__":
    main()
