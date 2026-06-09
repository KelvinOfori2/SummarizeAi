from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.core.config import settings
from app.core.security import hash_password
from app.core.logging import get_logger

# Import all models so SQLAlchemy registers them before create_all
import app.models.user          # noqa: F401
import app.models.summary       # noqa: F401
import app.models.activity_log  # noqa: F401
import app.models.password_reset  # noqa: F401
import app.models.setting       # noqa: F401
import app.models.notification  # noqa: F401

logger = get_logger(__name__)


def create_tables() -> None:
    """Create all tables that don't exist yet (idempotent)."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured")


def seed_admin(db: Session) -> None:
    from app.models.user import User
    existing = db.query(User).filter(User.role == "admin").first()
    if existing:
        logger.info(f"Admin user already exists: {existing.email}")
        return
    admin = User(
        username=settings.ADMIN_USERNAME,
        email=settings.ADMIN_EMAIL,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        full_name="System Administrator",
        role="admin",
        is_active=True,
        is_banned=False,
    )
    db.add(admin)
    db.commit()
    logger.info(f"Admin user created: {settings.ADMIN_EMAIL}")


def seed_default_settings(db: Session) -> None:
    from app.models.setting import Setting
    defaults = [
        ("site_name",           "SummarizeAI",  "general"),
        ("maintenance_mode",    "false",         "general"),
        ("max_summary_length",  "50",            "summarization"),
        ("default_algorithm",   "tfidf",         "summarization"),
        ("allow_registration",  "true",          "security"),
        ("max_uploads_per_day", "20",            "limits"),
    ]
    for key, value, category in defaults:
        if not db.query(Setting).filter(Setting.key == key).first():
            db.add(Setting(key=key, value=value, category=category))
    db.commit()
    logger.info("Default settings ensured")


def init_db() -> None:
    """Full init: create tables + seed. Called from app.py launcher."""
    create_tables()
    db = SessionLocal()
    try:
        seed_admin(db)
        seed_default_settings(db)
    finally:
        db.close()
