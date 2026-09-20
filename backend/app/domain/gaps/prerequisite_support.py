"""Prerequisite understanding support (spec: "Readiness should be
graph-derived, not stored"). Whether a concept's foundations are solid is
computed on demand from the prerequisite graph + current `understanding`
values — there is no persisted `readiness`/`fragility` field to keep in
sync; callers recompute this every time they need it.
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class PrerequisiteLink:
    prerequisite_concept_id: UUID
    edge_confidence: float


def compute_prerequisite_understanding_support(
    prerequisites: list[PrerequisiteLink],
    understanding_by_concept: dict[UUID, float | None],
    *,
    default_understanding: float = 0.0,
) -> float | None:
    """Weighted average of direct-prerequisite understanding, weighted by how
    confident each PREREQUISITE_FOR edge is. Returns `None` for a concept
    with no prerequisites — a distinct sentinel from "prerequisites exist and
    happen to average to full understanding".
    """

    if not prerequisites:
        return None

    total_weight = sum(link.edge_confidence for link in prerequisites)
    if total_weight <= 0:
        return default_understanding

    weighted_sum = sum(
        link.edge_confidence
        * (
            understanding_by_concept.get(link.prerequisite_concept_id)
            if understanding_by_concept.get(link.prerequisite_concept_id) is not None
            else default_understanding
        )
        for link in prerequisites
    )
    return weighted_sum / total_weight


def weak_prerequisites(
    prerequisites: list[PrerequisiteLink],
    understanding_by_concept: dict[UUID, float | None],
    *,
    threshold: float,
) -> list[UUID]:
    """Direct prerequisites whose understanding is below `threshold` —
    identifies a shaky foundation dynamically, with no stored fragility
    field: a concept resting on these is only as solid as they are.
    """

    return [
        link.prerequisite_concept_id
        for link in prerequisites
        if (understood := understanding_by_concept.get(link.prerequisite_concept_id))
        is not None
        and understood < threshold
    ]
