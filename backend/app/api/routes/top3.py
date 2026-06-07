from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, Profile
from app.schemas import RecommendationResult, SessionOut, Top3Out

router = APIRouter(prefix="/top3", tags=["top3"])


@router.get("/{session_id}", response_model=Top3Out)
async def top3(session_id: UUID, _: Profile = Depends(current_user), db: AsyncSession = Depends(get_db)) -> Top3Out:
    rows = (await db.scalars(select(Content).where(Content.cover_url.is_not(None)).order_by(desc(Content.popularity_score)).limit(3))).all()
    return Top3Out(
        session=SessionOut(id=session_id, category=rows[0].content_type if rows else "mixed", decision_count=3, target_decisions=3, status="COMPLETED"),
        top_3=[
            RecommendationResult(
                content=item,
                score=max(0, item.popularity),
                reason="Scelto dai contenuti piu' forti nel catalogo Supabase.",
                matched_signals=item.genres[:3],
                rank_type="primary" if index == 0 else "adjacent" if index == 1 else "exploration",
            )
            for index, item in enumerate(rows)
        ],
    )
