from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from uuid import UUID
from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.revision import RevisionStatusResponse, DiffResponse, ChangeStatusUpdate
from app.services import revision_service

router = APIRouter()

AdminUser = Annotated[User, Depends(require_role("admin", "superadmin"))]


@router.post("/run/{syllabus_id}", response_model=RevisionStatusResponse, status_code=201)
async def trigger_revision(
    syllabus_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await revision_service.trigger_revision(db, syllabus_id, admin.id)


@router.get("/{revision_id}/status", response_model=RevisionStatusResponse)
async def get_revision_status(
    revision_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await revision_service.get_revision_by_id(db, revision_id)


@router.get("/{revision_id}/diff", response_model=DiffResponse)
async def get_diff(
    revision_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await revision_service.get_diff(db, revision_id)


@router.patch("/{revision_id}/changes/{change_id}")
async def update_change_status(
    revision_id: UUID,
    change_id: str,
    data: ChangeStatusUpdate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    valid_statuses = {"PENDING", "ACCEPTED", "REJECTED", "DEFERRED"}
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")
    return await revision_service.update_change_status(db, revision_id, change_id, data.status)


@router.post("/{revision_id}/finalize", response_model=RevisionStatusResponse)
async def finalize_revision(
    revision_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await revision_service.finalize_revision(db, revision_id, admin.id)


@router.get("/{revision_id}/download")
async def download_revised_pdf(
    revision_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    rev = await revision_service.get_revision_by_id(db, revision_id)
    if not rev.revised_pdf_path or not __import__("os").path.exists(rev.revised_pdf_path):
        raise HTTPException(status_code=404, detail="PDF not yet generated. Finalize first.")
    return FileResponse(
        rev.revised_pdf_path,
        media_type="application/pdf",
        filename=__import__("os").path.basename(rev.revised_pdf_path),
    )
