from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import DecisionSession, User
from app.schemas import SessionCreateIn, SessionOut

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut)
async def create_session(payload: SessionCreateIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> DecisionSession:
    session = DecisionSession(user_id=user.id, category=payload.category, target_decisions=payload.target_decisions)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/active", response_model=SessionOut)
async def active_session(category: str = Query(min_length=2), user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> DecisionSession:
    session = await db.scalar(
        select(DecisionSession)
        .where(DecisionSession.user_id == user.id, DecisionSession.category == category, DecisionSession.status == "ACTIVE")
        .order_by(DecisionSession.created_at.desc())
    )
    if not session:
        session = DecisionSession(user_id=user.id, category=category, target_decisions=10)
        db.add(session)
        await db.commit()
        await db.refresh(session)
    return session


@router.post("/{session_id}/abandon")
async def abandon_session(session_id: UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    session = await db.get(DecisionSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = "ABANDONED"
    await db.commit()
    return {"ok": True}
