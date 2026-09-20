from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.personal_graph import PersonalGraphEdgeOut

UnitFloat = Annotated[float, Field(ge=0, le=1)]


class WorldRegionOut(BaseModel):
    concept_id: UUID
    name: str
    cluster_id: str | None = None
    cluster: str | None = None
    terrain_height: UnitFloat
    terrain_area: UnitFloat
    fog: UnitFloat
    semantic_state: Literal[
        "frontier",
        "exposed",
        "struggling",
        "developing",
        "strong",
        "mastered",
        "stale",
    ]
    creature_state: Literal[
        "unhatched", "weak", "evolved", "ascended", "sleepy", "normal"
    ]


class WorldResponse(BaseModel):
    student_id: UUID
    course_id: UUID
    world_version: str
    regions: list[WorldRegionOut]
    edges: list[PersonalGraphEdgeOut]
    hidden_concept_count: int
