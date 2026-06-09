from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.db.session import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.models.summary import Summary
from app.models.activity_log import ActivityLog
from app.models.setting import Setting
from app.schemas.user import UserResponse
from app.schemas.admin import (
    AdminCreateUserRequest, AdminUpdateUserRequest,
    AnalyticsResponse, ActivityLogResponse, SettingResponse, UpdateSettingRequest,
)
from app.core.security import hash_password
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


# ── User Management ──────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    query = db.query(User)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (User.username.ilike(like)) | (User.email.ilike(like)) | (User.full_name.ilike(like))
        )
    return query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    payload: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
        is_banned=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: AdminUpdateUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


@router.post("/users/{user_id}/ban")
def toggle_ban(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = not user.is_banned
    db.commit()
    return {"is_banned": user.is_banned, "message": f"User {'banned' if user.is_banned else 'unbanned'}"}


# ── Summary Management ────────────────────────────────────────────────────────

@router.get("/summaries")
def list_all_summaries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    query = db.query(Summary)
    if search:
        like = f"%{search}%"
        query = query.filter(Summary.title.ilike(like) | Summary.summary_text.ilike(like))
    total = query.count()
    items = query.order_by(Summary.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [
        {
            "id": s.id, "user_id": s.user_id, "title": s.title,
            "algorithm": s.algorithm, "original_word_count": s.original_word_count,
            "summary_word_count": s.summary_word_count, "source_type": s.source_type,
            "created_at": s.created_at,
        } for s in items
    ]}


@router.delete("/summaries/{summary_id}", status_code=204)
def admin_delete_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    record = db.query(Summary).filter(Summary.id == summary_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Summary not found")
    db.delete(record)
    db.commit()


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True, User.is_banned == False).scalar() or 0
    banned_users = db.query(func.count(User.id)).filter(User.is_banned == True).scalar() or 0
    total_summaries = db.query(func.count(Summary.id)).scalar() or 0
    summaries_today = db.query(func.count(Summary.id)).filter(Summary.created_at >= today_start).scalar() or 0
    summaries_week = db.query(func.count(Summary.id)).filter(Summary.created_at >= week_start).scalar() or 0
    summaries_month = db.query(func.count(Summary.id)).filter(Summary.created_at >= month_start).scalar() or 0

    avg_ratio_row = db.query(func.avg(Summary.compression_ratio)).scalar()
    avg_compression = round(float(avg_ratio_row or 0), 4)

    algo_rows = (
        db.query(Summary.algorithm, func.count(Summary.id).label("count"))
        .group_by(Summary.algorithm)
        .all()
    )
    algo_dist = [{"algorithm": r.algorithm, "count": r.count} for r in algo_rows]
    most_used = max(algo_dist, key=lambda x: x["count"])["algorithm"] if algo_dist else "tfidf"

    # Daily activity last 14 days
    daily_rows = (
        db.query(cast(Summary.created_at, Date).label("day"), func.count(Summary.id).label("count"))
        .filter(Summary.created_at >= today_start - timedelta(days=13))
        .group_by("day")
        .order_by("day")
        .all()
    )
    daily_activity = [{"date": str(r.day), "count": r.count} for r in daily_rows]

    # Monthly activity last 12 months
    monthly_rows = (
        db.query(
            func.to_char(Summary.created_at, "YYYY-MM").label("month"),
            func.count(Summary.id).label("count"),
        )
        .filter(Summary.created_at >= today_start - timedelta(days=365))
        .group_by("month")
        .order_by("month")
        .all()
    )
    monthly_activity = [{"month": r.month, "count": r.count} for r in monthly_rows]

    return AnalyticsResponse(
        total_users=total_users,
        active_users=active_users,
        banned_users=banned_users,
        total_summaries=total_summaries,
        summaries_today=summaries_today,
        summaries_this_week=summaries_week,
        summaries_this_month=summaries_month,
        most_used_algorithm=most_used,
        avg_compression_ratio=avg_compression,
        daily_activity=daily_activity,
        monthly_activity=monthly_activity,
        algorithm_distribution=algo_dist,
    )


# ── Activity Logs ──────────────────────────────────────────────────────────────

@router.get("/logs")
def get_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    total = db.query(func.count(ActivityLog.id)).scalar() or 0
    logs = (
        db.query(ActivityLog, User.username)
        .join(User, User.id == ActivityLog.user_id, isouter=True)
        .order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "items": [
            {
                "id": log.ActivityLog.id,
                "user_id": log.ActivityLog.user_id,
                "username": log.username,
                "action": log.ActivityLog.action,
                "description": log.ActivityLog.description,
                "ip_address": log.ActivityLog.ip_address,
                "created_at": log.ActivityLog.created_at,
            }
            for log in logs
        ],
    }


# ── Settings ────────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=list[SettingResponse])
def get_settings(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    return db.query(Setting).order_by(Setting.category, Setting.key).all()


@router.put("/settings/{key}", response_model=SettingResponse)
def update_setting(
    key: str,
    payload: UpdateSettingRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    setting.value = payload.value
    db.commit()
    db.refresh(setting)
    return setting
