from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.course import SyllabusUploadResponse, SyllabusStructureResponse
from app.services import syllabus_service

router = APIRouter()

AdminUser = Annotated[User, Depends(require_role("admin", "superadmin"))]


@router.post("/upload", response_model=SyllabusUploadResponse, status_code=201)
async def upload_syllabus(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: UUID = Form(...),
    academic_year: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    return await syllabus_service.upload_syllabus(db, course_id, academic_year, file, admin.id)


@router.get("/{course_id}", response_model=SyllabusUploadResponse)
async def get_latest_syllabus(
    course_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    doc = await syllabus_service.get_syllabus_by_course(db, course_id)
    if not doc:
        raise HTTPException(status_code=404, detail="No syllabus found for this course")
    return doc


@router.post("/{syllabus_id}/parse", response_model=SyllabusUploadResponse)
async def trigger_parse(
    syllabus_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await syllabus_service.trigger_parse(db, syllabus_id)


@router.get("/{syllabus_id}/structure", response_model=SyllabusStructureResponse)
async def get_structure(
    syllabus_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    doc = await syllabus_service.get_syllabus_structure(db, syllabus_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return doc
