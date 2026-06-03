from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config.settings import get_settings
from app.models.base import Base

settings = get_settings()


def async_database_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def engine_connect_args() -> dict:
    args: dict = {}
    url = settings.database_url
    if settings.database_ssl or "supabase.co" in url:
        args["ssl"] = True
    if "pooler.supabase.com" in url or ":6543/" in url:
        # Supabase pooler can invalidate prepared statements between pooled connections.
        args["statement_cache_size"] = 0
    return args


engine = create_async_engine(
    async_database_url(settings.database_url),
    pool_pre_ping=True,
    connect_args=engine_connect_args(),
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
