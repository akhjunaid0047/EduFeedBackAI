from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.services import report_service

router = APIRouter()

AdminUser = Annotated[User, Depends(require_role("admin", "superadmin"))]


@router.get("/pdf")
async def full_pdf_report(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    pdf_bytes = await report_service.generate_pdf_report(db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=edufeedback_report.pdf"},
    )


@router.get("/pdf/{course_id}")
async def course_pdf_report(
    course_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    pdf_bytes = await report_service.generate_pdf_report(db, course_id=course_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=course_{course_id}_report.pdf"},
    )


@router.get("/excel")
async def excel_report(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    xlsx_bytes = await report_service.generate_excel_report(db)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=edufeedback_analytics.xlsx"},
    )


@router.get("/naac")
async def naac_report(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # NAAC uses same PDF report format; can be extended with custom formatting
    pdf_bytes = await report_service.generate_pdf_report(db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=naac_summary.pdf"},
    )
