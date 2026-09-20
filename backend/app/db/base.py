import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class EmbeddingVector(TypeDecorator):
    """Portable stand-in for pgvector's `Vector` column (spec: embeddings).

    Matching happens in Python (`app.resolution.semantic_match`), never in
    SQL, so a plain JSON-encoded float list is sufficient here — there is no
    `<=>` operator or index to lose by dropping pgvector.
    """

    impl = JSON
    cache_ok = True

    def process_result_value(self, value, dialect):
        return None if value is None else list(value)


class UUIDPKMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
