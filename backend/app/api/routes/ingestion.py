from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.config.settings import get_settings
from app.db import get_db
from app.ingestion.normalizers import anilist_item, embedding_text, google_book_item, open_library_item, rawg_item, spotify_podcast_item, tmdb_item
from app.ingestion.seed_data import DEMO_CONTENT
from app.models.entities import Content, IngestionLog, User
from app.services.external_clients import ExternalApiClient

router = APIRouter(prefix="/admin/ingestion", tags=["ingestion"])


async def upsert_contents(db: AsyncSession, items: list[dict]) -> int:
    saved = 0
    for item in items:
        item["_embedding_text"] = embedding_text(item)
        stmt = insert(Content).values(**{k: v for k, v in item.items() if not k.startswith("_")})
        stmt = stmt.on_conflict_do_update(
            constraint="uq_source_external_id",
            set_={
                k: getattr(stmt.excluded, k)
                for k in [
                    "title",
                    "description",
                    "genres",
                    "tags",
                    "moods",
                    "image_url",
                    "banner_url",
                    "rating",
                    "popularity",
                    "external_url",
                    "language",
                ]
            },
        )
        await db.execute(stmt)
        saved += 1
    return saved


@router.post("/run")
async def run_ingestion(_: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    client = ExternalApiClient()
    fetched: list[dict] = []
    errors: list[str] = []

    for source, loader in (
        ("tmdb_movie", lambda: client.tmdb_trending("movie")),
        ("tmdb_tv", lambda: client.tmdb_trending("tv")),
        ("anilist_anime", lambda: client.anilist_trending("ANIME")),
        ("rawg_games", client.rawg_trending),
        ("google_books", client.google_books),
        ("open_library", client.open_library),
        ("spotify_podcasts", client.spotify_podcasts),
    ):
        try:
            rows = await loader()
        except Exception as exc:  # External APIs should not block demo readiness.
            errors.append(f"{source}: {exc}")
            rows = []
        if source == "tmdb_movie":
            fetched.extend(tmdb_item(item, "movie", settings.tmdb_image_base_url) for item in rows)
        elif source == "tmdb_tv":
            fetched.extend(tmdb_item(item, "tv", settings.tmdb_image_base_url) for item in rows)
        elif source == "anilist_anime":
            fetched.extend(anilist_item(item, "anime") for item in rows)
        elif source == "rawg_games":
            fetched.extend(rawg_item(item) for item in rows)
        elif source == "google_books":
            fetched.extend(google_book_item(item) for item in rows)
        elif source == "open_library":
            fetched.extend(open_library_item(item) for item in rows)
        elif source == "spotify_podcasts":
            fetched.extend(spotify_podcast_item(item) for item in rows)

    if not fetched:
        fetched = DEMO_CONTENT

    saved = await upsert_contents(db, fetched)
    status = "success" if not errors else "partial"
    db.add(IngestionLog(source="mixed", status=status, items_fetched=len(fetched), items_saved=saved, errors=errors))
    await db.commit()
    return {"items_fetched": len(fetched), "items_saved": saved, "status": status, "errors": errors[:5]}


@router.post("/seed")
async def seed_demo(_: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    saved = await upsert_contents(db, DEMO_CONTENT)
    db.add(IngestionLog(source="demo", status="success", items_fetched=len(DEMO_CONTENT), items_saved=saved, errors=[]))
    await db.commit()
    return {"items_fetched": len(DEMO_CONTENT), "items_saved": saved, "status": "success"}


@router.get("/logs")
async def logs(_: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = await db.scalars(select(IngestionLog).order_by(IngestionLog.created_at.desc()).limit(30))
    return [{"source": r.source, "status": r.status, "items_saved": r.items_saved, "created_at": r.created_at} for r in rows]
