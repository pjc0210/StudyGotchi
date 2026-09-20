"""Derives the displayable concept state label from already-computed scores.

This lives server-side deliberately. `fragile`, `struggling` and `stale` are
semantic judgements about a student, not presentation formatting, so the
engine owns them - a client must never re-derive them from raw scores.

Pure function over values the mastery/readiness layers have already produced;
it computes no new evidence and reads no database.
"""

from datetime import datetime, timezone
from enum import StrEnum

from app.domain.personal_graph.discovery import DiscoveryState


class ConceptState(StrEnum):
    FRONTIER = "frontier"
    EXPOSED = "exposed"
    UNCERTAIN = "uncertain"
    STRUGGLING = "struggling"
    DEVELOPING = "developing"
    STRONG = "strong"
    MASTERED = "mastered"
    FRAGILE = "fragile"
    STALE = "stale"


def classify_concept_state(
    *,
    discovery_state: DiscoveryState,
    mastery: float | None,
    confidence: float,
    fragility: float,
    last_practiced_at: datetime | None = None,
    staleness_days: float = 45.0,
    fragile_threshold: float = 0.5,
    low_confidence_threshold: float = 0.4,
    mastered_threshold: float = 0.85,
    strong_threshold: float = 0.7,
    developing_threshold: float = 0.45,
) -> ConceptState:
    """Order matters: the checks run most-actionable first.

    A concept the student scores well on but which rests on weak prerequisites
    is `fragile`, not `strong` - surfacing that is the whole point of tracking
    fragility separately from mastery.
    """

    if discovery_state is DiscoveryState.FRONTIER or mastery is None:
        return ConceptState.FRONTIER

    if fragility >= fragile_threshold:
        return ConceptState.FRAGILE

    if last_practiced_at is not None:
        # SQLite hands back naive timestamps; they were stored as UTC.
        if last_practiced_at.tzinfo is None:
            last_practiced_at = last_practiced_at.replace(tzinfo=timezone.utc)
        age_days = (datetime.now(timezone.utc) - last_practiced_at).total_seconds() / 86400.0
        if age_days >= staleness_days and mastery >= developing_threshold:
            return ConceptState.STALE

    if mastery < developing_threshold:
        # Low mastery with high confidence is a real misconception; low mastery
        # with low confidence is simply thin evidence.
        return (
            ConceptState.STRUGGLING
            if confidence >= low_confidence_threshold
            else ConceptState.EXPOSED
        )

    if confidence < low_confidence_threshold:
        return ConceptState.UNCERTAIN

    if mastery >= mastered_threshold:
        return ConceptState.MASTERED
    if mastery >= strong_threshold:
        return ConceptState.STRONG
    return ConceptState.DEVELOPING
