from app.resolution.normalize import normalize_concept_name


def test_case_and_whitespace_normalize_identically():
    assert normalize_concept_name("PSD  Matrix") == normalize_concept_name("psd matrix")


def test_dash_variants_normalize_identically():
    assert normalize_concept_name("Bias–Variance Decomposition") == normalize_concept_name(
        "Bias-Variance Decomposition"
    )


def test_punctuation_is_stripped():
    assert normalize_concept_name("Mercer's Theorem!") == normalize_concept_name("Mercers Theorem")


def test_distinct_concepts_stay_distinct():
    assert normalize_concept_name("Kernel") != normalize_concept_name("Kernel Regression")
