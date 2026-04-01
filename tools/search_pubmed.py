"""
search_pubmed.py
Busca artigos no PubMed usando a API do NCBI (Entrez).

Retorna metadados completos via efetch XML: título, autores, journal,
abstract, tipos de publicação e MeSH terms.

Uso:
    python tools/search_pubmed.py --query "abdominoplasty outcomes" --max 20
    python tools/search_pubmed.py --query "abdominoplasty outcomes" --max 20 --years 5

Saída:
    .tmp/pubmed_results.json  — lista de artigos encontrados
"""

import argparse
import json
import os
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv

load_dotenv()

NCBI_API_KEY = os.getenv("NCBI_API_KEY")
NCBI_EMAIL = os.getenv("NCBI_EMAIL")
TMP_DIR = os.getenv("TMP_DIR", ".tmp")

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"


def _parse_article_xml(article_elem):
    """Extrai metadados de um <PubmedArticle> XML element."""
    citation = article_elem.find("MedlineCitation")
    if citation is None:
        return None

    pmid_elem = citation.find("PMID")
    pmid = pmid_elem.text if pmid_elem is not None else ""

    article = citation.find("Article")
    if article is None:
        return None

    # Título
    title_elem = article.find("ArticleTitle")
    titulo = title_elem.text if title_elem is not None else ""

    # Autores
    author_list = article.find("AuthorList")
    autores = []
    if author_list is not None:
        for author in author_list.findall("Author"):
            last = author.find("LastName")
            fore = author.find("ForeName")
            if last is not None:
                name = last.text
                if fore is not None:
                    name += " " + fore.text[0]  # Primeira inicial
                autores.append(name)
    autores_str = ", ".join(autores[:3])
    if len(autores) > 3:
        autores_str += " et al."

    # Journal
    journal_elem = article.find("Journal")
    journal = ""
    ano = ""
    volume = ""
    if journal_elem is not None:
        iso = journal_elem.find("ISOAbbreviation")
        journal = iso.text if iso is not None else ""
        issue = journal_elem.find("JournalIssue")
        if issue is not None:
            vol = issue.find("Volume")
            volume = vol.text if vol is not None else ""
            pub_date = issue.find("PubDate")
            if pub_date is not None:
                year = pub_date.find("Year")
                if year is not None:
                    ano = year.text
                else:
                    # Formato alternativo: <MedlineDate>2025 Jan-Feb</MedlineDate>
                    medline_date = pub_date.find("MedlineDate")
                    if medline_date is not None and medline_date.text:
                        ano = medline_date.text[:4]

    # Paginação
    pagination = article.find("Pagination")
    paginas = ""
    if pagination is not None:
        pgn = pagination.find("MedlinePgn")
        paginas = pgn.text if pgn is not None else ""

    # DOI
    doi = ""
    for eloc in article.findall("ELocationID"):
        if eloc.get("EIdType") == "doi":
            doi = eloc.text or ""
            break
    if not doi:
        pubmed_data = article_elem.find("PubmedData")
        if pubmed_data is not None:
            for aid in pubmed_data.findall(".//ArticleId"):
                if aid.get("IdType") == "doi":
                    doi = aid.text or ""
                    break

    # Abstract (suporta abstracts estruturados com labels)
    abstract_elem = article.find("Abstract")
    abstract = ""
    if abstract_elem is not None:
        parts = []
        for text_elem in abstract_elem.findall("AbstractText"):
            label = text_elem.get("Label", "")
            # Coleta todo o texto incluindo sub-elementos (itálico, etc.)
            text = "".join(text_elem.itertext()).strip()
            if label:
                parts.append(f"{label}: {text}")
            else:
                parts.append(text)
        abstract = "\n".join(parts)

    # Tipos de publicação
    pub_types = []
    pub_type_list = article.find("PublicationTypeList")
    if pub_type_list is not None:
        for pt in pub_type_list.findall("PublicationType"):
            if pt.text:
                pub_types.append(pt.text)

    # MeSH terms
    mesh_terms = []
    mesh_list = citation.find("MeshHeadingList")
    if mesh_list is not None:
        for heading in mesh_list.findall("MeshHeading"):
            descriptor = heading.find("DescriptorName")
            if descriptor is not None and descriptor.text:
                major = descriptor.get("MajorTopicYN", "N") == "Y"
                term = {"term": descriptor.text, "major": major}
                qualifiers = []
                for qual in heading.findall("QualifierName"):
                    if qual.text:
                        qualifiers.append(qual.text)
                if qualifiers:
                    term["qualifiers"] = qualifiers
                mesh_terms.append(term)

    return {
        "pmid": pmid,
        "titulo": titulo,
        "autores": autores_str,
        "journal": journal,
        "ano": ano,
        "volume": volume,
        "paginas": paginas,
        "doi": doi,
        "abstract": abstract,
        "publication_types": pub_types,
        "mesh_terms": mesh_terms,
    }


def search_pubmed(query: str, max_results: int = 20, years: int = None) -> list[dict]:
    """Busca artigos no PubMed e retorna metadados completos via efetch XML."""

    if years:
        min_date = (datetime.now() - timedelta(days=365 * years)).strftime("%Y/%m/%d")
        query = f"{query} AND ({min_date}[PDAT] : 3000/12/31[PDAT])"

    # Etapa 1: buscar IDs via esearch
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

    print(f"Encontrados {len(ids)} artigos. Buscando metadados completos via efetch...")

    # Etapa 2: buscar metadados completos via efetch XML
    # Processa em lotes de 200 (limite recomendado pelo NCBI)
    articles = []
    batch_size = 200
    for i in range(0, len(ids), batch_size):
        batch = ids[i:i + batch_size]
        if i > 0:
            time.sleep(0.4)  # respeitar limite de taxa do NCBI

        fetch_params = {
            "db": "pubmed",
            "id": ",".join(batch),
            "retmode": "xml",
            "email": NCBI_EMAIL,
        }
        if NCBI_API_KEY:
            fetch_params["api_key"] = NCBI_API_KEY

        resp = requests.get(f"{BASE_URL}/efetch.fcgi", params=fetch_params)
        resp.raise_for_status()

        root = ET.fromstring(resp.text)
        for art_elem in root.findall("PubmedArticle"):
            parsed = _parse_article_xml(art_elem)
            if parsed:
                articles.append(parsed)

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
        titulo_short = a['titulo'][:80] if a['titulo'] else "(sem título)"
        types = ", ".join(a.get('publication_types', []))
        has_abstract = "[abstract]" if a.get('abstract') else "[sem abstract]"
        mesh_count = len(a.get('mesh_terms', []))
        print(f"  {i}. {titulo_short}...")
        print(f"     {a['journal']}, {a['ano']} | {types} | {has_abstract} | {mesh_count} MeSH")


if __name__ == "__main__":
    main()
