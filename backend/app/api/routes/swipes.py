from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, Favorite, Swipe, User, UserTasteProfile
from app.recommendation.engine import update_profile_from_swipe
from app.schemas import SwipeIn

router = APIRouter(prefix="/swipes", tags=["swipes"])


@router.post("")
async def swipe(payload: SwipeIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    content = await db.get(Content, payload.content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    profile = await db.scalar(select(UserTasteProfile).where(UserTasteProfile.user_id == user.id))
    if not profile:
        profile = UserTasteProfile(user_id=user.id, category_weights={})
        db.add(profile)
    existing = await db.scalar(select(Swipe).where(Swipe.user_id == user.id, Swipe.content_id == content.id))
    if existing:
        existing.swipe_type = payload.swipe_type
    else:
        db.add(Swipe(user_id=user.id, content_id=content.id, swipe_type=payload.swipe_type))
    if payload.swipe_type in {"right", "superlike"}:
        favorite = await db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.content_id == content.id))
        if not favorite:
            db.add(Favorite(user_id=user.id, content_id=content.id))
    update_profile_from_swipe(profile, content, payload.swipe_type)
    await db.commit()
    return {"ok": True}
