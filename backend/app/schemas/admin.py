from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional, List
import re


class AdminCreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "user"

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        if v not in {"user", "admin"}:
            raise ValueError("Role must be 'user' or 'admin'")
        return v


class AdminUpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_banned: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"user", "admin"}:
            raise ValueError("Role must be 'user' or 'admin'")
        return v


class AnalyticsResponse(BaseModel):
    total_users: int
    active_users: int
    banned_users: int
    total_summaries: int
    summaries_today: int
    summaries_this_week: int
    summaries_this_month: int
    most_used_algorithm: str
    avg_compression_ratio: float
    daily_activity: List[dict]
    monthly_activity: List[dict]
    algorithm_distribution: List[dict]


class ActivityLogResponse(BaseModel):
    id: str
    user_id: str
    username: Optional[str]
    action: str
    description: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SettingResponse(BaseModel):
    id: str
    key: str
    value: Optional[str]
    category: str
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class UpdateSettingRequest(BaseModel):
    value: str
