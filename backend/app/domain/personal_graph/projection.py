"""One answer to "what is the state of this concept for this student".

Every surface that shows a concept (the knowledge graph, the island, study
plans) reads the same metrics from here. Readiness and fragility are
graph-derived from prerequisite understanding, as the gap engine defines
them; confidence saturates with the amount of scored evidence; the state
label comes from `classify_concept_state`. Nothing here touches a database.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol
from uuid import UUID

from app.domain.gaps.prerequisite_support import PrerequisiteLink, compute_prerequisite_understanding_support
from app.domain.ontology.edges import ConceptEdgeType
from app.domain.personal_graph.builder import PersonalGraphResult
from app.domain.personal_graph.concept_state import ConceptState, classify_concept_state

SemanticState = Literal["frontier", "exposed", "struggling", "developing", "strong", "mastered", "stale"]

# The island speaks a smaller vocabulary than the graph. Low-confidence
# adequacy reads as merely seen; a strong score on weak foundations reads as
# struggling, because that is what the student will experience.
_TO_SEMANTIC: dict[ConceptState, SemanticState] = {
    ConceptState.FRONTIER: "frontier",
    ConceptState.EXPOSED: "exposed",
    ConceptState.UNCERTAIN: "exposed",
    ConceptState.STRUGGLING: "struggling",
    ConceptState.DEVELOPING: "developing",
    ConceptState.STRONG: "strong",
    ConceptState.MASTERED: "mastered",
    ConceptState.FRAGILE: "struggling",
    ConceptState.STALE: "stale",
}

# Weights from docs/architecture.md: readiness leans on the concept itself,
# with prerequisite support as the second term.
_READINESS_SELF_WEIGHT = 0.65


class EvidenceTotals(Protocol):
    positive_evidence: float
    negative_evidence: float
    last_practiced_at: datetime | None


@dataclass(frozen=True)
class ConceptMetrics:
    understanding: float | None
    confidence: float
    fragility: float
    readiness: float
    prerequisite_support: float | None
    state: ConceptState

    @property
    def semantic_state(self) -> SemanticState:
        return _TO_SEMANTIC[self.state]


def to_semantic_state(state: ConceptState) -> SemanticState:
    return _TO_SEMANTIC[state]


def confidence_from_evidence(positive: float, negative: float) -> float:
    """Saturating confidence in the estimate: one unit of evidence is 0.5, ten is 0.91."""

    total = float(positive) + float(negative)
    return total / (total + 1.0) if total > 0 else 0.0


def prerequisites_by_concept(graph: PersonalGraphResult) -> dict[UUID, list[PrerequisiteLink]]:
    links: dict[UUID, list[PrerequisiteLink]] = {}
    for edge in graph.edges:
        if edge.edge_type != ConceptEdgeType.PREREQUISITE_FOR.value:
            continue
        links.setdefault(edge.target, []).append(
            PrerequisiteLink(prerequisite_concept_id=edge.source, edge_confidence=edge.confidence)
        )
    return links


def project_graph(
    graph: PersonalGraphResult,
    totals: dict[UUID, EvidenceTotals],
    *,
    staleness_days: float = 45.0,
) -> dict[UUID, ConceptMetrics]:
    """Metrics and state for every node of a student's personal graph."""

    understanding_by_concept = {n.concept_id: n.understanding for n in graph.nodes}
    prereqs = prerequisites_by_concept(graph)
    metrics: dict[UUID, ConceptMetrics] = {}
    for node in graph.nodes:
        total = totals.get(node.concept_id)
        support = compute_prerequisite_understanding_support(prereqs.get(node.concept_id, []), understanding_by_concept)
        understanding = node.understanding
        confidence = confidence_from_evidence(total.positive_evidence, total.negative_evidence) if total else 0.0
        if understanding is None or support is None:
            fragility = 0.0
            readiness = understanding or 0.0
        else:
            fragility = understanding * (1.0 - support)
            readiness = _READINESS_SELF_WEIGHT * understanding + (1.0 - _READINESS_SELF_WEIGHT) * support
        state = classify_concept_state(
            discovery_state=node.discovery_state,
            mastery=understanding,
            confidence=confidence,
            fragility=fragility,
            last_practiced_at=total.last_practiced_at if total else None,
            staleness_days=staleness_days,
        )
        metrics[node.concept_id] = ConceptMetrics(
            understanding=understanding,
            confidence=confidence,
            fragility=fragility,
            readiness=readiness,
            prerequisite_support=support,
            state=state,
        )
    return metrics
