from datetime import timedelta
import hashlib
import hmac
import secrets
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import AdminUser, CsrfAdminUser
from app.core.security import csrf_token_for_session, hash_token, new_session_values, session_expiry, verify_password
from app.models import AuthSession, LoginAttempt, User, now_utc
from app.schemas import LoginInput, LoginOutput

router = APIRouter(prefix="/auth", tags=["authentication"])
ATTEMPT_WINDOW = timedelta(minutes=15)
LOCK_DURATION = timedelta(minutes=15)
MAX_FAILURES = 5


def check_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in settings.frontend_origins:
        raise HTTPException(status_code=403, detail="Origin not allowed.")


@router.post("/imagekit-auth")
def imagekit_auth(request: Request, user: CsrfAdminUser):
    """Issue short-lived ImageKit upload credentials to an authenticated admin."""
    check_origin(request)
    if not settings.imagekit_private_key or not settings.imagekit_public_key:
        raise HTTPException(status_code=503, detail="Le téléversement d’images n’est pas encore configuré sur le serveur.")

    token = secrets.token_urlsafe(24)
    expire = int(time.time()) + 300
    signature = hmac.new(
        settings.imagekit_private_key.encode("utf-8"),
        f"{token}{expire}".encode("utf-8"),
        hashlib.sha1,
    ).hexdigest()
    return {"token": token, "expire": expire, "signature": signature, "publicKey": settings.imagekit_public_key}


@router.post("/login", response_model=LoginOutput)
def login(payload: LoginInput, request: Request, response: Response, db: Session = Depends(get_db)):
    check_origin(request)
    address = request.client.host if request.client else "unknown"
    address_hash = hash_token(f"{settings.secret_key}:{address}")
    now = now_utc()
    attempt = db.get(LoginAttempt, address_hash)
    if attempt and attempt.locked_until and attempt.locked_until > now:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.", headers={"Retry-After": str(max(1, int((attempt.locked_until - now).total_seconds())))})
    if attempt and now - attempt.window_started_at > ATTEMPT_WINDOW:
        attempt.failures = 0
        attempt.window_started_at = now
        attempt.locked_until = None

    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        if attempt is None:
            attempt = LoginAttempt(ip_hash=address_hash, failures=0, window_started_at=now)
            db.add(attempt)
        attempt.failures += 1
        if attempt.failures >= MAX_FAILURES:
            attempt.locked_until = now + LOCK_DURATION
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if attempt:
        db.delete(attempt)
    raw_token, token_hash, csrf_token = new_session_values()
    db.add(AuthSession(user_id=user.id, token_hash=token_hash, csrf_hash=hash_token(csrf_token), expires_at=session_expiry()))
    db.commit()
    response.set_cookie(
        key=settings.cookie_name,
        value=raw_token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="none" if settings.app_env == "production" else "lax",
        max_age=settings.session_ttl_hours * 3600,
        path="/api/v1",
    )
    return LoginOutput(id=user.id, email=user.email, full_name=user.full_name, csrf_token=csrf_token)


@router.get("/me")
def me(request: Request, user: AdminUser):
    return {"id": str(user.id), "email": user.email, "full_name": user.full_name, "csrf_token": csrf_token_for_session(request.state.raw_session_token)}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, user: CsrfAdminUser, db: Session = Depends(get_db)):
    check_origin(request)
    session = request.state.auth_session
    session.revoked_at = now_utc()
    db.commit()
    response.delete_cookie(settings.cookie_name, path="/api/v1", httponly=True, secure=settings.app_env == "production", samesite="none" if settings.app_env == "production" else "lax")
    return None
