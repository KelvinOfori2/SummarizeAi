from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, Literal


VALID_ALGORITHMS = {"tfidf", "lsa", "lexrank", "luhn"}


class SummarizeTextRequest(BaseModel):
    text: str
    algorithm: str = "tfidf"
    summary_ratio: float = 0.3  # 0.1 – 0.9
    title: Optional[str] = None

    @field_validator("algorithm")
    @classmethod
    def algorithm_valid(cls, v: str) -> str:
        if v not in VALID_ALGORITHMS:
            raise ValueError(f"Algorithm must be one of: {', '.join(VALID_ALGORITHMS)}")
        return v

    @field_validator("summary_ratio")
    @classmethod
    def ratio_range(cls, v: float) -> float:
        if not (0.05 <= v <= 0.95):
            raise ValueError("summary_ratio must be between 0.05 and 0.95")
        return v

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 50:
            raise ValueError("Text must be at least 50 characters long")
        return stripped


class SummaryResponse(BaseModel):
    id: str
    title: Optional[str]
    original_text: str
    summary_text: str
    algorithm: str
    original_word_count: int
    summary_word_count: int
    compression_ratio: float
    processing_time: float
    source_type: str
    file_name: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SummaryListItem(BaseModel):
    id: str
    title: Optional[str]
    algorithm: str
    original_word_count: int
    summary_word_count: int
    compression_ratio: float
    source_type: str
    file_name: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedSummaries(BaseModel):
    items: list[SummaryListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
