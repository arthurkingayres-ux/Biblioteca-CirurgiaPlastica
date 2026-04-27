import pytest

from tools import harvest_palpebra_images as h


def test_ensure_ascii_accepts_plain():
    h._ensure_ascii("hughes-modificado-estagio-1.png")


def test_ensure_ascii_rejects_diacritic():
    with pytest.raises(ValueError, match="diacritics"):
        h._ensure_ascii("mustardé-bochecha-rotacao.png")


def test_ensure_ascii_rejects_non_ascii():
    with pytest.raises(ValueError):
        h._ensure_ascii("retalho-π.png")


def test_mapping_is_complete_and_unique():
    slugs = [row[0] for row in h.MAPPING]
    assert len(slugs) == 19
    assert len(set(slugs)) == 19
    for s in slugs:
        h._ensure_ascii(s)
        assert s.endswith(".png")
