"""
Audit de imagens do PWA.
Produz relatorio por tema de:
  - imagens no disco (contagem e tamanho)
  - imagens referenciadas nos JSONs (total e por card)
  - arquivos orfaos (no disco, nunca referenciados)
  - referencias quebradas (JSON aponta para arquivo inexistente)
  - reuso (mesmo arquivo em N cards)
  - pares candidatos a duplicata (heuristica por numeracao de figura)

Heuristica de par duplicado:
  - extrair identificador de figura (ex: 13-6, 13-11, 13-33) quando presente
  - agrupar arquivos por tema+identificador
  - se >= 2 arquivos caem no mesmo grupo, reportar como candidato
"""
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARDS_DIR = ROOT / "content" / "cards"
IMAGES_DIR = ROOT / "assets" / "images"

FIG_PATTERNS = [
    re.compile(r"(?:^|[-_])(?:fig|figure|blef|abdo|gluteo|rino|oto|lipo|rito|cont)?[-_]?(\d{1,2})[-_.](\d{1,3})(?:[a-z]+)?(?:[-_]|\.)", re.I),
    re.compile(r"(?:^|[-_])p?(\d{3,5})[-_]", re.I),
]


def fig_key(filename: str):
    stem = filename.lower()
    for pat in FIG_PATTERNS:
        m = pat.search(stem)
        if m:
            groups = [g for g in m.groups() if g]
            return "-".join(groups)
    return None


def list_images(topic_dir: Path):
    if not topic_dir.exists():
        return {}
    out = {}
    for p in topic_dir.iterdir():
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}:
            out[p.name] = p.stat().st_size
    return out


def iter_cards_jsons(area_dir: Path):
    for topic_dir in sorted(area_dir.iterdir()):
        if not topic_dir.is_dir():
            continue
        for js in topic_dir.iterdir():
            if js.suffix == ".json" and js.name not in {"_meta.json"}:
                yield topic_dir.name, js


def load_image_refs(json_path: Path):
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"ERRO parse {json_path}: {e}", file=sys.stderr)
        return []
    if not isinstance(data, list):
        data = [data]
    refs = []
    for card in data:
        if not isinstance(card, dict):
            continue
        cid = card.get("id", "?")
        title = card.get("title", "?")
        imgs = card.get("images") or []
        for img in imgs:
            if isinstance(img, dict):
                refs.append({
                    "card_id": cid,
                    "card_title": title,
                    "file": img.get("file"),
                    "caption": (img.get("caption") or "")[:90],
                })
            elif isinstance(img, str):
                refs.append({
                    "card_id": cid,
                    "card_title": title,
                    "file": img,
                    "caption": "",
                })
    return refs


def audit():
    areas = [d for d in CARDS_DIR.iterdir() if d.is_dir()]
    total_orfaos = 0
    total_quebradas = 0
    total_candidatos = 0
    print("# Audit de imagens do PWA\n")
    for area in sorted(areas):
        topics = sorted([t for t in area.iterdir() if t.is_dir()])
        for topic_dir in topics:
            topic = topic_dir.name
            imgs_on_disk = list_images(IMAGES_DIR / topic)
            refs = []
            for js in topic_dir.iterdir():
                if js.suffix == ".json" and js.name != "_meta.json":
                    refs.extend(load_image_refs(js))
            referenced = set(r["file"] for r in refs if r["file"])
            on_disk = set(imgs_on_disk.keys())

            orfaos = sorted(on_disk - referenced)
            quebradas = sorted(referenced - on_disk)

            # reuso por arquivo
            use_by_card = defaultdict(set)
            for r in refs:
                if r["file"]:
                    use_by_card[r["file"]].add(r["card_id"])
            reused = {f: cids for f, cids in use_by_card.items() if len(cids) >= 2}

            # candidatos a duplicata por grupo de numeracao
            groups = defaultdict(list)
            for f in on_disk:
                k = fig_key(f)
                if k:
                    groups[k].append(f)
            candidatos = {k: sorted(v) for k, v in groups.items() if len(v) >= 2}

            if not (on_disk or refs):
                continue

            print(f"## {area.name}/{topic}")
            print(f"- Imagens no disco: {len(on_disk)} / referenciadas: {len(referenced)}")
            if orfaos:
                print(f"- Orfaos ({len(orfaos)}): {', '.join(orfaos[:6])}{' ...' if len(orfaos) > 6 else ''}")
                total_orfaos += len(orfaos)
            if quebradas:
                print(f"- Quebradas ({len(quebradas)}): {', '.join(quebradas[:6])}{' ...' if len(quebradas) > 6 else ''}")
                total_quebradas += len(quebradas)
            if reused:
                top_reused = sorted(reused.items(), key=lambda kv: -len(kv[1]))[:5]
                print(f"- Reuso (arquivo em >=2 cards): {len(reused)}")
                for f, cids in top_reused:
                    print(f"    {f} -> {len(cids)} cards")
            if candidatos:
                print(f"- Candidatos a duplicata (mesma numeracao de figura): {len(candidatos)}")
                for k, files in list(candidatos.items())[:10]:
                    print(f"    [{k}] {files}")
                total_candidatos += len(candidatos)
            print()

    print("---")
    print(f"TOTAL: orfaos={total_orfaos}, quebradas={total_quebradas}, grupos_candidatos_duplicata={total_candidatos}")


if __name__ == "__main__":
    audit()
