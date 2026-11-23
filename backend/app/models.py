import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Timestamps:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)


class PublicationStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


publication_status_type = Enum(PublicationStatus, name="publication_status")


class User(Timestamps, Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    csrf_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    ip_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    failures: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Profile(Timestamps, Base):
    __tablename__ = "profiles"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    location: Mapped[str] = mapped_column(String(160), nullable=False)
    availability: Mapped[str] = mapped_column(String(40), default="open", nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(1000))
    cv_url: Mapped[str | None] = mapped_column(String(1000))
    translations: Mapped[list["ProfileTranslation"]] = relationship(back_populates="profile", cascade="all, delete-orphan")


class TranslationRow(Timestamps, Base):
    __abstract__ = True
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    locale: Mapped[str] = mapped_column(String(2), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class ProfileTranslation(TranslationRow):
    __tablename__ = "profile_translations"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    profile: Mapped[Profile] = relationship(back_populates="translations")
    __table_args__ = (UniqueConstraint("profile_id", "locale", name="uq_profile_translation_locale"),)


class SocialLink(Timestamps, Base):
    __tablename__ = "social_links"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Project(Timestamps, Base):
    __tablename__ = "projects"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    image_url: Mapped[str | None] = mapped_column(String(1000))
    github_url: Mapped[str | None] = mapped_column(String(1000))
    demo_url: Mapped[str | None] = mapped_column(String(1000))
    completed_on: Mapped[str | None] = mapped_column(String(30))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[PublicationStatus] = mapped_column(publication_status_type, default=PublicationStatus.DRAFT, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    translations: Mapped[list["ProjectTranslation"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    skills: Mapped[list["ProjectSkill"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    images: Mapped[list["ProjectImage"]] = relationship(back_populates="project", cascade="all, delete-orphan", order_by="ProjectImage.display_order")


class ProjectTranslation(TranslationRow):
    __tablename__ = "project_translations"
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project: Mapped[Project] = relationship(back_populates="translations")
    __table_args__ = (UniqueConstraint("project_id", "locale", name="uq_project_translation_locale"),)


class ProjectImage(Timestamps, Base):
    __tablename__ = "project_images"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    image_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    alt_text: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    project: Mapped[Project] = relationship(back_populates="images")


class Skill(Timestamps, Base):
    __tablename__ = "skills"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    level: Mapped[int | None] = mapped_column(Integer)
    icon: Mapped[str | None] = mapped_column(String(255))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    projects: Mapped[list["ProjectSkill"]] = relationship(back_populates="skill", cascade="all, delete-orphan")


class ProjectSkill(Base):
    __tablename__ = "project_skills"
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    project: Mapped[Project] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship(back_populates="projects")


class Education(Timestamps, Base):
    __tablename__ = "education"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    institution: Mapped[str] = mapped_column(String(200), nullable=False)
    degree: Mapped[str] = mapped_column(String(200), nullable=False)
    field_of_study: Mapped[str | None] = mapped_column(String(160))
    started_on: Mapped[str | None] = mapped_column(String(30))
    ended_on: Mapped[str | None] = mapped_column(String(30))
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[list["EducationTranslation"]] = relationship(back_populates="education", cascade="all, delete-orphan")


class EducationTranslation(TranslationRow):
    __tablename__ = "education_translations"
    education_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("education.id", ondelete="CASCADE"), nullable=False)
    education: Mapped[Education] = relationship(back_populates="translations")
    __table_args__ = (UniqueConstraint("education_id", "locale", name="uq_education_translation_locale"),)


class Experience(Timestamps, Base):
    __tablename__ = "experiences"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[str] = mapped_column(String(160), nullable=False)
    experience_type: Mapped[str | None] = mapped_column(String(80))
    started_on: Mapped[str | None] = mapped_column(String(30))
    ended_on: Mapped[str | None] = mapped_column(String(30))
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[PublicationStatus] = mapped_column(publication_status_type, default=PublicationStatus.DRAFT, nullable=False)
    translations: Mapped[list["ExperienceTranslation"]] = relationship(back_populates="experience", cascade="all, delete-orphan")


class ExperienceTranslation(TranslationRow):
    __tablename__ = "experience_translations"
    experience_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    experience: Mapped[Experience] = relationship(back_populates="translations")
    __table_args__ = (UniqueConstraint("experience_id", "locale", name="uq_experience_translation_locale"),)


class Certification(Timestamps, Base):
    __tablename__ = "certifications"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    issuer: Mapped[str] = mapped_column(String(200), nullable=False)
    awarded_on: Mapped[str | None] = mapped_column(String(30))
    expires_on: Mapped[str | None] = mapped_column(String(30))
    document_url: Mapped[str | None] = mapped_column(String(1000))
    verification_url: Mapped[str | None] = mapped_column(String(1000))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[list["CertificationTranslation"]] = relationship(back_populates="certification", cascade="all, delete-orphan")


class CertificationTranslation(TranslationRow):
    __tablename__ = "certification_translations"
    certification_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("certifications.id", ondelete="CASCADE"), nullable=False)
    certification: Mapped[Certification] = relationship(back_populates="translations")
    __table_args__ = (UniqueConstraint("certification_id", "locale", name="uq_certification_translation_locale"),)


class Training(Timestamps, Base):
    __tablename__ = "trainings"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    provider: Mapped[str | None] = mapped_column(String(200))
    started_on: Mapped[str | None] = mapped_column(String(30))
    completed_on: Mapped[str | None] = mapped_column(String(30))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[list["TrainingTranslation"]] = relationship(back_populates="training", cascade="all, delete-orphan")


class TrainingTranslation(TranslationRow):
    __tablename__ = "training_translations"
    training_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trainings.id", ondelete="CASCADE"), nullable=False)
    training: Mapped[Training] = relationship(back_populates="translations")
    __table_args__ = (UniqueConstraint("training_id", "locale", name="uq_training_translation_locale"),)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    subject: Mapped[str] = mapped_column(String(240), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_ip_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True, nullable=False)


class SiteSetting(Timestamps, Base):
    __tablename__ = "site_settings"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


Index("ix_projects_status_order", Project.status, Project.display_order)
Index("ix_experiences_status", Experience.status)
Index("ix_login_attempts_locked_until", LoginAttempt.locked_until)
