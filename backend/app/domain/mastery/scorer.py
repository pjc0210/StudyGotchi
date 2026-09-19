"""Weighted Bayesian mastery scoring (spec: "Mastery scoring").

`mastery = alpha / (alpha + beta)` where alpha/beta accumulate weighted
positive/negative evidence on top of a symmetric prior. Passive exposure
(student notes, resource views) has such low `evidence_strength` that it can
barely move mastery, by construction of the weight formula, not by special
casing here.
"""

import math
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.mastery.evidence import EvidenceEvent, compute_evidence_weight


@dataclass(frozen=True)
class MasteryResult:
    mastery: float
    confidence: float
    positive_evidence: float
    negative_evidence: float


def accumulate_evidence(
    events: list[EvidenceEvent], *, now: datetime | None = None
) -> tuple[float, float]:
    """Sum weighted positive/negative evidence across events that carry an
    `outcome` (pure-exposure events with `outcome=None` don't participate in
    mastery — they only feed familiarity, see `domain.mastery.familiarity`).
    """

    positive = 0.0
    negative = 0.0
    for event in events:
        if event.outcome is None:
            continue
        weight = compute_evidence_weight(event, now=now)
        outcome = max(0.0, min(1.0, event.outcome))
        positive += weight * outcome
        negative += weight * (1.0 - outcome)
    return positive, negative


def compute_mastery(
    positive_evidence: float,
    negative_evidence: float,
    *,
    alpha_prior: float,
    beta_prior: float,
) -> float:
    alpha = alpha_prior + positive_evidence
    beta = beta_prior + negative_evidence
    return alpha / (alpha + beta)


def compute_mastery_confidence(
    positive_evidence: float,
    negative_evidence: float,
    *,
    k: float,
) -> float:
    """`confidence = 1 - exp(-k * effective_evidence)`. More evidence (of
    either sign) increases confidence; it says nothing about *how good* the
    evidence is, only how much of it there is.
    """

    effective_evidence = positive_evidence + negative_evidence
    return 1.0 - math.exp(-k * effective_evidence)


def score_concept_mastery(
    events: list[EvidenceEvent],
    *,
    alpha_prior: float,
    beta_prior: float,
    confidence_k: float,
    now: datetime | None = None,
) -> MasteryResult:
    positive, negative = accumulate_evidence(events, now=now)
    mastery = compute_mastery(positive, negative, alpha_prior=alpha_prior, beta_prior=beta_prior)
    confidence = compute_mastery_confidence(positive, negative, k=confidence_k)
    return MasteryResult(
        mastery=mastery,
        confidence=confidence,
        positive_evidence=positive,
        negative_evidence=negative,
    )


def score_mastery_by_concept(
    events_by_concept: dict[UUID, list[EvidenceEvent]],
    *,
    alpha_prior: float,
    beta_prior: float,
    confidence_k: float,
    now: datetime | None = None,
) -> dict[UUID, MasteryResult]:
    return {
        concept_id: score_concept_mastery(
            events,
            alpha_prior=alpha_prior,
            beta_prior=beta_prior,
            confidence_k=confidence_k,
            now=now,
        )
        for concept_id, events in events_by_concept.items()
    }
