from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.alumni import AlumniSurveyCreate, AlumniSurveyUpdate, AlumniResponse, AlumniListResponse
from app.services import alumni_service

router = APIRouter()

AdminUser = Annotated[User, Depends(require_role("admin", "superadmin"))]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/survey", response_model=AlumniResponse, status_code=201)
async def submit_survey(
    data: AlumniSurveyCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await alumni_service.submit_survey(db, current_user.id, data)


@router.put("/survey", response_model=AlumniResponse)
async def update_survey(
    data: AlumniSurveyUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await alumni_service.update_survey(db, current_user.id, data)


@router.get("/me", response_model=AlumniResponse)
async def get_my_profile(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    alumni = await alumni_service.get_alumni_by_user_id(db, current_user.id)
    if not alumni:
        raise HTTPException(status_code=404, detail="Survey not yet submitted")
    return alumni


@router.get("/all", response_model=AlumniListResponse)
async def list_all_alumni(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    department: Optional[str] = None,
    graduation_year: Optional[int] = None,
):
    items, total = await alumni_service.list_alumni(db, skip, limit, department, graduation_year)
    return AlumniListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{alumni_id}", response_model=AlumniResponse)
async def get_alumni(
    alumni_id: UUID,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    alumni = await alumni_service.get_alumni_by_id(db, alumni_id)
    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni not found")
    return alumni
