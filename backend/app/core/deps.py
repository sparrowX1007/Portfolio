from datetime import datetime, timezone
import hashlib
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import constant_time_hash_matches
from app.models import AuthSession, User


def get_current_admin(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    raw_token = request.cookies.get(settings.cookie_name)
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    session = db.query(AuthSession).filter(
        AuthSession.token_hash == hashlib.sha256(raw_token.encode()).hexdigest(),
        AuthSession.revoked_at.is_(None),
        AuthSession.expires_at > datetime.now(timezone.utc),
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired.")
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account disabled.")
    request.state.auth_session = session
    request.state.raw_session_token = raw_token
    return user


def require_csrf(
    request: Request,
    x_csrf_token: str | None = Header(default=None),
    user: User = Depends(get_current_admin),
) -> User:
    session = getattr(request.state, "auth_session", None)
    if not session or not x_csrf_token or not constant_time_hash_matches(x_csrf_token, session.csrf_hash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token.")
    return user


AdminUser = Annotated[User, Depends(get_current_admin)]
CsrfAdminUser = Annotated[User, Depends(require_csrf)]
