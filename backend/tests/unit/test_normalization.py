from app.resolution.normalize import normalize_concept_name, plural_variant_candidates


def test_case_and_whitespace_normalize_identically():
    assert normalize_concept_name("PSD  Matrix") == normalize_concept_name("psd matrix")


def test_dash_variants_normalize_identically():
    assert normalize_concept_name(
        "Bias–Variance Decomposition"
    ) == normalize_concept_name("Bias-Variance Decomposition")


def test_punctuation_is_stripped():
    assert normalize_concept_name("Mercer's Theorem!") == normalize_concept_name(
        "Mercers Theorem"
    )


def test_distinct_concepts_stay_distinct():
    assert normalize_concept_name("Kernel") != normalize_concept_name(
        "Kernel Regression"
    )


def test_plural_variant_covers_regular_plural():
    assert "regular language" in plural_variant_candidates("regular languages")


def test_plural_variant_covers_ies_to_y():
    assert "theory" in plural_variant_candidates("theories")


def test_plural_variant_covers_singular_to_plural():
    assert "assumptions" in plural_variant_candidates("assumption")


def test_plural_variant_never_includes_the_input_itself():
    assert "class" not in plural_variant_candidates("class")


def test_plural_variant_does_not_mangle_double_s_endings():
    # "class" ends in "ss" -> not treated as a trivial plural of "clas".
    assert "clas" not in plural_variant_candidates("class")
