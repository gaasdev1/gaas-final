from collections.abc import AsyncGenerator
import ssl
from uuid import uuid4
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from app.config.settings import get_settings
from app.models.base import Base

settings = get_settings()


def async_database_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def with_asyncpg_options(url: str) -> str:
    async_url = async_database_url(url)
    if not uses_transaction_pooler(async_url):
        return async_url
    parsed = urlparse(async_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    # SQLAlchemy's asyncpg dialect has its own prepared statement cache.
    # Supabase's transaction pooler/PgBouncer needs it disabled in addition to
    # asyncpg's lower-level statement cache.
    query.setdefault("prepared_statement_cache_size", "0")
    return urlunparse(parsed._replace(query=urlencode(query)))


def is_supabase_url(url: str) -> bool:
    host = urlparse(url.replace("postgresql+asyncpg://", "postgresql://", 1)).hostname or ""
    return host.endswith(".supabase.co") or "pooler.supabase.com" in host


def uses_transaction_pooler(url: str) -> bool:
    parsed = urlparse(url.replace("postgresql+asyncpg://", "postgresql://", 1))
    host = parsed.hostname or ""
    return "pooler.supabase.com" in host or parsed.port == 6543


def engine_connect_args() -> dict:
    args: dict = {}
    url = settings.database_url
    if settings.database_ssl or is_supabase_url(url):
        if settings.database_ssl_verify:
            args["ssl"] = True
        else:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            args["ssl"] = ssl_context
    if settings.database_statement_cache_size is not None:
        args["statement_cache_size"] = settings.database_statement_cache_size
    elif uses_transaction_pooler(url):
        # Supabase transaction pooler can invalidate prepared statements between pooled connections.
        args["statement_cache_size"] = 0
        args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4()}__"
    return args


engine_kwargs = {
    "echo": settings.database_echo,
    "pool_pre_ping": True,
    "connect_args": engine_connect_args(),
}

if uses_transaction_pooler(settings.database_url):
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_size"] = settings.database_pool_size
    engine_kwargs["max_overflow"] = settings.database_max_overflow
    engine_kwargs["pool_recycle"] = settings.database_pool_recycle_seconds


engine = create_async_engine(
    with_asyncpg_options(settings.database_url),
    **engine_kwargs,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def check_database_connection() -> bool:
    async with engine.connect() as conn:
        result = await conn.execute(text("select 1"))
        return result.scalar_one() == 1


async def dispose_engine() -> None:
    await engine.dispose()
