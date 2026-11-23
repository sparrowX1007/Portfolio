from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LoginInput(StrictModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class LoginOutput(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    csrf_token: str


class ProfileInput(StrictModel):
    email: EmailStr
    location: str = Field(min_length=1, max_length=160)
    availability: Literal["available", "unavailable", "open"] = "open"
    photo_url: HttpUrl | None = None
    cv_url: HttpUrl | None = None
    translations: dict[Literal["fr", "en"], dict[str, str]] = Field(default_factory=dict)


class SocialLinkInput(StrictModel):
    platform: str = Field(min_length=1, max_length=50)
    url: HttpUrl
    display_order: int = Field(default=0, ge=0)
    is_public: bool = True


class ProjectImageInput(StrictModel):
    image_url: HttpUrl
    alt_text: dict[Literal["fr", "en"], str] = Field(default_factory=dict)
    display_order: int = Field(default=0, ge=0)


class ProjectInput(StrictModel):
    image_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    demo_url: HttpUrl | None = None
    completed_on: str | None = Field(default=None, max_length=30)
    is_featured: bool = False
    status: Literal["draft", "published"] = "draft"
    display_order: int = Field(default=0, ge=0)
    translations: dict[Literal["fr", "en"], dict[str, str]] = Field(default_factory=dict)
    skill_ids: list[UUID] = Field(default_factory=list)
    images: list[ProjectImageInput] = Field(default_factory=list, max_length=20)


class SkillInput(StrictModel):
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=80)
    level: int | None = Field(default=None, ge=0, le=100)
    icon: str | None = Field(default=None, max_length=255)
    display_order: int = Field(default=0, ge=0)
    is_public: bool = True


class EducationInput(StrictModel):
    institution: str = Field(min_length=1, max_length=200)
    degree: str = Field(min_length=1, max_length=200)
    field_of_study: str | None = Field(default=None, max_length=160)
    started_on: str | None = Field(default=None, max_length=30)
    ended_on: str | None = Field(default=None, max_length=30)
    is_current: bool = False
    is_public: bool = True
    translations: dict[Literal["fr", "en"], dict[str, str]] = Field(default_factory=dict)


class ExperienceInput(StrictModel):
    company: str = Field(min_length=1, max_length=200)
    position: str = Field(min_length=1, max_length=160)
    experience_type: str | None = Field(default=None, max_length=80)
    started_on: str | None = Field(default=None, max_length=30)
    ended_on: str | None = Field(default=None, max_length=30)
    is_current: bool = False
    status: Literal["draft", "published"] = "draft"
    translations: dict[Literal["fr", "en"], dict[str, str]] = Field(default_factory=dict)


class CertificationInput(StrictModel):
    issuer: str = Field(min_length=1, max_length=200)
    awarded_on: str | None = Field(default=None, max_length=30)
    expires_on: str | None = Field(default=None, max_length=30)
    document_url: HttpUrl | None = None
    verification_url: HttpUrl | None = None
    is_public: bool = True
    translations: dict[Literal["fr", "en"], dict[str, str]] = Field(default_factory=dict)


class TrainingInput(StrictModel):
    provider: str | None = Field(default=None, max_length=200)
    started_on: str | None = Field(default=None, max_length=30)
    completed_on: str | None = Field(default=None, max_length=30)
    is_public: bool = True
    translations: dict[Literal["fr", "en"], dict[str, str]] = Field(default_factory=dict)


class MessageInput(StrictModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=240)
    content: str = Field(min_length=1, max_length=10000)


class MessageReadInput(StrictModel):
    is_read: bool


class SettingInput(StrictModel):
    key: str = Field(min_length=1, max_length=100, pattern="^[a-zA-Z0-9._-]+$")
    value: dict[str, Any]


class Page(BaseModel):
    items: list[dict[str, Any]]
    total: int
    limit: int
    offset: int
