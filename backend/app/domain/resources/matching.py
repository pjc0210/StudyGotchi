"""Fast-phase matching: which known concepts does a student file sit near?

Runs before any model reads the file. Chunk embeddings are compared with the
course's concept embeddings; matches above a cosine floor become exposure
evidence (no outcome), so familiarity can move while mastery cannot.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.mastery.evidence import EvidenceEvent, EvidenceType
from app.domain.resources.novelty import cosine_similarity

# Exposure from an embedding match alone is attributable, but not as surely as a model
# naming the concept, so it sits below the 0.8 the deep phase uses for notes.
MATCH_CERTAINTY = 0.6

# Embedding models compress cosine into a model-specific band, so an absolute floor alone
# either matches everything or nothing. A chunk keeps only concepts within this share of
# its own best match; the absolute `threshold` then just rejects chunks about nothing.
RELATIVE_FLOOR = 0.75


@dataclass(frozen=True)
class ChunkMatch:
    chunk_index: int
    concept_id: UUID
    similarity: float


def match_chunks_to_concepts(
    chunk_embeddings: list[list[float]],
    concept_embeddings: dict[UUID, list[float]],
    *,
    threshold: float,
    top_k: int = 3,
) -> list[ChunkMatch]:
    """For each chunk, up to `top_k` concepts at or above `threshold` and within
    `RELATIVE_FLOOR` of the chunk's best match, best first."""

    matches: list[ChunkMatch] = []
    for chunk_index, embedding in enumerate(chunk_embeddings):
        scored = [
            ChunkMatch(chunk_index=chunk_index, concept_id=concept_id, similarity=cosine_similarity(embedding, concept_embedding))
            for concept_id, concept_embedding in concept_embeddings.items()
        ]
        scored.sort(key=lambda m: -m.similarity)
        if not scored or scored[0].similarity < threshold:
            continue
        floor = max(threshold, scored[0].similarity * RELATIVE_FLOOR)
        matches.extend(m for m in scored[:top_k] if m.similarity >= floor)
    return matches


def exposure_events_for_matches(
    matches: list[ChunkMatch],
    *,
    student_id: UUID,
    resource_id: UUID,
    evidence_type: EvidenceType,
    occurred_at: datetime,
) -> list[EvidenceEvent]:
    """One exposure event per distinct concept. A concept's relevance is its best share of
    any chunk that matched it (1/k for a chunk with k matches), so a concept that owns a
    whole chunk outweighs one that shared a chunk with two others.
    """

    per_chunk: dict[int, int] = {}
    for m in matches:
        per_chunk[m.chunk_index] = per_chunk.get(m.chunk_index, 0) + 1

    relevance: dict[UUID, float] = {}
    for m in matches:
        share = 1.0 / per_chunk[m.chunk_index]
        relevance[m.concept_id] = max(relevance.get(m.concept_id, 0.0), share)

    return [
        EvidenceEvent(
            concept_id=concept_id,
            student_id=student_id,
            evidence_type=evidence_type,
            outcome=None,
            certainty=MATCH_CERTAINTY,
            occurred_at=occurred_at,
            resource_id=resource_id,
            concept_relevance=share,
        )
        for concept_id, share in relevance.items()
    ]
