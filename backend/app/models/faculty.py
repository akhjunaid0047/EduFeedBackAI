import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    designation = Column(String, nullable=True)
    specialization = Column(String, nullable=True)


class COAttainmentReport(Base):
    __tablename__ = "co_attainment_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("faculty.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    academic_year = Column(String, nullable=False)
    semester = Column(Integer, nullable=True)
    co_code = Column(String, nullable=False)
    direct_attainment_pct = Column(Float, nullable=True)
    indirect_attainment_pct = Column(Float, nullable=True)
    final_attainment_pct = Column(Float, nullable=True)
    remarks = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())


class FacultyFeedback(Base):
    __tablename__ = "faculty_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("faculty.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    topics_to_add = Column(Text, nullable=True)
    topics_to_remove = Column(Text, nullable=True)
    student_difficulties = Column(Text, nullable=True)
    general_comments = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
