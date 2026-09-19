"""Embedding candidate search (spec: "Concept canonicalization" step 3-4).

Ranks existing concepts by embedding similarity to a candidate and buckets
the best match into merge / adjudicate / create, per configurable
thresholds. Similarity itself is computed with the same cosine helper used
for resource novelty/redundancy.
"""

from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from app.domain.resources.novelty import cosine_similarity


class SimilarityBucket(StrEnum):
    MERGE = "merge"
    ADJUDICATE = "adjudicate"
    CREATE = "create"


@dataclass(frozen=True)
class EmbeddingMatch:
    concept_id: UUID
    similarity: float


def rank_embedding_candidates(
    candidate_embedding: list[float],
    existing_concept_embeddings: dict[UUID, list[float]],
    *,
    top_k: int = 5,
) -> list[EmbeddingMatch]:
    scored = [
        EmbeddingMatch(concept_id=concept_id, similarity=cosine_similarity(candidate_embedding, embedding))
        for concept_id, embedding in existing_concept_embeddings.items()
    ]
    scored.sort(key=lambda m: -m.similarity)
    return scored[:top_k]


def classify_similarity(
    similarity: float, *, merge_threshold: float, adjudicate_threshold: float
) -> SimilarityBucket:
    if similarity >= merge_threshold:
        return SimilarityBucket.MERGE
    if similarity >= adjudicate_threshold:
        return SimilarityBucket.ADJUDICATE
    return SimilarityBucket.CREATE
