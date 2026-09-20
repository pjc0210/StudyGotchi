from collections.abc import AsyncGenerator

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.providers.llm import get_llm_provider
from app.providers.llm.base import LLMProvider


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session


def get_provider() -> LLMProvider:
    try:
        return get_llm_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
