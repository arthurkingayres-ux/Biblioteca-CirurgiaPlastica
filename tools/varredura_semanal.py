"""
varredura_semanal.py
Orquestra a varredura semanal de artigos nos periodicos-alvo.

Fluxo:
  1. Le varredura_state.json para determinar qual area varrer
  2. Chama search_pubmed.py com a query da area + filtro dos 6 periodicos
  3. Filtra DOIs ja presentes em indice-artigos.csv
  4. Envia abstracts dos artigos novos para a Anthropic API (triagem)
  5. Salva resultados em 02-Artigos-Periodicos/_varredura/<area>_<data>.json
  6. Atualiza varredura_state.json com a data da varredura
  7. Faz commit dos resultados no repo via git

Uso:
    python tools/varredura_semanal.py                  # varredura normal
    python tools/varredura_semanal.py --dry-run        # sem salvar nem commitar
    python tools/varredura_semanal.py --area estetica-facial  # forcar area especifica
    python tools/varredura_semanal.py --skip-triage    # pular triagem IA (salva todos)
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta

from dotenv import load_dotenv

# Forcar stdout UTF-8 no Windows (evita UnicodeEncodeError com cp1252)
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Adicionar o diretorio tools/ ao path para importar search_pubmed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from search_pubmed import search_pubmed

load_dotenv()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_PATH = os.path.join(ROOT, "varredura_state.json")
INDEX_PATH = os.path.join(ROOT, "02-Artigos-Periodicos", "indice-artigos.csv")
VARREDURA_DIR = os.path.join(ROOT, "02-Artigos-Periodicos", "_varredura")
TRIAGE_PROMPT_PATH = os.path.join(ROOT, "tools", "triage_prompt.txt")

JOURNAL_FILTER = (
    '("Plastic and Reconstructive Surgery"[Journal] OR '
    '"Aesthetic Surgery Journal"[Journal] OR '
    '"Journal of Plastic, Reconstructive and Aesthetic Surgery"[Journal] OR '
    '"Annals of Plastic Surgery"[Journal] OR '
    '"Clinics in Plastic Surgery"[Journal] OR '
    '"Revista Brasileira de Cirurgia Plástica"[Journal])'
)


# --- State management ---


def load_state():
    with open(STATE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(state):
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
        f.write("\n")


def pick_area(state, forced_area=None):
    """Seleciona a area mais desatualizada (ou a forcada via --area)."""
    if forced_area:
        if forced_area not in state["areas"]:
            print(f"ERRO: Area '{forced_area}' nao encontrada no state.")
            print(f"Areas disponiveis: {', '.join(state['areas'].keys())}")
            sys.exit(1)
        return forced_area

    oldest_area = None
    oldest_date = None

    for area, info in state["areas"].items():
        dt = info.get("ultima_varredura")
        if dt is None:
            # Nunca varrida — prioridade maxima
            return area
        if oldest_date is None or dt < oldest_date:
            oldest_date = dt
            oldest_area = area

    return oldest_area


# --- DOI dedup ---


def load_existing_dois():
    """Carrega todos os DOIs ja indexados em indice-artigos.csv."""
    dois = set()
    if not os.path.exists(INDEX_PATH):
        return dois
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            doi = row.get("doi", "").strip()
            if doi:
                dois.add(doi.lower())
    return dois


# --- PubMed search ---


def build_query(area_info):
    """Constroi a query PubMed combinando termos da area + filtro de periodicos."""
    terms = area_info["query_terms"]
    return f"({terms}) AND {JOURNAL_FILTER}"


def run_search(query, is_zero, max_results=500):
    """Executa a busca PubMed. Varredura zero = 10 anos, subsequentes = 30 dias."""
    if is_zero:
        years = 10
        print(f"  Varredura ZERO: buscando ultimos {years} anos")
    else:
        # Para varreduras subsequentes, usar filtro de 30 dias via query direta
        min_date = (datetime.now() - timedelta(days=30)).strftime("%Y/%m/%d")
        query = f"{query} AND ({min_date}[PDAT] : 3000/12/31[PDAT])"
        years = None
        print(f"  Varredura incremental: ultimos 30 dias")

    return search_pubmed(query, max_results=max_results, years=years if is_zero else None)


# --- Triage via Anthropic API ---


def triage_articles(articles, area, subtemas):
    """Envia artigos para a Anthropic API e retorna classificacoes."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("AVISO: ANTHROPIC_API_KEY nao definida. Pulando triagem IA.")
        print("  Todos os artigos serao marcados como relevancia PENDENTE.")
        return _fallback_triage(articles)

    try:
        import anthropic
    except ImportError:
        print("AVISO: Pacote 'anthropic' nao instalado. Pulando triagem IA.")
        print("  Execute: pip install anthropic")
        return _fallback_triage(articles)

    # Carregar template do prompt
    with open(TRIAGE_PROMPT_PATH, "r", encoding="utf-8") as f:
        prompt_template = f.read()

    # Formatar artigos para o prompt
    artigos_texto = _format_articles_for_prompt(articles)

    prompt = prompt_template.replace("{area}", area)
    prompt = prompt.replace("{subtemas}", ", ".join(subtemas))
    prompt = prompt.replace("{artigos}", artigos_texto)

    # Chamar API em lotes (maximo ~30 artigos por chamada para nao estourar contexto)
    batch_size = 30
    all_results = []

    for i in range(0, len(articles), batch_size):
        batch = articles[i:i + batch_size]
        batch_texto = _format_articles_for_prompt(batch)

        batch_prompt = prompt_template.replace("{area}", area)
        batch_prompt = batch_prompt.replace("{subtemas}", ", ".join(subtemas))
        batch_prompt = batch_prompt.replace("{artigos}", batch_texto)

        lote_num = i // batch_size + 1
        print(f"  Triagem IA: lote {lote_num} ({len(batch)} artigos)...")

        client = anthropic.Anthropic(api_key=api_key)
        # Retry com backoff para rate limit (429)
        max_retries = 5
        for attempt in range(max_retries):
            try:
                message = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    messages=[{"role": "user", "content": batch_prompt}],
                )
                break
            except anthropic.RateLimitError:
                wait = 30 * (attempt + 1)
                print(f"  Rate limit atingido. Aguardando {wait}s antes de tentar novamente...")
                time.sleep(wait)
        else:
            print(f"  ERRO: Rate limit persistente no lote {lote_num}. Pulando.")
            continue

        response_text = message.content[0].text.strip()

        # Extrair JSON da resposta (pode vir com ```json ... ```)
        json_text = response_text
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0].strip()
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0].strip()

        try:
            batch_results = json.loads(json_text)
            all_results.extend(batch_results)
        except json.JSONDecodeError as e:
            print(f"  AVISO: Falha ao parsear resposta da IA (lote {i // batch_size + 1}): {e}")
            print(f"  Resposta: {response_text[:200]}...")
            # Fallback: marcar artigos do lote como PENDENTE
            for art in batch:
                all_results.append({
                    "pmid": art["pmid"],
                    "relevancia": "PENDENTE",
                    "justificativa": "Falha na triagem automatica — avaliar manualmente",
                })

    return all_results


def _format_articles_for_prompt(articles):
    """Formata artigos para inclusao no prompt de triagem."""
    lines = []
    for i, art in enumerate(articles, 1):
        lines.append(f"--- Artigo {i} ---")
        lines.append(f"PMID: {art['pmid']}")
        lines.append(f"Titulo: {art['titulo']}")
        lines.append(f"Autores: {art['autores']}")
        lines.append(f"Journal: {art['journal']}, {art['ano']}")
        lines.append(f"Tipos de publicacao: {', '.join(art.get('publication_types', []))}")

        mesh = art.get("mesh_terms", [])
        if mesh:
            mesh_strs = []
            for m in mesh:
                s = m["term"]
                if m.get("major"):
                    s += " *"
                if m.get("qualifiers"):
                    s += f" ({', '.join(m['qualifiers'])})"
                mesh_strs.append(s)
            lines.append(f"MeSH: {'; '.join(mesh_strs)}")
        else:
            lines.append("MeSH: (nao indexado)")

        abstract = art.get("abstract", "")
        if abstract:
            lines.append(f"Abstract: {abstract}")
        else:
            lines.append("Abstract: (nao disponivel)")

        lines.append("")

    return "\n".join(lines)


def _fallback_triage(articles):
    """Triagem fallback quando a API nao esta disponivel."""
    results = []
    for art in articles:
        pub_types = [pt.lower() for pt in art.get("publication_types", [])]

        # Heuristica simples baseada nos tipos de publicacao
        relevancia = "PENDENTE"
        justificativa = "Triagem automatica indisponivel — avaliar manualmente"

        if any("meta-analysis" in pt for pt in pub_types):
            relevancia = "ALTA"
            justificativa = "Meta-analise detectada pelo tipo de publicacao (sem triagem IA)"
        elif any("systematic review" in pt for pt in pub_types):
            relevancia = "ALTA"
            justificativa = "Revisao sistematica detectada pelo tipo de publicacao (sem triagem IA)"
        elif any("randomized controlled trial" in pt for pt in pub_types):
            relevancia = "ALTA"
            justificativa = "RCT detectado pelo tipo de publicacao (sem triagem IA)"
        elif any("review" in pt for pt in pub_types):
            relevancia = "MEDIA"
            justificativa = "Revisao detectada pelo tipo de publicacao (sem triagem IA)"

        results.append({
            "pmid": art["pmid"],
            "relevancia": relevancia,
            "justificativa": justificativa,
        })

    return results


# --- Merge results ---


def merge_results(articles, triage_results):
    """Combina metadados dos artigos com resultados da triagem."""
    triage_map = {r["pmid"]: r for r in triage_results}
    merged = []

    for art in articles:
        triage = triage_map.get(art["pmid"], {
            "relevancia": "PENDENTE",
            "justificativa": "Nao avaliado",
        })
        entry = {
            **art,
            "relevancia": triage.get("relevancia", "PENDENTE"),
            "justificativa": triage.get("justificativa", triage.get("justificacao", "Nao avaliado")),
        }
        merged.append(entry)

    return merged


# --- Output ---


def save_results(merged, area, today_str, dry_run=False):
    """Salva resultados em _varredura/<area>_<data>.json."""
    os.makedirs(VARREDURA_DIR, exist_ok=True)
    filename = f"{area}_{today_str}.json"
    filepath = os.path.join(VARREDURA_DIR, filename)

    output = {
        "area": area,
        "data_varredura": today_str,
        "total_encontrados": len(merged),
        "por_relevancia": {},
        "artigos": merged,
    }

    # Contar por relevancia
    for art in merged:
        rel = art["relevancia"]
        output["por_relevancia"][rel] = output["por_relevancia"].get(rel, 0) + 1

    if dry_run:
        print(f"\n[DRY RUN] Resultados que seriam salvos em: {filepath}")
    else:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"\nResultados salvos em: {filepath}")

    return filepath, output


def print_summary(output):
    """Imprime resumo da varredura."""
    print(f"\n{'=' * 50}")
    print(f"RESUMO DA VARREDURA: {output['area']}")
    print(f"{'=' * 50}")
    print(f"Data: {output['data_varredura']}")
    print(f"Total de artigos novos: {output['total_encontrados']}")
    print(f"Classificacao:")
    for rel, count in sorted(output["por_relevancia"].items()):
        print(f"  {rel}: {count}")

    # Listar artigos ALTA e MEDIA
    relevantes = [a for a in output["artigos"] if a["relevancia"] in ("ALTA", "MEDIA")]
    if relevantes:
        print(f"\nArtigos relevantes ({len(relevantes)}):")
        for a in relevantes:
            titulo_short = a["titulo"][:70] if a["titulo"] else "(sem titulo)"
            print(f"  [{a['relevancia']}] {titulo_short}...")
            print(f"         {a['journal']}, {a['ano']} | {a['justificativa']}")


def git_commit(filepath, area, today_str, dry_run=False):
    """Faz commit dos resultados no repositorio."""
    if dry_run:
        print("[DRY RUN] Commit nao realizado.")
        return

    try:
        # Adicionar arquivos
        subprocess.run(
            ["git", "add", filepath, STATE_PATH],
            cwd=ROOT, check=True, capture_output=True,
        )
        msg = f"Varredura {area} ({today_str}): artigos avaliados"
        subprocess.run(
            ["git", "commit", "-m", msg],
            cwd=ROOT, check=True, capture_output=True,
        )
        print(f"Commit realizado: {msg}")
    except subprocess.CalledProcessError as e:
        print(f"AVISO: Falha no git commit: {e.stderr.decode()[:200] if e.stderr else str(e)}")


# --- Email notification ---


def send_notification(output, dry_run=False):
    """Envia email de notificacao com resumo (se configurado)."""
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")
    ncbi_email = os.getenv("NCBI_EMAIL")

    if not gmail_password or not ncbi_email:
        return

    if dry_run:
        print("[DRY RUN] Email nao enviado.")
        return

    import smtplib
    from email.mime.text import MIMEText

    relevantes = [a for a in output["artigos"] if a["relevancia"] in ("ALTA", "MEDIA")]
    if not relevantes:
        return

    body_lines = [
        f"Varredura: {output['area']} ({output['data_varredura']})",
        f"Total artigos novos: {output['total_encontrados']}",
        f"Relevantes (ALTA/MEDIA): {len(relevantes)}",
        "",
    ]
    for a in relevantes:
        body_lines.append(f"[{a['relevancia']}] {a['titulo']}")
        body_lines.append(f"  {a['journal']}, {a['ano']} | DOI: {a.get('doi', 'N/A')}")
        body_lines.append(f"  {a['justificativa']}")
        body_lines.append("")

    body = "\n".join(body_lines)
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = f"Varredura {output['area']}: {len(relevantes)} artigos relevantes"
    msg["From"] = ncbi_email
    msg["To"] = ncbi_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(ncbi_email, gmail_password)
            server.send_message(msg)
        print("Email de notificacao enviado.")
    except Exception as e:
        print(f"AVISO: Falha ao enviar email: {e}")


# --- Main ---


def main():
    parser = argparse.ArgumentParser(description="Varredura semanal de artigos")
    parser.add_argument("--dry-run", action="store_true", help="Simular sem salvar")
    parser.add_argument("--area", default=None, help="Forcar area especifica")
    parser.add_argument("--skip-triage", action="store_true", help="Pular triagem IA")
    parser.add_argument("--max", type=int, default=500, help="Max resultados PubMed (default 500)")
    args = parser.parse_args()

    today_str = datetime.now().strftime("%Y-%m-%d")

    # 1. Carregar estado
    print("=== Varredura Semanal de Artigos ===\n")
    state = load_state()

    # 2. Selecionar area
    area = pick_area(state, args.area)
    area_info = state["areas"][area]
    is_zero = not area_info.get("varredura_zero_feita", False)
    print(f"Area selecionada: {area}")
    print(f"Subtemas: {', '.join(area_info['subtemas'])}")
    print(f"Tipo: {'VARREDURA ZERO (10 anos)' if is_zero else 'incremental (30 dias)'}")

    # 3. Buscar artigos no PubMed
    print(f"\n--- Etapa 1: Busca PubMed ---")
    query = build_query(area_info)
    print(f"  Query: {query[:120]}...")
    articles = run_search(query, is_zero, max_results=args.max)
    print(f"  Artigos retornados: {len(articles)}")

    if not articles:
        print("Nenhum artigo encontrado. Encerrando.")
        # Atualizar state mesmo sem resultados
        if not args.dry_run:
            area_info["ultima_varredura"] = today_str
            if is_zero:
                area_info["varredura_zero_feita"] = True
            save_state(state)
        return

    # 4. Filtrar DOIs ja indexados
    print(f"\n--- Etapa 2: Deduplicacao ---")
    existing_dois = load_existing_dois()
    print(f"  DOIs ja indexados: {len(existing_dois)}")

    new_articles = [a for a in articles if a.get("doi", "").lower() not in existing_dois]
    # Artigos sem DOI tambem passam (podem ser novos)
    no_doi = [a for a in articles if not a.get("doi")]
    print(f"  Artigos novos (DOI nao indexado): {len(new_articles)}")
    if no_doi:
        print(f"  Artigos sem DOI (incluidos): {len(no_doi)}")

    if not new_articles:
        print("Todos os artigos ja estao indexados. Encerrando.")
        if not args.dry_run:
            area_info["ultima_varredura"] = today_str
            if is_zero:
                area_info["varredura_zero_feita"] = True
            save_state(state)
        return

    # 5. Triagem via IA (ou fallback)
    print(f"\n--- Etapa 3: Triagem ---")
    if args.skip_triage:
        print("  Triagem IA pulada (--skip-triage).")
        triage_results = _fallback_triage(new_articles)
    else:
        triage_results = triage_articles(new_articles, area, area_info["subtemas"])

    # 6. Merge e salvar resultados
    print(f"\n--- Etapa 4: Salvando resultados ---")
    merged = merge_results(new_articles, triage_results)
    filepath, output = save_results(merged, area, today_str, dry_run=args.dry_run)

    # 7. Atualizar estado
    if not args.dry_run:
        area_info["ultima_varredura"] = today_str
        if is_zero:
            area_info["varredura_zero_feita"] = True
        save_state(state)
        print(f"Estado atualizado: {area} -> ultima_varredura = {today_str}")

    # 8. Resumo
    print_summary(output)

    # 9. Git commit
    if not args.dry_run:
        git_commit(filepath, area, today_str)

    # 10. Email (opcional)
    send_notification(output, dry_run=args.dry_run)

    print(f"\n=== Varredura concluida ===")


if __name__ == "__main__":
    main()
