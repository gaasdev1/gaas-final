from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "Gaas"
    api_base_url: str = "http://localhost:8000"

    database_url: str = "postgresql+asyncpg://gaas:gaas@localhost:5432/gaas"
    redis_url: str = "redis://localhost:6379/0"

    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    database_ssl: bool = False

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    openai_api_key: str | None = None
    llm_provider: str = "local"
    openai_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    tmdb_api_key: str | None = None
    tmdb_base_url: str = "https://api.themoviedb.org/3"
    tmdb_image_base_url: str = "https://image.tmdb.org/t/p/w500"

    anilist_api_url: str = "https://graphql.anilist.co"
    jikan_api_base_url: str = "https://api.jikan.moe/v4"

    rawg_api_key: str | None = None
    rawg_base_url: str = "https://api.rawg.io/api"

    google_books_api_key: str | None = None
    google_books_base_url: str = "https://www.googleapis.com/books/v1"

    open_library_base_url: str = "https://openlibrary.org"

    spotify_client_id: str | None = None
    spotify_client_secret: str | None = None
    spotify_token_url: str = "https://accounts.spotify.com/api/token"
    spotify_api_base_url: str = "https://api.spotify.com/v1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
