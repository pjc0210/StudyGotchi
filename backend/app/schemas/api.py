"""Miscellaneous request/response DTOs not tied to one domain schema file."""

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


class ResourceIngestResponse(BaseModel):
    resource_id: UUID
    status: str
    concepts_created: int
    concepts_merged: int
    edges_created: int
    assessment_items_created: int = 0


class StudentResourceIngestResponse(BaseModel):
    resource_id: UUID
    status: str
    evidence_events_created: int
    concepts_touched: list[UUID]
    personal_concepts_created: int = 0


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
