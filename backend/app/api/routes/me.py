from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import current_student, get_db
from app.repositories.students import list_courses_for_student
from app.schemas.api import CourseOut, MeOut

router = APIRouter(prefix="/api", tags=["me"])


@router.get("/me", response_model=MeOut)
async def get_me(
    session: AsyncSession = Depends(get_db),
    student_id: UUID = Depends(current_student),
) -> MeOut:
    courses = await list_courses_for_student(session, student_id)
    return MeOut(
        student_id=student_id,
        courses=[CourseOut(id=c.id, name=c.name, code=c.code, term=c.term) for c in courses],
    )
