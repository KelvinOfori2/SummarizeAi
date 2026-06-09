import re
import html
from typing import Any


def strip_html_tags(text: str) -> str:
    """Remove all HTML tags and content of dangerous tags (script, style)."""
    # Remove script/style tag content entirely
    text = re.sub(r"<(script|style)[^>]*>.*?</(script|style)>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    # Remove remaining tags
    clean = re.sub(r"<[^>]+>", "", text)
    return html.unescape(clean)


def sanitize_string(value: str, max_length: int = 10_000) -> str:
    """
    Sanitize a user-supplied string:
    - Strip leading/trailing whitespace
    - Remove null bytes
    - Strip HTML/script tags
    - Truncate to max_length
    """
    value = value.replace("\x00", "")
    value = value.strip()
    value = strip_html_tags(value)
    value = value[:max_length]
    return value


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal.
    Keeps only alphanumerics, dots, dashes, underscores.
    Removes all path separators and dot-sequences.
    """
    filename = filename.replace("\x00", "")
    # Get only the basename — strip any directory components
    filename = filename.replace("\\", "/").split("/")[-1]
    # Remove dangerous sequences
    filename = re.sub(r"\.{2,}", "", filename)   # remove .. and ...
    # Keep only safe characters
    filename = re.sub(r"[^\w.\-]", "_", filename)
    # Prevent hidden files
    filename = filename.lstrip(".")
    return filename[:255] or "upload"


def sanitize_search_query(query: str) -> str:
    """Sanitize search input used in LIKE queries."""
    query = query.replace("\x00", "").strip()
    query = strip_html_tags(query)
    # Escape LIKE special chars
    query = query.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")
    return query[:200]


def validate_text_input(text: str, min_len: int = 50, max_len: int = 500_000) -> str:
    """
    Validate and sanitize text submitted for summarization.
    Raises ValueError on invalid input.
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")

    cleaned = text.strip()

    if len(cleaned) < min_len:
        raise ValueError(f"Text must be at least {min_len} characters")

    if len(cleaned) > max_len:
        raise ValueError(f"Text exceeds maximum length of {max_len:,} characters")

    # Remove null bytes but preserve all other content
    cleaned = cleaned.replace("\x00", "")

    return cleaned
