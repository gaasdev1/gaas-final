from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, DecisionSession, Favorite, User, UserInteraction, UserTasteProfile
from app.recommendation.decision_engine import top3_for_session
from app.recommendation.taste import DECISION_EVENTS, apply_interaction_to_profile
from app.schemas import InteractionIn, InteractionOut, RecommendationResult

router = APIRouter(prefix="/interaction", tags=["interaction"])


@router.post("", response_model=InteractionOut)
async def record_interaction(payload: InteractionIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> InteractionOut:
    content = await db.get(Content, payload.content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    session = None
    if payload.session_id:
        session = await db.get(DecisionSession, payload.session_id)
        if not session or session.user_id != user.id:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = await db.scalar(
            select(DecisionSession)
            .where(DecisionSession.user_id == user.id, DecisionSession.category == content.content_type, DecisionSession.status == "ACTIVE")
            .order_by(DecisionSession.created_at.desc())
        )
        if not session:
            session = DecisionSession(user_id=user.id, category=content.content_type)
            db.add(session)
    await db.flush()

    profile = await db.scalar(select(UserTasteProfile).where(UserTasteProfile.user_id == user.id))
    if not profile:
        profile = UserTasteProfile(user_id=user.id, category_weights={})
        db.add(profile)

    interaction = UserInteraction(
        user_id=user.id,
        content_id=content.id,
        session_id=session.id if session else None,
        interaction_type=payload.interaction_type,
        category=content.content_type,
        watch_time=payload.watch_time,
    )
    db.add(interaction)

    if payload.interaction_type == "SAVE":
        favorite = await db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.content_id == content.id))
        if not favorite:
            db.add(Favorite(user_id=user.id, content_id=content.id))

    apply_interaction_to_profile(profile, session, content, payload.interaction_type, payload.watch_time)

    top_3 = []
    if session and session.decision_count >= session.target_decisions:
        top_3 = await top3_for_session(db, session)

    await db.commit()
    return InteractionOut(
        ok=True,
        decision_count=session.decision_count if session else 0,
        target_decisions=session.target_decisions if session else 10,
        session_completed=bool(session and session.status == "COMPLETED"),
        top_3=[RecommendationResult(**item) for item in top_3],
    )
