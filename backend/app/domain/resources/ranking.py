"""Representative-resource selection (spec: "Resource redundancy"): prefer a
compact portfolio (official anchor, best alternate explanation, best worked
example, optional formal reference) over dumping every matching file.
"""

from dataclasses import dataclass
from uuid import UUID

from app.domain.resources.novelty import marginal_novelty

DEFAULT_PORTFOLIO_SIZE = 4


@dataclass(frozen=True)
class ResourceCandidate:
    resource_id: UUID
    relevance: float
    authority: float
    depth_score: float
    embedding: list[float] | None = None


@dataclass(frozen=True)
class RankedResource:
    resource_id: UUID
    score: float
    marginal_novelty: float


def score_resource(
    relevance: float, authority: float, depth: float, novelty: float
) -> float:
    """`resource_score = relevance + authority + depth + marginal_novelty`"""

    return relevance + authority + depth + novelty


def select_representative_resources(
    candidates: list[ResourceCandidate], *, portfolio_size: int = DEFAULT_PORTFOLIO_SIZE
) -> list[RankedResource]:
    """Greedy Maximal-Marginal-Relevance selection: at each step pick the
    candidate that maximizes relevance+authority+depth+novelty-vs-already-
    selected, so a classmate note only surfaces once it adds something the
    official anchor and best alternate don't already cover.
    """

    remaining = list(candidates)
    selected: list[RankedResource] = []
    selected_embeddings: list[list[float]] = []

    while remaining and len(selected) < portfolio_size:
        best_candidate: ResourceCandidate | None = None
        best_score = float("-inf")
        best_novelty = 1.0

        for candidate in remaining:
            novelty = marginal_novelty(candidate.embedding, selected_embeddings)
            score = score_resource(
                candidate.relevance, candidate.authority, candidate.depth_score, novelty
            )
            if score > best_score:
                best_score = score
                best_candidate = candidate
                best_novelty = novelty

        assert best_candidate is not None  # remaining is non-empty in this loop
        selected.append(
            RankedResource(
                resource_id=best_candidate.resource_id,
                score=best_score,
                marginal_novelty=best_novelty,
            )
        )
        if best_candidate.embedding is not None:
            selected_embeddings.append(best_candidate.embedding)
        remaining.remove(best_candidate)

    return selected
