import logging
from jwt import PyJWKClient, InvalidTokenError, get_unverified_header
from jwt import decode as jwt_decode
from fastapi import HTTPException, status
from app.config import settings

logger = logging.getLogger("auth")


_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(
            f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        )
    return _jwks_client


def decode_supabase_jwt(token: str) -> dict:
    # Use PyJWT's own header decoder — handles padding correctly
    try:
        header = get_unverified_header(token)
    except InvalidTokenError as e:
        logger.warning("JWT header decode failed", extra={"reason": str(e)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    alg = header.get("alg", "HS256")

    try:
        if alg in ("RS256", "ES256", "ES384", "ES512", "RS384", "RS512"):
            # Asymmetric algorithms — verify using Supabase's JWKS endpoint
            client = _get_jwks_client()
            signing_key = client.get_signing_key_from_jwt(token)
            return jwt_decode(
                token,
                signing_key.key,
                algorithms=["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"],
                options={"verify_aud": False},
            )
        else:
            return jwt_decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
    except InvalidTokenError as e:
        logger.warning(
            "JWT verification failed",
            extra={"reason": str(e), "alg": alg},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Catches JWKS fetch failures, network errors, etc.
        logger.warning(
            "JWT verification error",
            extra={"reason": str(e), "alg": alg},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
