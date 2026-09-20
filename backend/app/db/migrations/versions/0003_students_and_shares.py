"""students and world_shares

Revision ID: 0003_students_and_shares
Revises: 0002_world_events
Create Date: 2026-09-20
"""

from alembic import op

from app.db.models import Student, WorldShare

revision = "0003_students_and_shares"
down_revision = "0002_world_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Student.__table__.create(bind, checkfirst=True)
    WorldShare.__table__.create(bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    WorldShare.__table__.drop(bind, checkfirst=True)
    Student.__table__.drop(bind, checkfirst=True)
