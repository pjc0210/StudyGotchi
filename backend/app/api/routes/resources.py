"""`POST .../resources/ingest` for both course-level and student-level
resources (spec: "Required backend endpoints"), plus a read endpoint listing
what has been ingested.

ZIP archives are expanded here rather than in the parser: an archive is a
transport container, not a document, so each member becomes its own resource
and flows through the unchanged single-file pipeline.
"""

import io
import zipfile
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_provider
from app.db.models import ConceptResourceLink
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.pipelines.course_ingestion import ingest_course_resource
from app.pipelines.student_ingestion import ingest_student_resource
from app.providers.llm.base import LLMProvider
from app.repositories.courses import get_course
from app.repositories.resources import list_resources
from app.schemas.api import ResourceIngestResponse, ResourceOut, StudentResourceIngestResponse

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

    filename = file.filename or "upload"
    content_bytes = await file.read()

    documents = _expand_zip(content_bytes) if _is_zip(filename) else [(filename, content_bytes)]
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

    filename = file.filename or "upload"
    content_bytes = await file.read()

    documents = _expand_zip(content_bytes) if _is_zip(filename) else [(filename, content_bytes)]
    is_bundle = len(documents) > 1 or _is_zip(filename)

    first_resource_id: UUID | None = None
    events = 0
    personal = 0
    touched: list[UUID] = []
    failures: list[str] = []

    for member_name, member_bytes in documents:
        try:
            outcome = await ingest_student_resource(
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

        first_resource_id = first_resource_id or outcome.resource_id
        events += outcome.evidence_events_created
        personal += outcome.personal_concepts_created
        touched.extend(outcome.concepts_touched)

    if first_resource_id is None:
        raise HTTPException(status_code=422, detail="; ".join(failures) or "Nothing could be ingested.")

    await session.commit()
    return StudentResourceIngestResponse(
        resource_id=first_resource_id,
        status="complete",
        evidence_events_created=events,
        concepts_touched=list(dict.fromkeys(touched)),
        personal_concepts_created=personal,
        child_count=len(documents) if is_bundle else None,
        child_failures=failures,
    )


@router.get("/resources", response_model=list[ResourceOut])
async def list_resources_endpoint(
    course_id: UUID, session: AsyncSession = Depends(get_db)
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
