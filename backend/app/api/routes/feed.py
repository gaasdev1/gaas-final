from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, not_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, Profile, Swipe, UserPreference
from app.recommendation.engine import score_content
from app.schemas import ContentOut

router = APIRouter(tags=["feed"])


@router.get("/feed", response_model=list[ContentOut])
async def feed(
    category: str | None = Query(default=None),
    user: Profile = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Content]:
    swiped = select(Swipe.content_id).where(Swipe.user_id == user.id)
    query = (
        select(Content)
        .where(not_(Content.id.in_(swiped)), Content.cover_url.is_not(None))
        .order_by(desc(Content.popularity_score))
        .limit(80)
    )
    if category:
        query = query.where(Content.type == category)
    profile = await db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    rows = (await db.scalars(query)).all()
    return sorted(rows, key=lambda item: score_content(item, profile), reverse=True)[:20]


@router.get("/feed/next", response_model=ContentOut | None)
async def feed_next(user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> Content | None:
    items = await feed(None, user, db)
    return items[0] if items else None
