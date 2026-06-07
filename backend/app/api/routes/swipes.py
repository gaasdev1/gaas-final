from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, Profile, Swipe, Watchlist
from app.schemas import SwipeIn

router = APIRouter(prefix="/swipes", tags=["swipes"])


def swipe_action(value: str) -> str:
    return {"right": "like", "superlike": "like", "left": "dislike"}.get(value, "not_interested")


@router.post("")
async def swipe(payload: SwipeIn, user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    content = await db.get(Content, payload.content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    stmt = insert(Swipe).values(user_id=user.id, content_id=content.id, action=swipe_action(payload.swipe_type))
    stmt = stmt.on_conflict_do_update(
        constraint="swipes_user_id_content_id_key",
        set_={"action": swipe_action(payload.swipe_type)},
    )
    await db.execute(stmt)

    if payload.swipe_type in {"right", "superlike"}:
        favorite = insert(Watchlist).values(user_id=user.id, content_id=content.id)
        favorite = favorite.on_conflict_do_nothing(constraint="watchlist_user_id_content_id_key")
        await db.execute(favorite)

    await db.commit()
    return {"ok": True}
