"""Readiness and fragility (spec: "Readiness", "Fragility").

Mastery is never blindly propagated through prerequisite edges — a student
can demonstrate downstream competence even with a shaky foundation. Instead,
prerequisite mastery feeds two *derived* signals: readiness (is this student
ready to build on this concept?) and fragility (is this mastery resting on
weak foundations?). Direct mastery itself is untouched by either.
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class PrerequisiteLink:
    prerequisite_concept_id: UUID
    edge_confidence: float


def compute_prerequisite_support(
    prerequisites: list[PrerequisiteLink],
    mastery_by_concept: dict[UUID, float],
    *,
    default_mastery: float = 0.0,
) -> float | None:
    """Weighted average of direct-prerequisite mastery, weighted by how
    confident each PREREQUISITE_FOR edge is. Returns `None` for a concept
    with no prerequisites — a distinct sentinel from "prerequisites exist and
    happen to average to full mastery" — which `compute_readiness` and
    `compute_fragility` special-case per the spec's stated root-concept rule.
    """

    if not prerequisites:
        return None

    total_weight = sum(link.edge_confidence for link in prerequisites)
    if total_weight <= 0:
        return default_mastery

    weighted_sum = sum(
        link.edge_confidence * mastery_by_concept.get(link.prerequisite_concept_id, default_mastery)
        for link in prerequisites
    )
    return weighted_sum / total_weight


def compute_readiness(mastery: float, prerequisite_support: float | None) -> float:
    """`readiness = 0.65 * mastery + 0.35 * prereq_support`. Concepts with no
    prerequisites (`prerequisite_support is None`) get `readiness = mastery`,
    matching the spec's stated special case.
    """

    if prerequisite_support is None:
        return mastery
    return 0.65 * mastery + 0.35 * prerequisite_support


def compute_fragility(mastery: float, prerequisite_support: float | None) -> float:
    """`fragility = mastery * (1 - prereq_support)`. High mastery resting on
    weak prerequisites yields high fragility; low mastery is just weak, not
    fragile (fragility requires something to be fragile). A concept with no
    prerequisites has nothing to be fragile against, so fragility is 0.
    """

    if prerequisite_support is None:
        return 0.0
    return mastery * (1.0 - prerequisite_support)
