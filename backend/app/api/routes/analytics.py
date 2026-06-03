from fastapi import APIRouter, Depends
from app.api.deps import current_user
from app.models.entities import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/event")
async def event(payload: dict, _: User = Depends(current_user)) -> dict:
    return {"ok": True, "accepted": payload.get("event_type", "event")}

