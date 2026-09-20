"""`GET .../knowledge-graph` (spec: "Required backend endpoints"). The
primary semantic product endpoint — a separate frontend/world system
consumes this, never the raw canonical ontology.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, require_student
from app.pipelines.personal_graph_query import build_student_personal_graph
from app.repositories.courses import get_course
from app.schemas.personal_graph import (
    PersonalGraphEdgeOut,
    PersonalGraphNodeOut,
    PersonalGraphResponse,
)

router = APIRouter(prefix="/api/courses/{course_id}/students/{student_id}", tags=["personal-graph"])


@router.get("/knowledge-graph", response_model=PersonalGraphResponse)
async def get_knowledge_graph_endpoint(
    course_id: UUID,
    student_id: UUID,
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(require_student),
) -> PersonalGraphResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    graph = await build_student_personal_graph(session, course_id=course_id, student_id=student_id)

    return PersonalGraphResponse(
        student_id=student_id,
        course_id=course_id,
        nodes=[
            PersonalGraphNodeOut(
                concept_id=n.concept_id,
                name=n.name,
                scope=n.scope,
                discovery_state=n.discovery_state,
                importance=n.importance,
                personal_relevance=n.personal_relevance,
                mastery=n.mastery,
                familiarity=n.familiarity,
                confidence=n.confidence,
                readiness=n.readiness,
                fragility=n.fragility,
            )
            for n in graph.nodes
        ],
        edges=[
            PersonalGraphEdgeOut(source=e.source, target=e.target, edge_type=e.edge_type, origin=e.origin, confidence=e.confidence)
            for e in graph.edges
        ],
        hidden_concept_count=graph.hidden_concept_count,
    )
