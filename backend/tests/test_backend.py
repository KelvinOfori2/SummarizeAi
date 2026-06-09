"""
Full backend test suite — Phase 4.
Run: pytest tests/ -v --cov=app --cov-report=term-missing

Requires:
  - TEST_DATABASE_URL env var pointing to a test PostgreSQL DB, OR
  - DATABASE_URL in environment/. env (will use as-is)

The suite uses an in-process TestClient (no real server needed).
All tests are isolated: tables are created fresh per session, then dropped.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── Environment bootstrap ────────────────────────────────────────────────────
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-at-least-32chars")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/summarize_ai_test")
os.environ.setdefault("ADMIN_EMAIL", "admin@test.com")
os.environ.setdefault("ADMIN_PASSWORD", "Admin@123456")
os.environ.setdefault("ADMIN_USERNAME", "testadmin")

from app.main import app
from app.db.base import Base
from app.db.session import get_db

TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", os.environ["DATABASE_URL"])
engine = create_engine(TEST_DB_URL)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once per session, drop after."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Seed settings for admin
    from app.db.init_db import seed_default_settings
    db = TestingSession()
    try:
        seed_default_settings(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def client():
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture(scope="session")
def registered_user(client):
    """Register a regular user once for the whole session."""
    payload = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "Test@1234",
        "password_confirm": "Test@1234",
        "full_name": "Test User",
    }
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code in (201, 409), f"Registration failed: {resp.text}"
    return payload


@pytest.fixture(scope="session")
def user_tokens(client, registered_user):
    """Login the regular user and return tokens."""
    resp = client.post("/api/v1/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()


@pytest.fixture(scope="session")
def user_headers(user_tokens):
    return {"Authorization": f"Bearer {user_tokens['access_token']}"}


@pytest.fixture(scope="session")
def admin_user(client):
    """Register an admin user."""
    payload = {
        "username": "adminuser",
        "email": "adminuser@example.com",
        "password": "Admin@1234",
        "password_confirm": "Admin@1234",
        "full_name": "Admin User",
    }
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code in (201, 409)
    # Promote to admin directly in DB
    db = TestingSession()
    from app.models.user import User
    user = db.query(User).filter(User.email == payload["email"]).first()
    if user:
        user.role = "admin"
        db.commit()
    db.close()
    return payload


@pytest.fixture(scope="session")
def admin_headers(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={
        "email": admin_user["email"],
        "password": admin_user["password"],
    })
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


LONG_TEXT = (
    "Natural language processing (NLP) is a subfield of linguistics, computer science, "
    "and artificial intelligence concerned with the interactions between computers and human language. "
    "In particular, it is how to program computers to process and analyze large amounts of natural language data. "
    "The goal is a computer capable of understanding the contents of documents, including the contextual nuances. "
    "The technology can then accurately extract information and insights contained in the documents. "
    "Challenges in natural language processing frequently involve speech recognition, natural language understanding, "
    "and natural language generation. "
    "Modern NLP algorithms are based on machine learning, especially statistical machine learning. "
    "The paradigm of machine learning is useful for NLP tasks because many such tasks, including parsing and "
    "semantic role labeling, involve computing the probability of a candidate output. "
    "Neural machine translation, named entity recognition, and question answering have all benefited from "
    "deep learning methods such as word embeddings, recurrent neural networks, and transformers. "
    "BERT, GPT, and T5 are among the most impactful transformer models in modern NLP. "
) * 4


# ═══════════════════════════════════════════════════════════════════════════════
# 1. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_health_endpoint(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "service" in data

    def test_docs_available(self, client):
        resp = client.get("/api/docs")
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# 2. AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthentication:

    # ── Registration ──────────────────────────────────────────────────────────
    def test_register_valid_user(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "username": "newreguser",
            "email": "newreguser@example.com",
            "password": "Secure@1234",
            "password_confirm": "Secure@1234",
            "full_name": "New Reg User",
        })
        assert resp.status_code in (201, 409)
        if resp.status_code == 201:
            data = resp.json()
            assert data["email"] == "newreguser@example.com"
            assert "password_hash" not in data

    def test_register_duplicate_email(self, client, registered_user):
        resp = client.post("/api/v1/auth/register", json={
            "username": "differentname",
            "email": registered_user["email"],
            "password": "Test@1234",
            "password_confirm": "Test@1234",
        })
        assert resp.status_code == 409

    def test_register_duplicate_username(self, client, registered_user):
        resp = client.post("/api/v1/auth/register", json={
            "username": registered_user["username"] if "username" in registered_user else "testuser",
            "email": "unique_email_xyz@example.com",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
        })
        assert resp.status_code == 409

    def test_register_weak_password_too_short(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "username": "weakpwd",
            "email": "weakpwd@example.com",
            "password": "abc",
            "password_confirm": "abc",
        })
        assert resp.status_code == 422

    def test_register_password_no_uppercase(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "username": "nouppercase",
            "email": "nouppercase@example.com",
            "password": "alllower1234",
            "password_confirm": "alllower1234",
        })
        assert resp.status_code == 422

    def test_register_password_no_digit(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "username": "nodigit",
            "email": "nodigit@example.com",
            "password": "NoDigitHere",
            "password_confirm": "NoDigitHere",
        })
        assert resp.status_code == 422

    def test_register_passwords_mismatch(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "username": "mismatch",
            "email": "mismatch@example.com",
            "password": "Test@1234",
            "password_confirm": "Different@999",
        })
        assert resp.status_code == 422

    def test_register_invalid_email(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "username": "bademail",
            "email": "not-an-email",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
        })
        assert resp.status_code == 422

    def test_register_username_with_spaces(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "username": "has spaces",
            "email": "spaces@example.com",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
        })
        assert resp.status_code == 422

    # ── Login ──────────────────────────────────────────────────────────────────
    def test_login_valid_credentials(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 50

    def test_login_wrong_password(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": registered_user["email"],
            "password": "WrongPassword999",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "nobody@nowhere.com",
            "password": "Test@1234",
        })
        assert resp.status_code == 401

    def test_login_empty_password(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": registered_user["email"],
            "password": "",
        })
        assert resp.status_code in (401, 422)

    # ── Token refresh ──────────────────────────────────────────────────────────
    def test_token_refresh_valid(self, client, user_tokens):
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": user_tokens["refresh_token"]
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_token_refresh_invalid(self, client):
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": "totally.invalid.token"
        })
        assert resp.status_code == 401

    def test_token_refresh_with_access_token(self, client, user_tokens):
        """Access token must not work as refresh token."""
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": user_tokens["access_token"]
        })
        assert resp.status_code == 401

    # ── Forgot/Reset password ─────────────────────────────────────────────────
    def test_forgot_password_existing_email(self, client, registered_user):
        resp = client.post("/api/v1/auth/forgot-password", json={
            "email": registered_user["email"]
        })
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_forgot_password_nonexistent_email(self, client):
        """Should not reveal whether email exists."""
        resp = client.post("/api/v1/auth/forgot-password", json={
            "email": "doesnotexist@example.com"
        })
        assert resp.status_code == 200

    def test_reset_password_invalid_token(self, client):
        resp = client.post("/api/v1/auth/reset-password", json={
            "token": "fakeinvalidtoken",
            "new_password": "NewPass@1234",
            "new_password_confirm": "NewPass@1234",
        })
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# 3. USER PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

class TestUserProfile:

    def test_get_me_authenticated(self, client, user_headers):
        resp = client.get("/api/v1/users/me", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "email" in data
        assert "password_hash" not in data
        assert "id" in data

    def test_get_me_unauthenticated(self, client):
        resp = client.get("/api/v1/users/me")
        assert resp.status_code == 403

    def test_get_me_bad_token(self, client):
        resp = client.get("/api/v1/users/me", headers={"Authorization": "Bearer bad.token.here"})
        assert resp.status_code == 401

    def test_update_profile_full_name(self, client, user_headers):
        resp = client.put("/api/v1/users/me", json={"full_name": "Updated Name"}, headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_update_profile_username(self, client, user_headers):
        resp = client.put("/api/v1/users/me", json={"username": "updateduser"}, headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == "updateduser"

    def test_get_user_stats(self, client, user_headers):
        resp = client.get("/api/v1/users/me/stats", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_summaries" in data
        assert "total_words_processed" in data
        assert "total_words_saved" in data

    def test_get_user_activity(self, client, user_headers):
        resp = client.get("/api/v1/users/me/activity", headers=user_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_change_password_valid(self, client, user_headers):
        resp = client.put("/api/v1/users/me/password", json={
            "current_password": "Test@1234",
            "new_password": "NewPass@5678",
            "new_password_confirm": "NewPass@5678",
        }, headers=user_headers)
        assert resp.status_code == 200

        # Change back
        resp2 = client.put("/api/v1/users/me/password", json={
            "current_password": "NewPass@5678",
            "new_password": "Test@1234",
            "new_password_confirm": "Test@1234",
        }, headers=user_headers)
        assert resp2.status_code == 200

    def test_change_password_wrong_current(self, client, user_headers):
        resp = client.put("/api/v1/users/me/password", json={
            "current_password": "WrongCurrentPass@1",
            "new_password": "NewPass@1234",
            "new_password_confirm": "NewPass@1234",
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_change_password_weak_new(self, client, user_headers):
        resp = client.put("/api/v1/users/me/password", json={
            "current_password": "Test@1234",
            "new_password": "weak",
            "new_password_confirm": "weak",
        }, headers=user_headers)
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 4. NLP ENGINE UNIT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestNLPEngine:

    def test_preprocessor_cleans_text(self):
        from app.services.nlp.preprocessor import clean_text
        dirty = "  Hello   World  \n\n\n\nFoo  "
        result = clean_text(dirty)
        assert "   " not in result
        assert result.startswith("Hello")

    def test_preprocessor_tokenizes_sentences(self):
        from app.services.nlp.preprocessor import tokenize_sentences
        text = "This is sentence one. This is sentence two. And sentence three."
        result = tokenize_sentences(text)
        assert len(result) == 3

    def test_preprocessor_tokenizes_words(self):
        from app.services.nlp.preprocessor import tokenize_words
        text = "Hello world! Testing 123."
        tokens = tokenize_words(text)
        assert "hello" in tokens
        assert "world" in tokens
        assert "!" not in tokens

    def test_preprocessor_removes_stopwords(self):
        from app.services.nlp.preprocessor import tokenize_words, remove_stopwords
        tokens = tokenize_words("this is a test of the system")
        filtered = remove_stopwords(tokens)
        assert "this" not in filtered
        assert "the" not in filtered
        assert "test" in filtered

    def test_preprocessor_counts_words(self):
        from app.services.nlp.preprocessor import count_words
        assert count_words("one two three four five") == 5
        assert count_words("") == 0

    def test_preprocess_full_pipeline(self):
        from app.services.nlp.preprocessor import preprocess
        result = preprocess(LONG_TEXT)
        assert result["sentence_count"] > 10
        assert result["word_count"] > 100
        assert len(result["filtered_words"]) < len(result["words"])

    def test_tfidf_returns_string(self):
        from app.services.nlp.tfidf import summarize_tfidf
        result = summarize_tfidf(LONG_TEXT, 0.3)
        assert isinstance(result, str)
        assert len(result) > 20

    def test_tfidf_shorter_than_original(self):
        from app.services.nlp.tfidf import summarize_tfidf
        result = summarize_tfidf(LONG_TEXT, 0.3)
        assert len(result) < len(LONG_TEXT)

    def test_tfidf_ratio_respected(self):
        from app.services.nlp.tfidf import summarize_tfidf
        from app.services.nlp.preprocessor import tokenize_sentences
        sentences = tokenize_sentences(LONG_TEXT)
        result_30 = summarize_tfidf(LONG_TEXT, 0.3)
        result_60 = summarize_tfidf(LONG_TEXT, 0.6)
        sentences_30 = tokenize_sentences(result_30)
        sentences_60 = tokenize_sentences(result_60)
        assert len(sentences_60) >= len(sentences_30)

    def test_tfidf_very_short_text(self):
        from app.services.nlp.tfidf import summarize_tfidf
        short = "Only two sentences. This is the second one."
        result = summarize_tfidf(short, 0.5)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_lsa_returns_string(self):
        from app.services.nlp.lsa import summarize_lsa
        result = summarize_lsa(LONG_TEXT, 0.3)
        assert isinstance(result, str)
        assert len(result) > 20

    def test_lsa_shorter_than_original(self):
        from app.services.nlp.lsa import summarize_lsa
        result = summarize_lsa(LONG_TEXT, 0.3)
        assert len(result) < len(LONG_TEXT)

    def test_lexrank_returns_string(self):
        from app.services.nlp.lexrank import summarize_lexrank
        result = summarize_lexrank(LONG_TEXT, 0.3)
        assert isinstance(result, str)
        assert len(result) > 20

    def test_luhn_returns_string(self):
        from app.services.nlp.luhn import summarize_luhn
        result = summarize_luhn(LONG_TEXT, 0.3)
        assert isinstance(result, str)
        assert len(result) > 20

    def test_all_algorithms_produce_different_output(self):
        """Each algorithm should typically produce distinct summaries."""
        from app.services.nlp.tfidf import summarize_tfidf
        from app.services.nlp.lsa import summarize_lsa
        from app.services.nlp.lexrank import summarize_lexrank
        from app.services.nlp.luhn import summarize_luhn

        results = {
            "tfidf":    summarize_tfidf(LONG_TEXT, 0.3),
            "lsa":      summarize_lsa(LONG_TEXT, 0.3),
            "lexrank":  summarize_lexrank(LONG_TEXT, 0.3),
            "luhn":     summarize_luhn(LONG_TEXT, 0.3),
        }
        unique = set(results.values())
        # At least 2 of the 4 should produce distinct output
        assert len(unique) >= 2


# ═══════════════════════════════════════════════════════════════════════════════
# 5. SUMMARIZATION API
# ═══════════════════════════════════════════════════════════════════════════════

class TestSummarizationAPI:

    def test_create_summary_tfidf(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT,
            "algorithm": "tfidf",
            "summary_ratio": 0.3,
        }, headers=user_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "summary_text" in data
        assert data["algorithm"] == "tfidf"
        assert data["original_word_count"] > 0
        assert data["summary_word_count"] > 0
        assert 0.0 < data["compression_ratio"] < 1.0
        assert data["processing_time"] >= 0.0
        assert "id" in data
        return data["id"]

    def test_create_summary_lsa(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "lsa", "summary_ratio": 0.4,
        }, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["algorithm"] == "lsa"

    def test_create_summary_lexrank(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "lexrank", "summary_ratio": 0.35,
        }, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["algorithm"] == "lexrank"

    def test_create_summary_luhn(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "luhn", "summary_ratio": 0.3,
        }, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["algorithm"] == "luhn"

    def test_create_summary_with_title(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf",
            "summary_ratio": 0.3, "title": "My Test Summary",
        }, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["title"] == "My Test Summary"

    def test_create_summary_invalid_algorithm(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "nonexistent", "summary_ratio": 0.3,
        }, headers=user_headers)
        assert resp.status_code == 422

    def test_create_summary_text_too_short(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": "Too short", "algorithm": "tfidf", "summary_ratio": 0.3,
        }, headers=user_headers)
        assert resp.status_code == 422

    def test_create_summary_invalid_ratio_too_low(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf", "summary_ratio": 0.01,
        }, headers=user_headers)
        assert resp.status_code == 422

    def test_create_summary_invalid_ratio_too_high(self, client, user_headers):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf", "summary_ratio": 1.5,
        }, headers=user_headers)
        assert resp.status_code == 422

    def test_create_summary_unauthenticated(self, client):
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf", "summary_ratio": 0.3,
        })
        assert resp.status_code == 403

    def test_list_summaries(self, client, user_headers):
        resp = client.get("/api/v1/summaries/", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    def test_list_summaries_pagination(self, client, user_headers):
        resp = client.get("/api/v1/summaries/?page=1&page_size=2", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) <= 2

    def test_list_summaries_search(self, client, user_headers):
        # First create a summary with a unique title
        client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf",
            "summary_ratio": 0.3, "title": "UNIQUE_SEARCH_TERM_XYZ",
        }, headers=user_headers)
        resp = client.get("/api/v1/summaries/?search=UNIQUE_SEARCH_TERM_XYZ", headers=user_headers)
        assert resp.status_code == 200

    def test_get_summary_by_id(self, client, user_headers):
        # Create one
        create_resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf", "summary_ratio": 0.3,
        }, headers=user_headers)
        summary_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/summaries/{summary_id}", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == summary_id

    def test_get_summary_not_found(self, client, user_headers):
        resp = client.get("/api/v1/summaries/00000000-0000-0000-0000-000000000000", headers=user_headers)
        assert resp.status_code == 404

    def test_delete_summary(self, client, user_headers):
        create_resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf", "summary_ratio": 0.3,
        }, headers=user_headers)
        summary_id = create_resp.json()["id"]

        del_resp = client.delete(f"/api/v1/summaries/{summary_id}", headers=user_headers)
        assert del_resp.status_code == 204

        get_resp = client.get(f"/api/v1/summaries/{summary_id}", headers=user_headers)
        assert get_resp.status_code == 404

    def test_delete_nonexistent_summary(self, client, user_headers):
        resp = client.delete("/api/v1/summaries/00000000-0000-0000-0000-000000000000", headers=user_headers)
        assert resp.status_code == 404

    def test_export_summary_txt(self, client, user_headers):
        create_resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf", "summary_ratio": 0.3,
        }, headers=user_headers)
        sid = create_resp.json()["id"]
        resp = client.get(f"/api/v1/summaries/{sid}/export?format=txt", headers=user_headers)
        assert resp.status_code == 200
        assert "text/plain" in resp.headers["content-type"]

    def test_export_summary_invalid_format(self, client, user_headers):
        create_resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf", "summary_ratio": 0.3,
        }, headers=user_headers)
        sid = create_resp.json()["id"]
        resp = client.get(f"/api/v1/summaries/{sid}/export?format=exe", headers=user_headers)
        assert resp.status_code == 422

    def test_user_cannot_access_other_users_summary(self, client, user_headers, admin_headers):
        # Admin creates summary
        create_resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT, "algorithm": "tfidf", "summary_ratio": 0.3,
        }, headers=admin_headers)
        admin_sid = create_resp.json()["id"]

        # Regular user tries to access it
        resp = client.get(f"/api/v1/summaries/{admin_sid}", headers=user_headers)
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# 6. FILE UPLOAD
# ═══════════════════════════════════════════════════════════════════════════════

class TestFileUpload:

    def test_upload_txt_file(self, client, user_headers):
        content = LONG_TEXT.encode("utf-8")
        resp = client.post(
            "/api/v1/summaries/upload",
            files={"file": ("test.txt", content, "text/plain")},
            data={"algorithm": "tfidf", "summary_ratio": "0.3"},
            headers=user_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["source_type"] == "txt"
        assert data["file_name"] == "test.txt"

    def test_upload_invalid_extension(self, client, user_headers):
        resp = client.post(
            "/api/v1/summaries/upload",
            files={"file": ("malware.exe", b"bad content", "application/octet-stream")},
            data={"algorithm": "tfidf", "summary_ratio": "0.3"},
            headers=user_headers,
        )
        assert resp.status_code == 400

    def test_upload_without_auth(self, client):
        content = LONG_TEXT.encode("utf-8")
        resp = client.post(
            "/api/v1/summaries/upload",
            files={"file": ("test.txt", content, "text/plain")},
            data={"algorithm": "tfidf", "summary_ratio": "0.3"},
        )
        assert resp.status_code == 403

    def test_upload_empty_txt_file(self, client, user_headers):
        resp = client.post(
            "/api/v1/summaries/upload",
            files={"file": ("empty.txt", b"short", "text/plain")},
            data={"algorithm": "tfidf", "summary_ratio": "0.3"},
            headers=user_headers,
        )
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# 7. ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestAdminEndpoints:

    def test_admin_list_users(self, client, admin_headers):
        resp = client.get("/api/v1/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_admin_list_users_with_search(self, client, admin_headers):
        resp = client.get("/api/v1/admin/users?search=test", headers=admin_headers)
        assert resp.status_code == 200

    def test_admin_create_user(self, client, admin_headers):
        resp = client.post("/api/v1/admin/users", json={
            "username": "adminmadeuser",
            "email": "adminmade@example.com",
            "password": "Admin@1234",
            "full_name": "Admin Made",
            "role": "user",
        }, headers=admin_headers)
        assert resp.status_code in (201, 409)

    def test_admin_update_user(self, client, admin_headers):
        # Get any user
        users = client.get("/api/v1/admin/users", headers=admin_headers).json()
        non_admin = next((u for u in users if u["role"] == "user"), None)
        if not non_admin:
            pytest.skip("No non-admin user available")
        resp = client.put(f"/api/v1/admin/users/{non_admin['id']}",
                          json={"full_name": "Updated by Admin"}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated by Admin"

    def test_admin_toggle_ban(self, client, admin_headers):
        users = client.get("/api/v1/admin/users", headers=admin_headers).json()
        non_admin = next((u for u in users if u["role"] == "user"), None)
        if not non_admin:
            pytest.skip("No non-admin user available")
        resp = client.post(f"/api/v1/admin/users/{non_admin['id']}/ban", headers=admin_headers)
        assert resp.status_code == 200
        assert "is_banned" in resp.json()
        # Unban
        client.post(f"/api/v1/admin/users/{non_admin['id']}/ban", headers=admin_headers)

    def test_admin_cannot_delete_self(self, client, admin_headers):
        me = client.get("/api/v1/users/me", headers=admin_headers).json()
        resp = client.delete(f"/api/v1/admin/users/{me['id']}", headers=admin_headers)
        assert resp.status_code == 400

    def test_admin_list_summaries(self, client, admin_headers):
        resp = client.get("/api/v1/admin/summaries", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "items" in data

    def test_admin_analytics(self, client, admin_headers):
        resp = client.get("/api/v1/admin/analytics", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        required_keys = [
            "total_users", "active_users", "total_summaries",
            "summaries_today", "most_used_algorithm",
            "daily_activity", "monthly_activity", "algorithm_distribution",
        ]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"
        assert data["total_users"] > 0
        assert isinstance(data["daily_activity"], list)
        assert isinstance(data["algorithm_distribution"], list)

    def test_admin_logs(self, client, admin_headers):
        resp = client.get("/api/v1/admin/logs", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "items" in data

    def test_admin_get_settings(self, client, admin_headers):
        resp = client.get("/api/v1/admin/settings", headers=admin_headers)
        assert resp.status_code == 200
        settings = resp.json()
        assert isinstance(settings, list)
        assert len(settings) > 0
        keys = [s["key"] for s in settings]
        assert "site_name" in keys

    def test_admin_update_setting(self, client, admin_headers):
        resp = client.put("/api/v1/admin/settings/site_name",
                          json={"value": "TestSite"}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["value"] == "TestSite"
        # Restore
        client.put("/api/v1/admin/settings/site_name",
                   json={"value": "SummarizeAI"}, headers=admin_headers)

    def test_admin_update_nonexistent_setting(self, client, admin_headers):
        resp = client.put("/api/v1/admin/settings/this_key_does_not_exist",
                          json={"value": "x"}, headers=admin_headers)
        assert resp.status_code == 404

    def test_regular_user_cannot_access_admin(self, client, user_headers):
        resp = client.get("/api/v1/admin/users", headers=user_headers)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_admin(self, client):
        resp = client.get("/api/v1/admin/users")
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# 8. SECURITY TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestSecurity:

    def test_security_headers_present(self, client):
        resp = client.get("/api/v1/health")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert "Content-Security-Policy" in resp.headers

    def test_no_password_in_response(self, client, user_headers):
        resp = client.get("/api/v1/users/me", headers=user_headers)
        body = resp.text
        assert "password_hash" not in body
        assert "password" not in body

    def test_sql_injection_in_search(self, client, user_headers):
        """SQLi attempt in search parameter should not cause a 500."""
        payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "1; SELECT * FROM users",
            "\" OR 1=1 --",
        ]
        for payload in payloads:
            resp = client.get(f"/api/v1/summaries/?search={payload}", headers=user_headers)
            assert resp.status_code in (200, 422), f"Unexpected status for payload: {payload!r}"

    def test_xss_in_summary_title(self, client, user_headers):
        """XSS content in title should be stored/returned without executing."""
        resp = client.post("/api/v1/summaries/", json={
            "text": LONG_TEXT,
            "algorithm": "tfidf",
            "summary_ratio": 0.3,
            "title": "<script>alert('xss')</script>",
        }, headers=user_headers)
        assert resp.status_code == 201
        # The title should be stored but won't execute in JSON context
        assert resp.json()["title"] is not None

    def test_large_payload_rejected(self, client, user_headers):
        """Extremely large text should be handled gracefully."""
        huge_text = "A" * 600_000  # 600K chars > 500K limit
        resp = client.post("/api/v1/summaries/", json={
            "text": huge_text, "algorithm": "tfidf", "summary_ratio": 0.3,
        }, headers=user_headers)
        assert resp.status_code in (400, 422)

    def test_expired_token_rejected(self, client):
        """A fabricated expired JWT should be rejected."""
        expired = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwfQ."
            "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        )
        resp = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {expired}"})
        assert resp.status_code == 401

    def test_malformed_token_rejected(self, client):
        resp = client.get("/api/v1/users/me", headers={"Authorization": "Bearer notavalidjwt"})
        assert resp.status_code == 401

    def test_missing_authorization_header(self, client):
        resp = client.get("/api/v1/users/me")
        assert resp.status_code == 403

    def test_wrong_auth_scheme(self, client):
        resp = client.get("/api/v1/users/me", headers={"Authorization": "Basic dXNlcjpwYXNz"})
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# 9. SANITIZATION UNIT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestSanitization:

    def test_strip_html_tags(self):
        from app.core.sanitization import strip_html_tags
        import re as _re
        result = _re.sub(r"\s+", " ", strip_html_tags("<b>Hello</b> <script>bad()</script> World")).strip()
        assert result == "Hello World"

    def test_sanitize_string_null_bytes(self):
        from app.core.sanitization import sanitize_string
        result = sanitize_string("hello\x00world")
        assert "\x00" not in result

    def test_sanitize_string_truncation(self):
        from app.core.sanitization import sanitize_string
        result = sanitize_string("A" * 200, max_length=50)
        assert len(result) == 50

    def test_sanitize_filename_traversal(self):
        from app.core.sanitization import sanitize_filename
        assert ".." not in sanitize_filename("../../etc/passwd")
        assert "/" not in sanitize_filename("path/to/file.txt")

    def test_sanitize_filename_preserves_extension(self):
        from app.core.sanitization import sanitize_filename
        result = sanitize_filename("my_document.pdf")
        assert result.endswith(".pdf")

    def test_validate_text_input_too_short(self):
        from app.core.sanitization import validate_text_input
        with pytest.raises(ValueError, match="at least"):
            validate_text_input("short", min_len=50)

    def test_validate_text_input_too_long(self):
        from app.core.sanitization import validate_text_input
        with pytest.raises(ValueError, match="maximum"):
            validate_text_input("A" * 600_000, max_len=500_000)

    def test_validate_text_input_valid(self):
        from app.core.sanitization import validate_text_input
        result = validate_text_input(LONG_TEXT[:500])
        assert len(result) > 0

    def test_validate_text_removes_null_bytes(self):
        from app.core.sanitization import validate_text_input
        text = "A" * 100 + "\x00" + "B" * 100
        result = validate_text_input(text)
        assert "\x00" not in result
