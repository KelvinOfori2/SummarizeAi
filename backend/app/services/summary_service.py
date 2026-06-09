import time
import asyncio
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, UploadFile

from app.models.summary import Summary
from app.schemas.summary import SummarizeTextRequest
from app.services.nlp.preprocessor import count_words
from app.services.nlp.tfidf    import summarize_tfidf
from app.services.nlp.lsa      import summarize_lsa
from app.services.nlp.lexrank  import summarize_lexrank
from app.services.nlp.luhn     import summarize_luhn
from app.services.file_service import extract_text_from_file
from app.core.sanitization import validate_text_input
from app.core.logging import get_logger

logger = get_logger(__name__)

ALGORITHM_MAP = {
    "tfidf":   summarize_tfidf,
    "lsa":     summarize_lsa,
    "lexrank": summarize_lexrank,
    "luhn":    summarize_luhn,
}


def run_summarization(text: str, algorithm: str, ratio: float):
    fn = ALGORITHM_MAP.get(algorithm)
    if not fn:
        raise HTTPException(status_code=400, detail=f"Unknown algorithm: {algorithm}")
    start = time.perf_counter()
    result = fn(text, ratio)
    return result, round(time.perf_counter() - start, 4)


def _summary_dict(record: Summary) -> dict:
    return {
        "id":                  record.id,
        "title":               record.title,
        "algorithm":           record.algorithm,
        "original_word_count": record.original_word_count,
        "summary_word_count":  record.summary_word_count,
        "compression_ratio":   record.compression_ratio,
        "processing_time":     record.processing_time,
        "source_type":         record.source_type,
        "file_name":           record.file_name,
        "created_at":          str(record.created_at),
    }


def _ws_emit(user_id: str, event: str, data: dict):
    """
    Fire-and-forget a WebSocket event to a user.
    Safe to call from sync code inside an async context.
    Uses asyncio.get_running_loop() (Python 3.10+ safe).
    """
    try:
        from app.api.v1.websocket import manager
        loop = asyncio.get_running_loop()
        # schedule_coroutine on the running loop without blocking
        asyncio.ensure_future(
            manager.send_to_user(user_id, event, data),
            loop=loop,
        )
    except RuntimeError:
        # No running loop (e.g., during tests) — silently skip
        pass
    except Exception as exc:
        logger.debug(f"WS emit skipped: {exc}")


def _ws_emit_admin(event: str, data: dict):
    """Broadcast a WebSocket event to all connected admins."""
    try:
        from app.api.v1.websocket import manager
        loop = asyncio.get_running_loop()
        asyncio.ensure_future(
            manager.broadcast_admins(event, data),
            loop=loop,
        )
    except RuntimeError:
        pass
    except Exception as exc:
        logger.debug(f"WS admin emit skipped: {exc}")


# ── Public API ─────────────────────────────────────────────────────────────────

def create_summary_from_text(
    db: Session, user_id: str, payload: SummarizeTextRequest,
) -> Summary:
    try:
        cleaned = validate_text_input(payload.text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    summary_text, proc_time = run_summarization(cleaned, payload.algorithm, payload.summary_ratio)
    orig_words = count_words(cleaned)
    summ_words = count_words(summary_text)
    ratio      = round(summ_words / orig_words, 4) if orig_words else 0.0
    title      = payload.title or (cleaned[:60] + "…" if len(cleaned) > 60 else cleaned)

    record = Summary(
        user_id=user_id, title=title,
        original_text=cleaned, summary_text=summary_text,
        algorithm=payload.algorithm,
        original_word_count=orig_words, summary_word_count=summ_words,
        compression_ratio=ratio, processing_time=proc_time,
        source_type="text",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info(f"Summary created [{payload.algorithm}] user={user_id} words={orig_words}→{summ_words}")

    d = _summary_dict(record)
    _ws_emit(user_id, "summary_created", d)
    _ws_emit_admin("summary_created", {**d, "user_id": user_id})

    # Push updated stats immediately
    try:
        from app.services.user_service import get_user_stats
        _ws_emit(user_id, "stats_updated", get_user_stats(db, user_id))
    except Exception:
        pass

    return record


def create_summary_from_file(
    db: Session, user_id: str, file: UploadFile,
    algorithm: str, summary_ratio: float, title: Optional[str] = None,
) -> Summary:
    extracted = extract_text_from_file(file)
    try:
        cleaned = validate_text_input(extracted)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    summary_text, proc_time = run_summarization(cleaned, algorithm, summary_ratio)
    orig_words   = count_words(cleaned)
    summ_words   = count_words(summary_text)
    ratio        = round(summ_words / orig_words, 4) if orig_words else 0.0
    ext          = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "txt"
    record_title = title or file.filename or cleaned[:60]

    record = Summary(
        user_id=user_id, title=record_title,
        original_text=cleaned, summary_text=summary_text,
        algorithm=algorithm,
        original_word_count=orig_words, summary_word_count=summ_words,
        compression_ratio=ratio, processing_time=proc_time,
        source_type=ext, file_name=file.filename,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    d = _summary_dict(record)
    _ws_emit(user_id, "summary_created", d)
    _ws_emit_admin("summary_created", {**d, "user_id": user_id})

    try:
        from app.services.user_service import get_user_stats
        _ws_emit(user_id, "stats_updated", get_user_stats(db, user_id))
    except Exception:
        pass

    return record


def get_user_summaries(
    db: Session, user_id: str,
    page: int = 1, page_size: int = 10,
    search: Optional[str] = None,
) -> dict:
    query = db.query(Summary).filter(Summary.user_id == user_id)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Summary.title.ilike(like), Summary.summary_text.ilike(like)))
    total = query.count()
    items = (
        query.order_by(Summary.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),
    }


def get_summary_by_id(db: Session, summary_id: str, user_id: str) -> Summary:
    record = db.query(Summary).filter(
        Summary.id == summary_id, Summary.user_id == user_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Summary not found")
    return record


def delete_summary(db: Session, summary_id: str, user_id: str) -> bool:
    record = get_summary_by_id(db, summary_id, user_id)
    db.delete(record)
    db.commit()

    _ws_emit(user_id, "summary_deleted", {"id": summary_id})
    _ws_emit_admin("summary_deleted", {"id": summary_id, "user_id": user_id})

    try:
        from app.services.user_service import get_user_stats
        _ws_emit(user_id, "stats_updated", get_user_stats(db, user_id))
    except Exception:
        pass

    return True
