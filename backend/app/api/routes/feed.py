from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, not_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, DecisionSession, IntentSession, Swipe, User, UserTasteProfile
from app.recommendation.decision_engine import ranked_feed
from app.recommendation.engine import score_content
from app.schemas import ContentOut

router = APIRouter(tags=["feed"])


@router.get("/feed", response_model=list[ContentOut])
async def feed(
    category: str | None = Query(default=None),
    session_id: UUID | None = Query(default=None),
    intent_session_id: UUID | None = Query(default=None),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Content]:
    if category:
        profile = await db.scalar(select(UserTasteProfile).where(UserTasteProfile.user_id == user.id))
        session = await db.get(DecisionSession, session_id) if session_id else None
        intent_session = await db.get(IntentSession, intent_session_id) if intent_session_id else None
        if session and session.user_id != user.id:
            session = None
        if intent_session and (intent_session.user_id != user.id or intent_session.status != "ACTIVE"):
            intent_session = None
        ranked = await ranked_feed(db, profile, category, session=session, intent_session=intent_session, limit=20)
        return [content for content, _, _ in ranked]

    swiped = select(Swipe.content_id).where(Swipe.user_id == user.id)
    profile = await db.scalar(select(UserTasteProfile).where(UserTasteProfile.user_id == user.id))
    rows = (await db.scalars(
        select(Content)
        .where(not_(Content.id.in_(swiped)), Content.image_url.is_not(None), Content.description != "")
        .order_by(desc(Content.popularity))
        .limit(80)
    )).all()
    return sorted(rows, key=lambda item: score_content(item, profile), reverse=True)[:20]


@router.get("/feed/next", response_model=ContentOut | None)
async def feed_next(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> Content | None:
    items = await feed(None, None, None, user, db)
    return items[0] if items else None
