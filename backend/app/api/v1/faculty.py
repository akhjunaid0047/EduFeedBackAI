from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, List
from uuid import UUID
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_faculty_module
from app.models.user import User
from app.schemas.faculty import (
    COAttainmentCreate, COAttainmentUpdate, COAttainmentResponse,
    FacultyFeedbackCreate, FacultyFeedbackResponse,
)
from app.services import faculty_service

router = APIRouter()

FacultyUser = Annotated[User, Depends(check_faculty_module)]


@router.post("/co-attainment", response_model=COAttainmentResponse, status_code=201)
async def submit_co(
    data: COAttainmentCreate,
    current_user: FacultyUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await faculty_service.submit_co_attainment(db, current_user.id, data)


@router.put("/co-attainment/{report_id}", response_model=COAttainmentResponse)
async def update_co(
    report_id: UUID,
    data: COAttainmentUpdate,
    current_user: FacultyUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await faculty_service.update_co_attainment(db, report_id, data)


@router.get("/co-attainment", response_model=List[COAttainmentResponse])
async def get_my_co(
    current_user: FacultyUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await faculty_service.get_co_attainment_by_faculty(db, current_user.id)


@router.post("/feedback", response_model=FacultyFeedbackResponse, status_code=201)
async def submit_feedback(
    data: FacultyFeedbackCreate,
    current_user: FacultyUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await faculty_service.submit_feedback(db, current_user.id, data)


@router.get("/feedback", response_model=List[FacultyFeedbackResponse])
async def get_my_feedback(
    current_user: FacultyUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await faculty_service.get_feedback_by_faculty(db, current_user.id)
