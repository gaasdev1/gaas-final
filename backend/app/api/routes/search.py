from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, Profile
from app.schemas import SearchOut

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchOut)
async def search(q: str = Query(min_length=2), _: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> SearchOut:
    pattern = f"%{q}%"
    rows = (
        await db.scalars(
            select(Content)
            .where(or_(Content.title.ilike(pattern), Content.subtitle.ilike(pattern), Content.description.ilike(pattern)))
            .limit(30)
        )
    ).all()
    return SearchOut(results=rows)


@router.get("/semantic", response_model=SearchOut)
async def semantic_search(q: str = Query(min_length=2), user: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> SearchOut:
    return await search(q, user, db)
