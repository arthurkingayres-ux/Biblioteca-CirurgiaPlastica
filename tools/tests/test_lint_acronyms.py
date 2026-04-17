from tools import lint_acronyms


def test_unexpanded_acronym_is_flagged():
    text = "A DIEA e o vaso dominante."
    issues = lint_acronyms.scan_text(text, context="abdo-anat-002:definition")
    assert any("DIEA" in i["acronym"] for i in issues)


def test_expanded_first_use_is_ok():
    text = "DIEA (Arteria Epigastrica Profunda Inferior) e dominante; depois mencionamos DIEA novamente."
    issues = lint_acronyms.scan_text(text, context="abdo-anat-002:definition")
    assert issues == []


def test_non_acronym_word_is_ignored():
    text = "Paciente masculino com historia previa."
    issues = lint_acronyms.scan_text(text, context="abdo-anat-001:definition")
    assert issues == []
