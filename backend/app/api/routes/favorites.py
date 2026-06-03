from fastapi import APIRouter, Depends
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, Favorite, User
from app.schemas import ContentOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.post("/{content_id}")
async def add_favorite(content_id: UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    exists = await db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.content_id == content_id))
    if not exists:
        db.add(Favorite(user_id=user.id, content_id=content_id))
        await db.commit()
    return {"ok": True}


@router.get("", response_model=list[ContentOut])
async def favorites(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> list[Content]:
    rows = await db.scalars(select(Content).join(Favorite, Favorite.content_id == Content.id).where(Favorite.user_id == user.id))
    return list(rows.all())


@router.delete("/{content_id}")
async def remove_favorite(content_id: UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    fav = await db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.content_id == content_id))
    if fav:
        await db.delete(fav)
        await db.commit()
    return {"ok": True}
