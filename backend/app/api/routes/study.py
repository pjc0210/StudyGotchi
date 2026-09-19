"""`GET .../gaps` and `POST .../study-plan` (spec: "Required backend
endpoints"). Both are backed by the same `compute_target_gaps` pipeline.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.pipelines.gap_query import compute_target_gaps
from app.repositories.concepts import get_course_concepts, get_personal_concepts
from app.repositories.courses import get_course
from app.schemas.api import GapOut, GapsResponse, StudyPlanRequest, StudyPlanResponse

router = APIRouter(prefix="/api/courses/{course_id}/students/{student_id}", tags=["study"])


async def _concept_name_lookup(session: AsyncSession, course_id: UUID, student_id: UUID) -> dict[UUID, str]:
    course_concepts = await get_course_concepts(session, course_id)
    personal_concepts = await get_personal_concepts(session, course_id, student_id)
    return {cid: c.canonical_name for cid, c in {**course_concepts, **personal_concepts}.items()}


@router.get("/gaps", response_model=GapsResponse)
async def get_gaps_endpoint(
    course_id: UUID,
    student_id: UUID,
    target_concept_id: UUID | None = None,
    assessment_id: UUID | None = None,
    session: AsyncSession = Depends(get_db),
) -> GapsResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if bool(target_concept_id) == bool(assessment_id):
        raise HTTPException(status_code=400, detail="Provide exactly one of target_concept_id or assessment_id.")

    result = await compute_target_gaps(
        session,
        course_id=course_id,
        student_id=student_id,
        target_concept_id=target_concept_id,
        assessment_id=assessment_id,
    )
    names = await _concept_name_lookup(session, course_id, student_id)

    return GapsResponse(
        student_id=student_id,
        course_id=course_id,
        target_concept_id=target_concept_id,
        target_assessment_id=assessment_id,
        gaps=[
            GapOut(
                concept_id=g.concept_id,
                name=names.get(g.concept_id, "(unknown concept)"),
                mastery=g.mastery,
                confidence=g.confidence,
                priority=g.priority,
                action=g.action,
                reason=g.reason,
            )
            for g in result.gaps
        ],
    )


@router.post("/study-plan", response_model=StudyPlanResponse)
async def post_study_plan_endpoint(
    course_id: UUID, student_id: UUID, body: StudyPlanRequest, session: AsyncSession = Depends(get_db)
) -> StudyPlanResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    result = await compute_target_gaps(
        session,
        course_id=course_id,
        student_id=student_id,
        target_concept_id=body.target_concept_id,
        assessment_id=body.assessment_id,
    )
    if not result.target_concept_ids:
        raise HTTPException(status_code=404, detail="Target has no associated concepts.")

    names = await _concept_name_lookup(session, course_id, student_id)
    primary_target = body.target_concept_id or next(iter(result.target_concept_ids))

    return StudyPlanResponse(
        student_id=student_id,
        course_id=course_id,
        target_concept_id=primary_target,
        gaps=[
            GapOut(
                concept_id=g.concept_id,
                name=names.get(g.concept_id, "(unknown concept)"),
                mastery=g.mastery,
                confidence=g.confidence,
                priority=g.priority,
                action=g.action,
                reason=g.reason,
            )
            for g in result.gaps
        ],
        study_order=result.study_order,
    )
