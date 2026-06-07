from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query

from app.api.deps import current_user
from app.models.entities import Profile
from app.schemas import SessionCreateIn, SessionOut

router = APIRouter(prefix="/sessions", tags=["sessions"])


def session_out(category: str, target_decisions: int = 10) -> SessionOut:
    return SessionOut(id=uuid4(), category=category, decision_count=0, target_decisions=target_decisions, status="ACTIVE")


@router.post("", response_model=SessionOut)
async def create_session(payload: SessionCreateIn, _: Profile = Depends(current_user)) -> SessionOut:
    return session_out(payload.category, payload.target_decisions)


@router.get("/active", response_model=SessionOut)
async def active_session(category: str = Query(min_length=2), _: Profile = Depends(current_user)) -> SessionOut:
    return session_out(category)


@router.post("/{session_id}/abandon")
async def abandon_session(session_id: UUID, _: Profile = Depends(current_user)) -> dict:
    return {"ok": True, "session_id": session_id}
