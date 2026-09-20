"""Knowledge-gap scoring (spec: "Knowledge-gap engine"). A gap is
contextual — it is never just `understanding < threshold`. Priority combines
how far the student is from understanding a concept, how relevant it is to
the current goal, how many other target-relevant concepts bottleneck on it,
and how important the concept is to the course.

Deliberately does not depend on familiarity, confidence, evidence_strength,
readiness, or fragility — only `understanding` + graph structure + target +
importance. Where "how much evidence exists" matters (to decide STUDY vs.
DIAGNOSE), it is read directly off the raw evidence totals rather than a
derived confidence score.
"""

from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID


class GapAction(StrEnum):
    STUDY = "study"
    DIAGNOSE = "diagnose"
    REVIEW = "review"
    OPTIONAL = "optional"


def understanding_deficit(understanding: float) -> float:
    return 1.0 - understanding


def goal_relevance(shortest_path_distance: int | None, *, alpha: float) -> float:
    """`alpha ^ distance`. A concept with no path to the target (distance is
    None) is irrelevant to this goal and gets zero relevance, which zeroes
    out its gap priority regardless of how weak it is.
    """

    if shortest_path_distance is None:
        return 0.0
    return alpha**shortest_path_distance


@dataclass(frozen=True)
class GapPriorityInputs:
    concept_id: UUID
    understanding: float
    course_importance: float
    shortest_path_distance: int | None
    bottleneck_weight: (
        float  # normalized downstream reach within the target subgraph, [0,1]
    )


def compute_gap_priority(inputs: GapPriorityInputs, *, relevance_alpha: float) -> float:
    relevance = goal_relevance(inputs.shortest_path_distance, alpha=relevance_alpha)
    return (
        understanding_deficit(inputs.understanding)
        * relevance
        * inputs.bottleneck_weight
        * inputs.course_importance
    )


def recommend_action(
    understanding: float,
    effective_evidence: float,
    *,
    is_stale: bool,
    study_understanding_threshold: float = 0.50,
    diagnose_understanding_threshold: float = 0.60,
    min_evidence_for_confident_action: float = 1.0,
    review_understanding_threshold: float = 0.75,
) -> GapAction:
    """Evidence-amount-aware action, read directly off the raw evidence
    totals rather than a derived confidence score (spec: "if later logic
    needs to know how much evidence exists, inspect/count the evidence
    events dynamically rather than maintaining another concept-state
    measurement"):

    understanding < 0.50 and enough evidence exists   -> STUDY
    understanding < 0.60 and evidence is sparse        -> DIAGNOSE
    understanding >= 0.75 and evidence is stale        -> REVIEW
    else                                                -> OPTIONAL
    """

    has_enough_evidence = effective_evidence > min_evidence_for_confident_action
    if understanding < study_understanding_threshold and has_enough_evidence:
        return GapAction.STUDY
    if understanding < diagnose_understanding_threshold and not has_enough_evidence:
        return GapAction.DIAGNOSE
    if understanding >= review_understanding_threshold and is_stale:
        return GapAction.REVIEW
    return GapAction.OPTIONAL
