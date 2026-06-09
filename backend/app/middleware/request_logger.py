import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import get_logger

logger = get_logger("http")


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        logger.info(
            f"{request.method} {request.url.path} "
            f"→ {response.status_code} "
            f"[{duration_ms:.1f}ms] "
            f"ip={request.client.host if request.client else 'unknown'}"
        )
        return response
