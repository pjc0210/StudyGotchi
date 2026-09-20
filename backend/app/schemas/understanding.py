"""API DTO for `GET /api/courses/{course_id}/students/{student_id}/understanding`
(spec: "single quantitative learning-state measurement")."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.domain.personal_graph.discovery import DiscoveryState


class UnderstandingEntryOut(BaseModel):
    concept_id: UUID
    name: str
    discovery_state: DiscoveryState
    understanding: float | None
    positive_evidence: float
    negative_evidence: float
    last_evidence_at: datetime | None
    last_practiced_at: datetime | None


class UnderstandingResponse(BaseModel):
    student_id: UUID
    course_id: UUID
    concepts: list[UnderstandingEntryOut]
