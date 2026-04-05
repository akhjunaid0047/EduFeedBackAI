from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.faculty import Faculty, COAttainmentReport, FacultyFeedback
from app.schemas.faculty import COAttainmentCreate, COAttainmentUpdate, FacultyFeedbackCreate
from fastapi import HTTPException
import uuid


async def get_or_create_faculty(db: AsyncSession, user_id) -> Faculty:
    result = await db.execute(select(Faculty).where(Faculty.user_id == user_id))
    faculty = result.scalar_one_or_none()
    if not faculty:
        faculty = Faculty(id=uuid.uuid4(), user_id=user_id)
        db.add(faculty)
        await db.commit()
        await db.refresh(faculty)
    return faculty


async def submit_co_attainment(db: AsyncSession, user_id, data: COAttainmentCreate) -> COAttainmentReport:
    faculty = await get_or_create_faculty(db, user_id)
    report = COAttainmentReport(id=uuid.uuid4(), faculty_id=faculty.id, **data.model_dump())
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def update_co_attainment(db: AsyncSession, report_id, data: COAttainmentUpdate) -> COAttainmentReport:
    result = await db.execute(select(COAttainmentReport).where(COAttainmentReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="CO report not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(report, k, v)
    await db.commit()
    await db.refresh(report)
    return report


async def get_co_attainment_by_faculty(db: AsyncSession, user_id):
    faculty = await get_or_create_faculty(db, user_id)
    result = await db.execute(
        select(COAttainmentReport).where(COAttainmentReport.faculty_id == faculty.id)
    )
    return result.scalars().all()


async def submit_feedback(db: AsyncSession, user_id, data: FacultyFeedbackCreate) -> FacultyFeedback:
    faculty = await get_or_create_faculty(db, user_id)
    feedback = FacultyFeedback(id=uuid.uuid4(), faculty_id=faculty.id, **data.model_dump())
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


async def get_feedback_by_faculty(db: AsyncSession, user_id):
    faculty = await get_or_create_faculty(db, user_id)
    result = await db.execute(
        select(FacultyFeedback).where(FacultyFeedback.faculty_id == faculty.id)
    )
    return result.scalars().all()
