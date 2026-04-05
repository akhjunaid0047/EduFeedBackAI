from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any


class ChangeStatusUpdate(BaseModel):
    status: str  # PENDING, ACCEPTED, REJECTED, DEFERRED


class ChangeItem(BaseModel):
    change_id: str
    unit: str
    type: str
    original_text: Optional[str]
    proposed_text: Optional[str]
    evidence: Optional[str]
    priority_score: float
    status: str


class DiffResponse(BaseModel):
    revision_id: UUID
    syllabus_document_id: UUID
    generated_at: Optional[str]
    changes: List[ChangeItem]


class RevisionStatusResponse(BaseModel):
    id: UUID
    syllabus_document_id: UUID
    diff_data: Optional[Any]
    revised_pdf_path: Optional[str]
    applied_changes_count: int
    rejected_changes_count: int
    finalized_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
