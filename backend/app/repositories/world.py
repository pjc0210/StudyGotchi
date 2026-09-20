from datetime import UTC, datetime

from sqlalchemy import select

from app.db.models import WorldEvent


async def add_world_event(
    session,
    *,
    student_id,
    course_id,
    event,
    explanation,
    concept_id=None,
    resource_id=None,
    delta=None,
):
    session.add(
        WorldEvent(
            student_id=student_id,
            course_id=course_id,
            concept_id=concept_id,
            resource_id=resource_id,
            event=event,
            delta=delta,
            explanation=explanation,
            created_at=datetime.now(UTC),
        )
    )
    await session.flush()


async def get_world_events(session, *, student_id, course_id, since=None, limit=100):
    query = select(WorldEvent).where(
        WorldEvent.student_id == student_id, WorldEvent.course_id == course_id
    )
    if since is not None:
        query = query.where(WorldEvent.created_at > since)
    rows = (
        await session.execute(
            query.order_by(WorldEvent.created_at.desc(), WorldEvent.id).limit(limit)
        )
    ).scalars()
    return [
        {
            "id": row.id,
            "event": row.event,
            "concept_id": row.concept_id,
            "resource_id": row.resource_id,
            "delta": float(row.delta) if row.delta is not None else None,
            "explanation": row.explanation,
            "created_at": row.created_at,
        }
        for row in rows
    ]
