"""initial schema

Creates every table in app.db.models from the live SQLAlchemy metadata
(`Base.metadata.create_all`) rather than hand-transcribed `op.create_table`
calls. Metadata-driven creation is guaranteed to match `app/db/models.py`
by construction, avoiding a hand-transcription bug across ~14 tables.
Consider generating a conventional `op.create_table`-based revision
(`alembic revision --autogenerate`) from a clean DB for finer-grained
downgrade support if that's ever needed.

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
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
