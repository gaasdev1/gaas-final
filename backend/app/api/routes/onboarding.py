from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.ai.openai_service import OpenAIService
from app.db import get_db
from app.models.entities import User, UserTasteProfile
from app.schemas import OnboardingIn

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("")
async def save_onboarding(payload: OnboardingIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    text = " ".join(payload.favorite_titles + payload.favorite_genres + payload.preferred_moods)
    embedding = await OpenAIService().embedding(text) if text else None
    profile = await db.scalar(select(UserTasteProfile).where(UserTasteProfile.user_id == user.id))
    if not profile:
        profile = UserTasteProfile(user_id=user.id)
        db.add(profile)
    profile.preferred_genres = {g.lower(): 0.7 for g in payload.favorite_genres}
    profile.disliked_genres = {g.lower(): -0.8 for g in payload.disliked_genres}
    profile.preferred_moods = {m.lower(): 0.7 for m in payload.preferred_moods}
    profile.preferred_tags = {}
    profile.category_weights = payload.category_weights
    profile.embedding_profile = embedding
    user.onboarding_completed = True
    await db.commit()
    return {"ok": True}


@router.get("/status")
async def onboarding_status(user: User = Depends(current_user)) -> dict:
    return {"completed": user.onboarding_completed}

