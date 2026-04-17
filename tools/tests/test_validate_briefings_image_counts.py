import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "tools" / "validate_briefings.mjs"


def run_validator(extra_args=None, timeout=15):
    """Invoca o validator em modo dry-run (sem abrir Playwright)."""
    args = ["node", str(VALIDATOR), "--check-image-counts-only"]
    if extra_args:
        args.extend(extra_args)
    return subprocess.run(
        args, cwd=ROOT, capture_output=True, text=True, timeout=timeout
    )


def test_dry_run_is_fast_and_skips_playwright():
    """--check-image-counts-only deve sair sem abrir Playwright (< 15s)."""
    start = time.time()
    result = run_validator()
    elapsed = time.time() - start
    assert elapsed < 15, f"Dry-run demorou {elapsed:.1f}s - provavelmente rodou Playwright"
    # Saida do dry-run NAO deve conter marcadores do modo Playwright
    assert "=== Theme:" not in result.stdout, \
        f"Dry-run rodou Playwright. stdout:\n{result.stdout}"
    assert "Toggle smoke" not in result.stdout, \
        f"Dry-run rodou Playwright. stdout:\n{result.stdout}"
    assert result.returncode in (0, 1), f"rc={result.returncode} stderr={result.stderr}"


def test_v2_cards_with_images_pass():
    """Abdominoplastia (5/5 com imagens) passa sem hardfail."""
    result = run_validator(["--topic", "abdominoplastia"])
    assert result.returncode == 0, f"stderr: {result.stderr}\nstdout: {result.stdout}"
    assert "abdominoplastia" in result.stdout
    # Procura contagem explicita OK
    assert "OK" in result.stdout, f"Esperava marcador OK. stdout:\n{result.stdout}"


def test_pending_report_lists_abdomino_gordura_visceral():
    """Com --report-pending, abdomino lista Gordura Visceral como pendente
    (card conceitual sem figura natural; 4/5 cards tem imagem, regra
    aceita 1 exemption em topicos pequenos)."""
    result = run_validator(["--topic", "abdominoplastia", "--report-pending"])
    assert result.returncode == 0, f"stderr: {result.stderr}\nstdout: {result.stdout}"
    # Linha principal deve dizer "abdominoplastia: OK 4 com imagem, 1 pendentes"
    ok_line = next(
        (l for l in result.stdout.split("\n") if "abdominoplastia:" in l and "OK" in l),
        None,
    )
    assert ok_line, f"Linha OK de abdominoplastia ausente. stdout:\n{result.stdout}"
    assert "4 com imagem" in ok_line, ok_line
    assert "1 pendente" in ok_line, ok_line
    # Detalhe da pendencia deve citar abdo-anat-005
    assert "abdo-anat-005" in result.stdout, result.stdout


def test_legacy_topic_reported_as_legacy():
    """Tema sem cards v2 (melanoma-cutaneo) e reportado como legacy, nao FAIL."""
    result = run_validator(["--topic", "melanoma-cutaneo"])
    assert result.returncode == 0, result.stderr
    # Marcador especifico do modo novo
    assert "legacy" in result.stdout.lower(), \
        f"Esperava marcador 'legacy' para melanoma-cutaneo. stdout:\n{result.stdout}"
    assert "FAIL" not in result.stdout
