from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import DecisionSession, User
from app.recommendation.decision_engine import top3_for_session
from app.schemas import RecommendationResult, SessionOut, Top3Out

router = APIRouter(prefix="/top3", tags=["top3"])


@router.get("/{session_id}", response_model=Top3Out)
async def top3(session_id: UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> Top3Out:
    session = await db.get(DecisionSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    results = await top3_for_session(db, session)
    await db.commit()
    return Top3Out(
        session=SessionOut.model_validate(session),
        top_3=[RecommendationResult(**item) for item in results],
    )
