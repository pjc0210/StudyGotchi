"""`GET .../concepts/{concept_id}` - the evidence and provenance behind one
concept's scores.

The scores themselves already travel on the personal-graph response; this
endpoint exists so a client can show *why* they are what they are without
ever recomputing them.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.db.models import ConceptResourceLink
from app.repositories.concepts import get_concept
from app.repositories.courses import get_course
from app.repositories.resources import get_resources_by_ids
from app.repositories.student_states import get_evidence_events
from app.schemas.api import ConceptDetailResponse, ConceptResourceOut, EvidenceOut, ResourceOut

router = APIRouter(prefix="/api/courses/{course_id}/students/{student_id}", tags=["concept-detail"])


def _resource_out(resource) -> ResourceOut:
    return ResourceOut(
        id=resource.id,
        title=resource.title,
        origin=resource.origin,
        artifact_type=resource.artifact_type,
        status=resource.status,
        concept_count=0,
        created_at=getattr(resource, "created_at", None),
    )


@router.get("/concepts/{concept_id}", response_model=ConceptDetailResponse)
async def get_concept_detail_endpoint(
    course_id: UUID,
    student_id: UUID,
    concept_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> ConceptDetailResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    concept = await get_concept(session, concept_id)
    if concept is None:
        raise HTTPException(status_code=404, detail="Concept not found")

    events = await get_evidence_events(
        session, student_id=student_id, course_id=course_id, concept_ids={concept_id}
    )

    link_rows = (
        await session.execute(
            select(ConceptResourceLink)
            .where(ConceptResourceLink.concept_id == concept_id)
            .order_by(ConceptResourceLink.depth_score.desc())
        )
    ).scalars().all()

    wanted = {e.resource_id for e in events if e.resource_id} | {link.resource_id for link in link_rows}
    resources = await get_resources_by_ids(session, wanted)

    return ConceptDetailResponse(
        concept_id=concept_id,
        name=concept.canonical_name,
        evidence=[
            EvidenceOut(
                # Evidence events are value objects in the domain layer and carry
                # no surrogate id, so address them by what identifies them here.
                id=concept_id,
                evidence_type=str(e.evidence_type),
                outcome=e.outcome,
                strength=e.strength,
                certainty=e.certainty,
                occurred_at=e.occurred_at,
                resource=(
                    _resource_out(resources[e.resource_id])
                    if e.resource_id and e.resource_id in resources
                    else None
                ),
            )
            for e in sorted(events, key=lambda e: e.occurred_at, reverse=True)
        ],
        resources=[
            ConceptResourceOut(
                resource=_resource_out(resources[link.resource_id]),
                link_type=link.link_type,
                depth_score=float(link.depth_score),
            )
            for link in link_rows
            if link.resource_id in resources
        ],
    )
