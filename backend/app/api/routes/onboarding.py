from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Profile, UserPreference
from app.schemas import OnboardingIn

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("")
async def save_onboarding(payload: OnboardingIn, user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    preferences = await db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    if not preferences:
        preferences = UserPreference(user_id=user.id)
        db.add(preferences)

    genre_weights = {genre.lower(): 0.7 for genre in payload.favorite_genres}
    genre_weights.update({genre.lower(): -0.8 for genre in payload.disliked_genres})
    preferences.genre_weights = genre_weights
    preferences.preferred_types = [key for key, value in payload.category_weights.items() if value > 0]
    user.onboarding_completed = True
    await db.commit()
    return {"ok": True}


@router.get("/status")
async def onboarding_status(user: Profile = Depends(current_user)) -> dict:
    return {"completed": user.onboarding_completed}
