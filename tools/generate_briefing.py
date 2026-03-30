"""
generate_briefing.py
Gera um briefing semanal em Markdown com os artigos mais recentes do índice.

Uso:
    python tools/generate_briefing.py
    python tools/generate_briefing.py --area "Abdominoplastia" --semana 2026-W13

Saída:
    04-Briefings-Semanais/YYYY-WNN-briefing.md
"""

import argparse
import csv
import os
from datetime import date, datetime

from dotenv import load_dotenv

load_dotenv()

ARTICLE_INDEX = os.getenv("ARTICLE_INDEX", "02-Artigos-Periodicos/indice-artigos.csv")
BRIEFINGS_DIR = os.getenv("BRIEFINGS_DIR", "04-Briefings-Semanais")


def load_recent_articles(area: str = None, days: int = 30) -> list[dict]:
    if not os.path.exists(ARTICLE_INDEX):
        return []

    with open(ARTICLE_INDEX, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    cutoff = date.today().toordinal() - days
    recent = []
    for r in rows:
        raw_date = r.get("data_download", "")
        try:
            dl = date.fromisoformat(raw_date).toordinal()
        except (ValueError, TypeError):
            continue
        if dl >= cutoff:
            if area is None or r.get("area_tematica", "").lower() == area.lower():
                recent.append(r)

    return recent


def build_briefing(articles: list[dict], semana: str, area: str = None) -> str:
    today = date.today().isoformat()
    area_label = f" — {area}" if area else ""
    lines = [
        f"# Briefing Semanal{area_label} — {semana}",
        f"",
        f"**Gerado em:** {today}  ",
        f"**Artigos incluídos:** {len(articles)}",
        f"",
        "---",
        "",
    ]

    if not articles:
        lines.append("Nenhum artigo novo encontrado neste período.")
        return "\n".join(lines)

    # Agrupar por área temática
    by_area: dict[str, list[dict]] = {}
    for a in articles:
        area_key = a.get("area_tematica", "Outros")
        by_area.setdefault(area_key, []).append(a)

    for area_key, group in sorted(by_area.items()):
        lines.append(f"## {area_key}")
        lines.append("")
        for art in group:
            doi_link = f" [[DOI]](https://doi.org/{art['doi']})" if art.get("doi") else ""
            lines.append(f"### {art['titulo']}")
            lines.append(f"**Autores:** {art['autores']}  ")
            lines.append(f"**Journal:** {art['journal']} | **Ano:** {art['ano']}  ")
            if art.get("volume"):
                lines.append(f"**Volume:** {art['volume']} | **Páginas:** {art.get('paginas', '')}  ")
            lines.append(f"**DOI:{doi_link}** `{art.get('doi', 'N/A')}`  ")
            incorporado = art.get("incorporado_em_documento", "")
            if incorporado:
                lines.append(f"**Incorporado em:** {incorporado}  ")
            lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Gera briefing semanal de artigos")
    parser.add_argument("--area", default=None, help="Filtrar por área temática")
    parser.add_argument("--semana", default=None, help="Identificador da semana (ex: 2026-W13)")
    parser.add_argument("--days", type=int, default=30, help="Janela de dias para artigos recentes")
    args = parser.parse_args()

    today = date.today()
    semana = args.semana or f"{today.year}-W{today.isocalendar()[1]:02d}"

    articles = load_recent_articles(area=args.area, days=args.days)
    content = build_briefing(articles, semana, args.area)

    os.makedirs(BRIEFINGS_DIR, exist_ok=True)
    area_slug = f"-{args.area.lower().replace(' ', '-')}" if args.area else ""
    output_path = os.path.join(BRIEFINGS_DIR, f"{semana}{area_slug}-briefing.md")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Briefing gerado: {output_path}")
    print(f"Artigos incluídos: {len(articles)}")


if __name__ == "__main__":
    main()
