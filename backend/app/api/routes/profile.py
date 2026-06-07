from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Profile, UserPreference

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
async def profile(user: Profile = Depends(current_user)) -> dict:
    return {
        "id": user.id,
        "username": user.username or user.display_name,
        "email": getattr(user, "email", None),
        "onboarding_completed": user.onboarding_completed,
        "profile_image": user.avatar_url,
    }


@router.get("/taste")
async def taste(user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    preferences = await db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    if not preferences:
        return {}
    return {
        "preferred_genres": preferences.genre_weights or {},
        "disliked_genres": {k: v for k, v in (preferences.genre_weights or {}).items() if isinstance(v, (int, float)) and v < 0},
        "preferred_tags": {},
        "preferred_moods": {},
        "category_weights": {key: 1 for key in (preferences.preferred_types or [])},
    }
