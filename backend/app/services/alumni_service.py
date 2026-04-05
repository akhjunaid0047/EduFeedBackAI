import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.alumni import Alumni
from app.schemas.alumni import AlumniSurveyCreate, AlumniSurveyUpdate
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


async def submit_survey(db: AsyncSession, user_id, data: AlumniSurveyCreate) -> Alumni:
    existing = await db.execute(select(Alumni).where(Alumni.user_id == user_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Survey already submitted. Use PUT to update.")

    alumni = Alumni(id=uuid.uuid4(), user_id=user_id, **data.model_dump())
    db.add(alumni)
    await db.commit()
    await db.refresh(alumni)

    # Trigger skill extraction
    try:
        from app.core.celery_app import celery_app
        result = celery_app.send_task("nlp_engine.tasks.extract_skills", args=[str(alumni.id)])
        logger.info("Dispatched extract_skills task: %s for alumni %s", result.id, alumni.id)
    except Exception:
        logger.exception("Failed to dispatch extract_skills task for alumni %s", alumni.id)

    return alumni


async def update_survey(db: AsyncSession, user_id, data: AlumniSurveyUpdate) -> Alumni:
    result = await db.execute(select(Alumni).where(Alumni.user_id == user_id))
    alumni = result.scalar_one_or_none()
    if not alumni:
        raise HTTPException(status_code=404, detail="Survey not found. Submit first.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(alumni, field, value)

    await db.commit()
    await db.refresh(alumni)

    try:
        from app.core.celery_app import celery_app
        result = celery_app.send_task("nlp_engine.tasks.extract_skills", args=[str(alumni.id)])
        logger.info("Dispatched extract_skills task: %s for alumni %s", result.id, alumni.id)
    except Exception:
        logger.exception("Failed to dispatch extract_skills task for alumni %s", alumni.id)

    return alumni


async def get_alumni_by_user_id(db: AsyncSession, user_id) -> Alumni | None:
    result = await db.execute(select(Alumni).where(Alumni.user_id == user_id))
    return result.scalar_one_or_none()


async def list_alumni(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    department: str | None = None,
    graduation_year: int | None = None,
):
    query = select(Alumni)
    if department:
        query = query.where(Alumni.department == department)
    if graduation_year:
        query = query.where(Alumni.graduation_year == graduation_year)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all(), total


async def get_alumni_by_id(db: AsyncSession, alumni_id) -> Alumni | None:
    result = await db.execute(select(Alumni).where(Alumni.id == alumni_id))
    return result.scalar_one_or_none()
