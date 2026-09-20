from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Assessment, AssessmentItem, AssessmentItemConcept


async def get_or_create_assessment(
    session: AsyncSession,
    *,
    course_id: UUID,
    resource_id: UUID | None,
    title: str,
    assessment_type: str,
) -> Assessment:
    existing = await session.execute(
        select(Assessment).where(
            Assessment.course_id == course_id, Assessment.title == title
        )
    )
    row = existing.scalars().first()
    if row is not None:
        return row

    row = Assessment(
        course_id=course_id,
        resource_id=resource_id,
        title=title,
        assessment_type=assessment_type,
    )
    session.add(row)
    await session.flush()
    return row


async def create_assessment_item(
    session: AsyncSession,
    *,
    assessment_id: UUID,
    label: str,
    prompt: str | None,
    max_score: float | None,
    difficulty: float | None,
) -> AssessmentItem:
    row = AssessmentItem(
        assessment_id=assessment_id,
        label=label,
        prompt=prompt,
        max_score=max_score,
        difficulty=difficulty,
    )
    session.add(row)
    await session.flush()
    return row


async def link_item_to_concept(
    session: AsyncSession,
    *,
    assessment_item_id: UUID,
    concept_id: UUID,
    relevance_weight: float,
) -> None:
    stmt = (
        sqlite_insert(AssessmentItemConcept)
        .values(
            assessment_item_id=assessment_item_id,
            concept_id=concept_id,
            relevance_weight=relevance_weight,
        )
        .on_conflict_do_update(
            index_elements=["assessment_item_id", "concept_id"],
            set_={"relevance_weight": relevance_weight},
        )
    )
    await session.execute(stmt)
    await session.flush()


async def get_item_concept_links(
    session: AsyncSession, assessment_item_id: UUID
) -> list[tuple[UUID, float]]:
    result = await session.execute(
        select(
            AssessmentItemConcept.concept_id, AssessmentItemConcept.relevance_weight
        ).where(AssessmentItemConcept.assessment_item_id == assessment_item_id)
    )
    return [(row.concept_id, float(row.relevance_weight)) for row in result.all()]


async def get_assessment_items(
    session: AsyncSession, assessment_id: UUID
) -> list[AssessmentItem]:
    result = await session.execute(
        select(AssessmentItem).where(AssessmentItem.assessment_id == assessment_id)
    )
    return list(result.scalars().all())


async def get_assessment(
    session: AsyncSession, assessment_id: UUID
) -> Assessment | None:
    return await session.get(Assessment, assessment_id)
