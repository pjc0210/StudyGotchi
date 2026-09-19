from uuid import uuid4

from app.domain.mastery.readiness import (
    PrerequisiteLink,
    compute_fragility,
    compute_prerequisite_support,
    compute_readiness,
)


def test_weak_prerequisites_lower_readiness():
    psd = uuid4()
    mastery_by_concept = {psd: 0.25}
    prereqs = [PrerequisiteLink(prerequisite_concept_id=psd, edge_confidence=0.9)]

    support = compute_prerequisite_support(prereqs, mastery_by_concept)
    readiness = compute_readiness(mastery=0.82, prerequisite_support=support)

    assert readiness < 0.82


def test_weak_prerequisites_do_not_change_direct_mastery():
    # Readiness/fragility are derived signals; direct mastery is untouched.
    direct_mastery = 0.82
    psd = uuid4()
    support = compute_prerequisite_support(
        [PrerequisiteLink(prerequisite_concept_id=psd, edge_confidence=0.9)], {psd: 0.1}
    )
    compute_readiness(mastery=direct_mastery, prerequisite_support=support)
    compute_fragility(mastery=direct_mastery, prerequisite_support=support)
    assert direct_mastery == 0.82  # unchanged by either derived computation


def test_strong_mastery_on_weak_foundation_is_fragile():
    psd = uuid4()
    support = compute_prerequisite_support(
        [PrerequisiteLink(prerequisite_concept_id=psd, edge_confidence=0.9)], {psd: 0.25}
    )
    fragility = compute_fragility(mastery=0.82, prerequisite_support=support)
    assert fragility > 0.4  # high mastery * mostly-unsupported foundation


def test_no_prerequisites_readiness_equals_mastery():
    support = compute_prerequisite_support([], {})
    assert support is None
    assert compute_readiness(mastery=0.6, prerequisite_support=support) == 0.6
    assert compute_fragility(mastery=0.6, prerequisite_support=support) == 0.0
