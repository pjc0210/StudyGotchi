import asyncio
from collections.abc import Awaitable, Iterable
from typing import TypeVar

T = TypeVar("T")


async def gather_bounded(coros: Iterable[Awaitable[T]], *, limit: int) -> list[T]:
    """`asyncio.gather` with at most `limit` coroutines in flight. Results keep input order."""

    semaphore = asyncio.Semaphore(max(1, limit))

    async def run(coro: Awaitable[T]) -> T:
        async with semaphore:
            return await coro

    return list(await asyncio.gather(*(run(c) for c in coros)))
