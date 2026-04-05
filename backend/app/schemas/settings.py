from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InstitutionSettingsResponse(BaseModel):
    id: int
    faculty_module_enabled: bool
    relevance_weight_alumni: float
    relevance_weight_skill_match: float
    relevance_weight_co_attainment: float
    gap_threshold: float
    min_alumni_mention_pct: float
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class InstitutionSettingsUpdate(BaseModel):
    faculty_module_enabled: Optional[bool] = None
    relevance_weight_alumni: Optional[float] = None
    relevance_weight_skill_match: Optional[float] = None
    relevance_weight_co_attainment: Optional[float] = None
    gap_threshold: Optional[float] = None
    min_alumni_mention_pct: Optional[float] = None
