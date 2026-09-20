"""Persist semantic world change events.

Superseded by 0003_drop_world_events: the `WorldEvent` model and the
`/world`, `/world-events` endpoints were removed once world/game logic
moved to a separate teammate-owned component that consumes raw
knowledge-graph node/edge data instead. This revision is kept, with its
table defined inline (rather than imported from `app.db.models`, which no
longer has a `WorldEvent` class), so replaying migration history from a
clean database still reproduces exactly what happened at the time.
"""

import uuid

import sqlalchemy as sa
from alembic import op

revision = "0002_world_events"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None

_world_events = sa.Table(
    "world_events",
    sa.MetaData(),
    sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4),
    sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
    sa.Column(
        "course_id", sa.Uuid(as_uuid=True), sa.ForeignKey("courses.id"), nullable=False
    ),
    sa.Column(
        "concept_id", sa.Uuid(as_uuid=True), sa.ForeignKey("concepts.id"), nullable=True
    ),
    sa.Column(
        "resource_id",
        sa.Uuid(as_uuid=True),
        sa.ForeignKey("resources.id"),
        nullable=True,
    ),
    sa.Column("event", sa.Text, nullable=False),
    sa.Column("delta", sa.Numeric, nullable=True),
    sa.Column("explanation", sa.Text, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Index(
        "ix_world_events_student_course", "student_id", "course_id", "created_at"
    ),
)


def upgrade():
    _world_events.create(op.get_bind(), checkfirst=True)


def downgrade():
    _world_events.drop(op.get_bind(), checkfirst=True)
