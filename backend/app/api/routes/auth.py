from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.security import create_access_token, hash_password, verify_password
from app.db import get_db
from app.models.entities import User
from app.schemas import LoginIn, RegisterIn, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    exists = await db.scalar(select(User).where((User.email == payload.email) | (User.username == payload.username)))
    if exists:
        raise HTTPException(status_code=409, detail="Email or username already used")
    user = User(username=payload.username, email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenOut(access_token=create_access_token(user.id))

