import uuid
import enum
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class RecommendationTypeEnum(str, enum.Enum):
    add = "ADD"
    reduce = "REDUCE"
    modify = "MODIFY"
    review = "REVIEW"
    overhaul = "OVERHAUL"


class RecommendationStatusEnum(str, enum.Enum):
    pending = "PENDING"
    accepted = "ACCEPTED"
    rejected = "REJECTED"
    deferred = "DEFERRED"


class AnalyticsRunStatusEnum(str, enum.Enum):
    queued = "QUEUED"
    running = "RUNNING"
    completed = "COMPLETED"
    failed = "FAILED"


class AnalyticsRun(Base):
    __tablename__ = "analytics_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    triggered_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(AnalyticsRunStatusEnum), default=AnalyticsRunStatusEnum.queued)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    alumni_count = Column(Integer, nullable=True)
    faculty_data_included = Column(Boolean, default=False)
    error_log = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SkillGapResult(Base):
    __tablename__ = "skill_gap_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False, index=True)
    skill_name = Column(String, nullable=False)
    skill_category = Column(String, nullable=True)
    max_similarity_score = Column(Float, nullable=True)
    alumni_mention_count = Column(Integer, default=0)
    alumni_mention_pct = Column(Float, default=0.0)
    is_post_grad_skill = Column(Boolean, default=False)
    gap_flag = Column(Boolean, default=False)
    analytics_run_id = Column(UUID(as_uuid=True), ForeignKey("analytics_runs.id"), nullable=True)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


class CourseRelevanceScore(Base):
    __tablename__ = "course_relevance_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False, unique=True)
    relevance_score = Column(Float, nullable=True)
    alumni_relevance_avg = Column(Float, nullable=True)
    skill_match_score = Column(Float, nullable=True)
    co_attainment_avg = Column(Float, nullable=True)
    analytics_run_id = Column(UUID(as_uuid=True), ForeignKey("analytics_runs.id"), nullable=True)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


class CurriculumRecommendation(Base):
    __tablename__ = "curriculum_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False, index=True)
    recommendation_type = Column(Enum(RecommendationTypeEnum), nullable=False)
    target_topic = Column(String, nullable=False)
    evidence_summary = Column(Text, nullable=True)
    priority_score = Column(Float, default=0.0)
    status = Column(Enum(RecommendationStatusEnum), default=RecommendationStatusEnum.pending)
    included_in_revision = Column(Boolean, default=False)
    analytics_run_id = Column(UUID(as_uuid=True), ForeignKey("analytics_runs.id"), nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
