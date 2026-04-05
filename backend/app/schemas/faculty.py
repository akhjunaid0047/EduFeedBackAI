from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class COAttainmentCreate(BaseModel):
    course_id: UUID
    academic_year: str
    semester: Optional[int] = None
    co_code: str
    direct_attainment_pct: Optional[float] = None
    indirect_attainment_pct: Optional[float] = None
    final_attainment_pct: Optional[float] = None
    remarks: Optional[str] = None


class COAttainmentUpdate(BaseModel):
    academic_year: Optional[str] = None
    semester: Optional[int] = None
    co_code: Optional[str] = None
    direct_attainment_pct: Optional[float] = None
    indirect_attainment_pct: Optional[float] = None
    final_attainment_pct: Optional[float] = None
    remarks: Optional[str] = None


class COAttainmentResponse(COAttainmentCreate):
    id: UUID
    faculty_id: UUID
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FacultyFeedbackCreate(BaseModel):
    course_id: UUID
    topics_to_add: Optional[str] = None
    topics_to_remove: Optional[str] = None
    student_difficulties: Optional[str] = None
    general_comments: Optional[str] = None


class FacultyFeedbackResponse(FacultyFeedbackCreate):
    id: UUID
    faculty_id: UUID
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
