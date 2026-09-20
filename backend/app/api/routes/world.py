"""`GET .../world` and `GET .../world-events` (spec: "World contracts").

The world is a pure projection of the personal graph; the site polls it after
an upload, so the response carries an ETag and honours `If-None-Match`.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, require_student
from app.api.etag import etag_matches, not_modified, set_etag
from app.config import get_settings
from app.domain.personal_graph.projection import project_graph
from app.domain.world.projection import project_world
from app.pipelines.personal_graph_query import build_student_personal_graph
from app.repositories.courses import get_course
from app.repositories.student_states import get_student_concept_states
from app.repositories.world import get_world_events
from app.schemas.world import WorldEventsResponse, WorldResponse

router = APIRouter(prefix="/api/courses/{course_id}/students/{student_id}", tags=["world"])


async def build_world(session: AsyncSession, *, course_id: UUID, student_id: UUID) -> WorldResponse:
    graph = await build_student_personal_graph(session, course_id=course_id, student_id=student_id)
    states = await get_student_concept_states(session, student_id=student_id, course_id=course_id)
    staleness_days = get_settings().staleness_days
    payload = project_world(
        graph,
        last_practiced={cid: s.last_practiced_at for cid, s in states.items()},
        last_evidence={cid: s.last_evidence_at for cid, s in states.items()},
        staleness_days=staleness_days,
        metrics=project_graph(graph, states, staleness_days=staleness_days),
    )
    return WorldResponse(student_id=student_id, course_id=course_id, **payload)


@router.get("/world", response_model=WorldResponse)
async def get_world(
    course_id: UUID,
    student_id: UUID,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(require_student),
):
    if await get_course(session, course_id) is None:
        raise HTTPException(404, "Course not found")
    world = await build_world(session, course_id=course_id, student_id=student_id)
    if etag_matches(request, world.world_version):
        return not_modified(world.world_version)
    set_etag(response, world.world_version)
    return world


@router.get("/world-events", response_model=WorldEventsResponse)
async def world_events(
    course_id: UUID,
    student_id: UUID,
    since: datetime | None = None,
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(require_student),
):
    if await get_course(session, course_id) is None:
        raise HTTPException(404, "Course not found")
    return WorldEventsResponse(
        events=await get_world_events(session, course_id=course_id, student_id=student_id, since=since, limit=limit)
    )
