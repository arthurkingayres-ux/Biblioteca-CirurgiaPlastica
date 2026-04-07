#!/usr/bin/env python3
"""
tools/classify_figures.py — Fase 2 Parte 2: Classifica candidatos com Claude Haiku (multimodal)

Lê candidates.json gerado pelo extract_figures.py, envia cada imagem ao Claude Haiku e
preenche os campos: approved, type, label, card_id.

Uso:
  python tools/classify_figures.py --topic blefaroplastia
  python tools/classify_figures.py --topic blefaroplastia --area estetica-facial
  python tools/classify_figures.py --topic blefaroplastia --limit 10   # processar apenas 10
  python tools/classify_figures.py --topic blefaroplastia --redo        # reclassificar todos
  python tools/classify_figures.py --topic blefaroplastia --dry-run     # ver prompt, sem API

Saída:
  .tmp/figures/<topic>/candidates.json  → campos preenchidos (salvo incrementalmente)
  .tmp/figures/<topic>/classify_log.jsonl → log linha a linha

Próximo passo após concluir:
  python tools/review_figures.py --topic blefaroplastia
"""

import argparse
import base64
import io
import json
import sys
import time
from pathlib import Path

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf-8-sig"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import anthropic
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 300

# Tipos de figura válidos
FIGURE_TYPES = ["anatomy", "technique", "result", "table", "diagram", "irrelevant"]


# ---------------------------------------------------------------------------
# Carregar catálogo de cards do tópico
# ---------------------------------------------------------------------------

def load_card_catalog(topic: str, area: str) -> list[dict]:
    """Retorna lista de {id, type, title} de todos os cards do tópico."""
    cards_dir = ROOT / "content" / "cards" / area / topic
    if not cards_dir.exists():
        return []

    catalog = []
    for f in sorted(cards_dir.glob("*.json")):
        if f.name.startswith("_"):
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            cards = data if isinstance(data, list) else data.get("cards", [])
            for c in cards:
                if "id" in c and "title" in c:
                    catalog.append({
                        "id": c["id"],
                        "type": c.get("type", "?"),
                        "title": c["title"],
                    })
        except Exception:
            pass

    return catalog


# ---------------------------------------------------------------------------
# Prompt de classificação
# ---------------------------------------------------------------------------

def build_prompt(candidate: dict, catalog: list[dict], topic: str) -> str:
    cards_text = ""
    if catalog:
        lines = [f"  {c['id']:30s} | {c['type']:12s} | {c['title']}" for c in catalog]
        cards_text = "Cards disponíveis:\n" + "\n".join(lines)
    else:
        cards_text = "(sem cards mapeados para este tópico)"

    return f"""Você é um assistente especializado em cirurgia plástica que classifica figuras de livros-texto.

Esta imagem foi extraída do livro Neligan's Plastic Surgery (5ª ed.) — capítulo sobre "{topic}", página {candidate['page']}.
Fonte: {candidate['source']} ({candidate['width_px']}×{candidate['height_px']} px)

{cards_text}

Classifique esta figura respondendo APENAS com JSON válido, sem texto extra:

{{
  "approved": true ou false,
  "type": "anatomy" | "technique" | "result" | "table" | "diagram" | "irrelevant",
  "label": "Descrição curta em português (max 70 chars) ou null se irrelevant",
  "card_id": "id-do-card-mais-relevante ou null",
  "reason": "Motivo em 1 frase"
}}

Regras:
- approved=false: logotipos, decorações, bordas, texto puro sem figura, imagens corrompidas (<50px), cabeçalhos/rodapés
- approved=true: qualquer ilustração anatômica, foto cirúrgica, diagrama, tabela de dados médicos
- type="anatomy": estruturas anatômicas, cortes, ossos, músculos, vascularização, inervação
- type="technique": passos cirúrgicos, incisões, suturas, instrumentos
- type="result": fotos pré/pós-operatórias, resultados clínicos
- type="table": tabelas de dados, classificações numéricas
- type="diagram": fluxogramas, árvores de decisão, esquemas
- card_id: escolha o card mais relevante da lista acima, ou null se não couber em nenhum"""


# ---------------------------------------------------------------------------
# Chamar API
# ---------------------------------------------------------------------------

def encode_image(img_path: Path) -> tuple[str, str]:
    """Retorna (base64_data, media_type)."""
    ext = img_path.suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    media_type = media_type_map.get(ext, "image/jpeg")
    data = base64.standard_b64encode(img_path.read_bytes()).decode("utf-8")
    return data, media_type


def classify_one(client: anthropic.Anthropic, img_path: Path,
                 candidate: dict, catalog: list[dict], topic: str,
                 dry_run: bool = False) -> dict:
    """Envia imagem ao Claude Haiku e retorna resultado de classificação."""
    prompt = build_prompt(candidate, catalog, topic)

    if dry_run:
        print(f"\n[DRY-RUN] Imagem: {img_path.name}")
        print(prompt[:500], "...")
        return {"approved": None, "type": None, "label": None, "card_id": None, "reason": "dry-run"}

    img_data, media_type = encode_image(img_path)

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": img_data,
                    },
                },
                {
                    "type": "text",
                    "text": prompt,
                },
            ],
        }],
    )

    raw = response.content[0].text.strip()

    # Remover blocos de código se o modelo os incluiu
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    result = json.loads(raw)
    return result


# ---------------------------------------------------------------------------
# Salvar progresso
# ---------------------------------------------------------------------------

def save_candidates(topic_dir: Path, data: dict):
    pending = sum(1 for c in data["candidates"] if c["approved"] is None)
    data["pending_review"] = pending
    (topic_dir / "candidates.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def append_log(log_path: Path, entry: dict):
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Classifica candidatos de figuras com Claude Haiku")
    parser.add_argument("--topic", required=True, help="Tópico (ex: blefaroplastia)")
    parser.add_argument("--area", default="estetica-facial", help="Área (ex: estetica-facial)")
    parser.add_argument("--limit", type=int, default=0, help="Processar no máximo N candidatos (0=todos)")
    parser.add_argument("--redo", action="store_true", help="Reclassificar candidatos já classificados")
    parser.add_argument("--dry-run", action="store_true", help="Mostrar prompt sem chamar API")
    parser.add_argument("--delay", type=float, default=0.5, help="Segundos entre chamadas API (padrão: 0.5)")
    args = parser.parse_args()

    topic_dir = ROOT / ".tmp" / "figures" / args.topic
    candidates_path = topic_dir / "candidates.json"

    if not candidates_path.exists():
        print(f"Erro: {candidates_path} não encontrado.", file=sys.stderr)
        print(f"  Execute primeiro: python tools/extract_figures.py --topic {args.topic} ...", file=sys.stderr)
        sys.exit(1)

    data = json.loads(candidates_path.read_text(encoding="utf-8"))
    candidates = data["candidates"]

    # Filtrar pendentes ou todos (se --redo)
    to_process = [c for c in candidates if args.redo or c["approved"] is None]
    if args.limit > 0:
        to_process = to_process[:args.limit]

    if not to_process:
        print("Nenhum candidato para processar. Use --redo para reclassificar todos.")
        sys.exit(0)

    # Carregar catálogo de cards
    catalog = load_card_catalog(args.topic, args.area)
    print(f"Tópico : {args.topic}")
    print(f"Cards  : {len(catalog)} cards no catálogo")
    print(f"Imagens: {len(to_process)} para classificar ({len(candidates)} total)")
    print(f"Modelo : {MODEL}")
    print()

    if not args.dry_run:
        client = anthropic.Anthropic()
    else:
        client = None

    log_path = topic_dir / "classify_log.jsonl"
    n_ok = 0
    n_err = 0
    n_approved = 0

    for i, cand in enumerate(to_process, 1):
        img_path = topic_dir / cand["filename"]
        if not img_path.exists():
            print(f"  [{i:3d}/{len(to_process)}] SKIP (arquivo não encontrado): {cand['filename']}")
            continue

        print(f"  [{i:3d}/{len(to_process)}] {cand['filename']} (pág {cand['page']}, {cand['source']})", end=" ", flush=True)

        retries = 0
        while True:
            try:
                result = classify_one(client, img_path, cand, catalog, args.topic, args.dry_run)
                break
            except anthropic.RateLimitError:
                retries += 1
                wait = 10 * retries
                print(f"\n    [rate-limit] aguardando {wait}s...", end=" ", flush=True)
                time.sleep(wait)
            except json.JSONDecodeError as e:
                print(f"  [JSON inválido: {e}]")
                result = {"approved": None, "type": None, "label": None, "card_id": None, "reason": f"parse error: {e}"}
                n_err += 1
                break
            except Exception as e:
                print(f"  [erro: {e}]")
                result = {"approved": None, "type": None, "label": None, "card_id": None, "reason": str(e)}
                n_err += 1
                break

        # Atualizar candidato
        if not args.dry_run:
            cand["approved"] = result.get("approved")
            cand["type"] = result.get("type")
            cand["label"] = result.get("label")
            cand["card_id"] = result.get("card_id")

            status = "OK" if result.get("approved") else "SKIP"
            if result.get("approved"):
                n_approved += 1
            print(f">> {status} | {result.get('type','?'):12s} | {(result.get('label') or '')[:45]}")
        else:
            print()

        # Log
        log_entry = {"filename": cand["filename"], "page": cand["page"], **result}
        append_log(log_path, log_entry)
        n_ok += 1

        # Salvar progresso após cada imagem
        if not args.dry_run:
            save_candidates(topic_dir, data)

        if args.delay > 0 and not args.dry_run and i < len(to_process):
            time.sleep(args.delay)

    print()
    print(f"Concluído: {n_ok} processados, {n_approved} aprovados, {n_err} erros")
    print(f"JSON  : {candidates_path}")
    print(f"Log   : {log_path}")
    print()
    print("Próximo passo:")
    print(f"  python tools/review_figures.py --topic {args.topic}")


if __name__ == "__main__":
    main()
