from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, Request, BackgroundTasks
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


@router.post("/", status_code=202)
@limiter.limit("30/minute")
async def create_summary(
    request: Request,
    payload: SummarizeTextRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    import asyncio
    from app.core.sanitization import validate_text_input
    from fastapi import HTTPException
    try:
        cleaned = validate_text_input(payload.text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    title = payload.title or (cleaned[:60] + "\u2026" if len(cleaned) > 60 else cleaned)
    loop = asyncio.get_event_loop()
    background_tasks.add_task(
        summary_service._background_job,
        current_user.id, cleaned, payload.algorithm, payload.summary_ratio, title, "text", None, loop
    )
    return {"status": "processing", "message": "Started in background"}


@router.post("/upload", status_code=202)
@limiter.limit("15/minute")
async def create_summary_from_file(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    algorithm: str = Form("tfidf"),
    summary_ratio: float = Form(0.3),
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    import asyncio
    from app.services.file_service import extract_text_from_file
    from app.core.sanitization import validate_text_input
    from fastapi import HTTPException

    extracted = extract_text_from_file(file)
    try:
        cleaned = validate_text_input(extracted)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "txt"
    record_title = title or file.filename or cleaned[:60]

    loop = asyncio.get_event_loop()
    background_tasks.add_task(
        summary_service._background_job,
        current_user.id, cleaned, algorithm, summary_ratio, record_title, ext, file.filename, loop
    )
    return {"status": "processing", "message": "Started in background"}


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
