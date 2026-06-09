from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional
import re


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    is_active: bool
    is_banned: bool
    created_at: datetime
    last_login: Optional[datetime]

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Username must be 3–50 characters")
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username may only contain letters, numbers, and underscores")
        return v.lower()


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    new_password_confirm: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("At least one uppercase letter required")
        if not re.search(r"[0-9]", v):
            raise ValueError("At least one digit required")
        return v

    @field_validator("new_password_confirm")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class UserStatsResponse(BaseModel):
    total_summaries: int
    total_words_processed: int
    total_words_saved: int
    last_activity: Optional[datetime]
