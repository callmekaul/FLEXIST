import logging

import httpx
from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt, jwk
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.models.user import User, UserRole

logger = logging.getLogger("uvicorn.error")

# Cache the JWKS keys at module level
_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        logger.warning(f"[AUTH] Fetching JWKS from {url}")
        resp = httpx.get(url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        logger.warning(f"[AUTH] JWKS loaded: {len(_jwks_cache.get('keys', []))} keys")
    return _jwks_cache


def _get_signing_key(token: str):
    """Find the matching key from JWKS for the token's kid."""
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    jwks_data = _get_jwks()

    for key_data in jwks_data.get("keys", []):
        if key_data.get("kid") == kid:
            return key_data

    raise JWTError(f"No matching key found for kid={kid}")


def get_current_user(
    request: Request, session: Session = Depends(get_session)
) -> User:
    token = request.headers.get("Authorization", "")
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = token[7:]

    try:
        key_data = _get_signing_key(token)
        payload = jwt.decode(
            token,
            key_data,
            algorithms=["ES256"],
            audience="authenticated",
        )
        logger.warning("[AUTH] Token verified OK")
    except JWTError as e:
        logger.warning(f"[AUTH] Verify failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    supabase_uid: str = payload.get("sub", "")
    if not supabase_uid:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = session.exec(
        select(User).where(User.supabase_uid == supabase_uid)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")

    return user


def require_role(role: UserRole):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Only allow platform admins (configured via ADMIN_EMAILS env var)."""
    admin_emails = [e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()]
    if user.email.lower() not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
