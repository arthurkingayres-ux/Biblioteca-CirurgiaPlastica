"""
log_progress.py
Registra uma entrada no diário de progresso de estudos.

Uso:
    python tools/log_progress.py \
        --tema "Abdominoplastia" \
        --atividade "Leitura do documento 11-1 + revisão de 3 artigos" \
        --duracao 90 \
        --notas "Foco em classificação de Matarasso"

Saída:
    05-Registro-Progresso/progresso.csv  — registro acumulado
    05-Registro-Progresso/YYYY-MM-DD.md  — entrada diária em Markdown
"""

import argparse
import csv
import os
from datetime import date, datetime

from dotenv import load_dotenv

load_dotenv()

PROGRESS_DIR = os.getenv("PROGRESS_DIR", "05-Registro-Progresso")
PROGRESS_CSV = os.path.join(PROGRESS_DIR, "progresso.csv")

CSV_FIELDNAMES = ["data", "tema", "atividade", "duracao_min", "notas"]


def append_to_csv(entry: dict):
    os.makedirs(PROGRESS_DIR, exist_ok=True)
    file_exists = os.path.exists(PROGRESS_CSV)
    with open(PROGRESS_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
        if not file_exists:
            writer.writeheader()
        writer.writerow(entry)


def append_to_daily_md(entry: dict):
    today = entry["data"]
    md_path = os.path.join(PROGRESS_DIR, f"{today}.md")
    is_new = not os.path.exists(md_path)

    with open(md_path, "a", encoding="utf-8") as f:
        if is_new:
            f.write(f"# Registro de Progresso — {today}\n\n")
        f.write(f"## {entry['tema']}\n")
        f.write(f"**Atividade:** {entry['atividade']}  \n")
        f.write(f"**Duração:** {entry['duracao_min']} min  \n")
        if entry.get("notas"):
            f.write(f"**Notas:** {entry['notas']}  \n")
        f.write("\n")


def main():
    parser = argparse.ArgumentParser(description="Registra progresso de estudo")
    parser.add_argument("--tema", required=True, help="Tema estudado (ex: Abdominoplastia)")
    parser.add_argument("--atividade", required=True, help="Descrição da atividade realizada")
    parser.add_argument("--duracao", type=int, default=0, help="Duração em minutos")
    parser.add_argument("--notas", default="", help="Notas ou observações")
    parser.add_argument("--data", default=None, help="Data (padrão: hoje, formato YYYY-MM-DD)")
    args = parser.parse_args()

    entry = {
        "data": args.data or date.today().isoformat(),
        "tema": args.tema,
        "atividade": args.atividade,
        "duracao_min": args.duracao,
        "notas": args.notas,
    }

    append_to_csv(entry)
    append_to_daily_md(entry)

    print(f"Progresso registrado: {entry['tema']} — {entry['atividade'][:50]}")
    print(f"Arquivos atualizados:")
    print(f"  {PROGRESS_CSV}")
    print(f"  {os.path.join(PROGRESS_DIR, entry['data'] + '.md')}")


if __name__ == "__main__":
    main()
