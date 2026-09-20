from datetime import UTC, datetime
from uuid import uuid4

from app.domain.ontology.concepts import ConceptScope
from app.domain.personal_graph.builder import PersonalGraphNode, PersonalGraphResult
from app.domain.personal_graph.discovery import DiscoveryState
from app.domain.world.projection import project_world
from app.schemas.world import WorldResponse


def node(**kwargs):
    values = {
        "concept_id": uuid4(),
        "name": "Inner Products",
        "scope": ConceptScope.COURSE,
        "discovery_state": DiscoveryState.ACTIVE,
        "importance": 0.8,
        "personal_relevance": 0.7,
        "understanding": 0.9,
    }
    return PersonalGraphNode(**(values | kwargs))


def test_terrain_is_personal_semantic_state_and_stable_for_same_input():
    n = node()
    graph = PersonalGraphResult(nodes=[n], hidden_concept_count=12)
    now = datetime(2026, 9, 19, tzinfo=UTC)
    result = project_world(graph, now=now, last_evidence={n.concept_id: now})
    assert result == project_world(graph, now=now, last_evidence={n.concept_id: now})
    region = result["regions"][0]
    assert region["terrain_height"] == 0.9
    assert region["terrain_area"] == 0.8 * 0.7
    assert region["creature_state"] == "ascended"
    WorldResponse(student_id=uuid4(), course_id=uuid4(), **result)


def test_unknown_understanding_does_not_render_as_fifty_percent_mountain():
    result = project_world(
        PersonalGraphResult(
            nodes=[
                node(
                    understanding=None,
                    discovery_state=DiscoveryState.FRONTIER,
                )
            ]
        )
    )
    assert result["regions"][0]["terrain_height"] == 0.05
    assert result["regions"][0]["creature_state"] == "unhatched"


def test_unseen_concepts_are_not_terrain():
    assert (
        project_world(
            PersonalGraphResult(nodes=[node(discovery_state=DiscoveryState.UNSEEN)])
        )["regions"]
        == []
    )
