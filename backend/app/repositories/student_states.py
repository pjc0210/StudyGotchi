from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StudentConceptState, StudentEvidenceEvent
from app.domain.mastery.evidence import EvidenceEvent, EvidenceType, evidence_strength


async def create_evidence_event(session: AsyncSession, *, course_id: UUID, event: EvidenceEvent) -> None:
    """Persists the event's *resolved* strength (the event's own
    `strength` override if set, else `DEFAULT_EVIDENCE_STRENGTH[evidence_type]`)
    so a later config change to the defaults table never silently
    reinterprets already-recorded evidence.
    """

    session.add(
        StudentEvidenceEvent(
            student_id=event.student_id,
            course_id=course_id,
            concept_id=event.concept_id,
            resource_id=event.resource_id,
            assessment_item_id=event.assessment_item_id,
            evidence_type=event.evidence_type.value,
            outcome=event.outcome,
            strength=evidence_strength(event),
            certainty=event.certainty,
            difficulty=event.difficulty,
            occurred_at=event.occurred_at,
            event_metadata={"concept_relevance": event.concept_relevance} if event.concept_relevance != 1.0 else {},
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.flush()


def _to_domain_event(row: StudentEvidenceEvent) -> EvidenceEvent:
    return EvidenceEvent(
        concept_id=row.concept_id,
        student_id=row.student_id,
        evidence_type=EvidenceType(row.evidence_type),
        outcome=float(row.outcome) if row.outcome is not None else None,
        certainty=float(row.certainty),
        occurred_at=row.occurred_at,
        resource_id=row.resource_id,
        assessment_item_id=row.assessment_item_id,
        difficulty=float(row.difficulty) if row.difficulty is not None else 1.0,
        concept_relevance=float(row.event_metadata.get("concept_relevance", 1.0)),
        strength=float(row.strength),
    )


async def get_evidence_events(
    session: AsyncSession, *, student_id: UUID, course_id: UUID, concept_ids: set[UUID] | None = None
) -> list[EvidenceEvent]:
    stmt = select(StudentEvidenceEvent).where(
        StudentEvidenceEvent.student_id == student_id, StudentEvidenceEvent.course_id == course_id
    )
    if concept_ids is not None:
        stmt = stmt.where(StudentEvidenceEvent.concept_id.in_(concept_ids))
    result = await session.execute(stmt)
    return [_to_domain_event(row) for row in result.scalars().all()]


async def upsert_student_concept_state(
    session: AsyncSession,
    *,
    student_id: UUID,
    course_id: UUID,
    concept_id: UUID,
    discovery_state: str,
    mastery: float,
    familiarity: float,
    mastery_confidence: float,
    readiness: float,
    fragility: float,
    personal_relevance: float,
    positive_evidence: float,
    negative_evidence: float,
    last_evidence_at: datetime | None,
    last_practiced_at: datetime | None,
) -> None:
    now = datetime.now(timezone.utc)
    values = dict(
        student_id=student_id,
        course_id=course_id,
        concept_id=concept_id,
        discovery_state=discovery_state,
        mastery=mastery,
        familiarity=familiarity,
        mastery_confidence=mastery_confidence,
        readiness=readiness,
        fragility=fragility,
        personal_relevance=personal_relevance,
        positive_evidence=positive_evidence,
        negative_evidence=negative_evidence,
        last_evidence_at=last_evidence_at,
        last_practiced_at=last_practiced_at,
        updated_at=now,
    )
    stmt = pg_insert(StudentConceptState).values(**values)
    update_cols = {k: v for k, v in values.items() if k not in ("student_id", "concept_id", "course_id")}
    stmt = stmt.on_conflict_do_update(
        index_elements=["student_id", "concept_id"],
        set_=update_cols,
    )
    await session.execute(stmt)
    await session.flush()


async def get_student_concept_states(
    session: AsyncSession, *, student_id: UUID, course_id: UUID
) -> dict[UUID, StudentConceptState]:
    result = await session.execute(
        select(StudentConceptState).where(
            StudentConceptState.student_id == student_id, StudentConceptState.course_id == course_id
        )
    )
    return {row.concept_id: row for row in result.scalars().all()}
