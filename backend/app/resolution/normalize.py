"""Lexical normalization (spec: "Concept canonicalization" step 1).

Catches trivial surface variants — case, punctuation, whitespace, dash
style — so "PSD Matrix" and "psd  matrix." normalize identically. It
deliberately does *not* try to expand acronyms or resolve synonyms; that's
the alias table's job (`resolution.aliases`) and, beyond that, embedding
similarity + adjudication (`resolution.semantic_match`, `resolution.merge`).
"""

import re
import unicodedata

_DASH_VARIANTS = re.compile(r"[‐-―−]")  # hyphen/en/em dash, minus sign
_NON_WORD = re.compile(r"[^\w\s-]", re.UNICODE)
_WHITESPACE = re.compile(r"\s+")
_SYMBOLIC_LABEL = re.compile(r"^[a-z]{1,2}\d{1,2}$")
_NUMBERED_LABEL = re.compile(
    r"^(?:theorem|lemma|proposition|corollary|definition|example|equation)\s*\d+$"
)


def normalize_concept_name(name: str) -> str:
    text = unicodedata.normalize("NFKC", name).strip().lower()
    text = _DASH_VARIANTS.sub("-", text)
    text = _NON_WORD.sub("", text)
    text = _WHITESPACE.sub(" ", text).strip()
    return text


def plural_variant_candidates(normalized_name: str) -> list[str]:
    """Regular-English singular/plural alternates of an already-normalized
    name (spec: "Concept canonicalization" — normalization "does not handle
    plural variants" was the gap; this closes the common regular case).

    Deliberately conservative: it only ever proposes alternate strings for
    the caller to look up in the alias index — a candidate is only merged if
    one of these forms is an *exact* match to something already known, never
    by fuzzy/stem similarity. Irregular plurals (e.g. "automaton"/"automata")
    aren't covered here; those rely on embedding similarity + adjudication
    instead, since no small suffix rule generalizes to them safely.
    """

    variants: list[str] = []
    if normalized_name.endswith("ies") and len(normalized_name) > 3:
        variants.append(normalized_name[:-3] + "y")
    elif normalized_name.endswith("es") and len(normalized_name) > 2:
        variants.append(normalized_name[:-2])
    if normalized_name.endswith("s") and not normalized_name.endswith("ss"):
        variants.append(normalized_name[:-1])
    if not normalized_name.endswith("s"):
        variants.append(normalized_name + "s")
    return [v for v in dict.fromkeys(variants) if v and v != normalized_name]


def is_locally_scoped_label(normalized_form: str) -> bool:
    """True for short symbolic notation like "l3", "m1", "q0" — the kind of
    per-example variable label a course reuses across unrelated instances
    (e.g. two different lectures each defining their own example language
    called "L3"). These must never trigger an automatic alias-based merge:
    unlike a stable acronym (e.g. "DFA"), a bare "L3" carries no fixed
    meaning outside the one worked example that introduced it, so treating
    it as a merge key risks collapsing genuinely distinct concepts.
    """

    return bool(
        _SYMBOLIC_LABEL.fullmatch(normalized_form.replace(" ", ""))
        or _NUMBERED_LABEL.fullmatch(normalized_form)
    )
