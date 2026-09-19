from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ConceptEdge, EdgeEvidence, StudentConceptEdge
from app.domain.ontology.edges import (
    ConceptEdgeData,
    ConceptEdgeType,
    StudentConceptEdgeType,
)


def _to_domain(row: ConceptEdge) -> ConceptEdgeData:
    return ConceptEdgeData(
        id=row.id,
        course_id=row.course_id,
        source_concept_id=row.source_concept_id,
        target_concept_id=row.target_concept_id,
        edge_type=ConceptEdgeType(row.edge_type),
        confidence=float(row.confidence),
        authority_weight=float(row.authority_weight),
        status=row.status,
        metadata=dict(row.edge_metadata or {}),
    )


async def upsert_concept_edge(
    session: AsyncSession,
    *,
    course_id: UUID,
    source_concept_id: UUID,
    target_concept_id: UUID,
    edge_type: ConceptEdgeType,
    confidence: float,
    authority_weight: float,
) -> ConceptEdgeData:
    """Insert a new edge, or merge into an existing one on the
    `(course_id, source, target, edge_type)` unique constraint by keeping
    the max confidence/authority seen so far (spec: "merge duplicate
    edges" — this is the DB-level realization of that rule, see
    `domain.graph.reduction`).
    """

    stmt = (
        pg_insert(ConceptEdge)
        .values(
            course_id=course_id,
            source_concept_id=source_concept_id,
            target_concept_id=target_concept_id,
            edge_type=edge_type.value,
            confidence=confidence,
            authority_weight=authority_weight,
            status="active",
        )
        .on_conflict_do_update(
            constraint="uq_concept_edges_triple",
            set_={
                "confidence": pg_insert(ConceptEdge).excluded.confidence,
                "authority_weight": pg_insert(ConceptEdge).excluded.authority_weight,
            },
            where=ConceptEdge.confidence < confidence,
        )
        .returning(ConceptEdge)
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        # Conflict happened but the WHERE clause skipped the update (existing
        # confidence was already >=); fetch the existing row instead.
        existing = await session.execute(
            select(ConceptEdge).where(
                ConceptEdge.course_id == course_id,
                ConceptEdge.source_concept_id == source_concept_id,
                ConceptEdge.target_concept_id == target_concept_id,
                ConceptEdge.edge_type == edge_type.value,
            )
        )
        row = existing.scalar_one()
    await session.flush()
    return _to_domain(row)


async def add_edge_evidence(
    session: AsyncSession,
    *,
    edge_id: UUID,
    resource_id: UUID,
    evidence_kind: str,
    confidence: float,
    chunk_id: UUID | None = None,
    page_number: int | None = None,
    snippet: str | None = None,
) -> None:
    session.add(
        EdgeEvidence(
            edge_id=edge_id,
            resource_id=resource_id,
            chunk_id=chunk_id,
            page_number=page_number,
            evidence_kind=evidence_kind,
            snippet=snippet,
            confidence=confidence,
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.flush()


async def get_course_edges(session: AsyncSession, course_id: UUID) -> list[ConceptEdgeData]:
    result = await session.execute(select(ConceptEdge).where(ConceptEdge.course_id == course_id))
    return [_to_domain(row) for row in result.scalars().all()]


async def downgrade_edge_to_related(session: AsyncSession, edge_id: UUID) -> None:
    """Cycle-breaking: rather than deleting a PREREQUISITE_FOR edge (and its
    evidence), relabel it RELATED_TO and mark status so it drops out of
    prerequisite-graph algorithms but the evidence is preserved.
    """

    await session.execute(
        update(ConceptEdge)
        .where(ConceptEdge.id == edge_id)
        .values(edge_type=ConceptEdgeType.RELATED_TO.value, status="cycle_downgraded")
    )
    await session.flush()


async def mark_edges_redundant(session: AsyncSession, edge_ids: set[UUID]) -> None:
    """Flag transitively-implied edges for display suppression, without
    deleting the underlying (still-active, still-evidenced) edge.
    """

    for edge_id in edge_ids:
        row = await session.get(ConceptEdge, edge_id)
        if row is not None:
            row.edge_metadata = {**row.edge_metadata, "is_redundant_in_display_graph": True}
    await session.flush()


def _to_student_domain(row: StudentConceptEdge) -> dict:
    return {
        "id": row.id,
        "student_id": row.student_id,
        "source_concept_id": row.source_concept_id,
        "target_concept_id": row.target_concept_id,
        "edge_type": StudentConceptEdgeType(row.edge_type),
        "confidence": float(row.confidence),
        "origin_resource_id": row.origin_resource_id,
    }


async def upsert_student_concept_edge(
    session: AsyncSession,
    *,
    student_id: UUID,
    course_id: UUID,
    source_concept_id: UUID,
    target_concept_id: UUID,
    edge_type: StudentConceptEdgeType,
    confidence: float,
    origin_resource_id: UUID | None,
) -> None:
    stmt = (
        pg_insert(StudentConceptEdge)
        .values(
            student_id=student_id,
            course_id=course_id,
            source_concept_id=source_concept_id,
            target_concept_id=target_concept_id,
            edge_type=edge_type.value,
            confidence=confidence,
            origin_resource_id=origin_resource_id,
        )
        .on_conflict_do_update(
            constraint="uq_student_concept_edges_triple",
            set_={"confidence": confidence, "origin_resource_id": origin_resource_id},
            where=StudentConceptEdge.confidence < confidence,
        )
    )
    await session.execute(stmt)
    await session.flush()


async def get_student_edges(session: AsyncSession, course_id: UUID, student_id: UUID) -> list[dict]:
    result = await session.execute(
        select(StudentConceptEdge).where(
            StudentConceptEdge.course_id == course_id, StudentConceptEdge.student_id == student_id
        )
    )
    return [_to_student_domain(row) for row in result.scalars().all()]
