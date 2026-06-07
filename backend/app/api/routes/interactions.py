from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, Profile, Swipe, UserPreference, Watchlist
from app.recommendation.engine import update_profile_from_swipe
from app.schemas import InteractionIn, InteractionOut

router = APIRouter(prefix="/interaction", tags=["interaction"])


def action_from_interaction(value: str) -> str:
    if value in {"LIKE", "SAVE", "CLICK_PLATFORM", "DETAIL_VIEW", "LONG_VIEW"}:
        return "like"
    if value in {"DISLIKE", "SKIP"}:
        return "dislike"
    return "not_interested"


@router.post("", response_model=InteractionOut)
async def record_interaction(payload: InteractionIn, user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> InteractionOut:
    content = await db.get(Content, payload.content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    action = action_from_interaction(payload.interaction_type)
    stmt = insert(Swipe).values(user_id=user.id, content_id=content.id, action=action)
    stmt = stmt.on_conflict_do_update(constraint="swipes_user_id_content_id_key", set_={"action": action})
    await db.execute(stmt)

    preferences = await db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    if not preferences:
        preferences = UserPreference(user_id=user.id, preferred_types=[])
        db.add(preferences)
    update_profile_from_swipe(preferences, content, "right" if action == "like" else "left")

    if payload.interaction_type == "SAVE":
        favorite = insert(Watchlist).values(user_id=user.id, content_id=content.id)
        favorite = favorite.on_conflict_do_nothing(constraint="watchlist_user_id_content_id_key")
        await db.execute(favorite)

    await db.commit()
    return InteractionOut(ok=True, decision_count=1, target_decisions=10, session_completed=False, top_3=[])
