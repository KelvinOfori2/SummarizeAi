from fastapi import UploadFile, HTTPException, status
from app.core.logging import get_logger

logger = get_logger(__name__)

ALLOWED_EXTENSIONS = {"txt", "pdf", "docx"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


def _get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def extract_text_from_file(file: UploadFile) -> str:
    ext = _get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: txt, pdf, docx",
        )

    raw = file.file.read()
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 10 MB limit",
        )

    if ext == "txt":
        return _extract_txt(raw)
    elif ext == "pdf":
        return _extract_pdf(raw)
    elif ext == "docx":
        return _extract_docx(raw)

    raise HTTPException(status_code=400, detail="Unhandled file type")


def _extract_txt(raw: bytes) -> str:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=400, detail="Cannot decode text file — unsupported encoding")


def _clean_pdf_text(text: str) -> str:
    import re
    from collections import Counter

    lines = text.splitlines()
    stripped = [l.strip() for l in lines]

    # Lines appearing 3+ times are repeated headers/footers
    counts = Counter(l for l in stripped if l)
    repeated = {l for l, n in counts.items() if n >= 3 and len(l) < 120}

    kept = []
    for line in stripped:
        if not line:
            kept.append("")
            continue
        if line in repeated:
            continue
        # Standalone page numbers
        if re.fullmatch(r"\d{1,3}", line):
            continue
        # Section-number-only lines like "4" or "4.1"
        if re.fullmatch(r"\d+(\.\d+)*", line):
            continue
        # CVSS / vector strings
        if re.match(r"^(CVSS:|Vector:)", line):
            continue
        # Lines with very low alphabetic content — table data, hex, code artifacts
        alpha_ratio = sum(c.isalpha() for c in line) / max(len(line), 1)
        if alpha_ratio < 0.25 and len(line) < 100:
            continue
        kept.append(line)

    # Merge lines that are continuations (no sentence-ending punctuation,
    # next line starts with a lowercase letter)
    merged: list[str] = []
    i = 0
    while i < len(kept):
        line = kept[i]
        if not line:
            merged.append("")
            i += 1
            continue
        while (
            i + 1 < len(kept)
            and kept[i + 1]
            and not re.search(r"[.!?]\s*$", line)
            and kept[i + 1][0].islower()
        ):
            i += 1
            line = line + " " + kept[i]
        merged.append(line)
        i += 1

    result = "\n".join(merged)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def _extract_pdf(raw: bytes) -> str:
    try:
        import fitz  # PyMuPDF
        import io
        doc = fitz.open(stream=io.BytesIO(raw), filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        text = "\n".join(pages)
        if not text.strip():
            raise HTTPException(status_code=400, detail="PDF appears to be scanned/image-only. No text extracted.")
        return _clean_pdf_text(text)
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF processing library not available")
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise HTTPException(status_code=400, detail="Failed to extract text from PDF")


def _extract_docx(raw: bytes) -> str:
    try:
        import docx
        import io
        doc = docx.Document(io.BytesIO(raw))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        if not paragraphs:
            raise HTTPException(status_code=400, detail="DOCX file contains no readable text")
        return "\n".join(paragraphs)
    except ImportError:
        raise HTTPException(status_code=500, detail="DOCX processing library not available")
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        raise HTTPException(status_code=400, detail="Failed to extract text from DOCX")
