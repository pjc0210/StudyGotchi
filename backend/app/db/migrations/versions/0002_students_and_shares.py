"""students and world_shares

Revision ID: 0002_students_and_shares
Revises: 0001_initial_schema
Create Date: 2026-09-19
"""

from alembic import op

from app.db import models  # noqa: F401
from app.db.base import Base

revision = "0002_students_and_shares"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    op.drop_table("world_shares")
    op.drop_table("students")
