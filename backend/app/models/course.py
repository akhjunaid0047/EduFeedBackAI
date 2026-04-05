import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_code = Column(String, unique=True, nullable=False)
    course_name = Column(String, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    semester = Column(Integer, nullable=True)
    credits = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)


class SyllabusDocument(Base):
    __tablename__ = "syllabus_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    academic_year = Column(String, nullable=True)
    original_file_path = Column(String, nullable=True)
    parsed_text = Column(Text, nullable=True)
    parsed_structure = Column(JSONB, nullable=True)
    is_processed = Column(Boolean, default=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())


class SyllabusRevision(Base):
    __tablename__ = "syllabus_revisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    syllabus_document_id = Column(UUID(as_uuid=True), ForeignKey("syllabus_documents.id"), nullable=False)
    analytics_run_id = Column(UUID(as_uuid=True), ForeignKey("analytics_runs.id"), nullable=True)
    diff_data = Column(JSONB, nullable=True)
    revised_structure = Column(JSONB, nullable=True)
    revised_pdf_path = Column(String, nullable=True)
    applied_changes_count = Column(Integer, default=0)
    rejected_changes_count = Column(Integer, default=0)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
