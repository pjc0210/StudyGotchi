"""Familiarity: exposure-based, independent of correctness (spec:
"Familiarity"). A student can have high familiarity and low mastery —
they've seen a concept many times but still can't solve problems about it.
"""

from datetime import datetime
from math import exp

from app.domain.mastery.evidence import EvidenceEvent, EvidenceType, recency_weight

# How much each evidence type counts as "exposure", independent of whether it
# graded correctness. Notes and self-explanation are the strongest exposure
# signals (the student actively engaged); a passive resource view is the
# weakest. Deliberately decoupled from `DEFAULT_EVIDENCE_STRENGTH` in
# evidence.py, which instead scales *mastery* impact.
EXPOSURE_MULTIPLIER: dict[EvidenceType, float] = {
    EvidenceType.STUDENT_NOTES: 1.00,
    EvidenceType.SELF_EXPLANATION: 1.00,
    EvidenceType.WORKED_SOLUTION: 0.80,
    EvidenceType.VERIFIED_PRACTICE: 0.80,
    EvidenceType.DIAGNOSTIC: 0.60,
    EvidenceType.GRADED_HOMEWORK: 0.60,
    EvidenceType.GRADED_QUIZ: 0.50,
    EvidenceType.GRADED_EXAM: 0.50,
    EvidenceType.SELF_RATING: 0.30,
    EvidenceType.RESOURCE_VIEW: 0.40,
}

_FAMILIARITY_HALF_LIFE_DAYS = 21.0  # 14-30 day range midpoint, per spec


def exposure_weight(event: EvidenceEvent, *, now: datetime | None = None) -> float:
    recency = recency_weight(event.occurred_at, now=now, half_life_days=_FAMILIARITY_HALF_LIFE_DAYS)
    return EXPOSURE_MULTIPLIER[event.evidence_type] * event.certainty * event.concept_relevance * recency


def compute_familiarity(events: list[EvidenceEvent], *, now: datetime | None = None) -> float:
    """`familiarity = 1 - exp(-sum(exposure_weights))` — saturating, so
    repeated exposure has diminishing returns and familiarity never exceeds 1.
    """

    total_exposure = sum(exposure_weight(e, now=now) for e in events)
    return 1.0 - exp(-total_exposure)
