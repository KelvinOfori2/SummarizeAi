#!/usr/bin/env python3
"""
app.py  —  SummarizeAI Backend Launcher
========================================
Usage:   python app.py

What this does automatically:
  1. Loads .env from the same folder
  2. Checks PostgreSQL is reachable (waits up to 30 s)
  3. Downloads NLTK language data if missing
  4. Creates / migrates all database tables
  5. Seeds the admin user + default settings
  6. Starts the API server on http://localhost:8000
"""

import os
import sys
import time
import subprocess

# ─────────────────────────────────────────────────────────────────────────────
# Coloured console helpers
# ─────────────────────────────────────────────────────────────────────────────
def _c(code, msg): return f"\033[{code}m{msg}\033[0m"
def info(m):  print(_c(36, "[SummarizeAI]") + f" {m}", flush=True)
def ok(m):    print(_c(32, "[SummarizeAI]") + f" \u2713 {m}", flush=True)
def warn(m):  print(_c(33, "[SummarizeAI]") + f" \u26a0  {m}", flush=True)
def fail(m):  print(_c(31, "[SummarizeAI]") + f" \u2717 {m}", flush=True); sys.exit(1)


def main():
    # ── Step 0 : set working directory ───────────────────────────────────────
    here = os.path.dirname(os.path.abspath(__file__))
    os.chdir(here)
    if here not in sys.path:
        sys.path.insert(0, here)

    # ── Step 1 : load .env ───────────────────────────────────────────────────
    env_path = os.path.join(here, ".env")
    if not os.path.exists(env_path):
        fail(
            ".env file not found!\n"
            "  Copy .env.example to .env and fill in your settings:\n"
            "    Windows:  copy .env.example .env\n"
            "    Linux/Mac: cp .env.example .env"
        )

    # Read .env manually so we don't need python-dotenv at import time
    _loaded = {}
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            _loaded[key.strip()] = val.strip()

    # Set into environment (don't overwrite values already set by the shell)
    for k, v in _loaded.items():
        os.environ.setdefault(k, v)

    # Also try python-dotenv for override support (optional)
    try:
        from dotenv import load_dotenv
        load_dotenv(env_path, override=False)
    except ImportError:
        pass

    info("Starting SummarizeAI API...")

    # ── Step 2 : validate required settings ──────────────────────────────────
    DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
    SECRET_KEY   = os.environ.get("SECRET_KEY",   "").strip()
    HOST         = os.environ.get("APP_HOST",      "0.0.0.0")
    PORT         = int(os.environ.get("APP_PORT",  "8000"))

    if not DATABASE_URL:
        fail("DATABASE_URL is empty. Edit your .env file.")

    PLACEHOLDER = "your-super-secret-key-change-in-production-min-32-chars"
    if not SECRET_KEY or SECRET_KEY == PLACEHOLDER:
        fail(
            "SECRET_KEY is not set in your .env file.\n"
            f"  Open  {env_path}\n"
            "  Set SECRET_KEY to any random string of 32+ characters.\n"
            "  Example:  SECRET_KEY=myrandomkey_abc123_changeme_xyz987"
        )
    if len(SECRET_KEY) < 32:
        fail(
            f"SECRET_KEY is too short ({len(SECRET_KEY)} chars). "
            "Must be at least 32 characters."
        )

    ok("Configuration loaded")

    # ── Step 3 : wait for PostgreSQL ─────────────────────────────────────────
    info("Connecting to PostgreSQL...")
    try:
        import psycopg2
    except ImportError:
        fail(
            "psycopg2-binary is not installed.\n"
            "  Run:  pip install -r requirements.txt"
        )

    max_wait, waited = 30, 0
    while True:
        try:
            conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
            conn.close()
            db_label = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
            ok(f"PostgreSQL connected  →  {db_label}")
            break
        except psycopg2.OperationalError as exc:
            if waited >= max_wait:
                fail(
                    f"Cannot reach PostgreSQL after {max_wait}s.\n"
                    f"  DATABASE_URL = {DATABASE_URL}\n"
                    f"  Error : {exc}\n\n"
                    "  Make sure PostgreSQL is running:\n"
                    "    Windows : open pgAdmin or run  pg_ctl start\n"
                    "    or install PostgreSQL from https://www.postgresql.org/download/windows/"
                )
            warn(f"PostgreSQL not ready yet — retrying in 2 s  ({waited}/{max_wait}s)")
            time.sleep(2)
            waited += 2

    # ── Step 4 : NLTK data ───────────────────────────────────────────────────
    info("Checking NLTK language data...")
    try:
        import nltk
        for pkg in ["punkt", "punkt_tab", "stopwords"]:
            nltk.download(pkg, quiet=True)
        ok("NLTK data ready")
    except Exception as exc:
        warn(f"NLTK setup issue (non-fatal): {exc}")

    # ── Step 5 : database tables + Alembic migrations ────────────────────────
    info("Running database migrations...")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            capture_output=True, text=True, cwd=here, timeout=60,
        )
        if result.returncode == 0:
            ok("Database schema up to date")
        else:
            warn("Alembic migration had warnings — falling back to create_all")
            warn(result.stderr.strip()[:300])
            _create_tables()
    except Exception as exc:
        warn(f"Migration error ({exc}) — using create_all fallback")
        _create_tables()

    # ── Step 6 : seed admin user + default settings ──────────────────────────
    info("Checking seed data...")
    try:
        from app.db.session import SessionLocal
        from app.db.init_db import seed_admin, seed_default_settings
        db = SessionLocal()
        try:
            seed_admin(db)
            seed_default_settings(db)
        finally:
            db.close()
        ok("Admin account and default settings ready")
    except Exception as exc:
        warn(f"Seeding warning (non-fatal): {exc}")

    # ── Step 7 : print banner ─────────────────────────────────────────────────
    admin_email = os.environ.get("ADMIN_EMAIL",    "admin@summarizeai.com")
    admin_pass  = os.environ.get("ADMIN_PASSWORD", "Admin@123456")
    env_label   = os.environ.get("APP_ENV", "development").upper()

    sep = _c(36, "=" * 60)
    print()
    print(sep)
    print(_c(1,  _c(36, f"   SummarizeAI API  [{env_label}]")))
    print(sep)
    print(f"   API Base  :  {_c(32, f'http://localhost:{PORT}/api/v1')}")
    print(f"   Swagger UI:  {_c(32, f'http://localhost:{PORT}/api/docs')}")
    print(f"   ReDoc     :  {_c(32, f'http://localhost:{PORT}/api/redoc')}")
    print(f"   Admin     :  {_c(33, f'{admin_email}   password: {admin_pass}')}")
    print(f"   Frontend  :  {_c(36, 'cd ../frontend  &&  npm run dev')}")
    print(sep)
    print()
    info("Press Ctrl+C to stop the server\n")

    # ── Step 8 : launch Uvicorn ───────────────────────────────────────────────
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=False,       # keep False — avoids multiprocessing issues on Windows
        log_level="info",
        access_log=True,
    )


def _create_tables():
    """Fallback: use SQLAlchemy create_all when Alembic is unavailable."""
    from app.db.init_db import create_tables
    create_tables()
    ok("Tables created via SQLAlchemy")


if __name__ == "__main__":
    main()
