from fastapi import APIRouter, HTTPException

from app.auth.supabase import sign_in, sign_up
from app.schemas import LoginIn, RegisterIn, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])


def token_from_auth_response(data: dict) -> TokenOut:
    access_token = data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=202, detail="Registration created. Confirm the email, then log in.")
    return TokenOut(access_token=access_token, token_type=data.get("token_type") or "bearer")


@router.post("/register", response_model=TokenOut)
async def register(payload: RegisterIn) -> TokenOut:
    data = await sign_up(payload.email, payload.password, payload.username)
    return token_from_auth_response(data)


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn) -> TokenOut:
    data = await sign_in(payload.email, payload.password)
    return token_from_auth_response(data)
