import uuid
import enum
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class GenderEnum(str, enum.Enum):
    male = "Male"
    female = "Female"
    other = "Other"
    prefer_not = "Prefer not to say"


class EmploymentStatusEnum(str, enum.Enum):
    employed = "Employed"
    higher_studies = "Higher Studies"
    unemployed = "Unemployed"
    self_employed = "Self-employed"
    freelance = "Freelance"


class WorkModeEnum(str, enum.Enum):
    remote = "Remote"
    onsite = "On-site"
    hybrid = "Hybrid"


class PlacementTrainingEnum(str, enum.Enum):
    yes = "Yes"
    partially = "Partially"
    no = "No"


class Alumni(Base):
    __tablename__ = "alumni"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    # Section A
    gender = Column(Enum(GenderEnum), nullable=True)
    degree_program = Column(String, nullable=True)
    department = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=True)

    # Section B
    employment_status = Column(Enum(EmploymentStatusEnum), nullable=True)
    job_role_designation = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    industry_domain = Column(String, nullable=True)
    work_mode = Column(Enum(WorkModeEnum), nullable=True)

    # Section C — NLP primary sources
    job_responsibilities = Column(Text, nullable=True)
    tools_software = Column(Text, nullable=True)
    skills_helped_land_job = Column(Text, nullable=True)

    # Section D
    course_relevance_rating = Column(Integer, nullable=True)  # 1-5
    unused_subjects = Column(Text, nullable=True)
    skills_missing_from_curriculum = Column(Text, nullable=True)

    # Section E
    has_changed_jobs = Column(Boolean, nullable=True)
    previous_designations = Column(Text, nullable=True)
    skills_acquired_after_graduation = Column(Text, nullable=True)
    certifications_completed = Column(Text, nullable=True)
    career_growth_satisfaction = Column(Integer, nullable=True)  # 1-5

    # Section F
    placement_preparation = Column(Text, nullable=True)
    helpful_platforms = Column(Text, nullable=True)
    placement_training_helped = Column(Enum(PlacementTrainingEnum), nullable=True)
    job_search_difficulties = Column(Text, nullable=True)
    suggestions_for_improvement = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())


class AlumniSkill(Base):
    __tablename__ = "alumni_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumni_id = Column(UUID(as_uuid=True), ForeignKey("alumni.id"), nullable=False, index=True)
    skill_name = Column(String, nullable=False)
    skill_category = Column(String, nullable=False)
    source_field = Column(String, nullable=True)
    is_post_graduation = Column(Boolean, default=False)
    extracted_at = Column(DateTime(timezone=True), server_default=func.now())
