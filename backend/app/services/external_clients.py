import base64
from typing import Any
import httpx
from app.config.settings import get_settings


class ExternalApiClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def tmdb_trending(self, media_type: str = "movie") -> list[dict[str, Any]]:
        if not self.settings.tmdb_api_key:
            return []
        url = f"{self.settings.tmdb_base_url}/trending/{media_type}/week"
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.get(url, params={"api_key": self.settings.tmdb_api_key})
            res.raise_for_status()
            return res.json().get("results", [])

    async def anilist_trending(self, media_type: str = "ANIME") -> list[dict[str, Any]]:
        query = """
        query ($type: MediaType) {
          Page(page: 1, perPage: 25) {
            media(type: $type, sort: TRENDING_DESC) {
              id title { romaji english native } description genres averageScore popularity bannerImage coverImage { extraLarge }
            }
          }
        }
        """
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.post(self.settings.anilist_api_url, json={"query": query, "variables": {"type": media_type}})
            res.raise_for_status()
            return res.json()["data"]["Page"]["media"]

    async def rawg_trending(self) -> list[dict[str, Any]]:
        if not self.settings.rawg_api_key:
            return []
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.get(
                f"{self.settings.rawg_base_url}/games",
                params={"key": self.settings.rawg_api_key, "ordering": "-rating", "page_size": 25},
            )
            res.raise_for_status()
            return res.json().get("results", [])

    async def google_books(self, query: str = "award winning fiction") -> list[dict[str, Any]]:
        params = {"q": query, "maxResults": 25}
        if self.settings.google_books_api_key:
            params["key"] = self.settings.google_books_api_key
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.get(f"{self.settings.google_books_base_url}/volumes", params=params)
            res.raise_for_status()
            return res.json().get("items", [])

    async def open_library(self, query: str = "science fiction") -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.get(f"{self.settings.open_library_base_url}/search.json", params={"q": query, "limit": 25})
            res.raise_for_status()
            return res.json().get("docs", [])

    async def spotify_token(self) -> str | None:
        if not self.settings.spotify_client_id or not self.settings.spotify_client_secret:
            return None
        raw = f"{self.settings.spotify_client_id}:{self.settings.spotify_client_secret}".encode()
        headers = {"Authorization": f"Basic {base64.b64encode(raw).decode()}"}
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.post(self.settings.spotify_token_url, data={"grant_type": "client_credentials"}, headers=headers)
            res.raise_for_status()
            return res.json()["access_token"]

    async def spotify_podcasts(self, query: str = "storytelling culture technology") -> list[dict[str, Any]]:
        token = await self.spotify_token()
        if not token:
            return []
        headers = {"Authorization": f"Bearer {token}"}
        params = {"q": query, "type": "show", "limit": 25, "market": "US"}
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.get(f"{self.settings.spotify_api_base_url}/search", params=params, headers=headers)
            res.raise_for_status()
            return res.json().get("shows", {}).get("items", [])
