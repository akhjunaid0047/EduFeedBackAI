from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.analytics import (
    RecommendationTypeEnum, RecommendationStatusEnum, AnalyticsRunStatusEnum
)


class AnalyticsRunResponse(BaseModel):
    id: UUID
    status: AnalyticsRunStatusEnum
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    alumni_count: Optional[int]
    faculty_data_included: bool
    error_log: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class SkillGapResponse(BaseModel):
    id: UUID
    course_id: UUID
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    skill_name: str
    skill_category: Optional[str]
    max_similarity_score: Optional[float]
    alumni_mention_count: int
    alumni_mention_pct: float
    is_post_grad_skill: bool
    gap_flag: bool
    computed_at: Optional[datetime]

    class Config:
        from_attributes = True


class RelevanceScoreResponse(BaseModel):
    id: UUID
    course_id: UUID
    relevance_score: Optional[float]
    alumni_relevance_avg: Optional[float]
    skill_match_score: Optional[float]
    co_attainment_avg: Optional[float]
    computed_at: Optional[datetime]

    class Config:
        from_attributes = True


class RecommendationResponse(BaseModel):
    id: UUID
    course_id: UUID
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    recommendation_type: RecommendationTypeEnum
    target_topic: str
    evidence_summary: Optional[str]
    priority_score: float
    status: RecommendationStatusEnum
    included_in_revision: bool
    generated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RecommendationStatusUpdate(BaseModel):
    status: RecommendationStatusEnum
