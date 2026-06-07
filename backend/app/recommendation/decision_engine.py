from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Content, UserTasteProfile
from app.recommendation.taste import content_signals


def rank_content(content: Content, vector: dict[str, float] | None = None, used_signals: set[str] | None = None) -> tuple[float, list[str]]:
    vector = vector or {}
    signals = content_signals(content)
    matched = [signal for signal in signals if vector.get(signal, 0) > 0]
    popularity = min((content.popularity or 0) / 100, 1)
    rating = min((content.rating or 0) / 10, 1)
    diversity = 1
    if used_signals:
        diversity = max(0.2, 1 - len(set(signals).intersection(used_signals)) / 6)
    score = round((popularity * 0.5 + rating * 0.35 + diversity * 0.15) * 100, 2)
    return score, matched[:5]


async def ranked_feed(
    db: AsyncSession,
    profile: UserTasteProfile | None,
    category: str,
    session=None,
    intent_session=None,
    limit: int = 20,
) -> list[tuple[Content, float, list[str]]]:
    rows = (
        await db.scalars(
            select(Content)
            .where(Content.type == category, Content.cover_url.is_not(None))
            .order_by(desc(Content.popularity_score))
            .limit(max(limit * 4, 40))
        )
    ).all()
    vector = dict(profile.preferred_genres or {}) if profile else {}
    ranked = [(content, *rank_content(content, vector)) for content in rows]
    return sorted(ranked, key=lambda item: item[1], reverse=True)[:limit]


async def top3_for_session(db: AsyncSession, session) -> list[dict]:
    rows = (
        await db.scalars(
            select(Content)
            .where(Content.cover_url.is_not(None))
            .order_by(desc(Content.popularity_score))
            .limit(3)
        )
    ).all()
    return [
        {
            "content": content,
            "score": content.popularity,
            "matched_signals": content.genres[:3],
            "rank_type": "primary" if index == 0 else "adjacent" if index == 1 else "exploration",
            "reason": "Scelto dal catalogo Supabase in base a popolarita' e qualita'.",
        }
        for index, content in enumerate(rows)
    ]
