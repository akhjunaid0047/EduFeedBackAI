import uuid
import json
import os
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.course import SyllabusRevision, SyllabusDocument
from app.core.config import settings
from fastapi import HTTPException

logger = logging.getLogger(__name__)


async def trigger_revision(db: AsyncSession, syllabus_id, user_id) -> SyllabusRevision:
    result = await db.execute(select(SyllabusDocument).where(SyllabusDocument.id == syllabus_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Syllabus document not found")
    if not doc.is_processed:
        raise HTTPException(status_code=400, detail="Syllabus must be parsed before revision")

    revision = SyllabusRevision(
        id=uuid.uuid4(),
        syllabus_document_id=syllabus_id,
        created_by=user_id,
        applied_changes_count=0,
        rejected_changes_count=0,
    )
    db.add(revision)
    await db.commit()
    await db.refresh(revision)

    try:
        from app.core.celery_app import celery_app
        result = celery_app.send_task(
            "nlp_engine.tasks.run_syllabus_revision",
            args=[str(revision.id), str(syllabus_id)],
        )
        logger.info("Dispatched run_syllabus_revision task: %s for revision %s", result.id, revision.id)
    except Exception:
        logger.exception("Failed to dispatch run_syllabus_revision task for revision %s", revision.id)

    return revision


async def get_revision_by_id(db: AsyncSession, revision_id) -> SyllabusRevision:
    result = await db.execute(select(SyllabusRevision).where(SyllabusRevision.id == revision_id))
    rev = result.scalar_one_or_none()
    if not rev:
        raise HTTPException(status_code=404, detail="Revision not found")
    return rev


async def get_diff(db: AsyncSession, revision_id) -> dict:
    rev = await get_revision_by_id(db, revision_id)
    diff = rev.diff_data or {"changes": []}
    return {
        "revision_id": str(revision_id),
        "syllabus_document_id": str(rev.syllabus_document_id),
        "generated_at": diff.get("generated_at"),
        "changes": diff.get("changes", []),
    }


async def update_change_status(db: AsyncSession, revision_id, change_id: str, new_status: str) -> dict:
    rev = await get_revision_by_id(db, revision_id)
    diff = rev.diff_data or {"changes": []}
    changes = diff.get("changes", [])

    found = False
    for ch in changes:
        if ch.get("change_id") == change_id:
            ch["status"] = new_status
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Change not found")

    # Recount
    accepted = sum(1 for c in changes if c.get("status") == "ACCEPTED")
    rejected = sum(1 for c in changes if c.get("status") == "REJECTED")
    rev.diff_data = diff
    rev.applied_changes_count = accepted
    rev.rejected_changes_count = rejected
    await db.commit()
    return {"change_id": change_id, "status": new_status}


async def finalize_revision(db: AsyncSession, revision_id, user_id) -> SyllabusRevision:
    rev = await get_revision_by_id(db, revision_id)
    diff = rev.diff_data or {"changes": []}
    accepted_changes = [c for c in diff.get("changes", []) if c.get("status") == "ACCEPTED"]

    # Build PDF
    try:
        from nlp_engine.revision.pdf_builder import build_revised_syllabus_pdf
        from sqlalchemy import select as sa_select
        from app.models.course import SyllabusDocument
        from app.models.user import User
        from app.models.course import Course

        syl_result = await db.execute(
            sa_select(SyllabusDocument).where(SyllabusDocument.id == rev.syllabus_document_id)
        )
        syl = syl_result.scalar_one_or_none()
        course_code = "COURSE"
        course_name = ""
        if syl:
            cr = await db.execute(sa_select(Course).where(Course.id == syl.course_id))
            course = cr.scalar_one_or_none()
            if course:
                course_code = course.course_code
                course_name = course.course_name

        user_result = await db.execute(sa_select(User).where(User.id == user_id))
        admin_user = user_result.scalar_one_or_none()
        admin_name = admin_user.full_name if admin_user else "Admin"

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        out_path = os.path.join(settings.UPLOAD_DIR, f"{course_code}_revised_syllabus_{today}.pdf")

        build_revised_syllabus_pdf(
            output_path=out_path,
            course_code=course_code,
            course_name=course_name,
            revised_structure=rev.revised_structure or {"units": []},
            accepted_changes=accepted_changes,
            admin_name=admin_name,
            analytics_run_date=today,
            alumni_count=0,
        )
        rev.revised_pdf_path = out_path
    except Exception as e:
        rev.revised_pdf_path = None

    rev.finalized_at = datetime.now(timezone.utc)
    rev.applied_changes_count = len(accepted_changes)
    await db.commit()
    await db.refresh(rev)
    return rev
