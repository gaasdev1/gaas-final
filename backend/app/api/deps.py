from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.supabase import get_auth_user
from app.db import get_db
from app.models.entities import Profile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


async def current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Profile:
    auth_user = await get_auth_user(token)
    try:
        user_id = UUID(auth_user["id"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid Supabase token") from exc

    profile = await db.get(Profile, user_id)
    if not profile:
        metadata = auth_user.get("user_metadata") or {}
        profile = Profile(
            id=user_id,
            username=metadata.get("username"),
            display_name=metadata.get("display_name") or auth_user.get("email"),
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    # SQLAlchemy models are regular Python objects; route code can read this transient field.
    profile.email = auth_user.get("email")
    return profile
