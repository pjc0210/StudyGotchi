"""Personal knowledge graph builder (spec: "Personal knowledge graph").

`G_s = (V_s, E_s)` is derived from the canonical course ontology + student
evidence + student resources + personal concepts + student-specific edges +
current learning goals. It references canonical concept IDs directly rather
than cloning the course graph per student — only per-student *state*
(mastery/familiarity/discovery) and per-student *extensions* (personal
concepts/edges) are student-specific.
"""

from dataclasses import dataclass, field
from uuid import UUID

import networkx as nx

from app.domain.ontology.concepts import ConceptNode, ConceptScope
from app.domain.ontology.edges import ConceptEdgeData, ConceptEdgeType
from app.domain.personal_graph.discovery import DiscoveryState, classify_discovery_state
from app.domain.personal_graph.frontier import (
    compute_frontier_neighbors,
    compute_goal_frontier,
)
from app.domain.personal_graph.personal_edges import StudentConceptEdgeCandidate


@dataclass
class PersonalConceptStats:
    """Per-concept computed state, assembled upstream by the mastery/gaps
    pipeline. Kept as a separate struct (rather than mutating `ConceptNode`)
    so canonical concept data and per-student state never get conflated.
    """

    mastery: float | None
    familiarity: float
    confidence: float
    readiness: float
    fragility: float
    positive_evidence: float
    negative_evidence: float


@dataclass
class PersonalGraphNode:
    concept_id: UUID
    name: str
    scope: ConceptScope
    discovery_state: DiscoveryState
    importance: float
    personal_relevance: float
    mastery: float | None
    familiarity: float
    confidence: float
    readiness: float
    fragility: float


@dataclass
class PersonalGraphEdge:
    source: UUID
    target: UUID
    edge_type: str
    origin: str  # "course" | "personal"
    confidence: float


@dataclass
class PersonalGraphResult:
    nodes: list[PersonalGraphNode] = field(default_factory=list)
    edges: list[PersonalGraphEdge] = field(default_factory=list)
    hidden_concept_count: int = 0


def build_personal_graph(
    *,
    course_concepts: dict[UUID, ConceptNode],
    personal_concepts: dict[UUID, ConceptNode],
    course_prereq_graph: nx.DiGraph,
    course_edges: list[ConceptEdgeData],
    student_edges: list[StudentConceptEdgeCandidate],
    stats_by_concept: dict[UUID, PersonalConceptStats],
    goal_concept_ids: set[UUID] = frozenset(),
    encountered_evidence_threshold: float = 0.5,
    active_evidence_threshold: float = 2.0,
    active_familiarity_threshold: float = 0.6,
) -> PersonalGraphResult:
    # Node-inclusion rule 1-3: concepts with any evidence, familiarity, or
    # personal material. Rule 6 (personal concepts) is handled by unioning in
    # every key of `personal_concepts` unconditionally below.
    known_concept_ids: set[UUID] = {
        concept_id
        for concept_id, stats in stats_by_concept.items()
        if stats.positive_evidence + stats.negative_evidence > 0 or stats.familiarity > 0
    }
    known_concept_ids |= set(personal_concepts.keys())

    # Node-inclusion rule 4: immediate prerequisite/frontier neighbors.
    frontier_neighbor_ids = compute_frontier_neighbors(course_prereq_graph, known_concept_ids)
    # Node-inclusion rule 5: concepts required for an explicit learning goal.
    goal_frontier_ids = compute_goal_frontier(course_prereq_graph, known_concept_ids, goal_concept_ids)

    included_concept_ids = known_concept_ids | frontier_neighbor_ids | goal_frontier_ids

    nodes: list[PersonalGraphNode] = []
    for concept_id in included_concept_ids:
        concept = course_concepts.get(concept_id) or personal_concepts.get(concept_id)
        if concept is None:
            continue  # referenced by an edge/goal we don't have concept data for

        stats = stats_by_concept.get(concept_id)
        is_frontier_neighbor = concept_id in frontier_neighbor_ids or concept_id in goal_frontier_ids
        is_learning_goal_ancestor = concept_id in goal_frontier_ids

        if stats is None:
            discovery_state = (
                DiscoveryState.FRONTIER
                if (is_frontier_neighbor or is_learning_goal_ancestor)
                else DiscoveryState.UNSEEN
            )
            mastery = None
            familiarity = confidence = readiness = fragility = 0.0
        else:
            discovery_state = classify_discovery_state(
                effective_evidence=stats.positive_evidence + stats.negative_evidence,
                familiarity=stats.familiarity,
                is_frontier_neighbor=is_frontier_neighbor,
                is_learning_goal_ancestor=is_learning_goal_ancestor,
                encountered_evidence_threshold=encountered_evidence_threshold,
                active_evidence_threshold=active_evidence_threshold,
                active_familiarity_threshold=active_familiarity_threshold,
            )
            mastery = stats.mastery
            familiarity = stats.familiarity
            confidence = stats.confidence
            readiness = stats.readiness
            fragility = stats.fragility

        personal_relevance = 1.0 if concept.scope != ConceptScope.COURSE else min(
            1.0, familiarity + (mastery or 0.0)
        )

        nodes.append(
            PersonalGraphNode(
                concept_id=concept_id,
                name=concept.canonical_name,
                scope=concept.scope,
                discovery_state=discovery_state,
                importance=concept.importance,
                personal_relevance=personal_relevance,
                mastery=mastery,
                familiarity=familiarity,
                confidence=confidence,
                readiness=readiness,
                fragility=fragility,
            )
        )

    included_ids_set = {n.concept_id for n in nodes}

    edges: list[PersonalGraphEdge] = []
    for edge in course_edges:
        if edge.status != "active":
            continue
        if edge.source_concept_id in included_ids_set and edge.target_concept_id in included_ids_set:
            edges.append(
                PersonalGraphEdge(
                    source=edge.source_concept_id,
                    target=edge.target_concept_id,
                    edge_type=edge.edge_type.value
                    if isinstance(edge.edge_type, ConceptEdgeType)
                    else edge.edge_type,
                    origin="course",
                    confidence=edge.confidence,
                )
            )

    for student_edge in student_edges:
        if (
            student_edge.source_concept_id in included_ids_set
            and student_edge.target_concept_id in included_ids_set
        ):
            edges.append(
                PersonalGraphEdge(
                    source=student_edge.source_concept_id,
                    target=student_edge.target_concept_id,
                    edge_type=student_edge.edge_type.value,
                    origin="personal",
                    confidence=student_edge.confidence,
                )
            )

    total_course_concepts = len(course_concepts)
    included_course_concepts = len(
        {n.concept_id for n in nodes if n.scope == ConceptScope.COURSE}
    )
    hidden_concept_count = max(0, total_course_concepts - included_course_concepts)

    return PersonalGraphResult(nodes=nodes, edges=edges, hidden_concept_count=hidden_concept_count)
