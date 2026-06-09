from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status, UploadFile
from pathlib import Path
import shutil
import uuid

from app.models.user import User
from app.models.summary import Summary
from app.models.activity_log import ActivityLog
from app.schemas.user import UpdateProfileRequest, ChangePasswordRequest
from app.core.security import verify_password, hash_password
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

AVATAR_DIR = Path(settings.UPLOAD_DIR) / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def get_user_stats(db: Session, user_id: str) -> dict:
    total_summaries = db.query(func.count(Summary.id)).filter(Summary.user_id == user_id).scalar() or 0
    total_words_processed = db.query(func.sum(Summary.original_word_count)).filter(Summary.user_id == user_id).scalar() or 0
    total_words_saved = db.query(
        func.sum(Summary.original_word_count - Summary.summary_word_count)
    ).filter(Summary.user_id == user_id).scalar() or 0
    last_summary = (
        db.query(Summary.created_at)
        .filter(Summary.user_id == user_id)
        .order_by(Summary.created_at.desc())
        .first()
    )
    return {
        "total_summaries": total_summaries,
        "total_words_processed": int(total_words_processed),
        "total_words_saved": int(total_words_saved),
        "last_activity": last_summary[0] if last_summary else None,
    }


def update_profile(db: Session, user: User, payload: UpdateProfileRequest) -> User:
    if payload.username and payload.username != user.username:
        existing = db.query(User).filter(User.username == payload.username).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        user.username = payload.username
    if payload.full_name is not None:
        user.full_name = payload.full_name
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, payload: ChangePasswordRequest) -> bool:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    db.add(ActivityLog(user_id=user.id, action="password_change", description="Password changed by user"))
    db.commit()
    return True


def upload_avatar(db: Session, user: User, file: UploadFile) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Avatar must be a JPEG, PNG, WebP, or GIF image")

    # Check file size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > 2 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar must be under 2MB")

    # Delete old avatar if present
    if user.avatar_url:
        old_path = Path(settings.UPLOAD_DIR) / user.avatar_url.lstrip("/uploads/")
        if old_path.exists():
            old_path.unlink(missing_ok=True)

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    dest = AVATAR_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    avatar_url = f"/uploads/avatars/{filename}"
    user.avatar_url = avatar_url
    db.commit()
    return avatar_url


def get_activity_logs(db: Session, user_id: str, limit: int = 20) -> list:
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == user_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
