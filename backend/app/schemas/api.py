"""Miscellaneous request/response DTOs not tied to one domain schema file."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.domain.gaps.scoring import GapAction


class CourseCreateRequest(BaseModel):
    name: str
    code: str | None = None
    term: str | None = None


class CourseOut(BaseModel):
    id: UUID
    name: str
    code: str | None
    term: str | None


class MeOut(BaseModel):
    student_id: UUID
    courses: list[CourseOut]


class ResourceIngestResponse(BaseModel):
    resource_id: UUID
    status: str
    concepts_created: int
    concepts_merged: int
    edges_created: int
    assessment_items_created: int = 0
    # Set when a ZIP archive expanded into several member documents.
    child_count: int | None = None
    child_failures: list[str] = Field(default_factory=list)


class StudentResourceIngestResponse(BaseModel):
    resource_id: UUID
    # unchanged (same bytes seen before), matched (fast phase done, deep analysis queued), processed
    status: str
    evidence_events_created: int
    concepts_touched: list[UUID]
    personal_concepts_created: int = 0
    # queued when the deep analysis runs after this response, none when nothing is left to do
    analysis: str = "none"
    child_count: int | None = None
    child_failures: list[str] = Field(default_factory=list)


class ResourceStatusOut(BaseModel):
    resource_id: UUID
    title: str
    origin: str
    artifact_type: str
    # parsing, matched, analyzing, processed, failed, unchanged, empty
    status: str
    error: str | None = None
    phase_a_ms: int | None = None
    phase_b_ms: int | None = None
    created_at: datetime
    updated_at: datetime


class ResourceOut(BaseModel):
    """One ingested file, for the Files view."""

    id: UUID
    title: str
    origin: str
    artifact_type: str
    status: str
    concept_count: int
    # Concepts this resource is linked to, so a client can draw the
    # resource-to-concept relationships without a request per concept.
    concept_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime | None = None


class EvidenceOut(BaseModel):
    """One evidence event behind a concept's understanding."""

    id: UUID
    evidence_type: str
    outcome: float | None
    strength: float
    certainty: float
    occurred_at: datetime
    resource: ResourceOut | None = None
    assessment_item_id: UUID | None = None


class CitationOut(BaseModel):
    chunk_id: UUID | None = None
    page_number: int | None = None
    snippet: str | None = None
    link_type: str


class ConceptResourceOut(BaseModel):
    """A file that teaches or assesses the concept, with where in it."""

    resource: ResourceOut
    link_type: str
    depth_score: float
    rank_score: float | None = None
    novelty: float | None = None
    citations: list[CitationOut] = Field(default_factory=list)


class ConceptRelationshipOut(BaseModel):
    source: UUID
    target: UUID
    edge_type: str
    status: str
    confidence: float
    resource_id: UUID | None = None
    page_number: int | None = None
    snippet: str | None = None


class ConceptAssessmentOut(BaseModel):
    assessment_id: UUID
    item_id: UUID
    title: str
    label: str


class ConceptDetailResponse(BaseModel):
    """Everything an inspector shows about one concept: the student's evidence,
    the files that teach it (ranked, deduplicated), relationships, and the
    assessment items that test it."""

    concept_id: UUID
    name: str
    definition: str | None = None
    scope: str
    aliases: list[str] = Field(default_factory=list)
    evidence: list[EvidenceOut]
    resources: list[ConceptResourceOut]
    relationships: list[ConceptRelationshipOut] = Field(default_factory=list)
    assessments: list[ConceptAssessmentOut] = Field(default_factory=list)
    suppressed_resource_count: int = 0


class GapOut(BaseModel):
    concept_id: UUID
    name: str
    understanding: float
    priority: float
    action: GapAction
    reason: str


class GapsResponse(BaseModel):
    student_id: UUID
    course_id: UUID
    target_concept_id: UUID | None
    target_assessment_id: UUID | None
    gaps: list[GapOut]


class StudyPlanRequest(BaseModel):
    target_concept_id: UUID | None = None
    assessment_id: UUID | None = None

    @model_validator(mode="after")
    def _exactly_one_target(self) -> "StudyPlanRequest":
        if bool(self.target_concept_id) == bool(self.assessment_id):
            raise ValueError(
                "Provide exactly one of target_concept_id or assessment_id."
            )
        return self


class StudyPlanResponse(BaseModel):
    student_id: UUID
    course_id: UUID
    target_concept_id: UUID
    gaps: list[GapOut]
    study_order: list[UUID] = Field(
        ..., description="Concept IDs in recommended study order."
    )
