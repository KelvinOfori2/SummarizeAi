from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.schemas.user import UserResponse, UpdateProfileRequest, ChangePasswordRequest, UserStatsResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.update_profile(db, current_user, payload)


@router.put("/me/password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_service.change_password(db, current_user, payload)
    return {"message": "Password changed successfully"}


@router.post("/me/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = user_service.upload_avatar(db, current_user, file)
    return {"avatar_url": url}


@router.get("/me/stats", response_model=UserStatsResponse)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.get_user_stats(db, current_user.id)


@router.get("/me/activity")
def get_my_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = user_service.get_activity_logs(db, current_user.id, limit=30)
    return [
        {
            "id": log.id,
            "action": log.action,
            "description": log.description,
            "created_at": log.created_at,
        }
        for log in logs
    ]
