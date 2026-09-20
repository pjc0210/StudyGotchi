"""`POST .../resources/ingest` for course-level and student-level resources
(spec: "Required backend endpoints"), plus the file lists and per-file status
the upload queue polls.

ZIP archives are expanded here rather than in the parser: an archive is a
transport container, not a document, so each member becomes its own resource
and flows through the unchanged single-file pipeline.

Student ingest answers after the fast phase (about two seconds) with 202 and
schedules the deep analysis in the background; `GET .../students/{id}/resources/{id}`
reports `matched`, `analyzing`, `processed` or `failed`.
"""

import io
import zipfile
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import current_student, get_db, get_provider, require_student
from app.config import get_settings
from app.db.models import ConceptResourceLink, Resource
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.pipelines.course_ingestion import ingest_course_resource
from app.pipelines.ingest_jobs import run_student_analysis
from app.pipelines.student_ingestion import match_student_resource
from app.providers.llm.base import LLMProvider
from app.repositories.courses import get_course
from app.repositories.resources import get_resource, list_resources, list_student_resources
from app.schemas.api import (
    ResourceIngestResponse,
    ResourceOut,
    ResourceStatusOut,
    StudentResourceIngestResponse,
)

router = APIRouter(prefix="/api/courses/{course_id}", tags=["resources"])

# Extensions the parser can actually handle; anything else in an archive is
# skipped rather than failing the whole upload.
_SUPPORTED_MEMBER_EXTENSIONS = {"pdf", "md", "markdown", "txt", "docx", "png", "jpg", "jpeg", "webp"}


def _is_zip(filename: str) -> bool:
    return filename.lower().endswith(".zip")


def _expand_zip(content_bytes: bytes) -> list[tuple[str, bytes]]:
    """Return (filename, bytes) for each parseable member.

    Skips directories, macOS resource forks, and unsupported extensions.
    """

    members: list[tuple[str, bytes]] = []
    try:
        archive = zipfile.ZipFile(io.BytesIO(content_bytes))
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=400, detail=f"Could not read ZIP archive: {exc}") from exc

    for info in archive.infolist():
        if info.is_dir():
            continue
        name = info.filename
        base = name.rsplit("/", 1)[-1]
        if not base or base.startswith(".") or name.startswith("__MACOSX/"):
            continue
        ext = base.rsplit(".", 1)[-1].lower() if "." in base else ""
        if ext not in _SUPPORTED_MEMBER_EXTENSIONS:
            continue
        members.append((base, archive.read(info)))

    if not members:
        raise HTTPException(status_code=400, detail="ZIP archive contained no parseable documents.")
    return members


async def _read_upload(file: UploadFile) -> tuple[str, list[tuple[str, bytes]]]:
    filename = file.filename or "upload"
    limit = get_settings().max_upload_bytes
    content_bytes = await file.read(limit + 1)
    if len(content_bytes) > limit:
        raise HTTPException(413, "File exceeds upload size limit")
    if not content_bytes:
        raise HTTPException(422, "File is empty")
    documents = _expand_zip(content_bytes) if _is_zip(filename) else [(filename, content_bytes)]
    return filename, documents


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
    _: UUID = Depends(current_student),
) -> ResourceIngestResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    filename, documents = await _read_upload(file)
    is_bundle = len(documents) > 1 or _is_zip(filename)

    first_resource_id: UUID | None = None
    created = merged = edges = assessments = 0
    failures: list[str] = []

    for member_name, member_bytes in documents:
        try:
            outcome = await ingest_course_resource(
                session,
                provider,
                course_id=course_id,
                origin=origin,
                artifact_type=artifact_type,
                filename=member_name,
                content_bytes=member_bytes,
            )
        except NotImplementedError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            failures.append(f"{member_name}: {exc}")
            continue

        first_resource_id = first_resource_id or outcome.resource_id
        created += outcome.concepts_created
        merged += outcome.concepts_merged
        edges += outcome.edges_created
        assessments += outcome.assessment_items_created

    if first_resource_id is None:
        raise HTTPException(status_code=422, detail="; ".join(failures) or "Nothing could be ingested.")
    await session.commit()
    return ResourceIngestResponse(
        resource_id=first_resource_id,
        status="complete",
        concepts_created=created,
        concepts_merged=merged,
        edges_created=edges,
        assessment_items_created=assessments,
        child_count=len(documents) if is_bundle else None,
        child_failures=failures,
    )


@router.post(
    "/students/{student_id}/resources/ingest",
    response_model=StudentResourceIngestResponse,
    status_code=202,
)
async def ingest_student_resource_endpoint(
    course_id: UUID,
    student_id: UUID,
    background: BackgroundTasks,
    origin: SourceOrigin = Form(...),
    artifact_type: ArtifactType = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_provider),
    _: UUID = Depends(require_student),
) -> StudentResourceIngestResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    filename, documents = await _read_upload(file)
    is_bundle = len(documents) > 1 or _is_zip(filename)

    first_resource_id: UUID | None = None
    status = "matched"
    events = 0
    personal = 0
    touched: list[UUID] = []
    failures: list[str] = []
    to_analyze: list[UUID] = []

    for member_name, member_bytes in documents:
        try:
            outcome = await match_student_resource(
                session,
                provider,
                course_id=course_id,
                student_id=student_id,
                origin=origin,
                artifact_type=artifact_type,
                filename=member_name,
                content_bytes=member_bytes,
            )
        except NotImplementedError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            failures.append(f"{member_name}: {exc}")
            continue

        if first_resource_id is None:
            first_resource_id = outcome.resource_id
            status = outcome.status
        events += outcome.evidence_events_created
        personal += outcome.personal_concepts_created
        touched.extend(outcome.concepts_touched)
        if outcome.needs_analysis:
            to_analyze.append(outcome.resource_id)

    if first_resource_id is None:
        raise HTTPException(status_code=422, detail="; ".join(failures) or "Nothing could be ingested.")
    await session.commit()

    # The offline stub cannot read a file closely, so local runs stop after the fast phase.
    queue_analysis = bool(to_analyze) and get_settings().llm_provider != "fake"
    if queue_analysis:
        for resource_id in to_analyze:
            background.add_task(run_student_analysis, resource_id)

    return StudentResourceIngestResponse(
        resource_id=first_resource_id,
        status=status,
        evidence_events_created=events,
        concepts_touched=list(dict.fromkeys(touched)),
        personal_concepts_created=personal,
        analysis="queued" if queue_analysis else "none",
        child_count=len(documents) if is_bundle else None,
        child_failures=failures,
    )


@router.get("/resources", response_model=list[ResourceOut])
async def list_resources_endpoint(
    course_id: UUID,
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(current_student),
) -> list[ResourceOut]:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    resources = await list_resources(session, course_id)
    if not resources:
        return []

    link_rows = (
        await session.execute(
            select(ConceptResourceLink.resource_id, ConceptResourceLink.concept_id)
            .where(ConceptResourceLink.resource_id.in_([r.id for r in resources]))
            .distinct()
        )
    ).all()

    concept_ids_by_resource: dict[UUID, list[UUID]] = {}
    for resource_id, concept_id in link_rows:
        concept_ids_by_resource.setdefault(resource_id, []).append(concept_id)

    return [
        ResourceOut(
            id=r.id,
            title=r.title,
            origin=r.origin,
            artifact_type=r.artifact_type,
            status=r.status,
            concept_count=len(concept_ids_by_resource.get(r.id, [])),
            concept_ids=concept_ids_by_resource.get(r.id, []),
            created_at=r.created_at,
        )
        for r in resources
    ]


@router.get("/students/{student_id}/resources", response_model=list[ResourceStatusOut])
async def list_student_resources_endpoint(
    course_id: UUID,
    student_id: UUID,
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(require_student),
) -> list[ResourceStatusOut]:
    rows = await list_student_resources(session, course_id=course_id, student_id=student_id)
    return [_status_out(r) for r in rows]


@router.get("/students/{student_id}/resources/{resource_id}", response_model=ResourceStatusOut)
async def get_student_resource_endpoint(
    course_id: UUID,
    student_id: UUID,
    resource_id: UUID,
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(require_student),
) -> ResourceStatusOut:
    resource = await get_resource(session, resource_id)
    if resource is None or resource.course_id != course_id or resource.owner_user_id != student_id:
        raise HTTPException(status_code=404, detail="Resource not found")
    return _status_out(resource)
