from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Optional, List
from uuid import UUID
from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsRunResponse, SkillGapResponse, RelevanceScoreResponse,
    RecommendationResponse, RecommendationStatusUpdate,
)
from app.services import analytics_service

router = APIRouter()

AdminUser = Annotated[User, Depends(require_role("admin", "superadmin"))]


@router.post("/run", response_model=AnalyticsRunResponse, status_code=201)
async def trigger_run(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await analytics_service.trigger_analytics_run(db, admin.id)


@router.get("/status/{run_id}", response_model=AnalyticsRunResponse)
async def get_run_status(
    run_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await analytics_service.get_run_status(db, run_id)


@router.get("/skill-gaps", response_model=List[SkillGapResponse])
async def get_skill_gaps(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: Optional[UUID] = None,
    gap_only: Optional[bool] = None,
):
    return await analytics_service.get_skill_gaps(db, course_id, gap_only)


@router.get("/relevance", response_model=List[RelevanceScoreResponse])
async def get_relevance_scores(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: Optional[UUID] = None,
):
    return await analytics_service.get_relevance_scores(db, course_id)


@router.get("/recommendations", response_model=List[RecommendationResponse])
async def get_recommendations(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: Optional[UUID] = None,
    status: Optional[str] = None,
):
    return await analytics_service.get_recommendations(db, course_id, status)


@router.patch("/recommendations/{rec_id}", response_model=RecommendationResponse)
async def update_recommendation(
    rec_id: UUID,
    data: RecommendationStatusUpdate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await analytics_service.update_recommendation_status(db, rec_id, data.status.value)
