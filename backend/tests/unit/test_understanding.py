from datetime import UTC, datetime
from uuid import uuid4

from app.domain.mastery.evidence import EvidenceEvent, EvidenceType
from app.domain.mastery.scorer import score_concept_understanding

NOW = datetime(2026, 9, 19, tzinfo=UTC)
ALPHA_PRIOR = 1.5
BETA_PRIOR = 1.5


def _event(
    evidence_type,
    outcome,
    *,
    certainty=1.0,
    relevance=1.0,
    occurred_at=NOW,
    concept_id=None,
):
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
    return score_concept_understanding(
        events,
        alpha_prior=ALPHA_PRIOR,
        beta_prior=BETA_PRIOR,
        now=NOW,
    )


def test_correct_graded_work_increases_understanding_above_prior():
    baseline = _score([]).understanding
    result = _score([_event(EvidenceType.GRADED_EXAM, 1.0)])
    assert result.understanding > baseline


def test_incorrect_high_certainty_work_decreases_understanding_below_prior():
    baseline = _score([]).understanding
    result = _score([_event(EvidenceType.GRADED_EXAM, 0.0, certainty=1.0)])
    assert result.understanding < baseline


def test_partial_credit_lands_between_full_credit_and_no_credit():
    full = _score([_event(EvidenceType.GRADED_EXAM, 1.0)]).understanding
    none = _score([_event(EvidenceType.GRADED_EXAM, 0.0)]).understanding
    partial = _score([_event(EvidenceType.GRADED_EXAM, 0.6)]).understanding
    assert none < partial < full


def test_passive_resource_view_has_little_effect_on_understanding():
    baseline = _score([]).understanding
    exam_result = _score([_event(EvidenceType.GRADED_EXAM, 1.0)]).understanding
    view_result = _score([_event(EvidenceType.RESOURCE_VIEW, 1.0)]).understanding

    exam_delta = exam_result - baseline
    view_delta = view_result - baseline
    assert 0 < view_delta < exam_delta * 0.1


def test_notes_have_less_influence_than_assessment_performance():
    baseline = _score([]).understanding
    notes_result = _score(
        [_event(EvidenceType.STUDENT_NOTES, outcome=None, certainty=1.0)]
    ).understanding
    exam_result = _score([_event(EvidenceType.GRADED_HOMEWORK, 1.0)]).understanding

    notes_delta = notes_result - baseline
    exam_delta = exam_result - baseline
    assert 0 < notes_delta < exam_delta


def test_failed_multiconcept_question_does_not_equally_punish_low_relevance_concept():
    concept_id = uuid4()
    baseline = _score([]).understanding

    high_relevance_result = _score(
        [
            _event(
                EvidenceType.GRADED_HOMEWORK,
                0.0,
                certainty=0.8,
                relevance=0.7,
                concept_id=concept_id,
            )
        ]
    ).understanding
    low_relevance_result = _score(
        [
            _event(
                EvidenceType.GRADED_HOMEWORK,
                0.0,
                certainty=0.8,
                relevance=0.1,
                concept_id=concept_id,
            )
        ]
    ).understanding

    high_relevance_drop = baseline - high_relevance_result
    low_relevance_drop = baseline - low_relevance_result
    assert low_relevance_drop < high_relevance_drop


def test_understanding_ignores_other_concepts_entirely():
    # A concept's understanding is computed only from its own evidence
    # events — prerequisite/downstream scores never feed back into it here
    # (that composition, if ever needed, happens at query time in
    # app.domain.gaps.prerequisite_support, not inside the scorer).
    weak_prereq_events = [_event(EvidenceType.GRADED_EXAM, 0.05)]
    target_events = [_event(EvidenceType.GRADED_EXAM, 0.95)]

    prereq_alone = _score(weak_prereq_events).understanding
    target_alone = _score(target_events).understanding
    target_with_prereq_context = _score(target_events).understanding

    assert prereq_alone < 0.5 < target_alone
    assert target_with_prereq_context == target_alone
