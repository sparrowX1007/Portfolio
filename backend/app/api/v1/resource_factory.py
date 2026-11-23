from typing import Type
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_admin, require_csrf
from app.models import Project, ProjectImage, ProjectSkill, PublicationStatus, Skill


def _primary_key(model: type, raw_id: str):
    column = model.__mapper__.primary_key[0]
    try:
        return column.type.python_type(raw_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid resource ID.")


def _serialize(row, locale: str | None = None) -> dict:
    result = {column.name: getattr(row, column.name) for column in row.__table__.columns}
    translations = getattr(row, "translations", None)
    if translations is not None:
        if locale:
            result["content"] = next((item.content for item in translations if item.locale == locale), {})
        else:
            result["translations"] = {item.locale: item.content for item in translations}
    if isinstance(row, Project):
        project_skills = [link for link in row.skills if locale is None or link.skill.is_public]
        result["skill_ids"] = [link.skill_id for link in project_skills]
        result["skill_names"] = [link.skill.name for link in project_skills]
        result["images"] = [{"id": image.id, "image_url": image.image_url, "alt_text": image.alt_text, "display_order": image.display_order} for image in row.images]
    return jsonable_encoder(result)


def build_resource_routers(
    *,
    resource: str,
    model: type,
    schema: Type[BaseModel],
    public_filter=None,
    search_fields: tuple[str, ...] = (),
    translation_model: type | None = None,
    allow_create: bool = True,
    allow_delete: bool = True,
):
    public = APIRouter(prefix=f"/{resource}", tags=[resource])
    admin = APIRouter(prefix=f"/{resource}", tags=[f"admin:{resource}"])

    @public.get("")
    def public_list(
        locale: str = Query("fr", pattern="^(fr|en)$"),
        limit: int = Query(50, ge=1, le=100),
        offset: int = Query(0, ge=0),
        db: Session = Depends(get_db),
    ):
        query = db.query(model)
        if translation_model is not None:
            query = query.join(model.translations).filter(translation_model.locale == locale)
        if public_filter is not None:
            query = query.filter(public_filter)
        order = model.display_order if hasattr(model, "display_order") else model.created_at.desc() if hasattr(model, "created_at") else None
        rows = query.order_by(order).offset(offset).limit(limit).all()
        return [_serialize(row, locale) for row in rows]

    @admin.get("", dependencies=[Depends(get_current_admin)])
    def admin_list(
        q: str | None = Query(None, max_length=100),
        limit: int = Query(25, ge=1, le=100),
        offset: int = Query(0, ge=0),
        db: Session = Depends(get_db),
    ):
        query = db.query(model)
        if q:
            conditions = [getattr(model, field).ilike(f"%{q}%") for field in search_fields if hasattr(model, field)]
            if conditions:
                query = query.filter(or_(*conditions))
        total = query.count()
        order = model.created_at.desc() if hasattr(model, "created_at") else None
        rows = query.order_by(order).offset(offset).limit(limit).all()
        return {"items": [_serialize(row) for row in rows], "total": total, "limit": limit, "offset": offset}

    @admin.get("/{resource_id}", dependencies=[Depends(get_current_admin)])
    def admin_get(resource_id: str, db: Session = Depends(get_db)):
        row = db.get(model, _primary_key(model, resource_id))
        if row is None:
            raise HTTPException(status_code=404, detail="Resource not found.")
        return _serialize(row)

    if allow_create:
        @admin.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_csrf)])
        def admin_create(payload: schema, db: Session = Depends(get_db)):
            data = payload.model_dump(mode="python")
            skill_ids = data.pop("skill_ids", [])
            images = data.pop("images", [])
            translations = data.pop("translations", {})
            if "status" in data:
                data["status"] = PublicationStatus(data["status"])
            for field in ("url", "image_url", "github_url", "demo_url", "document_url", "verification_url", "photo_url", "cv_url"):
                if data.get(field) is not None:
                    data[field] = str(data[field])
            for image in images:
                image["image_url"] = str(image["image_url"])
            if model is Project:
                skills = db.query(Skill).filter(Skill.id.in_(skill_ids)).all() if skill_ids else []
                if len(skills) != len(set(skill_ids)):
                    raise HTTPException(status_code=422, detail="One or more skills do not exist.")
                row = Project(**data)
                row.skills = [ProjectSkill(skill=skill) for skill in skills]
                row.images = [ProjectImage(**image) for image in images]
            elif model.__name__ == "SiteSetting":
                row = model(**data)
            else:
                row = model(**data)
            db.add(row)
            if translation_model:
                row.translations = [translation_model(locale=locale, content=content) for locale, content in translations.items()]
            db.commit()
            db.refresh(row)
            return _serialize(row)

    @admin.put("/{resource_id}", dependencies=[Depends(require_csrf)])
    def admin_update(resource_id: str, payload: schema, db: Session = Depends(get_db)):
        row = db.get(model, _primary_key(model, resource_id))
        if row is None:
            raise HTTPException(status_code=404, detail="Resource not found.")
        data = payload.model_dump(mode="python")
        skill_ids = data.pop("skill_ids", None)
        images = data.pop("images", None)
        translations = data.pop("translations", None)
        if model.__name__ == "SiteSetting" and data.get("key") != resource_id:
            raise HTTPException(status_code=422, detail="Setting keys cannot be changed; create a new setting instead.")
        if "status" in data:
            data["status"] = PublicationStatus(data["status"])
        for field in ("url", "image_url", "github_url", "demo_url", "document_url", "verification_url", "photo_url", "cv_url"):
            if data.get(field) is not None:
                data[field] = str(data[field])
        if images is not None:
            for image in images:
                image["image_url"] = str(image["image_url"])
        for key, value in data.items():
            setattr(row, key, value)
        if model is Project and skill_ids is not None:
            skills = db.query(Skill).filter(Skill.id.in_(skill_ids)).all() if skill_ids else []
            if len(skills) != len(set(skill_ids)):
                raise HTTPException(status_code=422, detail="One or more skills do not exist.")
            row.skills = [ProjectSkill(skill=skill) for skill in skills]
        if model is Project and images is not None:
            row.images = [ProjectImage(**image) for image in images]
        if translation_model and translations is not None:
            row.translations = [translation_model(locale=locale, content=content) for locale, content in translations.items()]
        db.commit()
        db.refresh(row)
        return _serialize(row)

    if allow_delete:
        @admin.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_csrf)])
        def admin_delete(resource_id: str, db: Session = Depends(get_db)):
            row = db.get(model, _primary_key(model, resource_id))
            if row is None:
                raise HTTPException(status_code=404, detail="Resource not found.")
            db.delete(row)
            db.commit()
            return None

    return public, admin
