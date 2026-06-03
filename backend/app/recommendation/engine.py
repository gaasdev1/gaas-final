import random
from math import sqrt
from app.models.entities import Content, UserTasteProfile


def overlap_score(values: list[str], weights: dict[str, float]) -> float:
    if not values:
        return 0
    return sum(max(weights.get(v.lower(), 0), 0) for v in values) / max(len(values), 1)


def cosine(a: list[float] | None, b: list[float] | None) -> float:
    if not a or not b:
        return 0
    dot = sum(x * y for x, y in zip(a, b))
    norm = sqrt(sum(x * x for x in a)) * sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0


def score_content(content: Content, profile: UserTasteProfile | None, embedding: list[float] | None = None) -> float:
    if not profile:
        return (content.popularity or 0) / 100

    genres = [g.lower() for g in (content.genres or [])]
    tags = [t.lower() for t in (content.tags or [])]
    moods = [m.lower() for m in (content.moods or [])]
    semantic = cosine(profile.embedding_profile, embedding)
    genre = overlap_score(genres, profile.preferred_genres or {})
    tag = overlap_score(tags, profile.preferred_tags or {})
    mood = overlap_score(moods, profile.preferred_moods or {})
    popularity = min((content.popularity or 0) / 100, 1)
    category = (profile.category_weights or {}).get(content.content_type, 0.05)
    freshness = 0.6 if content.release_year and content.release_year >= 2020 else 0.35
    diversity = max(0.05, 1 - category)
    exploration = random.random()
    return (
        0.30 * semantic
        + 0.20 * genre
        + 0.15 * tag
        + 0.10 * mood
        + 0.10 * popularity
        + 0.05 * category
        + 0.05 * freshness
        + 0.03 * diversity
        + 0.02 * exploration
    )


def update_profile_from_swipe(profile: UserTasteProfile, content: Content, swipe_type: str) -> None:
    multiplier = {"left": -0.08, "right": 0.12, "superlike": 0.25}[swipe_type]
    for field, values in (
        ("preferred_genres", content.genres or []),
        ("preferred_tags", content.tags or []),
        ("preferred_moods", content.moods or []),
    ):
        bucket = dict(getattr(profile, field) or {})
        for value in values:
            key = value.lower()
            bucket[key] = max(-1, min(1, bucket.get(key, 0) + multiplier))
        setattr(profile, field, bucket)
    weights = dict(profile.category_weights or {})
    weights[content.content_type] = max(0.01, min(0.7, weights.get(content.content_type, 0.1) + multiplier / 2))
    profile.category_weights = weights

