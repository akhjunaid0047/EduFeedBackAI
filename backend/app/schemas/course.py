from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any


class DepartmentCreate(BaseModel):
    name: str
    code: str


class DepartmentResponse(DepartmentCreate):
    id: UUID

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    course_code: str
    course_name: str
    department_id: Optional[UUID] = None
    semester: Optional[int] = None
    credits: Optional[int] = None


class CourseResponse(CourseCreate):
    id: UUID
    is_active: bool

    class Config:
        from_attributes = True


class SyllabusUploadResponse(BaseModel):
    id: UUID
    course_id: UUID
    academic_year: Optional[str]
    original_file_path: Optional[str]
    is_processed: bool
    uploaded_at: Optional[datetime]

    class Config:
        from_attributes = True


class SyllabusStructureResponse(BaseModel):
    id: UUID
    course_id: UUID
    is_processed: bool
    parsed_structure: Optional[Any]
    uploaded_at: Optional[datetime]

    class Config:
        from_attributes = True
