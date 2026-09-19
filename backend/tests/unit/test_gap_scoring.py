from uuid import uuid4

import networkx as nx

from app.domain.gaps.scoring import (
    GapAction,
    GapPriorityInputs,
    compute_gap_priority,
    recommend_action,
)
from app.domain.gaps.study_plan import build_study_plan

ALPHA = 0.75


def test_weak_relevant_prerequisite_outranks_weak_irrelevant_concept():
    relevant = uuid4()  # direct prerequisite of the target
    irrelevant = uuid4()  # not on any path to the target

    relevant_priority = compute_gap_priority(
        GapPriorityInputs(
            concept_id=relevant,
            mastery=0.2,
            confidence=0.8,
            course_importance=0.7,
            shortest_path_distance=1,
            bottleneck_weight=0.8,
        ),
        relevance_alpha=ALPHA,
    )
    irrelevant_priority = compute_gap_priority(
        GapPriorityInputs(
            concept_id=irrelevant,
            mastery=0.2,
            confidence=0.8,
            course_importance=0.7,
            shortest_path_distance=None,  # no path to target
            bottleneck_weight=0.8,
        ),
        relevance_alpha=ALPHA,
    )
    assert relevant_priority > irrelevant_priority
    assert irrelevant_priority == 0.0


def test_low_confidence_weak_concept_returns_diagnose():
    assert recommend_action(mastery=0.4, confidence=0.3, is_stale=False) == GapAction.DIAGNOSE


def test_high_confidence_weak_concept_returns_study():
    assert recommend_action(mastery=0.3, confidence=0.9, is_stale=False) == GapAction.STUDY


def test_mastered_and_stale_returns_review():
    assert recommend_action(mastery=0.85, confidence=0.9, is_stale=True) == GapAction.REVIEW


def test_mastered_and_fresh_returns_optional():
    assert recommend_action(mastery=0.85, confidence=0.9, is_stale=False) == GapAction.OPTIONAL


def test_study_plan_omits_mastered_prerequisites_and_respects_ordering():
    # A -> B -> C -> D (D is the target); A is already mastered.
    a, b, c, d = uuid4(), uuid4(), uuid4(), uuid4()
    graph = nx.DiGraph()
    graph.add_edges_from([(a, b), (b, c), (c, d)])

    result = build_study_plan(
        graph,
        target_concept_id=d,
        mastery_by_concept={a: 0.95, b: 0.2, c: 0.3, d: 0.0},
        confidence_by_concept={a: 0.9, b: 0.8, c: 0.8, d: 0.0},
        course_importance_by_concept={a: 0.5, b: 0.5, c: 0.5, d: 0.5},
        is_stale_by_concept={},
        relevance_alpha=ALPHA,
        mastered_threshold=0.75,
    )

    assert a not in result.study_order
    assert d not in result.study_order
    assert set(result.study_order) == {b, c}
    assert result.study_order.index(b) < result.study_order.index(c)
