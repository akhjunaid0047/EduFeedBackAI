from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.alumni import GenderEnum, EmploymentStatusEnum, WorkModeEnum, PlacementTrainingEnum


class AlumniSurveyCreate(BaseModel):
    # Section A
    gender: Optional[GenderEnum] = None
    degree_program: Optional[str] = None
    department: Optional[str] = None
    graduation_year: Optional[int] = None
    # Section B
    employment_status: Optional[EmploymentStatusEnum] = None
    job_role_designation: Optional[str] = None
    company_name: Optional[str] = None
    industry_domain: Optional[str] = None
    work_mode: Optional[WorkModeEnum] = None
    # Section C
    job_responsibilities: Optional[str] = None
    tools_software: Optional[str] = None
    skills_helped_land_job: Optional[str] = None
    # Section D
    course_relevance_rating: Optional[int] = None
    unused_subjects: Optional[str] = None
    skills_missing_from_curriculum: Optional[str] = None
    # Section E
    has_changed_jobs: Optional[bool] = None
    previous_designations: Optional[str] = None
    skills_acquired_after_graduation: Optional[str] = None
    certifications_completed: Optional[str] = None
    career_growth_satisfaction: Optional[int] = None
    # Section F
    placement_preparation: Optional[str] = None
    helpful_platforms: Optional[str] = None
    placement_training_helped: Optional[PlacementTrainingEnum] = None
    job_search_difficulties: Optional[str] = None
    suggestions_for_improvement: Optional[str] = None


class AlumniSurveyUpdate(AlumniSurveyCreate):
    pass


class AlumniResponse(AlumniSurveyCreate):
    id: UUID
    user_id: UUID
    submitted_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlumniListResponse(BaseModel):
    items: List[AlumniResponse]
    total: int
    skip: int
    limit: int
