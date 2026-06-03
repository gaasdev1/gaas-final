from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import ai_intent, analytics, auth, favorites, feed, ingestion, interactions, onboarding, profile, recommendations, search, sessions, swipes, top3, trending
from app.db import create_tables

app = FastAPI(title="Gaas API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    await create_tables()


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "service": "gaas"}


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
