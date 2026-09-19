"""API DTO for `GET /api/courses/{course_id}/students/{student_id}/mastery`."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.domain.personal_graph.discovery import DiscoveryState


class MasteryEntryOut(BaseModel):
    concept_id: UUID
    name: str
    discovery_state: DiscoveryState
    mastery: float
    familiarity: float
    confidence: float
    readiness: float
    fragility: float
    positive_evidence: float
    negative_evidence: float
    last_evidence_at: datetime | None
    last_practiced_at: datetime | None


class MasteryResponse(BaseModel):
    student_id: UUID
    course_id: UUID
    concepts: list[MasteryEntryOut]
