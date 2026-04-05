from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated, List
from uuid import UUID
import uuid
from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.models.course import Course
from app.models.department import Department
from app.schemas.course import CourseCreate, CourseResponse, DepartmentCreate, DepartmentResponse

router = APIRouter()

AdminUser = Annotated[User, Depends(require_role("admin", "superadmin"))]


@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Department))
    return result.scalars().all()


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
async def create_department(
    data: DepartmentCreate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    dept = Department(id=uuid.uuid4(), **data.model_dump())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


@router.get("", response_model=List[CourseResponse])
async def list_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    department_id: UUID | None = None,
):
    query = select(Course).where(Course.is_active == True)
    if department_id:
        query = query.where(Course.department_id == department_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=CourseResponse, status_code=201)
async def create_course(
    data: CourseCreate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    course = Course(id=uuid.uuid4(), **data.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.delete("/{course_id}", status_code=204)
async def deactivate_course(
    course_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.is_active = False
    await db.commit()
