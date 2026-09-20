"""Embedding similarity primitives used by redundancy detection and
Maximal-Marginal-Relevance-style resource ranking (spec: "Resource
redundancy").
"""

import math


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def marginal_novelty(
    candidate_embedding: list[float] | None, selected_embeddings: list[list[float]]
) -> float:
    """`1 - max_similarity_to_already_selected`. No embedding or nothing
    selected yet -> fully novel (1.0), so the first pick and un-embeddable
    candidates are never penalized.
    """

    if candidate_embedding is None or not selected_embeddings:
        return 1.0
    max_similarity = max(
        cosine_similarity(candidate_embedding, e) for e in selected_embeddings
    )
    return max(0.0, 1.0 - max_similarity)
