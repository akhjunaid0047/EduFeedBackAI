from app.models.user import User, UserRole
from app.models.department import Department
from app.models.alumni import Alumni, AlumniSkill
from app.models.faculty import Faculty, COAttainmentReport, FacultyFeedback
from app.models.course import Course, SyllabusDocument, SyllabusRevision
from app.models.analytics import SkillGapResult, CourseRelevanceScore, CurriculumRecommendation, AnalyticsRun
from app.models.settings import InstitutionSettings

__all__ = [
    "User", "UserRole", "Department",
    "Alumni", "AlumniSkill",
    "Faculty", "COAttainmentReport", "FacultyFeedback",
    "Course", "SyllabusDocument", "SyllabusRevision",
    "SkillGapResult", "CourseRelevanceScore", "CurriculumRecommendation", "AnalyticsRun",
    "InstitutionSettings",
]
