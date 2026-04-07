#!/usr/bin/env python3
"""
tools/review_figures.py — Fase 2 Parte 3: Vincula figuras classificadas aos cards

Lê candidates.json (preenchido por classify_figures.py), copia as imagens aprovadas
para assets/images/<topic>/ com nomes descritivos, e insere os filenames no campo
images[] dos cards correspondentes em content/cards/<area>/<topic>/.

Uso:
  python tools/review_figures.py --topic blefaroplastia
  python tools/review_figures.py --topic blefaroplastia --area estetica-facial
  python tools/review_figures.py --topic blefaroplastia --dry-run   # ver sem modificar
  python tools/review_figures.py --topic blefaroplastia --force     # sobrescrever destinos

Saída:
  assets/images/<topic>/          → imagens aprovadas copiadas com nome descritivo
  content/cards/<area>/<topic>/   → campo images[] atualizado em cada card relevante
  .tmp/figures/<topic>/candidates.json → dest_filename preenchido

Próximo passo após concluir:
  Conferir assets/images/<topic>/ e abrir a PWA para verificar as imagens
"""

import argparse
import io
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf-8-sig"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    """Converte texto em português para slug ASCII."""
    # Decompor acentos
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    # Substituir não-alfanuméricos por hífens
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text[:50]


def make_topic_prefix(topic: str) -> str:
    """blefaroplastia -> blef, rinoplastia -> rino"""
    return topic[:4]


def generate_dest_filename(candidate: dict, topic: str, used_names: set) -> str:
    """Gera nome de arquivo descritivo único para o asset."""
    label = candidate.get("label") or f"figura-pagina-{candidate['page']}"
    prefix = make_topic_prefix(topic)
    slug = slugify(label)
    ext = Path(candidate["filename"]).suffix.lower()
    if not ext:
        ext = ".png"

    base = f"{prefix}-p{candidate['page']:04d}-{slug}{ext}"

    # Garantir unicidade
    if base not in used_names:
        return base

    # Colisão: adicionar sufixo numérico
    name_stem = f"{prefix}-p{candidate['page']:04d}-{slug}"
    counter = 2
    while True:
        candidate_name = f"{name_stem}-{counter}{ext}"
        if candidate_name not in used_names:
            return candidate_name
        counter += 1


# ---------------------------------------------------------------------------
# Catálogo de cards: mapeia card_id -> (arquivo .json, índice na lista)
# ---------------------------------------------------------------------------

def load_card_index(topic: str, area: str) -> dict[str, tuple[Path, int, list]]:
    """
    Retorna {card_id: (json_path, idx_in_list, cards_list)} para todos os cards do tópico.
    A mesma lista é compartilhada — modificar o objeto modifica in-place.
    """
    cards_dir = ROOT / "content" / "cards" / area / topic
    if not cards_dir.exists():
        return {}

    index: dict[str, tuple[Path, int, list]] = {}

    for f in sorted(cards_dir.glob("*.json")):
        if f.name.startswith("_"):
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  [warn] Erro ao ler {f.name}: {e}", file=sys.stderr)
            continue

        if isinstance(data, list):
            cards = data
        else:
            cards = data.get("cards", [])

        for i, card in enumerate(cards):
            cid = card.get("id")
            if cid:
                index[cid] = (f, i, cards)

    return index


# ---------------------------------------------------------------------------
# Salvar arquivo de cards atualizado
# ---------------------------------------------------------------------------

def save_card_file(path: Path, cards: list):
    """Salva o arquivo de cards preservando o formato original (lista ou dict)."""
    try:
        original = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        original = []

    if isinstance(original, list):
        data = cards
    else:
        original["cards"] = cards
        data = original

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Salvar candidates.json
# ---------------------------------------------------------------------------

def save_candidates(topic_dir: Path, data: dict):
    pending = sum(1 for c in data["candidates"] if c["approved"] is None)
    data["pending_review"] = pending
    (topic_dir / "candidates.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Vincula figuras classificadas aos cards (Fase 2 Parte 3)")
    parser.add_argument("--topic", required=True, help="Tópico (ex: blefaroplastia)")
    parser.add_argument("--area", default="estetica-facial", help="Área (ex: estetica-facial)")
    parser.add_argument("--dry-run", action="store_true", help="Mostrar ações sem modificar arquivos")
    parser.add_argument("--force", action="store_true", help="Sobrescrever arquivos de destino existentes")
    args = parser.parse_args()

    topic_dir = ROOT / ".tmp" / "figures" / args.topic
    candidates_path = topic_dir / "candidates.json"

    if not candidates_path.exists():
        print(f"Erro: {candidates_path} não encontrado.", file=sys.stderr)
        print(f"  Execute: python tools/extract_figures.py --topic {args.topic} ...", file=sys.stderr)
        sys.exit(1)

    data = json.loads(candidates_path.read_text(encoding="utf-8"))
    candidates = data["candidates"]

    # Candidatos aprovados
    approved = [c for c in candidates if c.get("approved") is True]
    if not approved:
        print("Nenhum candidato aprovado. Execute classify_figures.py primeiro.")
        sys.exit(0)

    # Diretório de destino
    assets_dir = ROOT / "assets" / "images" / args.topic
    if not args.dry_run:
        assets_dir.mkdir(parents=True, exist_ok=True)

    # Catálogo de cards
    card_index = load_card_index(args.topic, args.area)

    print(f"Tópico : {args.topic}")
    print(f"Aprovadas: {len(approved)} de {len(candidates)}")
    print(f"Cards   : {len(card_index)} cards no catálogo")
    print(f"Destino : {assets_dir}")
    if args.dry_run:
        print("[DRY-RUN] Nenhuma modificação será feita")
    print()

    # Nomes já usados (para evitar colisões)
    used_names: set[str] = set()
    if assets_dir.exists():
        used_names = {f.name for f in assets_dir.iterdir()}

    # Candidatos já processados (dest_filename preenchido)
    already_done = {c["filename"] for c in approved if c.get("dest_filename")}
    to_copy = [c for c in approved if not c.get("dest_filename")]
    print(f"Para copiar : {len(to_copy)} novas imagens ({len(already_done)} já processadas)")
    print()

    # --- Passo 1: Copiar imagens aprovadas para assets/ ---

    n_copied = 0
    n_skipped = 0

    for cand in to_copy:
        src = topic_dir / cand["filename"]
        if not src.exists():
            print(f"  [SKIP] Arquivo não encontrado: {cand['filename']}", file=sys.stderr)
            n_skipped += 1
            continue

        dest_name = generate_dest_filename(cand, args.topic, used_names)
        dest = assets_dir / dest_name

        status = ""
        if dest.exists() and not args.force:
            # Mesmo arquivo já existe — apenas registrar o nome
            status = "[existe]"
        else:
            if not args.dry_run:
                shutil.copy2(src, dest)
            status = "[DRY-RUN copiaria]" if args.dry_run else "[copiado]"
            n_copied += 1

        # Atualizar dest_filename no candidato
        if not args.dry_run:
            cand["dest_filename"] = dest_name
        else:
            cand["_sim_dest"] = dest_name  # reutilizado no passo 2
        used_names.add(dest_name)

        card_hint = f" -> card: {cand.get('card_id', 'null')}" if cand.get("card_id") else ""
        print(f"  {status} {dest_name}{card_hint}")

    print()

    # --- Passo 2: Inserir filenames nos cards ---

    # Todos aprovados com dest_filename e card_id
    to_link = [
        c for c in approved
        if c.get("card_id") and (c.get("dest_filename") or (args.dry_run and not c.get("dest_filename")))
    ]

    # Para dry-run, simular dest_filename (apenas para candidates que ainda não têm _sim_dest)
    if args.dry_run:
        sim_names: set[str] = set(used_names)
        for c in to_link:
            if not c.get("dest_filename") and not c.get("_sim_dest"):
                c["_sim_dest"] = generate_dest_filename(c, args.topic, sim_names)
                sim_names.add(c["_sim_dest"])

    # Agrupar por card_id
    card_to_images: dict[str, list[str]] = {}
    for cand in to_link:
        cid = cand["card_id"]
        fname = cand.get("dest_filename") or cand.get("_sim_dest")
        if fname:
            card_to_images.setdefault(cid, []).append(fname)

    if not card_to_images:
        print("Nenhum candidato com card_id válido para vincular.")
    else:
        print(f"Vinculando imagens a {len(card_to_images)} cards...")

    # Rastrear quais arquivos de card foram modificados
    modified_files: dict[Path, list] = {}

    n_linked = 0
    n_unknown_card = 0

    for card_id, new_fnames in sorted(card_to_images.items()):
        if card_id not in card_index:
            print(f"  [warn] card_id '{card_id}' não encontrado no catálogo — pulando")
            n_unknown_card += 1
            continue

        json_path, idx, cards = card_index[card_id]
        card = cards[idx]

        existing = card.get("images", [])
        to_add = [f for f in new_fnames if f not in existing]

        if not to_add:
            print(f"  [ok]  {card_id} — imagens já vinculadas")
            continue

        print(f"  [link] {card_id} ({card.get('title', '')[:40]}) +{len(to_add)} imagem(ns): {to_add}")

        if not args.dry_run:
            card["images"] = existing + to_add
            modified_files[json_path] = cards
            n_linked += len(to_add)

    # Salvar arquivos de card modificados
    saved_files = set()
    for json_path, cards in modified_files.items():
        if json_path not in saved_files:
            save_card_file(json_path, cards)
            saved_files.add(json_path)
            print(f"  -> Salvo: {json_path.relative_to(ROOT)}")

    # Salvar candidates.json atualizado
    if not args.dry_run:
        save_candidates(topic_dir, data)

    print()
    print("=" * 50)
    print(f"Imagens copiadas : {n_copied}")
    print(f"Imagens puladas  : {n_skipped}")
    print(f"Links inseridos  : {n_linked}")
    print(f"Cards atualizados: {len(saved_files)}")
    if n_unknown_card:
        print(f"Card IDs desconhecidos: {n_unknown_card} (verifique o catálogo)")
    print()
    print("Próximos passos:")
    print(f"  ls assets/images/{args.topic}/      # verificar imagens copiadas")
    print(f"  npx http-server webapp/library -p 8080  # abrir PWA e conferir")


if __name__ == "__main__":
    main()
