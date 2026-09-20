"""Evidence events: the only source of truth for understanding (spec:
"Student evidence model"). File presence or resource links are never
evidence by themselves — only recorded events with an outcome/strength/
certainty.
"""

import math
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID


class EvidenceType(StrEnum):
    GRADED_EXAM = "graded_exam"
    GRADED_QUIZ = "graded_quiz"
    GRADED_HOMEWORK = "graded_homework"
    DIAGNOSTIC = "diagnostic"
    VERIFIED_PRACTICE = "verified_practice"
    WORKED_SOLUTION = "worked_solution"
    SELF_EXPLANATION = "self_explanation"
    STUDENT_NOTES = "student_notes"
    RESOURCE_VIEW = "resource_view"
    SELF_RATING = "self_rating"


# Evidence-strength defaults from the build spec. Configurable per course if
# needed; strong (graded/diagnostic) evidence dominates, passive exposure
# (notes, resource views) barely moves understanding.
DEFAULT_EVIDENCE_STRENGTH: dict[EvidenceType, float] = {
    EvidenceType.GRADED_EXAM: 1.00,
    EvidenceType.GRADED_QUIZ: 0.90,
    EvidenceType.DIAGNOSTIC: 0.80,
    EvidenceType.GRADED_HOMEWORK: 0.75,
    EvidenceType.VERIFIED_PRACTICE: 0.65,
    EvidenceType.WORKED_SOLUTION: 0.45,
    EvidenceType.SELF_EXPLANATION: 0.35,
    EvidenceType.STUDENT_NOTES: 0.10,
    EvidenceType.RESOURCE_VIEW: 0.02,
    EvidenceType.SELF_RATING: 0.10,
}

# Half-life (days) for recency decay, per evidence category. Assessment-like
# evidence decays slowest; passive exposure decays fastest.
_ASSESSMENT_TYPES = frozenset(
    {
        EvidenceType.GRADED_EXAM,
        EvidenceType.GRADED_QUIZ,
        EvidenceType.GRADED_HOMEWORK,
        EvidenceType.DIAGNOSTIC,
    }
)
_PRACTICE_TYPES = frozenset(
    {
        EvidenceType.VERIFIED_PRACTICE,
        EvidenceType.WORKED_SOLUTION,
        EvidenceType.SELF_EXPLANATION,
    }
)

DEFAULT_HALF_LIFE_DAYS: dict[EvidenceType, float] = {
    **{t: 135.0 for t in _ASSESSMENT_TYPES},  # 90-180 day range midpoint
    **{t: 65.0 for t in _PRACTICE_TYPES},  # 45-90 day range midpoint
    EvidenceType.STUDENT_NOTES: 21.0,  # 14-30 day range midpoint
    EvidenceType.RESOURCE_VIEW: 21.0,
    EvidenceType.SELF_RATING: 21.0,
}


@dataclass
class EvidenceEvent:
    concept_id: UUID
    student_id: UUID
    evidence_type: EvidenceType
    outcome: (
        float | None
    )  # 0.0 (incorrect) .. 1.0 (correct); None for pure-exposure events
    certainty: (
        float  # how confidently this event is attributable to this concept, [0,1]
    )
    occurred_at: datetime
    resource_id: UUID | None = None
    assessment_item_id: UUID | None = None
    difficulty: float = 1.0  # [0.5, 1.5], 1.0 = average
    concept_relevance: float = (
        1.0  # this concept's share of a multi-concept item, [0,1]
    )
    strength: float | None = (
        None  # overrides DEFAULT_EVIDENCE_STRENGTH[evidence_type] if set
    )


def recency_weight(
    occurred_at: datetime, *, now: datetime | None = None, half_life_days: float
) -> float:
    """`exp(-lambda * age_days)`, lambda chosen so the weight halves every
    `half_life_days`. Mild decay: an event from today has weight 1.0.
    """

    now = now or datetime.now(UTC)
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=UTC)
    age_days = max(0.0, (now - occurred_at).total_seconds() / 86400.0)
    decay_lambda = math.log(2) / half_life_days
    return math.exp(-decay_lambda * age_days)


def evidence_strength(event: EvidenceEvent) -> float:
    if event.strength is not None:
        return event.strength
    return DEFAULT_EVIDENCE_STRENGTH[event.evidence_type]


def evidence_half_life(event: EvidenceEvent) -> float:
    return DEFAULT_HALF_LIFE_DAYS[event.evidence_type]


def compute_evidence_weight(
    event: EvidenceEvent, *, now: datetime | None = None
) -> float:
    """`weight_i = strength_i * certainty_i * difficulty_i * recency_i * concept_relevance_i`"""

    recency = recency_weight(
        event.occurred_at, now=now, half_life_days=evidence_half_life(event)
    )
    return (
        evidence_strength(event)
        * event.certainty
        * event.difficulty
        * recency
        * event.concept_relevance
    )
