"""API DTO for `GET /api/courses/{course_id}/students/{student_id}/knowledge-graph`."""

from uuid import UUID

from pydantic import BaseModel

from app.domain.ontology.concepts import ConceptScope
from app.domain.personal_graph.concept_state import ConceptState
from app.domain.personal_graph.discovery import DiscoveryState


class PersonalGraphNodeOut(BaseModel):
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
    state: ConceptState


class PersonalGraphEdgeOut(BaseModel):
    source: UUID
    target: UUID
    edge_type: str
    origin: str
    confidence: float


class PersonalGraphResponse(BaseModel):
    student_id: UUID
    course_id: UUID
    nodes: list[PersonalGraphNodeOut]
    edges: list[PersonalGraphEdgeOut]
    hidden_concept_count: int
