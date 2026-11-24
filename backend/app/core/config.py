from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "David Raharison Portfolio API"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/portfolio"
    secret_key: str = "development-only-change-this-secret-key-now"
    frontend_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]
    session_ttl_hours: int = 12
    cookie_name: str = "portfolio_session"
    imagekit_private_key: str | None = None
    imagekit_public_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Neon and Render often provide postgresql:// URLs; use psycopg 3 explicitly.
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        return value.replace("postgresql://", "postgresql+psycopg://", 1) if value.startswith("postgresql://") else value

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def parse_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    def validate_production_secrets(self) -> None:
        if self.app_env == "production" and (len(self.secret_key) < 32 or self.secret_key.startswith("development")):
            raise RuntimeError("SECRET_KEY must be a strong, unique value in production.")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_production_secrets()
    return settings


settings = get_settings()
