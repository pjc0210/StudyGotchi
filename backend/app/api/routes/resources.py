"""`POST .../resources/ingest` for course-level and student-level resources
(spec: "Required backend endpoints"), plus the student's file list and
per-file status the upload queue polls.

Student ingest answers after the fast phase (about two seconds) with 202 and
schedules the deep analysis in the background; `GET .../resources/{id}`
reports `matched`, `analyzing`, `processed` or `failed`.
"""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_provider
from app.config import get_settings
from app.db.models import Resource
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.pipelines.course_ingestion import ingest_course_resource
from app.pipelines.ingest_jobs import run_student_analysis
from app.pipelines.student_ingestion import match_student_resource
from app.providers.llm.base import LLMProvider
from app.repositories.courses import get_course
from app.repositories.resources import get_resource, list_student_resources
from app.schemas.api import ResourceIngestResponse, ResourceStatusOut, StudentResourceIngestResponse

router = APIRouter(prefix="/api/courses/{course_id}", tags=["resources"])


def _status_out(resource: Resource) -> ResourceStatusOut:
    meta = resource.resource_metadata or {}
    return ResourceStatusOut(
        resource_id=resource.id,
        title=resource.title,
        origin=resource.origin,
        artifact_type=resource.artifact_type,
        status=resource.status,
        error=meta.get("error"),
        phase_a_ms=meta.get("phase_a_ms"),
        phase_b_ms=meta.get("phase_b_ms"),
        created_at=resource.created_at,
        updated_at=resource.updated_at,
    )


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


@router.post("/students/{student_id}/resources/ingest", response_model=StudentResourceIngestResponse, status_code=202)
async def ingest_student_resource_endpoint(
    course_id: UUID,
    student_id: UUID,
    background: BackgroundTasks,
    origin: SourceOrigin = Form(...),
    artifact_type: ArtifactType = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_provider),
) -> StudentResourceIngestResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    content_bytes = await file.read()
    outcome = await match_student_resource(
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

    # The offline stub cannot read a file closely, so local runs stop after the fast phase.
    queue_analysis = outcome.needs_analysis and get_settings().llm_provider != "fake"
    if queue_analysis:
        background.add_task(run_student_analysis, outcome.resource_id)

    return StudentResourceIngestResponse(
        resource_id=outcome.resource_id,
        status=outcome.status,
        evidence_events_created=outcome.evidence_events_created,
        concepts_touched=list(outcome.concepts_touched),
        personal_concepts_created=outcome.personal_concepts_created,
        analysis="queued" if queue_analysis else "none",
    )


@router.get("/students/{student_id}/resources", response_model=list[ResourceStatusOut])
async def list_student_resources_endpoint(
    course_id: UUID, student_id: UUID, session: AsyncSession = Depends(get_db)
) -> list[ResourceStatusOut]:
    rows = await list_student_resources(session, course_id=course_id, student_id=student_id)
    return [_status_out(r) for r in rows]


@router.get("/students/{student_id}/resources/{resource_id}", response_model=ResourceStatusOut)
async def get_student_resource_endpoint(
    course_id: UUID, student_id: UUID, resource_id: UUID, session: AsyncSession = Depends(get_db)
) -> ResourceStatusOut:
    resource = await get_resource(session, resource_id)
    if resource is None or resource.course_id != course_id or resource.owner_user_id != student_id:
        raise HTTPException(status_code=404, detail="Resource not found")
    return _status_out(resource)
