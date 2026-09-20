from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from app.domain.ontology.concepts import ConceptScope
from app.domain.personal_graph.builder import PersonalGraphEdge, PersonalGraphNode, PersonalGraphResult
from app.domain.personal_graph.concept_state import ConceptState
from app.domain.personal_graph.discovery import DiscoveryState
from app.domain.personal_graph.projection import confidence_from_evidence, project_graph, to_semantic_state
from app.domain.world.projection import project_world


@dataclass
class Totals:
    positive_evidence: float
    negative_evidence: float
    last_practiced_at: datetime | None = None


def node(understanding, discovery=DiscoveryState.ACTIVE):
    return PersonalGraphNode(
        concept_id=uuid4(),
        name="c",
        scope=ConceptScope.COURSE,
        discovery_state=discovery,
        importance=0.5,
        personal_relevance=0.5,
        understanding=understanding,
    )


def test_confidence_saturates_with_evidence():
    assert confidence_from_evidence(0, 0) == 0.0
    assert confidence_from_evidence(1, 0) == 0.5
    assert confidence_from_evidence(9, 1) > 0.9


def test_readiness_and_fragility_come_from_prerequisites():
    weak_prereq = node(0.2)
    strong = node(0.9)
    graph = PersonalGraphResult(
        nodes=[weak_prereq, strong],
        edges=[
            PersonalGraphEdge(
                source=weak_prereq.concept_id,
                target=strong.concept_id,
                edge_type="PREREQUISITE_FOR",
                origin="course",
                confidence=1.0,
            )
        ],
        hidden_concept_count=0,
    )
    totals = {n.concept_id: Totals(4, 0, datetime.now(UTC)) for n in graph.nodes}
    metrics = project_graph(graph, totals)
    m = metrics[strong.concept_id]
    assert m.prerequisite_support == 0.2
    assert m.fragility == 0.9 * 0.8
    assert m.readiness == 0.65 * 0.9 + 0.35 * 0.2
    # Strong score on a weak foundation is fragile in the graph and struggling on the island.
    assert m.state is ConceptState.FRAGILE
    assert to_semantic_state(m.state) == "struggling"
    root = metrics[weak_prereq.concept_id]
    assert root.prerequisite_support is None and root.fragility == 0.0 and root.readiness == 0.2


def test_world_reads_the_same_state_as_the_graph():
    a = node(0.9)
    graph = PersonalGraphResult(nodes=[a], edges=[], hidden_concept_count=0)
    totals = {a.concept_id: Totals(0.4, 0, datetime.now(UTC))}
    metrics = project_graph(graph, totals)
    assert metrics[a.concept_id].state is ConceptState.UNCERTAIN
    world = project_world(graph, metrics=metrics)
    assert world["regions"][0]["semantic_state"] == "exposed"
    plain = project_world(graph)
    assert plain["regions"][0]["semantic_state"] == "mastered"
