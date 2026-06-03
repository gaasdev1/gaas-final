from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import User, UserTasteProfile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
async def profile(user: User = Depends(current_user)) -> dict:
    return {"id": user.id, "username": user.username, "email": user.email, "onboarding_completed": user.onboarding_completed}


@router.get("/taste")
async def taste(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    profile = await db.scalar(select(UserTasteProfile).where(UserTasteProfile.user_id == user.id))
    if not profile:
        return {}
    return {
        "preferred_genres": profile.preferred_genres,
        "disliked_genres": profile.disliked_genres,
        "preferred_tags": profile.preferred_tags,
        "preferred_moods": profile.preferred_moods,
        "category_weights": profile.category_weights,
    }

