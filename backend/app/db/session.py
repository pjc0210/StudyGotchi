from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

_settings = get_settings()

engine = create_async_engine(
    _settings.database_url,
    echo=False,
    future=True,
    # SQLite has no cross-connection queueing by default: a second writer
    # gets "database is locked" immediately instead of waiting. This makes
    # aiosqlite's underlying sqlite3 connection retry for up to 30s before
    # raising, which is enough for this project's sequential, single-writer
    # ingestion/repair scripts.
    connect_args={"timeout": 30},
)

async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session
