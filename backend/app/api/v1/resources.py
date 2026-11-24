from datetime import timedelta
import json
import urllib.error
import urllib.request
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.v1.resource_factory import build_resource_routers
from app.core.db import get_db
from app.core.deps import get_current_admin, require_csrf
from app.core.security import hash_token
from app.core.config import settings
from app.models import (
    Certification, CertificationTranslation, Education, EducationTranslation,
    Experience, ExperienceTranslation, Message, Profile, ProfileTranslation, Project,
    ProjectTranslation, PublicationStatus, SiteSetting, Skill, SocialLink, Training,
    TrainingTranslation, now_utc,
)
from app.schemas import (
    CertificationInput, EducationInput, ExperienceInput, MessageInput, ProfileInput,
    ProjectInput, SettingInput, SkillInput, SocialLinkInput, TrainingInput, MessageReadInput,
)

public_router = APIRouter()
admin_router = APIRouter()


class TranslationInput(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=50)


@admin_router.post("/translate", dependencies=[Depends(require_csrf)], tags=["admin:translation"])
def translate_content(payload: TranslationInput):
    if not settings.deepl_api_key:
        raise HTTPException(status_code=503, detail="La traduction automatique n’est pas encore configurée sur le serveur.")
    texts = [text.strip() for text in payload.texts]
    if any(not text for text in texts) or sum(len(text) for text in texts) > 30000:
        raise HTTPException(status_code=400, detail="Le texte à traduire est vide ou trop long.")

    endpoint = "https://api-free.deepl.com/v2/translate" if settings.deepl_api_key.endswith(":fx") else "https://api.deepl.com/v2/translate"
    body = json.dumps({"text": texts, "source_lang": "FR", "target_lang": "EN-GB"}).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            "Authorization": f"DeepL-Auth-Key {settings.deepl_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        if error.code in (456, 429):
            raise HTTPException(status_code=429, detail="Quota de traduction DeepL atteint ou temporairement limité.") from error
        raise HTTPException(status_code=502, detail="DeepL n’a pas pu traduire ces textes. Vérifie la clé API.") from error
    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(status_code=502, detail="Le service de traduction DeepL est temporairement inaccessible.")

    return {"translations": [item["text"] for item in result.get("translations", [])]}

_resources = [
    ("profiles", Profile, ProfileInput, None, ("email", "location"), True, ProfileTranslation),
    ("social-links", SocialLink, SocialLinkInput, SocialLink.is_public.is_(True), ("platform",), True, None),
    ("projects", Project, ProjectInput, Project.status == PublicationStatus.PUBLISHED, ("completed_on",), True, ProjectTranslation),
    ("skills", Skill, SkillInput, Skill.is_public.is_(True), ("name", "category"), True, None),
    ("education", Education, EducationInput, Education.is_public.is_(True), ("institution", "degree"), True, EducationTranslation),
    ("experiences", Experience, ExperienceInput, Experience.status == PublicationStatus.PUBLISHED, ("company", "position"), True, ExperienceTranslation),
    ("certifications", Certification, CertificationInput, Certification.is_public.is_(True), ("issuer",), True, CertificationTranslation),
    ("trainings", Training, TrainingInput, Training.is_public.is_(True), ("provider",), True, TrainingTranslation),
    ("settings", SiteSetting, SettingInput, SiteSetting.key.like("public.%"), ("key",), True, None),
]

for resource, model, schema, public_filter, search_fields, allow_create, translation_model in _resources:
    public_part, admin_part = build_resource_routers(
        resource=resource,
        model=model,
        schema=schema,
        public_filter=public_filter,
        search_fields=search_fields,
        translation_model=translation_model,
        allow_create=allow_create,
        allow_delete=True,
    )
    public_router.include_router(public_part)
    admin_router.include_router(admin_part)


@public_router.post("/messages", status_code=status.HTTP_201_CREATED, tags=["messages"])
def create_message(payload: MessageInput, request: Request, db: Session = Depends(get_db)):
    address = request.client.host if request.client else "unknown"
    address_hash = hash_token(f"{settings.secret_key}:{address}")
    cutoff = now_utc() - timedelta(minutes=15)
    recent_count = db.query(Message).filter(Message.source_ip_hash == address_hash, Message.created_at >= cutoff).count()
    if recent_count >= 5:
        raise HTTPException(status_code=429, detail="Please wait before sending another message.")
    message = Message(**payload.model_dump(mode="python"), source_ip_hash=address_hash)
    db.add(message)
    db.commit()
    return {"received": True}


@admin_router.get("/messages", tags=["admin:messages"], dependencies=[Depends(get_current_admin)])
def list_messages(
    unread: bool | None = None,
    q: str | None = Query(None, max_length=100),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Message)
    if unread is not None:
        query = query.filter(Message.is_read.is_(not unread))
    if q:
        query = query.filter(or_(Message.name.ilike(f"%{q}%"), Message.email.ilike(f"%{q}%"), Message.subject.ilike(f"%{q}%")))
    total = query.count()
    rows = query.order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [{"id": row.id, "name": row.name, "email": row.email, "subject": row.subject, "content": row.content, "is_read": row.is_read, "created_at": row.created_at} for row in rows], "total": total, "limit": limit, "offset": offset}


@admin_router.patch("/messages/{message_id}", tags=["admin:messages"], dependencies=[Depends(require_csrf)])
def set_message_read(message_id: UUID, payload: MessageReadInput, db: Session = Depends(get_db)):
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    message.is_read = payload.is_read
    db.commit()
    return {"id": message.id, "is_read": message.is_read}


@admin_router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["admin:messages"], dependencies=[Depends(require_csrf)])
def delete_message(message_id: UUID, db: Session = Depends(get_db)):
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    db.delete(message)
    db.commit()
    return None
