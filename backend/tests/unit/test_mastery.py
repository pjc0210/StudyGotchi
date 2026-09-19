from datetime import datetime, timezone
from uuid import uuid4

from app.domain.mastery.evidence import EvidenceEvent, EvidenceType
from app.domain.mastery.familiarity import compute_familiarity
from app.domain.mastery.scorer import score_concept_mastery

NOW = datetime(2026, 9, 19, tzinfo=timezone.utc)
ALPHA_PRIOR = 1.5
BETA_PRIOR = 1.5
CONFIDENCE_K = 0.5


def _event(evidence_type, outcome, *, certainty=1.0, relevance=1.0, occurred_at=NOW, concept_id=None):
    return EvidenceEvent(
        concept_id=concept_id or uuid4(),
        student_id=uuid4(),
        evidence_type=evidence_type,
        outcome=outcome,
        certainty=certainty,
        occurred_at=occurred_at,
        concept_relevance=relevance,
    )


def _score(events):
    return score_concept_mastery(
        events, alpha_prior=ALPHA_PRIOR, beta_prior=BETA_PRIOR, confidence_k=CONFIDENCE_K, now=NOW
    )


def test_correct_graded_work_increases_mastery_above_prior():
    baseline = _score([]).mastery
    result = _score([_event(EvidenceType.GRADED_EXAM, 1.0)])
    assert result.mastery > baseline


def test_incorrect_high_certainty_work_decreases_mastery_below_prior():
    baseline = _score([]).mastery
    result = _score([_event(EvidenceType.GRADED_EXAM, 0.0, certainty=1.0)])
    assert result.mastery < baseline


def test_partial_credit_lands_between_full_credit_and_no_credit():
    full = _score([_event(EvidenceType.GRADED_EXAM, 1.0)]).mastery
    none = _score([_event(EvidenceType.GRADED_EXAM, 0.0)]).mastery
    partial = _score([_event(EvidenceType.GRADED_EXAM, 0.6)]).mastery
    assert none < partial < full


def test_passive_exposure_barely_moves_mastery():
    baseline = _score([]).mastery
    exam_result = _score([_event(EvidenceType.GRADED_EXAM, 1.0)]).mastery
    view_result = _score([_event(EvidenceType.RESOURCE_VIEW, 1.0)]).mastery

    exam_delta = exam_result - baseline
    view_delta = view_result - baseline
    assert view_delta < exam_delta * 0.1


def test_notes_increase_familiarity_more_than_mastery():
    events = [_event(EvidenceType.STUDENT_NOTES, outcome=None, certainty=1.0)]
    mastery = _score(events)
    familiarity = compute_familiarity(events, now=NOW)

    # Notes carry no outcome, so they can't move mastery evidence at all...
    assert mastery.positive_evidence == 0.0
    assert mastery.negative_evidence == 0.0
    # ...but they meaningfully raise familiarity.
    assert familiarity > 0.3


def test_more_evidence_increases_confidence():
    one_event = _score([_event(EvidenceType.GRADED_EXAM, 1.0)])
    many_events = _score(
        [_event(EvidenceType.GRADED_EXAM, 1.0, concept_id=uuid4()) for _ in range(5)]
    )
    assert many_events.confidence > one_event.confidence


def test_failed_multiconcept_question_does_not_equally_punish_low_relevance_concept():
    concept_id = uuid4()
    baseline = _score([]).mastery

    high_relevance_result = _score(
        [_event(EvidenceType.GRADED_HOMEWORK, 0.0, certainty=0.8, relevance=0.7, concept_id=concept_id)]
    ).mastery
    low_relevance_result = _score(
        [_event(EvidenceType.GRADED_HOMEWORK, 0.0, certainty=0.8, relevance=0.1, concept_id=concept_id)]
    ).mastery

    high_relevance_drop = baseline - high_relevance_result
    low_relevance_drop = baseline - low_relevance_result
    assert low_relevance_drop < high_relevance_drop
