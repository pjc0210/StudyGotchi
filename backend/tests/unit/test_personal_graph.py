from uuid import uuid4

import networkx as nx

from app.domain.ontology.concepts import (
    ConceptKind,
    ConceptNode,
    ConceptScope,
    Granularity,
)
from app.domain.ontology.edges import ConceptEdgeData, ConceptEdgeType
from app.domain.personal_graph.builder import (
    PersonalConceptStats,
    PersonalGraphNode,
    build_personal_graph,
)
from app.schemas.personal_graph import PersonalGraphNodeOut


def test_node_carries_only_understanding_as_learning_state():
    # Spec: "a single quantitative learning-state measurement" — no
    # familiarity/confidence/mastery_confidence/evidence_strength/fragility/
    # readiness fields anywhere on the node or its API schema.
    removed = {
        "mastery",
        "familiarity",
        "confidence",
        "mastery_confidence",
        "evidence_strength",
        "fragility",
        "readiness",
    }
    node_fields = set(PersonalGraphNode.__dataclass_fields__)
    schema_fields = set(PersonalGraphNodeOut.model_fields)
    assert not (removed & node_fields)
    assert not (removed & schema_fields)
    assert "understanding" in node_fields
    assert "understanding" in schema_fields


def _concept(course_id, name, scope=ConceptScope.COURSE, owner=None) -> ConceptNode:
    return ConceptNode(
        id=uuid4(),
        course_id=course_id,
        canonical_name=name,
        normalized_name=name.lower(),
        concept_kind=ConceptKind.DEFINITION,
        granularity=Granularity.CORE,
        importance=0.5,
        scope=scope,
        owner_student_id=owner,
    )


def test_personal_concept_from_student_notes_is_included():
    course_id = uuid4()
    student_id = uuid4()
    personal_concept = _concept(
        course_id,
        "Random Fourier Features",
        scope=ConceptScope.PERSONAL,
        owner=student_id,
    )

    result = build_personal_graph(
        course_concepts={},
        personal_concepts={personal_concept.id: personal_concept},
        course_prereq_graph=nx.DiGraph(),
        course_edges=[],
        student_edges=[],
        stats_by_concept={},
    )

    node_ids = {n.concept_id for n in result.nodes}
    assert personal_concept.id in node_ids
    included_node = next(n for n in result.nodes if n.concept_id == personal_concept.id)
    assert included_node.scope == ConceptScope.PERSONAL


def test_personal_concept_does_not_appear_in_course_concepts():
    # Personal concepts are never silently promoted into the canonical
    # `course_concepts` map — they stay a separate, student-owned scope.
    course_id = uuid4()
    student_id = uuid4()
    personal_concept = _concept(
        course_id,
        "Random Fourier Features",
        scope=ConceptScope.PERSONAL,
        owner=student_id,
    )

    course_concepts: dict = {}
    build_personal_graph(
        course_concepts=course_concepts,
        personal_concepts={personal_concept.id: personal_concept},
        course_prereq_graph=nx.DiGraph(),
        course_edges=[],
        student_edges=[],
        stats_by_concept={},
    )
    assert personal_concept.id not in course_concepts


def test_unseen_irrelevant_course_concept_is_excluded_by_default():
    course_id = uuid4()
    encountered = _concept(course_id, "Kernel Function")
    irrelevant = _concept(course_id, "Unrelated Syllabus Topic")

    stats = {
        encountered.id: PersonalConceptStats(
            understanding=0.6,
            positive_evidence=2.0,
            negative_evidence=0.5,
        )
    }

    result = build_personal_graph(
        course_concepts={encountered.id: encountered, irrelevant.id: irrelevant},
        personal_concepts={},
        course_prereq_graph=nx.DiGraph(),
        course_edges=[],
        student_edges=[],
        stats_by_concept=stats,
    )

    node_ids = {n.concept_id for n in result.nodes}
    assert encountered.id in node_ids
    assert irrelevant.id not in node_ids
    assert result.hidden_concept_count == 1


def test_two_students_produce_different_personal_graphs():
    course_id = uuid4()
    shared_concept = _concept(course_id, "Kernel Function")

    student_a_stats = {
        shared_concept.id: PersonalConceptStats(
            understanding=0.8,
            positive_evidence=3.0,
            negative_evidence=0.2,
        )
    }
    student_b_stats: dict = {}  # student B has no evidence for this concept at all

    result_a = build_personal_graph(
        course_concepts={shared_concept.id: shared_concept},
        personal_concepts={},
        course_prereq_graph=nx.DiGraph(),
        course_edges=[],
        student_edges=[],
        stats_by_concept=student_a_stats,
    )
    result_b = build_personal_graph(
        course_concepts={shared_concept.id: shared_concept},
        personal_concepts={},
        course_prereq_graph=nx.DiGraph(),
        course_edges=[],
        student_edges=[],
        stats_by_concept=student_b_stats,
    )

    assert {n.concept_id for n in result_a.nodes} != {
        n.concept_id for n in result_b.nodes
    }


def test_course_edges_only_included_when_both_endpoints_present():
    course_id = uuid4()
    a = _concept(course_id, "A")
    b = _concept(course_id, "B")  # not encountered, not adjacent -> excluded

    edge = ConceptEdgeData(
        id=uuid4(),
        course_id=course_id,
        source_concept_id=a.id,
        target_concept_id=b.id,
        edge_type=ConceptEdgeType.PREREQUISITE_FOR,
        confidence=0.9,
        authority_weight=0.9,
    )

    stats = {
        a.id: PersonalConceptStats(
            understanding=0.6,
            positive_evidence=2.0,
            negative_evidence=0.1,
        )
    }

    prereq_graph = nx.DiGraph()
    prereq_graph.add_edge(a.id, b.id)

    result = build_personal_graph(
        course_concepts={a.id: a, b.id: b},
        personal_concepts={},
        course_prereq_graph=prereq_graph,
        course_edges=[edge],
        student_edges=[],
        stats_by_concept=stats,
    )

    # b becomes a frontier neighbor of a (direct successor), so it IS
    # included, and the edge should appear connecting them.
    node_ids = {n.concept_id for n in result.nodes}
    assert a.id in node_ids and b.id in node_ids
    assert any(e.source == a.id and e.target == b.id for e in result.edges)
