import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools" / "report_pending_images.mjs"
OUTPUT = ROOT / "content" / "cards" / "_pending_images.md"


def test_script_exists():
    assert SCRIPT.exists(), f"{SCRIPT} nao existe"


def test_script_runs_and_writes_output():
    result = subprocess.run(
        ["node", str(SCRIPT)],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    assert OUTPUT.exists()
    content = OUTPUT.read_text(encoding="utf-8")
    assert "Pendencias de imagem" in content or "Pendências de imagem" in content


def test_output_lists_abdominoplastia_with_one_pending():
    """Abdominoplastia tem 4/5 com imagens; 1 card conceitual pendente
    (Gordura Visceral)."""
    subprocess.run(["node", str(SCRIPT)], cwd=ROOT, check=True)
    content = OUTPUT.read_text(encoding="utf-8")
    assert "Abdominoplastia" in content or "abdominoplastia" in content
    # Encontra linha da tabela de abdomino e checa contagem
    found_row = False
    for line in content.split("\n"):
        lower = line.lower()
        if "abdominoplastia" in lower and "|" in line:
            # Tabela: | Tema | v2 cards | Com imagem | Pendentes |
            cols = [c.strip() for c in line.split("|") if c.strip()]
            assert "5" in cols, f"Esperava 5 v2 cards em abdomino: {line}"
            assert "4" in cols, f"Esperava 4 com imagem em abdomino: {line}"
            assert "1" in cols, f"Esperava 1 pendente em abdomino: {line}"
            found_row = True
            break
    assert found_row, f"Linha da tabela de abdomino ausente:\n{content}"
    # Detalhe por tema lista o card pendente
    assert "abdo-anat-005" in content, content
