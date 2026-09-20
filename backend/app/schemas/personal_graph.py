"""API DTO for `GET /api/courses/{course_id}/students/{student_id}/knowledge-graph`."""

from uuid import UUID

from pydantic import BaseModel

from app.domain.ontology.concepts import ConceptScope
from app.domain.personal_graph.discovery import DiscoveryState
from app.schemas.numbers import ApiFloat, OptionalApiFloat


class PersonalGraphNodeOut(BaseModel):
    concept_id: UUID
    name: str
    scope: ConceptScope
    discovery_state: DiscoveryState
    importance: ApiFloat
    personal_relevance: ApiFloat
    mastery: OptionalApiFloat
    familiarity: ApiFloat
    confidence: ApiFloat
    readiness: ApiFloat
    fragility: ApiFloat


class PersonalGraphEdgeOut(BaseModel):
    source: UUID
    target: UUID
    edge_type: str
    origin: str
    confidence: ApiFloat


class PersonalGraphResponse(BaseModel):
    student_id: UUID
    course_id: UUID
    nodes: list[PersonalGraphNodeOut]
    edges: list[PersonalGraphEdgeOut]
    hidden_concept_count: int
