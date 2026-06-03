import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    profile_image: Mapped[str | None] = mapped_column(String(500))
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Content(Base):
    __tablename__ = "contents"
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_source_external_id"),
        Index("ix_contents_type_popularity", "content_type", "popularity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_type: Mapped[str] = mapped_column(String(30), index=True)
    title: Mapped[str] = mapped_column(String(300), index=True)
    original_title: Mapped[str | None] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    genres: Mapped[list[str]] = mapped_column(JSONB, default=list)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    moods: Mapped[list[str]] = mapped_column(JSONB, default=list)
    image_url: Mapped[str | None] = mapped_column(String(800))
    banner_url: Mapped[str | None] = mapped_column(String(800))
    release_year: Mapped[int | None] = mapped_column(Integer)
    rating: Mapped[float] = mapped_column(Float, default=0)
    popularity: Mapped[float] = mapped_column(Float, default=0)
    source: Mapped[str] = mapped_column(String(50), index=True)
    external_id: Mapped[str] = mapped_column(String(120), index=True)
    external_url: Mapped[str | None] = mapped_column(String(800))
    language: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    embedding: Mapped["ContentEmbedding"] = relationship(back_populates="content", uselist=False)


class ContentEmbedding(Base):
    __tablename__ = "content_embeddings"
    __table_args__ = (
        Index(
            "ix_content_embeddings_vector",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contents.id", ondelete="CASCADE"), index=True)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))
    embedding_model: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    content: Mapped[Content] = relationship(back_populates="embedding")


class Swipe(Base):
    __tablename__ = "swipes"
    __table_args__ = (UniqueConstraint("user_id", "content_id", name="uq_swipe_user_content"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contents.id", ondelete="CASCADE"), index=True)
    swipe_type: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "content_id", name="uq_favorite_user_content"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contents.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DecisionSession(Base):
    __tablename__ = "decision_sessions"
    __table_args__ = (Index("ix_decision_sessions_user_category_status", "user_id", "category", "status"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(30), index=True)
    decision_count: Mapped[int] = mapped_column(Integer, default=0)
    target_decisions: Mapped[int] = mapped_column(Integer, default=10)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", index=True)
    session_vector: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class IntentSession(Base):
    __tablename__ = "intent_sessions"
    __table_args__ = (Index("ix_intent_sessions_user_status", "user_id", "status"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", index=True)
    source: Mapped[str] = mapped_column(String(40), default="ai_chat")
    session_title: Mapped[str] = mapped_column(String(160))
    user_intent_summary: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(30), index=True)
    genres: Mapped[list[str]] = mapped_column(JSONB, default=list)
    moods: Mapped[list[str]] = mapped_column(JSONB, default=list)
    energy: Mapped[list[str]] = mapped_column(JSONB, default=list)
    boost_tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    exclude_tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    intensity: Mapped[int] = mapped_column(Integer, default=3)
    mainstream_level: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UserInteraction(Base):
    __tablename__ = "user_interactions"
    __table_args__ = (Index("ix_user_interactions_user_session", "user_id", "session_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contents.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("decision_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    interaction_type: Mapped[str] = mapped_column(String(30), index=True)
    category: Mapped[str] = mapped_column(String(30), index=True)
    watch_time: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserTasteProfile(Base):
    __tablename__ = "user_taste_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    preferred_genres: Mapped[dict] = mapped_column(JSONB, default=dict)
    disliked_genres: Mapped[dict] = mapped_column(JSONB, default=dict)
    preferred_tags: Mapped[dict] = mapped_column(JSONB, default=dict)
    preferred_moods: Mapped[dict] = mapped_column(JSONB, default=dict)
    category_weights: Mapped[dict] = mapped_column(JSONB, default=dict)
    embedding_profile: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contents.id", ondelete="CASCADE"), index=True)
    score: Mapped[float] = mapped_column(Float, index=True)
    reason: Mapped[str | None] = mapped_column(Text)
    served_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    clicked: Mapped[bool] = mapped_column(Boolean, default=False)
    swiped: Mapped[bool] = mapped_column(Boolean, default=False)


class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[str] = mapped_column(String(30))
    items_fetched: Mapped[int] = mapped_column(Integer, default=0)
    items_saved: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[dict] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
