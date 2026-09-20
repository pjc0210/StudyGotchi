from collections.abc import AsyncGenerator
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.clerk import get_verifier
from app.config import get_settings
from app.db.session import get_session
from app.providers.llm import get_llm_provider
from app.providers.llm.base import LLMProvider
from app.repositories.students import get_or_create_student


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session


def get_provider() -> LLMProvider:
    try:
        return get_llm_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


async def current_student(request: Request, session: AsyncSession = Depends(get_db)) -> UUID:
    settings = get_settings()
    if settings.auth_mode == "dev":
        raw = request.headers.get("X-Student-Id")
        if raw is None:
            raise HTTPException(status_code=401, detail="X-Student-Id required in dev mode")
        try:
            return UUID(raw)
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="Invalid X-Student-Id") from exc

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        clerk_user_id = get_verifier().verify(auth.removeprefix("Bearer "))
    except (jwt.PyJWTError, RuntimeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    return await get_or_create_student(session, clerk_user_id=clerk_user_id)


async def require_student(student_id: UUID, caller: UUID = Depends(current_student)) -> UUID:
    if student_id != caller:
        raise HTTPException(status_code=403, detail="Not your world")
    return caller
