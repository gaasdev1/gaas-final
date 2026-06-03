from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.ai.openai_service import OpenAIService
from app.db import get_db
from app.models.entities import Content, Swipe, User
from app.schemas import ContentOut, ExplainOut

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[ContentOut])
async def recommendations(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> list[Content]:
    rows = await db.scalars(select(Content).order_by(desc(Content.popularity)).limit(30))
    return list(rows.all())


@router.get("/explain/{content_id}", response_model=ExplainOut)
async def explain(content_id: UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> ExplainOut:
    content = await db.get(Content, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    liked_rows = await db.scalars(
        select(Content.title)
        .join(Swipe, Swipe.content_id == Content.id)
        .where(Swipe.user_id == user.id, Swipe.swipe_type.in_(["right", "superlike"]))
        .limit(10)
    )
    reason = await OpenAIService().explain(list(liked_rows.all()), f"{content.title}. {content.description}")
    return ExplainOut(content_id=content.id, reason=reason)
