import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    username: Mapped[str | None] = mapped_column(Text, unique=True)
    display_name: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    bio: Mapped[str | None] = mapped_column(Text)
    privacy_setting: Mapped[str] = mapped_column(Text, default="public")
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def profile_image(self) -> str | None:
        return self.avatar_url


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True)


class ContentGenre(Base):
    __tablename__ = "content_genres"

    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id"), primary_key=True)
    genre_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("genres.id"), primary_key=True)
    genre: Mapped[Genre] = relationship(lazy="joined")


class ContentTag(Base):
    __tablename__ = "content_tags"

    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id"), primary_key=True)
    tag_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tags.id"), primary_key=True)
    tag: Mapped[Tag] = relationship(lazy="joined")


class Content(Base):
    __tablename__ = "content"
    __table_args__ = (UniqueConstraint("source", "external_id", name="content_source_external_id_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String, index=True)
    source: Mapped[str] = mapped_column(String)
    external_id: Mapped[str] = mapped_column(String)
    slug: Mapped[str | None] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    original_title: Mapped[str | None] = mapped_column(String)
    subtitle: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)
    banner_url: Mapped[str | None] = mapped_column(Text)
    trailer_url: Mapped[str | None] = mapped_column(Text)
    official_url: Mapped[str | None] = mapped_column(Text)
    preview_url: Mapped[str | None] = mapped_column(Text)
    release_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    original_language: Mapped[str | None] = mapped_column(String)
    country_code: Mapped[str | None] = mapped_column(String)
    age_rating: Mapped[str | None] = mapped_column(String)
    status: Mapped[str | None] = mapped_column(String)
    content_format: Mapped[str | None] = mapped_column(String)
    average_rating: Mapped[float | None] = mapped_column(Numeric)
    rating_count: Mapped[int | None] = mapped_column(Integer)
    popularity_score: Mapped[float | None] = mapped_column(Numeric)
    is_adult: Mapped[bool | None] = mapped_column(Boolean)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    genre_links: Mapped[list[ContentGenre]] = relationship(lazy="selectin")
    tag_links: Mapped[list[ContentTag]] = relationship(lazy="selectin")

    @property
    def content_type(self) -> str:
        return self.type

    @property
    def genres(self) -> list[str]:
        return [link.genre.name for link in self.genre_links if link.genre]

    @property
    def tags(self) -> list[str]:
        return [link.tag.name for link in self.tag_links if link.tag]

    @property
    def moods(self) -> list[str]:
        return []

    @property
    def image_url(self) -> str | None:
        return self.cover_url

    @property
    def release_year(self) -> int | None:
        return self.release_date.year if self.release_date else None

    @property
    def rating(self) -> float:
        return float(self.average_rating or 0)

    @property
    def popularity(self) -> float:
        return float(self.popularity_score or 0)

    @property
    def external_url(self) -> str | None:
        return self.official_url or self.preview_url

    @property
    def language(self) -> str | None:
        return self.original_language


class Swipe(Base):
    __tablename__ = "swipes"
    __table_args__ = (UniqueConstraint("user_id", "content_id", name="swipes_user_id_content_id_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id"), index=True)
    action: Mapped[str] = mapped_column(ENUM("like", "dislike", "not_interested", name="swipe_action", create_type=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @property
    def swipe_type(self) -> str:
        return {"like": "right", "dislike": "left", "not_interested": "left"}.get(self.action, self.action)

    @swipe_type.setter
    def swipe_type(self, value: str) -> None:
        self.action = {"right": "like", "superlike": "like", "left": "dislike"}.get(value, value)


class Watchlist(Base):
    __tablename__ = "watchlist"
    __table_args__ = (UniqueConstraint("user_id", "content_id", name="watchlist_user_id_content_id_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id"), index=True)
    watched: Mapped[bool] = mapped_column(Boolean, default=False)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    watched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, index=True)
    preferred_types: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    genre_weights: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def preferred_genres(self) -> dict:
        return self.genre_weights or {}

    @preferred_genres.setter
    def preferred_genres(self, value: dict) -> None:
        self.genre_weights = value

    @property
    def disliked_genres(self) -> dict:
        return {k: v for k, v in (self.genre_weights or {}).items() if isinstance(v, (int, float)) and v < 0}

    @disliked_genres.setter
    def disliked_genres(self, value: dict) -> None:
        weights = dict(self.genre_weights or {})
        weights.update(value or {})
        self.genre_weights = weights

    @property
    def preferred_tags(self) -> dict:
        return {}

    @preferred_tags.setter
    def preferred_tags(self, _: dict) -> None:
        return None

    @property
    def preferred_moods(self) -> dict:
        return {}

    @preferred_moods.setter
    def preferred_moods(self, _: dict) -> None:
        return None

    @property
    def category_weights(self) -> dict:
        return {key: 1 for key in (self.preferred_types or [])}

    @category_weights.setter
    def category_weights(self, value: dict) -> None:
        self.preferred_types = [key for key, weight in (value or {}).items() if weight and weight > 0]

    embedding_profile = None


# Backwards-compatible names used by the existing route modules.
User = Profile
Favorite = Watchlist
UserTasteProfile = UserPreference
