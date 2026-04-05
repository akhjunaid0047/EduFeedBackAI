import os
import uuid
import shutil
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, UploadFile
from app.models.course import SyllabusDocument
from app.core.config import settings


async def upload_syllabus(
    db: AsyncSession,
    course_id,
    academic_year: str | None,
    file: UploadFile,
    uploaded_by,
) -> SyllabusDocument:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = SyllabusDocument(
        id=uuid.uuid4(),
        course_id=course_id,
        academic_year=academic_year,
        original_file_path=file_path,
        is_processed=False,
        uploaded_by=uploaded_by,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def trigger_parse(db: AsyncSession, syllabus_id) -> SyllabusDocument:
    result = await db.execute(select(SyllabusDocument).where(SyllabusDocument.id == syllabus_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    try:
        from app.core.celery_app import celery_app
        celery_app.send_task("nlp_engine.tasks.parse_syllabus", args=[str(syllabus_id)])
    except Exception:
        pass

    return doc


async def get_syllabus_by_course(db: AsyncSession, course_id) -> SyllabusDocument | None:
    result = await db.execute(
        select(SyllabusDocument)
        .where(SyllabusDocument.course_id == course_id)
        .order_by(SyllabusDocument.uploaded_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_syllabus_structure(db: AsyncSession, syllabus_id) -> SyllabusDocument | None:
    result = await db.execute(select(SyllabusDocument).where(SyllabusDocument.id == syllabus_id))
    return result.scalar_one_or_none()
