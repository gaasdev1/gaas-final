from typing import Any

from app.models.entities import Content, UserTasteProfile

INTERACTION_WEIGHTS = {
    "LIKE": 1.0,
    "DISLIKE": -1.0,
    "SAVE": 3.0,
    "VIEW": 0.25,
    "CLICK_PLATFORM": 4.0,
    "DETAIL_VIEW": 1.5,
    "LONG_VIEW": 2.0,
    "SKIP": -0.5,
}

DECISION_EVENTS = {"LIKE", "DISLIKE", "SAVE"}


def content_signals(content: Content) -> list[str]:
    signals = [*(content.genres or []), *(content.tags or []), *(content.moods or [])]
    return [signal.strip().lower() for signal in signals if signal and signal.strip()]


def apply_interaction_to_profile(
    profile: UserTasteProfile,
    session: Any | None,
    content: Content,
    interaction_type: str,
    watch_time: int = 0,
) -> None:
    weight = INTERACTION_WEIGHTS.get(interaction_type, 0)
    if watch_time >= 20 and interaction_type == "VIEW":
        weight = max(weight, INTERACTION_WEIGHTS["LONG_VIEW"])

    preferred_tags = dict(profile.preferred_tags or {})
    preferred_genres = dict(profile.preferred_genres or {})
    preferred_moods = dict(profile.preferred_moods or {})
    category_weights = dict(profile.category_weights or {})

    for signal in content_signals(content):
        preferred_tags[signal] = round(preferred_tags.get(signal, 0) + weight, 3)

    for genre in [g.lower() for g in (content.genres or [])]:
        preferred_genres[genre] = round(preferred_genres.get(genre, 0) + weight, 3)

    for mood in [m.lower() for m in (content.moods or [])]:
        preferred_moods[mood] = round(preferred_moods.get(mood, 0) + weight, 3)

    category_weights[content.content_type] = round(category_weights.get(content.content_type, 0) + weight, 3)

    profile.preferred_tags = preferred_tags
    profile.preferred_genres = preferred_genres
    profile.preferred_moods = preferred_moods
    profile.category_weights = category_weights

    if session:
        vector = dict(session.session_vector or {})
        for signal in content_signals(content):
            vector[signal] = round(vector.get(signal, 0) + weight, 3)
        session.session_vector = vector
        if interaction_type in DECISION_EVENTS:
            session.decision_count += 1
            if session.decision_count >= session.target_decisions:
                session.status = "COMPLETED"
