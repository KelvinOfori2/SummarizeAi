import logging
import sys
import warnings
from pathlib import Path

# Silence noisy third-party warnings globally
warnings.filterwarnings("ignore", message=".*urllib3.*")
warnings.filterwarnings("ignore", message=".*chardet.*")
warnings.filterwarnings("ignore", message=".*charset_normalizer.*")
warnings.filterwarnings("ignore", category=UserWarning, module="requests")

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(debug: bool = False) -> None:
    level = logging.DEBUG if debug else logging.INFO

    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT)

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    console.setLevel(level)

    file_handler = logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    error_handler = logging.FileHandler(LOG_DIR / "error.log", encoding="utf-8")
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(console)
    root.addHandler(file_handler)
    root.addHandler(error_handler)

    # Always silence these — they add no value in dev or prod
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.ERROR)
    logging.getLogger("urllib3").setLevel(logging.ERROR)
    logging.getLogger("charset_normalizer").setLevel(logging.ERROR)

    # Silence SQLAlchemy engine logs unless explicitly in DEBUG mode
    sa_level = logging.INFO if debug else logging.WARNING
    logging.getLogger("sqlalchemy.engine").setLevel(sa_level)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.dialects").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.orm").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
