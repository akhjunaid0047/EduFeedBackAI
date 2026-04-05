import uuid
import logging

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.analytics import (
    AnalyticsRun, AnalyticsRunStatusEnum, SkillGapResult,
    CourseRelevanceScore, CurriculumRecommendation, RecommendationStatusEnum
)
from fastapi import HTTPException


async def trigger_analytics_run(db: AsyncSession, user_id) -> AnalyticsRun:
    run = AnalyticsRun(
        id=uuid.uuid4(),
        triggered_by=user_id,
        status=AnalyticsRunStatusEnum.queued,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    try:
        from app.core.celery_app import celery_app
        result = celery_app.send_task("nlp_engine.tasks.run_full_analytics", args=[str(run.id)])
        logger.info("Dispatched run_full_analytics task: %s for run %s", result.id, run.id)
    except Exception:
        logger.exception("Failed to dispatch run_full_analytics task for run %s", run.id)

    return run


async def get_run_status(db: AsyncSession, run_id) -> AnalyticsRun:
    result = await db.execute(select(AnalyticsRun).where(AnalyticsRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Analytics run not found")
    return run


async def get_skill_gaps(db: AsyncSession, course_id=None, gap_flag=None):
    query = select(SkillGapResult)
    if course_id:
        query = query.where(SkillGapResult.course_id == course_id)
    if gap_flag is not None:
        query = query.where(SkillGapResult.gap_flag == gap_flag)
    result = await db.execute(query)
    return result.scalars().all()


async def get_relevance_scores(db: AsyncSession, course_id=None):
    query = select(CourseRelevanceScore)
    if course_id:
        query = query.where(CourseRelevanceScore.course_id == course_id)
    result = await db.execute(query)
    return result.scalars().all()


async def get_recommendations(db: AsyncSession, course_id=None, status=None):
    query = select(CurriculumRecommendation).order_by(
        CurriculumRecommendation.priority_score.desc()
    )
    if course_id:
        query = query.where(CurriculumRecommendation.course_id == course_id)
    if status:
        query = query.where(CurriculumRecommendation.status == status)
    result = await db.execute(query)
    return result.scalars().all()


async def update_recommendation_status(db: AsyncSession, rec_id, status: str) -> CurriculumRecommendation:
    result = await db.execute(
        select(CurriculumRecommendation).where(CurriculumRecommendation.id == rec_id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = RecommendationStatusEnum(status)
    await db.commit()
    await db.refresh(rec)
    return rec
