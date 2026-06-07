from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class OnboardingIn(BaseModel):
    favorite_genres: list[str] = []
    disliked_genres: list[str] = []
    favorite_titles: list[str] = []
    preferred_moods: list[str] = []
    category_weights: dict[str, float] = {
        "movie": 0.25,
        "tv": 0.20,
        "anime": 0.20,
        "manga": 0.05,
        "game": 0.15,
        "book": 0.10,
        "podcast": 0.05,
    }


class ContentOut(BaseModel):
    id: UUID
    content_type: str
    title: str
    description: str
    genres: list[str] = []
    tags: list[str] = []
    moods: list[str] = []
    image_url: str | None = None
    banner_url: str | None = None
    release_year: int | None = None
    rating: float = 0
    popularity: float = 0
    source: str
    external_id: str
    external_url: str | None = None

    model_config = {"from_attributes": True}

    @field_validator("description", mode="before")
    @classmethod
    def default_description(cls, value: str | None) -> str:
        return value or ""

    @field_validator("genres", "tags", "moods", mode="before")
    @classmethod
    def default_list(cls, value):
        return value or []

    @field_validator("rating", "popularity", mode="before")
    @classmethod
    def default_float(cls, value) -> float:
        return float(value or 0)


class SwipeIn(BaseModel):
    content_id: UUID
    swipe_type: str = Field(pattern="^(left|right|superlike)$")


class SearchOut(BaseModel):
    results: list[ContentOut]


class ExplainOut(BaseModel):
    content_id: UUID
    reason: str


class SessionCreateIn(BaseModel):
    category: str = Field(min_length=2, max_length=30)
    target_decisions: int = Field(default=10, ge=3, le=30)


class SessionOut(BaseModel):
    id: UUID
    category: str
    decision_count: int
    target_decisions: int
    status: str

    model_config = {"from_attributes": True}


class InteractionIn(BaseModel):
    content_id: UUID
    interaction_type: str = Field(pattern="^(LIKE|DISLIKE|SAVE|VIEW|CLICK_PLATFORM|DETAIL_VIEW|LONG_VIEW|SKIP)$")
    session_id: UUID | None = None
    watch_time: int = Field(default=0, ge=0, le=3600)


class RecommendationResult(BaseModel):
    content: ContentOut
    score: float
    reason: str
    matched_signals: list[str] = []
    rank_type: str


class InteractionOut(BaseModel):
    ok: bool
    decision_count: int
    target_decisions: int
    session_completed: bool
    top_3: list[RecommendationResult] = []


class Top3Out(BaseModel):
    session: SessionOut
    top_3: list[RecommendationResult]


class IntentFeedQuery(BaseModel):
    category: str = "book"
    required_tags: list[str] = []
    boost_tags: list[str] = []
    exclude_tags: list[str] = []


class IntentData(BaseModel):
    session_title: str = "Deriva personale"
    user_intent_summary: str = ""
    category: str = "book"
    genres: list[str] = []
    moods: list[str] = []
    energy: list[str] = []
    avoid: list[str] = []
    mainstream_level: str = "medium"
    intensity: int = Field(default=3, ge=1, le=5)
    follow_up_questions_completed: bool = False
    feed_query: IntentFeedQuery = Field(default_factory=IntentFeedQuery)


class AiChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=1200)


class AiIntentChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1200)
    history: list[AiChatMessage] = []


class IntentSessionOut(BaseModel):
    id: UUID
    status: str
    source: str
    session_title: str
    user_intent_summary: str
    category: str
    genres: list[str] = []
    moods: list[str] = []
    energy: list[str] = []
    boost_tags: list[str] = []
    exclude_tags: list[str] = []
    intensity: int
    mainstream_level: str

    model_config = {"from_attributes": True}


class AiIntentChatOut(BaseModel):
    provider: str
    assistant_message: str
    questions: list[str] = []
    intent: IntentData
    ready_to_start: bool
    intent_session: IntentSessionOut | None = None
