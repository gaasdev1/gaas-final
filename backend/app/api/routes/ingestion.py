from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db import get_db
from app.models.entities import Content, User

router = APIRouter(prefix="/admin/ingestion", tags=["ingestion"])


@router.post("/run")
async def run_ingestion(_: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    count = await db.scalar(select(func.count()).select_from(Content))
    return {
        "items_fetched": 0,
        "items_saved": 0,
        "existing_items": count or 0,
        "status": "skipped",
        "errors": ["Supabase catalog is already normalized; legacy ingestion is disabled."],
    }


@router.post("/seed")
async def seed_demo(_: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    count = await db.scalar(select(func.count()).select_from(Content))
    return {"items_fetched": 0, "items_saved": 0, "existing_items": count or 0, "status": "skipped"}


@router.get("/logs")
async def logs(_: User = Depends(current_user)) -> list[dict]:
    return []
