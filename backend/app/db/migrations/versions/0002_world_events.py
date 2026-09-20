"""Persist semantic world change events."""

from alembic import op

from app.db.models import WorldEvent

revision = "0002_world_events"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    WorldEvent.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    WorldEvent.__table__.drop(op.get_bind(), checkfirst=True)
