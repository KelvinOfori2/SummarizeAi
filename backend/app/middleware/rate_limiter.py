"""
Rate limiting configuration using slowapi.
Limits applied per IP address.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    storage_uri="memory://",
)

LIMITS = {
    "auth_register":  "10/minute",
    "auth_login":     "20/minute",
    "auth_forgot":    "5/minute",
    "summarize_text": "30/minute",
    "summarize_file": "15/minute",
    "general_read":   "120/minute",
    "admin":          "60/minute",
}


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Too many requests. Limit: {exc.detail}. Please slow down.",
            "type": "rate_limit_exceeded",
        },
        headers={"Retry-After": "60"},
    )
