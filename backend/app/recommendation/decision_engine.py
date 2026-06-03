from datetime import datetime, UTC
from sqlalchemy import not_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.entities import Content, DecisionSession, IntentSession, UserInteraction, UserTasteProfile
from app.recommendation.taste import content_signals


def normalized_popularity(content: Content) -> float:
    return min((content.popularity or 0) / 100, 1)


def recency_score(content: Content) -> float:
    if not content.release_year:
        return 0.35
    if content.release_year >= 2023:
        return 1
    if content.release_year >= 2020:
        return 0.8
    if content.release_year >= 2010:
        return 0.55
    return 0.35


def tag_match_score(content: Content, vector: dict[str, float]) -> tuple[float, list[str]]:
    signals = content_signals(content)
    if not signals or not vector:
        return 0, []
    positive = {key: value for key, value in vector.items() if value > 0}
    matched = [signal for signal in signals if positive.get(signal, 0) > 0]
    score = sum(max(vector.get(signal, 0), 0) for signal in signals) / max(len(signals), 1)
    return min(score / 5, 1), matched[:5]


def metadata_score(content: Content) -> float:
    fields = [
        bool(content.image_url),
        bool(content.description),
        bool(content.rating),
        bool(content.external_url),
        bool(content.genres),
        bool(content.tags or content.moods),
    ]
    return sum(1 for value in fields if value) / len(fields)


def rank_content(content: Content, vector: dict[str, float], used_signals: set[str] | None = None) -> tuple[float, list[str]]:
    tag_match, matched = tag_match_score(content, vector)
    popularity = normalized_popularity(content)
    recency = recency_score(content)
    quality = min((content.rating or 0) / 10, 1) * 0.65 + metadata_score(content) * 0.35
    diversity = 1
    if used_signals:
        overlap = len(set(content_signals(content)).intersection(used_signals))
        diversity = max(0.2, 1 - overlap / 6)
    save_probability = min((tag_match * 0.7) + (quality * 0.3), 1)
    score = (
        tag_match * 0.45
        + popularity * 0.20
        + recency * 0.15
        + diversity * 0.10
        + save_probability * 0.10
    )
    return round(score * 100, 2), matched


def intent_match_score(content: Content, intent: IntentSession | None) -> float:
    if not intent:
        return 0
    signals = set(content_signals(content))
    required = set((intent.genres or []) + (intent.moods or []))
    boost = set((intent.boost_tags or []) + (intent.energy or []))
    exclude = set(intent.exclude_tags or [])
    penalty = 0.35 if signals.intersection(exclude) else 0
    required_score = len(signals.intersection(required)) / max(len(required), 1)
    boost_score = len(signals.intersection(boost)) / max(len(boost), 1)
    return max(0, min(1, required_score * 0.65 + boost_score * 0.35 - penalty))


def recommendation_reason(content: Content, matched: list[str], rank_type: str) -> str:
    if matched:
        base = f"Perche combina {', '.join(matched[:3])}: segnali emersi dalle tue decisioni."
    else:
        base = "Perche ha qualita, popolarita e coerenza con la categoria scelta."
    if rank_type == "exploration":
        return f"{base} E anche un'opzione esplorativa per evitare un feed troppo ripetitivo."
    if rank_type == "adjacent":
        return f"{base} E leggermente diversa dal match principale, ma ancora compatibile."
    return base


async def session_seen_content_ids(db: AsyncSession, session_id) -> list:
    rows = await db.scalars(select(UserInteraction.content_id).where(UserInteraction.session_id == session_id))
    return list(rows.all())


async def ranked_feed(
    db: AsyncSession,
    profile: UserTasteProfile | None,
    category: str,
    session: DecisionSession | None = None,
    intent_session: IntentSession | None = None,
    limit: int = 20,
) -> list[tuple[Content, float, list[str]]]:
    vector = dict(profile.preferred_tags or {}) if profile else {}
    if session and session.session_vector:
        vector.update({key: vector.get(key, 0) + value for key, value in session.session_vector.items()})
    if intent_session:
        intent_vector = {signal.lower(): 4 for signal in [*intent_session.genres, *intent_session.moods, *intent_session.energy, *intent_session.boost_tags]}
        vector.update({key: vector.get(key, 0) + value for key, value in intent_vector.items()})
    seen = await session_seen_content_ids(db, session.id) if session else []
    query = select(Content).where(
        Content.content_type == category,
        Content.image_url.is_not(None),
        Content.description != "",
    )
    if seen:
        query = query.where(not_(Content.id.in_(seen)))
    rows = (await db.scalars(query.limit(120))).all()
    ranked = []
    for content in rows:
        base_score, matched = rank_content(content, vector)
        if intent_session:
            intent_score = intent_match_score(content, intent_session) * 100
            base_score = round(intent_score * 0.45 + base_score * 0.55, 2)
        ranked.append((content, base_score, matched))
    return sorted(ranked, key=lambda item: item[1], reverse=True)[:limit]


async def top3_for_session(db: AsyncSession, session: DecisionSession) -> list[dict]:
    rows = (await db.scalars(
        select(Content)
        .join(UserInteraction, UserInteraction.content_id == Content.id)
        .where(UserInteraction.session_id == session.id, UserInteraction.interaction_type.in_(["LIKE", "SAVE"]))
    )).all()
    candidate_query = select(Content).where(Content.content_type == session.category, Content.image_url.is_not(None), Content.description != "")
    candidates = list({content.id: content for content in [*rows, *(await db.scalars(candidate_query)).all()]}.values())
    used_signals: set[str] = set()
    results: list[dict] = []
    rank_types = ["primary", "adjacent", "exploration"]
    for rank_type in rank_types:
        ranked = []
        for content in candidates:
            if any(result["content"].id == content.id for result in results):
                continue
            score, matched = rank_content(content, session.session_vector or {}, used_signals)
            if rank_type == "exploration":
                score = round(score * 0.82 + metadata_score(content) * 18, 2)
            ranked.append((content, score, matched))
        if not ranked:
            break
        content, score, matched = sorted(ranked, key=lambda item: item[1], reverse=True)[0]
        used_signals.update(content_signals(content))
        results.append({
            "content": content,
            "score": score,
            "matched_signals": matched,
            "rank_type": rank_type,
            "reason": recommendation_reason(content, matched, rank_type),
        })
    session.status = "COMPLETED"
    session.completed_at = datetime.now(UTC)
    return results
