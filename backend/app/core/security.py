import hashlib
import hmac
import secrets
from datetime import timedelta

from pwdlib import PasswordHash

from app.core.config import settings
from app.models import now_utc

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except Exception:
        return False


def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def constant_time_hash_matches(value: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_token(value), expected_hash)


def new_session_values() -> tuple[str, str, str]:
    raw_token = secrets.token_urlsafe(48)
    csrf_token = hmac.new(settings.secret_key.encode(), f"csrf:{raw_token}".encode(), hashlib.sha256).hexdigest()
    return raw_token, hash_token(raw_token), csrf_token


def csrf_token_for_session(raw_token: str) -> str:
    return hmac.new(settings.secret_key.encode(), f"csrf:{raw_token}".encode(), hashlib.sha256).hexdigest()


def session_expiry():
    return now_utc() + timedelta(hours=settings.session_ttl_hours)
