import asyncio
import hashlib
from collections import defaultdict
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Resource, ResourceChunk
from app.extractors.chunker import Chunk

# Per-course ingestion serialization (spec: "course ingestion locking").
# SQLite has no cross-connection advisory lock, but this backend only ever
# runs as a single process, so an in-process lock keyed by course_id gives
# the same per-course serialization Postgres's pg_advisory_xact_lock did.
# pg_advisory_xact_lock is reentrant within one transaction (a session
# re-locking the same key it already holds does not block itself), which
# callers rely on when a single session ingests more than one resource for
# the same course before committing — _course_lock_holders tracks that.
_course_ingestion_locks: dict[UUID, asyncio.Lock] = defaultdict(asyncio.Lock)
_course_lock_holders: dict[UUID, int] = {}


def compute_content_hash(content_bytes: bytes) -> str:
    return hashlib.sha256(content_bytes).hexdigest()


async def get_resource_by_hash(
    session: AsyncSession,
    course_id: UUID,
    content_hash: str,
    *,
    owner_user_id: UUID | None = None,
    origin: str,
    artifact_type: str,
) -> Resource | None:
    result = await session.execute(
        select(Resource).where(
            Resource.course_id == course_id,
            Resource.content_hash == content_hash,
            Resource.owner_user_id == owner_user_id,
            Resource.origin == origin,
            Resource.artifact_type == artifact_type,
            Resource.status.in_(["processed", "empty"]),
        )
    )
    return result.scalars().first()


async def create_resource(
    session: AsyncSession,
    *,
    course_id: UUID,
    origin: str,
    artifact_type: str,
    title: str,
    content_hash: str | None,
    owner_user_id: UUID | None = None,
    external_file_id: str | None = None,
    path: str | None = None,
    raw_text: str | None = None,
    status: str = "pending",
    metadata: dict | None = None,
) -> Resource:
    resource = Resource(
        course_id=course_id,
        origin=origin,
        artifact_type=artifact_type,
        title=title,
        content_hash=content_hash,
        owner_user_id=owner_user_id,
        external_file_id=external_file_id,
        path=path,
        raw_text=raw_text,
        status=status,
        resource_metadata=metadata or {},
    )
    session.add(resource)
    await session.flush()
    return resource


async def update_resource_status(
    session: AsyncSession, resource_id: UUID, status: str
) -> None:
    resource = await session.get(Resource, resource_id)
    if resource is not None:
        resource.status = status
        await session.flush()


async def save_chunks(
    session: AsyncSession,
    *,
    resource_id: UUID,
    course_id: UUID,
    chunks: list[Chunk],
    embeddings: list[list[float]] | None = None,
) -> list[ResourceChunk]:
    rows: list[ResourceChunk] = []
    for i, chunk in enumerate(chunks):
        row = ResourceChunk(
            resource_id=resource_id,
            course_id=course_id,
            chunk_index=chunk.chunk_index,
            page_number=chunk.page_number,
            section_title=chunk.section_title,
            text=chunk.text,
            embedding=embeddings[i] if embeddings else None,
            created_at=datetime.now(UTC),
        )
        session.add(row)
        rows.append(row)
    await session.flush()
    return rows


async def get_resource(session: AsyncSession, resource_id: UUID) -> Resource | None:
    return await session.get(Resource, resource_id)


async def lock_course_ingestion(session: AsyncSession, course_id: UUID) -> None:
    sync_session = session.sync_session
    if _course_lock_holders.get(course_id) == id(sync_session):
        return  # this session/transaction already holds it

    lock = _course_ingestion_locks[course_id]
    await lock.acquire()
    _course_lock_holders[course_id] = id(sync_session)

    def _release(*_args: object, **_kwargs: object) -> None:
        _course_lock_holders.pop(course_id, None)
        if lock.locked():
            lock.release()

    # `once=True` self-unregisters without mutating the listener deque from
    # inside its own dispatch (calling event.remove() there raises
    # "deque mutated during iteration").
    event.listen(sync_session, "after_transaction_end", _release, once=True)


async def list_resources(session: AsyncSession, course_id: UUID) -> list[Resource]:
    result = await session.execute(
        select(Resource)
        .where(Resource.course_id == course_id)
        .order_by(Resource.created_at.desc())
    )
    return list(result.scalars().all())


async def get_resources_by_ids(
    session: AsyncSession, resource_ids: set[UUID]
) -> dict[UUID, Resource]:
    if not resource_ids:
        return {}
    result = await session.execute(select(Resource).where(Resource.id.in_(resource_ids)))
    return {resource.id: resource for resource in result.scalars().all()}
