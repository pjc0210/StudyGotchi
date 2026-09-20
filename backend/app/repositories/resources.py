import hashlib
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Resource, ResourceChunk
from app.extractors.chunker import Chunk


def compute_content_hash(content_bytes: bytes) -> str:
    return hashlib.sha256(content_bytes).hexdigest()


async def get_resource_by_hash(
    session: AsyncSession, course_id: UUID, content_hash: str, *, owner_user_id: UUID | None = None
) -> Resource | None:
    stmt = select(Resource).where(Resource.course_id == course_id, Resource.content_hash == content_hash)
    if owner_user_id is not None:
        stmt = stmt.where(Resource.owner_user_id == owner_user_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def list_student_resources(session: AsyncSession, *, course_id: UUID, student_id: UUID) -> list[Resource]:
    result = await session.execute(
        select(Resource)
        .where(Resource.course_id == course_id, Resource.owner_user_id == student_id)
        .order_by(Resource.created_at.desc())
    )
    return list(result.scalars().all())


async def get_resource_chunks(session: AsyncSession, resource_id: UUID) -> list[ResourceChunk]:
    result = await session.execute(
        select(ResourceChunk).where(ResourceChunk.resource_id == resource_id).order_by(ResourceChunk.chunk_index)
    )
    return list(result.scalars().all())


async def merge_resource_metadata(session: AsyncSession, resource_id: UUID, **fields: object) -> None:
    """JSONB is only written back when the attribute is reassigned, so merge into a new dict."""

    resource = await session.get(Resource, resource_id)
    if resource is not None:
        resource.resource_metadata = {**resource.resource_metadata, **fields}
        await session.flush()


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


async def update_resource_status(session: AsyncSession, resource_id: UUID, status: str) -> None:
    resource = await session.get(Resource, resource_id)
    if resource is not None:
        resource.status = status
        await session.flush()


async def save_chunks(
    session: AsyncSession, *, resource_id: UUID, course_id: UUID, chunks: list[Chunk], embeddings: list[list[float]] | None = None
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
            created_at=datetime.now(timezone.utc),
        )
        session.add(row)
        rows.append(row)
    await session.flush()
    return rows


async def get_resource(session: AsyncSession, resource_id: UUID) -> Resource | None:
    return await session.get(Resource, resource_id)
