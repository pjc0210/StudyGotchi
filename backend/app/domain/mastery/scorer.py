"""Weighted Bayesian understanding scoring (spec: "Understanding scoring").

`understanding = alpha / (alpha + beta)` where alpha/beta accumulate weighted
positive/negative evidence on top of a symmetric prior. Passive exposure
(student notes, resource views) has such low `evidence_strength` that it can
barely move understanding, by construction of the weight formula, not by
special casing here.

`positive_evidence`/`negative_evidence` are kept on the result because the
incremental-update pipeline needs the running totals to recompute future
updates cheaply — they are internal accumulator state, not a second
semantic measurement alongside `understanding`.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.mastery.evidence import EvidenceEvent, compute_evidence_weight


@dataclass(frozen=True)
class UnderstandingResult:
    understanding: float
    positive_evidence: float
    negative_evidence: float


def accumulate_evidence(
    events: list[EvidenceEvent], *, now: datetime | None = None
) -> tuple[float, float]:
    """Sum weighted positive/negative evidence across all events.

    Events with `outcome=None` (pure exposure: notes, resource views) are
    treated as a mild positive signal rather than ignored — the student
    engaged and showed no sign of struggle — but their already-tiny
    `evidence_strength` (see evidence.py) keeps that nudge small by
    construction, never enough to manufacture high understanding on its own.
    """

    positive = 0.0
    negative = 0.0
    for event in events:
        weight = compute_evidence_weight(event, now=now)
        outcome = 1.0 if event.outcome is None else max(0.0, min(1.0, event.outcome))
        positive += weight * outcome
        negative += weight * (1.0 - outcome)
    return positive, negative


def compute_understanding(
    positive_evidence: float,
    negative_evidence: float,
    *,
    alpha_prior: float,
    beta_prior: float,
) -> float:
    alpha = alpha_prior + positive_evidence
    beta = beta_prior + negative_evidence
    return alpha / (alpha + beta)


def score_concept_understanding(
    events: list[EvidenceEvent],
    *,
    alpha_prior: float,
    beta_prior: float,
    now: datetime | None = None,
) -> UnderstandingResult:
    positive, negative = accumulate_evidence(events, now=now)
    understanding = compute_understanding(
        positive, negative, alpha_prior=alpha_prior, beta_prior=beta_prior
    )
    return UnderstandingResult(
        understanding=understanding,
        positive_evidence=positive,
        negative_evidence=negative,
    )


def score_understanding_by_concept(
    events_by_concept: dict[UUID, list[EvidenceEvent]],
    *,
    alpha_prior: float,
    beta_prior: float,
    now: datetime | None = None,
) -> dict[UUID, UnderstandingResult]:
    return {
        concept_id: score_concept_understanding(
            events,
            alpha_prior=alpha_prior,
            beta_prior=beta_prior,
            now=now,
        )
        for concept_id, events in events_by_concept.items()
    }
