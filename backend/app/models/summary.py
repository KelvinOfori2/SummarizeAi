import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(300), nullable=True)
    original_text = Column(Text, nullable=False)
    summary_text = Column(Text, nullable=False)
    algorithm = Column(String(50), nullable=False)
    original_word_count = Column(Integer, nullable=False, default=0)
    summary_word_count = Column(Integer, nullable=False, default=0)
    compression_ratio = Column(Float, nullable=False, default=0.0)
    processing_time = Column(Float, nullable=False, default=0.0)
    source_type = Column(String(20), nullable=False, default="text")  # text | txt | pdf | docx
    file_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="summaries")
