from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.settings import InstitutionSettingsResponse, InstitutionSettingsUpdate
from app.services import settings_service

router = APIRouter()

AdminUser = Annotated[User, Depends(require_role("admin", "superadmin"))]
SuperadminUser = Annotated[User, Depends(require_role("superadmin"))]


@router.get("", response_model=InstitutionSettingsResponse)
async def get_settings(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await settings_service.get_settings(db)


@router.put("", response_model=InstitutionSettingsResponse)
async def update_settings(
    data: InstitutionSettingsUpdate,
    superadmin: SuperadminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await settings_service.update_settings(db, data)
