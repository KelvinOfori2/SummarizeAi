import warnings
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from pathlib import Path

# Silence the requests/urllib3 version warning immediately
warnings.filterwarnings("ignore", category=UserWarning, module="requests")
warnings.filterwarnings("ignore", message="urllib3")

from app.core.config import settings
import app.models.user          # noqa: F401
import app.models.summary       # noqa: F401
import app.models.activity_log  # noqa: F401
import app.models.password_reset  # noqa: F401
import app.models.setting       # noqa: F401
import app.models.notification  # noqa: F401
from app.core.logging import setup_logging, get_logger
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler
from app.middleware.request_logger import RequestLoggerMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.api.v1 import auth, users, summaries, admin, health
from app.api.v1 import websocket as ws_router

setup_logging(debug=settings.DEBUG)
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SummarizeAI API starting up")
    yield
    logger.info("SummarizeAI API shutting down")


app = FastAPI(
    title="SummarizeAI API",
    description="Automatic Text Summarization — NLP-powered REST API with WebSocket support",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── Rate limiter ───────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ── Middlewares ────────────────────────────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ───────────────────────────────────────────────────────────────
uploads_path = Path(settings.UPLOAD_DIR)
uploads_path.mkdir(parents=True, exist_ok=True)
(uploads_path / "avatars").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# ── REST routers ───────────────────────────────────────────────────────────────
API_V1 = "/api/v1"
app.include_router(health.router,    prefix=API_V1)
app.include_router(auth.router,      prefix=API_V1)
app.include_router(users.router,     prefix=API_V1)
app.include_router(summaries.router, prefix=API_V1)
app.include_router(admin.router,     prefix=API_V1)

# ── WebSocket ──────────────────────────────────────────────────────────────────
# Connect with:  ws://localhost:8000/ws?token=<jwt_access_token>
app.include_router(ws_router.router)
