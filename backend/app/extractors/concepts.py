"""Combined structured extraction per chunk (spec: "Structured extraction",
"Concept extraction contract"): concepts, their relationships, assessment
items, and resource-concept links all come back in one validated
`ResourceExtractionResult` per chunk.
"""

import re

from app.prompts import load_prompt
from app.providers.llm.base import LLMProvider
from app.schemas.extraction import ConceptCandidateOut, ResourceExtractionResult

_SYSTEM_PROMPT = load_prompt("concept_extraction.txt")

_WORD = re.compile(r"[a-z0-9]{4,}")


def is_grounded(candidate: ConceptCandidateOut, chunk_text: str) -> bool:
    """Does the passage actually mention this candidate?

    A model asked about a title or a score line invents plausible concepts from
    the wider subject. Requiring one content word of the name, an alias, or a
    quoted snippet to appear in the text drops those without a second model call.
    """

    haystack = chunk_text.lower()
    for snippet in candidate.evidence:
        text = (snippet.snippet or "").strip().lower()
        if len(text) >= 12 and text in haystack:
            return True
    words = set(_WORD.findall(candidate.name.lower()))
    for alias in candidate.aliases:
        words.update(_WORD.findall(alias.lower()))
    return any(word in haystack for word in words)


def grounded(extraction: ResourceExtractionResult, chunk_text: str) -> ResourceExtractionResult:
    """The same extraction with ungrounded candidates (and links to them) removed."""

    kept = [c for c in extraction.concept_candidates if is_grounded(c, chunk_text)]
    if len(kept) == len(extraction.concept_candidates):
        return extraction
    names = {c.name for c in kept}
    return extraction.model_copy(
        update={
            "concept_candidates": kept,
            "concept_relationships": [
                r for r in extraction.concept_relationships if r.source_concept_name in names and r.target_concept_name in names
            ],
        }
    )


async def extract_resource_structured(
    provider: LLMProvider,
    *,
    document_type: str,
    chunk_text: str,
) -> ResourceExtractionResult:
    prompt = f"Document type: {document_type}\n\n---\n\n{chunk_text}"
    return await provider.structured_generate(
        system=_SYSTEM_PROMPT, prompt=prompt, schema=ResourceExtractionResult
    )
