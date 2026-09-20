"""Prerequisite understanding support is computed on demand from the graph
+ current `understanding` values — there is no persisted readiness/
fragility field (spec: "Readiness should be graph-derived, not stored").
"""

from uuid import uuid4

from app.domain.gaps.prerequisite_support import (
    PrerequisiteLink,
    compute_prerequisite_understanding_support,
    weak_prerequisites,
)


def test_weak_prerequisite_lowers_support_below_direct_understanding():
    psd = uuid4()
    understanding_by_concept = {psd: 0.25}
    prereqs = [PrerequisiteLink(prerequisite_concept_id=psd, edge_confidence=0.9)]

    support = compute_prerequisite_understanding_support(
        prereqs, understanding_by_concept
    )

    assert support == 0.25
    assert support < 0.82  # a hypothetical direct understanding it would feed into


def test_no_prerequisites_returns_none_sentinel():
    support = compute_prerequisite_understanding_support([], {})
    assert support is None


def test_weak_prerequisites_identified_dynamically_without_fragility_field():
    strong = uuid4()
    weak = uuid4()
    understanding_by_concept = {strong: 0.9, weak: 0.2}
    prereqs = [
        PrerequisiteLink(prerequisite_concept_id=strong, edge_confidence=0.9),
        PrerequisiteLink(prerequisite_concept_id=weak, edge_confidence=0.9),
    ]

    result = weak_prerequisites(prereqs, understanding_by_concept, threshold=0.5)

    assert result == [weak]


def test_weak_prerequisites_ignores_concepts_with_no_understanding_yet():
    unseen = uuid4()
    prereqs = [PrerequisiteLink(prerequisite_concept_id=unseen, edge_confidence=0.9)]

    result = weak_prerequisites(prereqs, {}, threshold=0.5)

    assert result == []
