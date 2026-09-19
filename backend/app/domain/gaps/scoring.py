"""Knowledge-gap scoring (spec: "Knowledge-gap engine"). A gap is
contextual — it is never just `mastery < threshold`. Priority combines how
far the student is from mastering a concept, how relevant it is to the
current goal, how many other target-relevant concepts bottleneck on it, how
important the concept is to the course, and how much we should trust the
mastery estimate at all.
"""

from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID


class GapAction(StrEnum):
    STUDY = "study"
    DIAGNOSE = "diagnose"
    REVIEW = "review"
    OPTIONAL = "optional"


def mastery_deficit(mastery: float) -> float:
    return 1.0 - mastery


def goal_relevance(shortest_path_distance: int | None, *, alpha: float) -> float:
    """`alpha ^ distance`. A concept with no path to the target (distance is
    None) is irrelevant to this goal and gets zero relevance, which zeroes
    out its gap priority regardless of how weak it is.
    """

    if shortest_path_distance is None:
        return 0.0
    return alpha**shortest_path_distance


def confidence_adjustment(confidence: float) -> float:
    """Dampen (never zero out) priority when mastery is poorly evidenced, so
    a barely-tested concept still surfaces but doesn't dominate over a
    well-evidenced weakness. Pairs with `recommend_action`, which routes
    low-confidence weaknesses to DIAGNOSE instead of STUDY.
    """

    return 0.4 + 0.6 * confidence


@dataclass(frozen=True)
class GapPriorityInputs:
    concept_id: UUID
    mastery: float
    confidence: float
    course_importance: float
    shortest_path_distance: int | None
    bottleneck_weight: float  # normalized downstream reach within the target subgraph, [0,1]


def compute_gap_priority(inputs: GapPriorityInputs, *, relevance_alpha: float) -> float:
    relevance = goal_relevance(inputs.shortest_path_distance, alpha=relevance_alpha)
    return (
        mastery_deficit(inputs.mastery)
        * relevance
        * inputs.bottleneck_weight
        * inputs.course_importance
        * confidence_adjustment(inputs.confidence)
    )


def recommend_action(
    mastery: float,
    confidence: float,
    *,
    is_stale: bool,
    study_mastery_threshold: float = 0.50,
    diagnose_mastery_threshold: float = 0.60,
    confidence_threshold: float = 0.60,
    review_mastery_threshold: float = 0.75,
) -> GapAction:
    """Confidence-aware action per the build spec's rule table:

        mastery < 0.50 and confidence > 0.60         -> STUDY
        mastery < 0.60 and confidence <= 0.60         -> DIAGNOSE
        mastery >= 0.75 and evidence is stale         -> REVIEW
        else                                          -> OPTIONAL
    """

    if mastery < study_mastery_threshold and confidence > confidence_threshold:
        return GapAction.STUDY
    if mastery < diagnose_mastery_threshold and confidence <= confidence_threshold:
        return GapAction.DIAGNOSE
    if mastery >= review_mastery_threshold and is_stale:
        return GapAction.REVIEW
    return GapAction.OPTIONAL
