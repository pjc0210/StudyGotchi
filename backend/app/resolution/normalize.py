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


def normalize_concept_name(name: str) -> str:
    text = unicodedata.normalize("NFKC", name).strip().lower()
    text = _DASH_VARIANTS.sub("-", text)
    text = _NON_WORD.sub("", text)
    text = _WHITESPACE.sub(" ", text).strip()
    return text
