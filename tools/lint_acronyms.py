"""Editorial lint: every 2-6 char all-caps acronym must be expanded on first use.

An acronym is considered "expanded" when it is immediately followed by a
parenthesised phrase whose first letter matches the first letter of the acronym,
e.g. DIEA (Arteria Epigastrica Profunda Inferior).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

ACRONYM_RE = re.compile(r"\b([A-Z]{2,6})\b")
EXPANSION_RE = re.compile(r"\s*\(([^)]+)\)")

ALLOWED = {"PRS", "ASJ", "CPS", "RBCP", "JPRAS", "RCT", "SBCP"}


@dataclass
class Issue:
    acronym: str
    context: str


def scan_text(text: str, context: str) -> list[dict]:
    seen_expanded: set[str] = set()
    issues: list[Issue] = []
    for match in ACRONYM_RE.finditer(text):
        acronym = match.group(1)
        if acronym in ALLOWED or acronym in seen_expanded:
            continue
        tail = text[match.end():]
        exp = EXPANSION_RE.match(tail)
        if exp:
            seen_expanded.add(acronym)
            continue
        issues.append(Issue(acronym=acronym, context=context))
    return [{"acronym": i.acronym, "context": i.context} for i in issues]


def scan_card(card: dict) -> list[dict]:
    out: list[dict] = []
    card_id = card.get("id", "?")
    for field in ("one_liner", "location", "clinical_hook", "how_to_identify", "definition", "surgical_relevance"):
        value = card.get(field)
        if isinstance(value, str):
            out.extend(scan_text(value, context=f"{card_id}:{field}"))
    return out


def main(argv: Iterable[str] | None = None) -> int:
    import argparse
    import json
    import sys
    from pathlib import Path

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args(list(argv) if argv is not None else None)

    total: list[dict] = []
    for path in args.paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        cards = data if isinstance(data, list) else [data]
        for card in cards:
            total.extend(scan_card(card))

    for issue in total:
        print(f"{issue['context']}: '{issue['acronym']}' used without expansion", file=sys.stderr)
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
