import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from app.db.base import Base


class Setting(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="general")
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
