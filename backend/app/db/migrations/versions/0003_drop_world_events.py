"""Drop world_events.

World/game state (terrain, fog, creature states, discovery/mastery event
feed) moved out of this backend into a separate teammate-owned component
that consumes raw knowledge-graph node/edge data (personal_relevance,
understanding, importance, edge type/origin/confidence) instead of a
backend-computed semantic projection. `WorldEvent`, `/world`, and
`/world-events` were removed from the application; this drops the now-dead
table.

Revision ID: 0003_drop_world_events
Revises: 0002_world_events
Create Date: 2026-09-20
"""

import uuid

import sqlalchemy as sa
from alembic import op

revision = "0003_drop_world_events"
down_revision = "0002_world_events"
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
    op.get_bind().execute(sa.text("DROP TABLE IF EXISTS world_events"))


def downgrade():
    _world_events.create(op.get_bind(), checkfirst=True)
