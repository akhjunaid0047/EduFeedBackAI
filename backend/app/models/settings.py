from sqlalchemy import Column, Integer, Boolean, Float, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class InstitutionSettings(Base):
    __tablename__ = "institution_settings"

    id = Column(Integer, primary_key=True, default=1)
    faculty_module_enabled = Column(Boolean, default=False)
    relevance_weight_alumni = Column(Float, default=0.50)
    relevance_weight_skill_match = Column(Float, default=0.50)
    relevance_weight_co_attainment = Column(Float, default=0.0)
    gap_threshold = Column(Float, default=0.40)
    min_alumni_mention_pct = Column(Float, default=0.10)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
