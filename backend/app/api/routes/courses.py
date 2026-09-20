"""Minimal course bootstrap. Not one of the spec's required endpoints, but
unavoidable plumbing: every other endpoint is scoped under a course_id, and
something has to create the row.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.repositories.courses import create_course, get_course, list_courses
from app.schemas.api import CourseCreateRequest, CourseOut

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.post("", response_model=CourseOut, status_code=201)
async def create_course_endpoint(
    body: CourseCreateRequest, session: AsyncSession = Depends(get_db)
) -> CourseOut:
    course = await create_course(
        session, name=body.name, code=body.code, term=body.term
    )
    await session.commit()
    return CourseOut(id=course.id, name=course.name, code=course.code, term=course.term)


@router.get("", response_model=list[CourseOut])
async def list_courses_endpoint(
    session: AsyncSession = Depends(get_db),
) -> list[CourseOut]:
    courses = await list_courses(session)
    return [CourseOut(id=c.id, name=c.name, code=c.code, term=c.term) for c in courses]


@router.get("/{course_id}", response_model=CourseOut)
async def get_course_endpoint(
    course_id: UUID, session: AsyncSession = Depends(get_db)
) -> CourseOut:
    course = await get_course(session, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseOut(id=course.id, name=course.name, code=course.code, term=course.term)
