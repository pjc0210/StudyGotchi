from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.config import get_settings
from app.domain.world.projection import project_world
from app.pipelines.personal_graph_query import build_student_personal_graph
from app.repositories.courses import get_course
from app.repositories.student_states import get_student_concept_states
from app.repositories.world import get_world_events
from app.schemas.world import WorldResponse

router = APIRouter(
    prefix="/api/courses/{course_id}/students/{student_id}", tags=["world"]
)


@router.get("/world", response_model=WorldResponse)
async def get_world(
    course_id: UUID, student_id: UUID, session: AsyncSession = Depends(get_db)
):
    if await get_course(session, course_id) is None:
        raise HTTPException(404, "Course not found")
    graph = await build_student_personal_graph(
        session, course_id=course_id, student_id=student_id
    )
    states = await get_student_concept_states(
        session, student_id=student_id, course_id=course_id
    )
    payload = project_world(
        graph,
        last_practiced={cid: s.last_practiced_at for cid, s in states.items()},
        last_evidence={cid: s.last_evidence_at for cid, s in states.items()},
        staleness_days=get_settings().staleness_days,
    )
    return WorldResponse(student_id=student_id, course_id=course_id, **payload)


@router.get("/world-events")
async def world_events(
    course_id: UUID,
    student_id: UUID,
    since: datetime | None = None,
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
):
    if await get_course(session, course_id) is None:
        raise HTTPException(404, "Course not found")
    return {
        "events": await get_world_events(
            session,
            course_id=course_id,
            student_id=student_id,
            since=since,
            limit=limit,
        )
    }
