"""API DTOs for `GET /api/courses/{course_id}/ontology`."""

from uuid import UUID

from pydantic import BaseModel

from app.domain.ontology.concepts import ConceptKind, ConceptScope, Granularity
from app.domain.ontology.edges import ConceptEdgeType


class ConceptOut(BaseModel):
    id: UUID
    canonical_name: str
    short_definition: str | None
    concept_kind: ConceptKind
    granularity: Granularity
    importance: float
    scope: ConceptScope


class ConceptEdgeOut(BaseModel):
    id: UUID
    source_concept_id: UUID
    target_concept_id: UUID
    edge_type: ConceptEdgeType
    confidence: float
    authority_weight: float
    status: str
    is_redundant_in_display_graph: bool = False


class OntologyResponse(BaseModel):
    course_id: UUID
    concepts: list[ConceptOut]
    edges: list[ConceptEdgeOut]
