"""initial schema

Creates every table in app.db.models from the live SQLAlchemy metadata
(`Base.metadata.create_all`) rather than hand-transcribed `op.create_table`
calls. There is no live Postgres+pgvector instance available in this
environment to autogenerate/verify a hand-written migration against, and a
transcription bug in ~14 hand-written tables is a real risk with no way to
catch it here; metadata-driven creation is guaranteed to match
`app/db/models.py` by construction. Run `alembic upgrade head` against a
real database to verify, then consider generating a conventional
`op.create_table`-based revision (`alembic revision --autogenerate`) from a
clean DB for finer-grained downgrade support if that's ever needed.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-19
"""

from alembic import op

from app.db import models  # noqa: F401  (registers all tables on Base.metadata)
from app.db.base import Base

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
    op.execute("DROP EXTENSION IF EXISTS vector")
