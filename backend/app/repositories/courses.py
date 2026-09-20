from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Course


async def create_course(session: AsyncSession, *, name: str, code: str | None, term: str | None) -> Course:
    course = Course(name=name, code=code, term=term)
    session.add(course)
    await session.flush()
    return course


async def get_course(session: AsyncSession, course_id: UUID) -> Course | None:
    return await session.get(Course, course_id)


async def list_courses(session: AsyncSession) -> list[Course]:
    result = await session.execute(select(Course))
    return list(result.scalars().all())
