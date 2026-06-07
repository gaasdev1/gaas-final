from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, User
from app.schemas import ContentOut

router = APIRouter(prefix="/trending", tags=["trending"])


@router.get("", response_model=list[ContentOut])
async def trending(_: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> list[Content]:
    rows = await db.scalars(select(Content).order_by(desc(Content.popularity_score)).limit(30))
    return list(rows.all())

