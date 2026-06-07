from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, Profile, Watchlist
from app.schemas import ContentOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.post("/{content_id}")
async def add_favorite(content_id: UUID, user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    stmt = insert(Watchlist).values(user_id=user.id, content_id=content_id).on_conflict_do_nothing(
        constraint="watchlist_user_id_content_id_key"
    )
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}


@router.get("", response_model=list[ContentOut])
async def favorites(user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> list[Content]:
    rows = await db.scalars(select(Content).join(Watchlist, Watchlist.content_id == Content.id).where(Watchlist.user_id == user.id))
    return list(rows.all())


@router.delete("/{content_id}")
async def remove_favorite(content_id: UUID, user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    fav = await db.scalar(select(Watchlist).where(Watchlist.user_id == user.id, Watchlist.content_id == content_id))
    if fav:
        await db.delete(fav)
        await db.commit()
    return {"ok": True}
