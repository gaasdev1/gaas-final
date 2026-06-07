from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import ai_intent, analytics, auth, favorites, feed, ingestion, interactions, onboarding, profile, recommendations, search, sessions, swipes, top3, trending
from app.config.settings import get_settings
from app.db import check_database_connection, create_tables, dispose_engine

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if settings.database_create_tables:
        await create_tables()
    try:
        yield
    finally:
        await dispose_engine()


app = FastAPI(title="Gaas API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "service": "gaas"}


@app.get("/health/db")
async def health_db() -> dict:
    return {"ok": await check_database_connection(), "service": "postgres"}


app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(feed.router)
app.include_router(swipes.router)
app.include_router(recommendations.router)
app.include_router(sessions.router)
app.include_router(interactions.router)
app.include_router(top3.router)
app.include_router(search.router)
app.include_router(favorites.router)
app.include_router(trending.router)
app.include_router(profile.router)
app.include_router(ingestion.router)
app.include_router(analytics.router)
app.include_router(ai_intent.router)
