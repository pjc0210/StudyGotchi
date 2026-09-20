from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Concept, ConceptAlias, ConceptResourceLink
from app.domain.ontology.concepts import (
    ConceptKind,
    ConceptNode,
    ConceptScope,
    Granularity,
)
from app.resolution.normalize import normalize_concept_name


def _visible_scope(student_id: UUID | None):
    public = Concept.scope.in_(
        [ConceptScope.COURSE.value, ConceptScope.SHARED_EXTENSION.value]
    )
    if student_id is None:
        return public
    return or_(
        public,
        and_(
            Concept.scope == ConceptScope.PERSONAL.value,
            Concept.owner_student_id == student_id,
        ),
    )


def _to_domain(row: Concept) -> ConceptNode:
    return ConceptNode(
        id=row.id,
        course_id=row.course_id,
        canonical_name=row.canonical_name,
        normalized_name=row.normalized_name,
        concept_kind=ConceptKind(row.concept_kind),
        granularity=Granularity(row.granularity),
        importance=float(row.importance),
        scope=ConceptScope(row.scope),
        short_definition=row.short_definition,
        owner_student_id=row.owner_student_id,
        canonical_parent_concept_id=row.canonical_parent_concept_id,
        embedding=list(row.embedding) if row.embedding is not None else None,
    )


async def get_course_concepts(
    session: AsyncSession, course_id: UUID
) -> dict[UUID, ConceptNode]:
    result = await session.execute(
        select(Concept).where(
            Concept.course_id == course_id,
            Concept.status == "active",
            Concept.scope.in_(
                [ConceptScope.COURSE.value, ConceptScope.SHARED_EXTENSION.value]
            ),
        )
    )
    return {row.id: _to_domain(row) for row in result.scalars().all()}


async def get_personal_concepts(
    session: AsyncSession, course_id: UUID, student_id: UUID
) -> dict[UUID, ConceptNode]:
    result = await session.execute(
        select(Concept).where(
            Concept.course_id == course_id,
            Concept.status == "active",
            Concept.scope == ConceptScope.PERSONAL.value,
            Concept.owner_student_id == student_id,
        )
    )
    return {row.id: _to_domain(row) for row in result.scalars().all()}


async def get_concept(session: AsyncSession, concept_id: UUID) -> ConceptNode | None:
    row = await session.get(Concept, concept_id)
    return _to_domain(row) if row is not None else None


async def get_concept_embeddings(
    session: AsyncSession, course_id: UUID, student_id: UUID | None = None
) -> dict[UUID, list[float]]:
    result = await session.execute(
        select(Concept.id, Concept.embedding).where(
            Concept.course_id == course_id,
            Concept.status == "active",
            Concept.embedding.is_not(None),
            _visible_scope(student_id),
        )
    )
    return {row.id: list(row.embedding) for row in result.all()}


async def get_alias_index(
    session: AsyncSession, course_id: UUID, student_id: UUID | None = None
) -> dict[str, UUID]:
    result = await session.execute(
        select(ConceptAlias.normalized_alias, ConceptAlias.concept_id)
        .join(Concept, Concept.id == ConceptAlias.concept_id)
        .where(
            Concept.course_id == course_id,
            Concept.status == "active",
            _visible_scope(student_id),
        )
        .order_by(Concept.scope.desc())
    )
    return {row.normalized_alias: row.concept_id for row in result.all()}


async def create_concept(
    session: AsyncSession,
    *,
    course_id: UUID,
    canonical_name: str,
    short_definition: str | None,
    concept_kind: ConceptKind,
    granularity: Granularity,
    importance: float = 0.5,
    embedding: list[float] | None = None,
    scope: ConceptScope = ConceptScope.COURSE,
    owner_student_id: UUID | None = None,
    created_from_resource_id: UUID | None = None,
) -> ConceptNode:
    normalized_name = normalize_concept_name(canonical_name)
    row = Concept(
        course_id=course_id,
        canonical_name=canonical_name,
        normalized_name=normalized_name,
        short_definition=short_definition,
        concept_kind=concept_kind.value,
        granularity=granularity.value,
        importance=importance,
        embedding=embedding,
        scope=scope.value,
        owner_student_id=owner_student_id,
        created_from_resource_id=created_from_resource_id,
    )
    session.add(row)
    await session.flush()

    alias_row = ConceptAlias(
        concept_id=row.id,
        alias=canonical_name,
        normalized_alias=normalized_name,
        confidence=1.0,
        created_at=datetime.now(UTC),
    )
    session.add(alias_row)
    await session.flush()

    return _to_domain(row)


async def add_alias(
    session: AsyncSession,
    *,
    concept_id: UUID,
    alias: str,
    source_resource_id: UUID | None = None,
    confidence: float = 0.9,
) -> None:
    normalized_alias = normalize_concept_name(alias)
    existing = await session.execute(
        select(ConceptAlias).where(
            ConceptAlias.normalized_alias == normalized_alias,
            ConceptAlias.concept_id == concept_id,
        )
    )
    if existing.scalars().first() is not None:
        return
    session.add(
        ConceptAlias(
            concept_id=concept_id,
            alias=alias,
            normalized_alias=normalized_alias,
            source_resource_id=source_resource_id,
            confidence=confidence,
            created_at=datetime.now(UTC),
        )
    )
    await session.flush()


async def create_resource_link(
    session: AsyncSession,
    *,
    concept_id: UUID,
    resource_id: UUID,
    link_type: str,
    depth_score: float,
    confidence: float,
    chunk_id: UUID | None = None,
) -> None:
    session.add(
        ConceptResourceLink(
            concept_id=concept_id,
            resource_id=resource_id,
            chunk_id=chunk_id,
            link_type=link_type,
            depth_score=depth_score,
            confidence=confidence,
            created_at=datetime.now(UTC),
        )
    )
    await session.flush()
