from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest,
)
from app.schemas.user import UserResponse
from app.services import auth_service
from app.middleware.rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("10/minute")
async def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    user = auth_service.register_user(db, payload, request)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(db, payload, request)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_access_token(db, payload.refresh_token)


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    auth_service.request_password_reset(db, payload.email)
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_service.reset_password(db, payload)
    return {"message": "Password reset successfully"}
