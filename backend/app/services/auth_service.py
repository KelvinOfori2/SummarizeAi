from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Request

from app.models.user import User
from app.models.activity_log import ActivityLog
from app.models.password_reset import PasswordReset
from app.schemas.auth import RegisterRequest, LoginRequest, ResetPasswordRequest
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, generate_reset_token,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


def _log_activity(db: Session, user_id: str, action: str, description: str, request: Request = None):
    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent") if request else None
    db.add(ActivityLog(user_id=user_id, action=action, description=description,
                       ip_address=ip, user_agent=ua))


def register_user(db: Session, payload: RegisterRequest, request: Request = None) -> User:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role="user",
        is_active=True,
        is_banned=False,
    )
    db.add(user)
    db.flush()
    _log_activity(db, user.id, "register", "Account created", request)
    db.commit()
    db.refresh(user)
    logger.info(f"New user registered: {user.email}")
    return user


def login_user(db: Session, payload: LoginRequest, request: Request = None) -> dict:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is banned")

    user.last_login = datetime.now(timezone.utc)
    _log_activity(db, user.id, "login", "User logged in", request)
    db.commit()

    token_data = {"sub": user.id, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


def refresh_access_token(db: Session, refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active or user.is_banned:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    token_data = {"sub": user.id, "role": user.role}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
    }


def request_password_reset(db: Session, email: str) -> str:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal whether email exists
        return "If that email is registered, a reset link has been sent."

    # Invalidate old tokens
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.is_used == False,
    ).update({"is_used": True})

    token = generate_reset_token()
    reset = PasswordReset(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(reset)
    db.commit()
    logger.info(f"Password reset requested for: {email}")
    return token


def reset_password(db: Session, payload: ResetPasswordRequest) -> bool:
    reset = db.query(PasswordReset).filter(
        PasswordReset.token == payload.token,
        PasswordReset.is_used == False,
    ).first()

    if not reset:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    if reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired")

    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    reset.is_used = True
    db.commit()
    logger.info(f"Password reset completed for user: {user.email}")
    return True
