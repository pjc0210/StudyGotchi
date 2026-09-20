from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Course, Resource, Student, StudentEvidenceEvent
from app.repositories.courses import list_courses


async def get_or_create_student(
    session: AsyncSession,
    *,
    clerk_user_id: str,
    display_name: str | None = None,
) -> UUID:
    result = await session.execute(select(Student).where(Student.clerk_user_id == clerk_user_id))
    row = result.scalar_one_or_none()
    if row is not None:
        return row.id
    student = Student(clerk_user_id=clerk_user_id, display_name=display_name)
    session.add(student)
    await session.commit()
    await session.refresh(student)
    return student.id


async def list_courses_for_student(session: AsyncSession, student_id: UUID) -> list[Course]:
    owned = await session.execute(
        select(Course).where(
            or_(
                Course.id.in_(select(Resource.course_id).where(Resource.owner_user_id == student_id)),
                Course.id.in_(
                    select(StudentEvidenceEvent.course_id).where(StudentEvidenceEvent.student_id == student_id)
                ),
            )
        )
    )
    courses = list(owned.scalars().unique().all())
    if courses:
        return courses
    return await list_courses(session)
