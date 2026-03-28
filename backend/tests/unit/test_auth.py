"""Tests for JWT auth utilities."""
import pytest
import jwt as pyjwt
from fastapi import HTTPException
from unittest.mock import patch

TEST_SECRET = "super-secret-test-key-for-unit-tests"


def _make_hs256_token(payload: dict, secret: str = TEST_SECRET) -> str:
    return pyjwt.encode(payload, secret, algorithm="HS256")


# ---------------------------------------------------------------------------
# decode_supabase_jwt
# ---------------------------------------------------------------------------

def test_valid_hs256_token_decodes():
    from app.utils.auth import decode_supabase_jwt

    payload = {"sub": "user-abc-123", "email": "user@example.com"}
    token = _make_hs256_token(payload)

    with patch("app.utils.auth.settings") as mock_settings:
        mock_settings.supabase_jwt_secret = TEST_SECRET
        result = decode_supabase_jwt(token)

    assert result["sub"] == "user-abc-123"
    assert result["email"] == "user@example.com"


def test_malformed_token_raises_401():
    from app.utils.auth import decode_supabase_jwt

    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_jwt("this.is.not.a.jwt")

    assert exc_info.value.status_code == 401


def test_completely_invalid_token_raises_401():
    from app.utils.auth import decode_supabase_jwt

    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_jwt("notavalidtoken")

    assert exc_info.value.status_code == 401


def test_wrong_secret_raises_401():
    from app.utils.auth import decode_supabase_jwt

    payload = {"sub": "user-123"}
    token = _make_hs256_token(payload, secret="correct-secret")

    with patch("app.utils.auth.settings") as mock_settings:
        mock_settings.supabase_jwt_secret = "wrong-secret"
        with pytest.raises(HTTPException) as exc_info:
            decode_supabase_jwt(token)

    assert exc_info.value.status_code == 401


def test_expired_token_raises_401():
    from app.utils.auth import decode_supabase_jwt
    import time

    payload = {"sub": "user-123", "exp": int(time.time()) - 3600}  # 1 hour ago
    token = _make_hs256_token(payload)

    with patch("app.utils.auth.settings") as mock_settings:
        mock_settings.supabase_jwt_secret = TEST_SECRET
        with pytest.raises(HTTPException) as exc_info:
            decode_supabase_jwt(token)

    assert exc_info.value.status_code == 401
