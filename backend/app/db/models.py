"""SQLAlchemy ORM models for the knowledge-engine schema.

Pure persistence only: no domain/scoring logic lives here. Domain logic
(mastery math, graph algorithms, personal-graph construction) operates on
plain dataclasses in `app.domain.*` and is unit-testable without a database.
"""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import DateTime

from app.db.base import Base, TimestampMixin, UUIDPKMixin

# Voyage-3 embeddings are 1024-dimensional. Kept as a single constant so the
# embedding provider and the schema never drift apart.
EMBEDDING_DIM = 1024


class Course(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "courses"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    code: Mapped[str | None] = mapped_column(Text, nullable=True)
    term: Mapped[str | None] = mapped_column(Text, nullable=True)


class Resource(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "resources"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    origin: Mapped[str] = mapped_column(Text, nullable=False)
    artifact_type: Mapped[str] = mapped_column(Text, nullable=False)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    external_file_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (Index("ix_resources_course_id", "course_id"),)


class ResourceChunk(Base, UUIDPKMixin):
    __tablename__ = "resource_chunks"

    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
    chunk_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("ix_resource_chunks_resource_id", "resource_id"),)


class Concept(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "concepts"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    canonical_name: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_name: Mapped[str] = mapped_column(Text, nullable=False)
    short_definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    concept_kind: Mapped[str] = mapped_column(Text, nullable=False)
    granularity: Mapped[str] = mapped_column(Text, nullable=False)
    importance: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.5)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")

    # scope: "course" | "personal" | "shared_extension"
    scope: Mapped[str] = mapped_column(Text, nullable=False, default="course")
    owner_student_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_from_resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=True
    )
    canonical_parent_concept_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=True
    )
    promotion_status: Mapped[str | None] = mapped_column(Text, nullable=True)

    concept_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (
        Index("ix_concepts_course_id", "course_id"),
        Index("ix_concepts_normalized_name", "course_id", "normalized_name"),
    )


class ConceptAlias(Base, UUIDPKMixin):
    __tablename__ = "concept_aliases"

    concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=False
    )
    alias: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_alias: Mapped[str] = mapped_column(Text, nullable=False)
    source_resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=True
    )
    confidence: Mapped[float] = mapped_column(Numeric, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_concept_aliases_normalized_alias", "normalized_alias"),
        Index("ix_concept_aliases_concept_id", "concept_id"),
    )


class ConceptEdge(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "concept_edges"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    source_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=False
    )
    target_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=False
    )
    edge_type: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric, nullable=False)
    authority_weight: Mapped[float] = mapped_column(Numeric, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")
    edge_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "source_concept_id",
            "target_concept_id",
            "edge_type",
            name="uq_concept_edges_triple",
        ),
        Index("ix_concept_edges_source", "source_concept_id"),
        Index("ix_concept_edges_target", "target_concept_id"),
    )


class EdgeEvidence(Base, UUIDPKMixin):
    __tablename__ = "edge_evidence"

    edge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concept_edges.id"), nullable=False
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False
    )
    chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resource_chunks.id"), nullable=True
    )
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    evidence_kind: Mapped[str] = mapped_column(Text, nullable=False)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Numeric, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("ix_edge_evidence_edge_id", "edge_id"),)


class ConceptResourceLink(Base, UUIDPKMixin):
    __tablename__ = "concept_resource_links"

    concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=False
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False
    )
    chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resource_chunks.id"), nullable=True
    )
    # EXPLAINED_IN | APPEARS_IN | WORKED_EXAMPLE_IN | ASSESSED_IN
    link_type: Mapped[str] = mapped_column(Text, nullable=False)
    depth_score: Mapped[float] = mapped_column(Numeric, nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_concept_resource_links_concept_id", "concept_id"),
        Index("ix_concept_resource_links_resource_id", "resource_id"),
    )


class Assessment(Base, UUIDPKMixin):
    __tablename__ = "assessments"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    assessment_type: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_score: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    assessment_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (Index("ix_assessments_course_id", "course_id"),)


class AssessmentItem(Base, UUIDPKMixin):
    __tablename__ = "assessment_items"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False
    )
    label: Mapped[str] = mapped_column(Text, nullable=False)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    difficulty: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    item_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (Index("ix_assessment_items_assessment_id", "assessment_id"),)


class AssessmentItemConcept(Base):
    __tablename__ = "assessment_item_concepts"

    assessment_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment_items.id"), primary_key=True
    )
    concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), primary_key=True
    )
    relevance_weight: Mapped[float] = mapped_column(Numeric, nullable=False)


class StudentConceptState(Base):
    __tablename__ = "student_concept_states"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), primary_key=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    # unseen | frontier | encountered | active
    discovery_state: Mapped[str] = mapped_column(Text, nullable=False, default="unseen")
    mastery: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.5)
    familiarity: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.0)
    mastery_confidence: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.0)
    readiness: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.0)
    fragility: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.0)
    personal_relevance: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.0)
    last_evidence_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_practiced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    positive_evidence: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.0)
    negative_evidence: Mapped[float] = mapped_column(Numeric, nullable=False, default=0.0)
    state_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("ix_student_concept_states_course_id", "course_id"),)


class StudentConceptEdge(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "student_concept_edges"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    source_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=False
    )
    target_concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=False
    )
    edge_type: Mapped[str] = mapped_column(Text, nullable=False)
    origin_resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=True
    )
    confidence: Mapped[float] = mapped_column(Numeric, nullable=False)
    edge_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "source_concept_id",
            "target_concept_id",
            "edge_type",
            name="uq_student_concept_edges_triple",
        ),
        Index("ix_student_concept_edges_student_id", "student_id"),
    )


class StudentEvidenceEvent(Base, UUIDPKMixin):
    __tablename__ = "student_evidence_events"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False
    )
    concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id"), nullable=False
    )
    resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=True
    )
    assessment_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment_items.id"), nullable=True
    )
    evidence_type: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    strength: Mapped[float] = mapped_column(Numeric, nullable=False)
    certainty: Mapped[float] = mapped_column(Numeric, nullable=False)
    difficulty: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_student_evidence_events_student_concept", "student_id", "concept_id"),
    )
