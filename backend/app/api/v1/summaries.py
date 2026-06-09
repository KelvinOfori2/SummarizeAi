from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.summary import SummarizeTextRequest, SummaryResponse, PaginatedSummaries
from app.services import summary_service
from app.services.export_service import export_as_txt, export_as_pdf, export_as_docx
from app.middleware.rate_limiter import limiter

router = APIRouter(prefix="/summaries", tags=["Summaries"])


@router.post("/", response_model=SummaryResponse, status_code=201)
@limiter.limit("30/minute")
async def create_summary(
    request: Request,
    payload: SummarizeTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return summary_service.create_summary_from_text(db, current_user.id, payload)


@router.post("/upload", response_model=SummaryResponse, status_code=201)
@limiter.limit("15/minute")
async def create_summary_from_file(
    request: Request,
    file: UploadFile = File(...),
    algorithm: str = Form("tfidf"),
    summary_ratio: float = Form(0.3),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return summary_service.create_summary_from_file(
        db, current_user.id, file, algorithm, summary_ratio, title
    )


@router.get("/", response_model=PaginatedSummaries)
def list_summaries(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return summary_service.get_user_summaries(db, current_user.id, page, page_size, search)


@router.get("/{summary_id}", response_model=SummaryResponse)
def get_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return summary_service.get_summary_by_id(db, summary_id, current_user.id)


@router.delete("/{summary_id}", status_code=204)
def delete_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary_service.delete_summary(db, summary_id, current_user.id)


@router.get("/{summary_id}/export")
def export_summary(
    summary_id: str,
    format: str = Query("txt", pattern="^(txt|pdf|docx)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = summary_service.get_summary_by_id(db, summary_id, current_user.id)
    if format == "pdf":
        return export_as_pdf(record)
    elif format == "docx":
        return export_as_docx(record)
    return export_as_txt(record)
