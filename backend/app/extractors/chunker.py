"""Structural chunking (spec: "File parsing" chunking priority): question
boundary > section heading > page boundary > paragraph grouping > token
fallback. Assessment documents chunk by question, not arbitrary windows.
"""

import re
from dataclasses import dataclass

from app.extractors.parser import ParsedDocument

TARGET_TOKENS_MIN = 500
TARGET_TOKENS_MAX = 900
OVERLAP_RATIO = 0.12

_QUESTION_BOUNDARY_RE = re.compile(
    r"(?m)^\s*(?:Q(?:uestion)?\.?\s*\d+[a-zA-Z]?|Problem\s*\d+[a-zA-Z]?|\d{1,2}[a-zA-Z]?)\s*[\.\):]"
)


@dataclass
class Chunk:
    chunk_index: int
    text: str
    page_number: int | None = None
    section_title: str | None = None


def _approx_token_count(text: str) -> int:
    # No tokenizer dependency for a hackathon-scale corpus: ~4 chars/token
    # is a standard rough English-text heuristic.
    return max(1, len(text) // 4)


def chunk_by_question(document: ParsedDocument) -> list[Chunk]:
    text = document.raw_text
    boundaries = [m.start() for m in _QUESTION_BOUNDARY_RE.finditer(text)]
    if len(boundaries) < 2:
        return []

    boundaries.append(len(text))
    chunks: list[Chunk] = []
    for i in range(len(boundaries) - 1):
        segment = text[boundaries[i] : boundaries[i + 1]].strip()
        if segment:
            chunks.append(Chunk(chunk_index=len(chunks), text=segment))
    return chunks


def chunk_by_structure(
    document: ParsedDocument,
    *,
    target_tokens_max: int = TARGET_TOKENS_MAX,
    overlap_ratio: float = OVERLAP_RATIO,
) -> list[Chunk]:
    """Falls through section heading -> page boundary -> paragraph grouping
    -> token-size fallback, since `ParsedDocument.pages` already encodes
    section headings (text.py) or page boundaries (pdf.py).
    """

    chunks: list[Chunk] = []

    for page in document.pages:
        paragraphs = [p for p in re.split(r"\n\s*\n", page.text) if p.strip()]
        buffer = ""

        for paragraph in paragraphs:
            candidate = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph

            if buffer and _approx_token_count(candidate) > target_tokens_max:
                chunks.append(
                    Chunk(
                        chunk_index=len(chunks),
                        text=buffer,
                        page_number=page.page_number,
                        section_title=page.section_title,
                    )
                )
                overlap_chars = int(len(buffer) * overlap_ratio)
                buffer = (buffer[-overlap_chars:] + "\n\n" + paragraph) if overlap_chars else paragraph
            else:
                buffer = candidate

        if buffer.strip():
            chunks.append(
                Chunk(
                    chunk_index=len(chunks),
                    text=buffer,
                    page_number=page.page_number,
                    section_title=page.section_title,
                )
            )

    return chunks


def chunk_document(document: ParsedDocument, *, is_assessment: bool = False) -> list[Chunk]:
    if is_assessment:
        question_chunks = chunk_by_question(document)
        if question_chunks:
            return question_chunks
    return chunk_by_structure(document)
