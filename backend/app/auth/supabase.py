from typing import Any

import httpx
from fastapi import HTTPException

from app.config.settings import get_settings


def supabase_api_key() -> str:
    settings = get_settings()
    key = settings.supabase_publishable_key or settings.supabase_anon_key
    if not settings.supabase_url or not key:
        raise HTTPException(status_code=500, detail="Supabase Auth is not configured")
    return key


def auth_url(path: str) -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="Supabase URL is not configured")
    return f"{settings.supabase_url.rstrip('/')}/auth/v1/{path.lstrip('/')}"


async def supabase_request(method: str, path: str, *, token: str | None = None, json: dict | None = None) -> dict[str, Any]:
    settings = get_settings()
    key = supabase_api_key()
    headers = {"apikey": key}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=settings.supabase_auth_timeout_seconds) as client:
        response = await client.request(method, auth_url(path), headers=headers, json=json)
    if response.status_code >= 400:
        detail = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response.json()


async def sign_up(email: str, password: str, username: str) -> dict[str, Any]:
    return await supabase_request(
        "POST",
        "signup",
        json={"email": email, "password": password, "data": {"display_name": username, "username": username}},
    )


async def sign_in(email: str, password: str) -> dict[str, Any]:
    return await supabase_request(
        "POST",
        "token?grant_type=password",
        json={"email": email, "password": password},
    )


async def get_auth_user(token: str) -> dict[str, Any]:
    return await supabase_request("GET", "user", token=token)
