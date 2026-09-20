from uuid import uuid4

from app.domain.graph.reduction import clean_prerequisite_edges
from app.domain.ontology.edges import ConceptEdgeData, ConceptEdgeType


def _edge(source, target, confidence=0.9, authority=0.9):
    return ConceptEdgeData(
        id=uuid4(),
        course_id=uuid4(),
        source_concept_id=source,
        target_concept_id=target,
        edge_type=ConceptEdgeType.PREREQUISITE_FOR,
        confidence=confidence,
        authority_weight=authority,
    )


def test_redundant_transitive_edge_is_suppressed_from_display():
    a, b, c = uuid4(), uuid4(), uuid4()
    edge_ab = _edge(a, b)
    edge_bc = _edge(b, c)
    edge_ac = _edge(a, c)  # implied by a->b->c, adds nothing

    result = clean_prerequisite_edges([edge_ab, edge_bc, edge_ac])

    assert edge_ac.id in result.redundant_edge_ids
    assert edge_ab.id not in result.redundant_edge_ids
    assert edge_bc.id not in result.redundant_edge_ids
    assert (a, c) not in set(result.reduced_graph.edges)
    assert (a, b) in set(result.reduced_graph.edges)


def test_cycle_is_broken_by_removing_lowest_confidence_edge():
    a, b, c = uuid4(), uuid4(), uuid4()
    edge_ab = _edge(a, b, confidence=0.9)
    edge_bc = _edge(b, c, confidence=0.85)
    edge_ca = _edge(c, a, confidence=0.4)  # weakest edge in the cycle

    result = clean_prerequisite_edges([edge_ab, edge_bc, edge_ca])

    assert edge_ca.id in result.cycle_broken_edge_ids
    assert edge_ab.id not in result.cycle_broken_edge_ids
    assert edge_bc.id not in result.cycle_broken_edge_ids
    # what remains must be acyclic
    import networkx as nx

    assert nx.is_directed_acyclic_graph(result.reduced_graph)


def test_self_edges_are_dropped():
    a = uuid4()
    self_edge = _edge(a, a)
    result = clean_prerequisite_edges([self_edge])
    assert not result.reduced_graph.has_edge(a, a)
