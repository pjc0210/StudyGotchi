"""`POST .../resources/ingest` for both course-level and student-level
resources (spec: "Required backend endpoints").
"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_provider
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.pipelines.course_ingestion import ingest_course_resource
from app.pipelines.student_ingestion import ingest_student_resource
from app.providers.llm.base import LLMProvider
from app.repositories.courses import get_course
from app.schemas.api import ResourceIngestResponse, StudentResourceIngestResponse

router = APIRouter(prefix="/api/courses/{course_id}", tags=["resources"])


@router.post("/resources/ingest", response_model=ResourceIngestResponse)
async def ingest_course_resource_endpoint(
    course_id: UUID,
    origin: SourceOrigin = Form(...),
    artifact_type: ArtifactType = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_provider),
) -> ResourceIngestResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    content_bytes = await file.read()
    outcome = await ingest_course_resource(
        session,
        provider,
        course_id=course_id,
        origin=origin,
        artifact_type=artifact_type,
        filename=file.filename or "upload",
        content_bytes=content_bytes,
    )
    await session.commit()
    return ResourceIngestResponse(
        resource_id=outcome.resource_id,
        status=outcome.status,
        concepts_created=outcome.concepts_created,
        concepts_merged=outcome.concepts_merged,
        edges_created=outcome.edges_created,
        assessment_items_created=outcome.assessment_items_created,
    )


@router.post("/students/{student_id}/resources/ingest", response_model=StudentResourceIngestResponse)
async def ingest_student_resource_endpoint(
    course_id: UUID,
    student_id: UUID,
    origin: SourceOrigin = Form(...),
    artifact_type: ArtifactType = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_provider),
) -> StudentResourceIngestResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    content_bytes = await file.read()
    outcome = await ingest_student_resource(
        session,
        provider,
        course_id=course_id,
        student_id=student_id,
        origin=origin,
        artifact_type=artifact_type,
        filename=file.filename or "upload",
        content_bytes=content_bytes,
    )
    await session.commit()
    return StudentResourceIngestResponse(
        resource_id=outcome.resource_id,
        status=outcome.status,
        evidence_events_created=outcome.evidence_events_created,
        concepts_touched=list(outcome.concepts_touched),
        personal_concepts_created=outcome.personal_concepts_created,
    )
