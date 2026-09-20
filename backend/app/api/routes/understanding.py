"""`GET .../understanding` (spec: "Required backend endpoints").

`/mastery` and `/overlay` remain as compatibility aliases for existing
callers, but their response is the same `understanding`-shaped payload —
there is no separate mastery-shaped response anymore.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, require_student
from app.domain.personal_graph.discovery import DiscoveryState
from app.repositories.concepts import get_course_concepts, get_personal_concepts
from app.repositories.courses import get_course
from app.repositories.student_states import get_student_concept_states
from app.schemas.understanding import UnderstandingEntryOut, UnderstandingResponse

router = APIRouter(
    prefix="/api/courses/{course_id}/students/{student_id}", tags=["understanding"]
)


@router.get("/understanding", response_model=UnderstandingResponse)
@router.get("/mastery", response_model=UnderstandingResponse)
@router.get("/overlay", response_model=UnderstandingResponse)
async def get_understanding_endpoint(
    course_id: UUID,
    student_id: UUID,
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(require_student),
) -> UnderstandingResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    course_concepts = await get_course_concepts(session, course_id)
    personal_concepts = await get_personal_concepts(session, course_id, student_id)
    states = await get_student_concept_states(
        session, student_id=student_id, course_id=course_id
    )

    entries: list[UnderstandingEntryOut] = []
    for concept_id, state in states.items():
        concept = course_concepts.get(concept_id) or personal_concepts.get(concept_id)
        if concept is None:
            continue
        entries.append(
            UnderstandingEntryOut(
                concept_id=concept_id,
                name=concept.canonical_name,
                discovery_state=DiscoveryState(state.discovery_state),
                understanding=float(state.understanding)
                if state.understanding is not None
                else None,
                positive_evidence=float(state.positive_evidence),
                negative_evidence=float(state.negative_evidence),
                last_evidence_at=state.last_evidence_at,
                last_practiced_at=state.last_practiced_at,
            )
        )

    return UnderstandingResponse(
        student_id=student_id, course_id=course_id, concepts=entries
    )
