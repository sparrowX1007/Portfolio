from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.resources import admin_router, public_router
from app.core.config import settings
from app.core.db import engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Public portfolio content API and authenticated administration API.",
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url="/redoc" if settings.app_env == "development" else None,
    openapi_url="/openapi.json" if settings.app_env == "development" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)

api_v1 = "/api/v1"
app.include_router(auth_router, prefix=api_v1)
app.include_router(public_router, prefix=f"{api_v1}/public")
app.include_router(admin_router, prefix=f"{api_v1}/admin")


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
