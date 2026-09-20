"""Prerequisite edge scoring (spec: "Prerequisite extraction").

PREREQUISITE_FOR is a strong pedagogical claim. It is never created from
co-occurrence or embedding similarity alone. Every candidate edge is scored
from its evidence level, the authority of the source(s) that support it, and
how many independent sources corroborate it, then thresholded into
active / suggested / rejected.
"""

from dataclasses import dataclass
from enum import IntEnum


class PrerequisiteEvidenceLevel(IntEnum):
    """Ordered strongest -> weakest, per the build spec's evidence levels."""

    EXPLICIT = 5  # "Recall...", "Before learning X we need Y...", "X requires Y..."
    INSTRUCTOR_DEPENDENCY = 4  # shown directly in instructor material's structure
    ASSESSMENT_DEPENDENCY = 3  # solving B materially requires A
    CROSS_RESOURCE_ORDERING = 2  # consistent ordering across independent sources
    MODEL_INFERENCE = 1  # LLM pedagogical inference from definitions alone


# Base confidence contribution per evidence level, before authority/cross-source
# adjustment. Deliberately conservative for the weakest levels so that
# ordering/co-occurrence alone can never cross the "active" threshold.
_BASE_CONFIDENCE: dict[PrerequisiteEvidenceLevel, float] = {
    PrerequisiteEvidenceLevel.EXPLICIT: 0.90,
    PrerequisiteEvidenceLevel.INSTRUCTOR_DEPENDENCY: 0.80,
    PrerequisiteEvidenceLevel.ASSESSMENT_DEPENDENCY: 0.70,
    PrerequisiteEvidenceLevel.CROSS_RESOURCE_ORDERING: 0.50,
    PrerequisiteEvidenceLevel.MODEL_INFERENCE: 0.35,
}

# Diminishing-returns bonus per *independent* corroborating source, beyond
# the first. Five copies of the same classmate note must not out-vote one
# official lecture, so callers must cluster duplicate sources (see
# `resolution.merge`) before counting them here.
_CROSS_SOURCE_BONUS_PER_EXTRA_SOURCE = 0.05
_CROSS_SOURCE_BONUS_CAP = 0.15


@dataclass(frozen=True)
class PrerequisiteEdgeScore:
    confidence: float
    classification: str  # "active" | "suggested" | "reject"


def score_prerequisite_confidence(
    level: PrerequisiteEvidenceLevel,
    source_authority: float,
    independent_source_count: int = 1,
) -> float:
    """Combine evidence level, source authority, and cross-source support
    into a single confidence score in [0, 1].
    """

    base = _BASE_CONFIDENCE[level]
    authority_adjusted = base * (0.6 + 0.4 * source_authority)
    cross_source_bonus = min(
        _CROSS_SOURCE_BONUS_CAP,
        max(0, independent_source_count - 1) * _CROSS_SOURCE_BONUS_PER_EXTRA_SOURCE,
    )
    return min(1.0, authority_adjusted + cross_source_bonus)


def classify_edge(
    confidence: float,
    active_threshold: float,
    weak_threshold: float,
) -> str:
    """`>= active_threshold` -> "active" prerequisite,
    `[weak_threshold, active_threshold)` -> "suggested" (weak),
    below that -> "reject" (evidence too thin to assert a prerequisite;
    caller should downgrade to RELATED_TO instead of discarding it).
    """

    if confidence >= active_threshold:
        return "active"
    if confidence >= weak_threshold:
        return "suggested"
    return "reject"


def score_and_classify(
    level: PrerequisiteEvidenceLevel,
    source_authority: float,
    active_threshold: float,
    weak_threshold: float,
    independent_source_count: int = 1,
) -> PrerequisiteEdgeScore:
    confidence = score_prerequisite_confidence(
        level, source_authority, independent_source_count
    )
    return PrerequisiteEdgeScore(
        confidence=confidence,
        classification=classify_edge(confidence, active_threshold, weak_threshold),
    )
