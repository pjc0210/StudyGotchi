"""Concept-level domain types (spec: "Concept semantics").

A concept must represent a learnable idea, not a keyword: something an
instructor could reasonably write an independent question about. These
types are pure data — no persistence, no LLM calls — so the rest of the
domain layer (graph algorithms, mastery, gaps) can be tested without a
database or model provider.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID


class ConceptKind(StrEnum):
    PRINCIPLE = "principle"
    DEFINITION = "definition"
    THEOREM = "theorem"
    METHOD = "method"
    PROCEDURE = "procedure"
    SKILL = "skill"
    MODEL = "model"
    FORMULA = "formula"
    APPLICATION = "application"
    TOPIC_CLUSTER = "topic_cluster"


class Granularity(StrEnum):
    CLUSTER = "cluster"
    CORE = "core"
    ATOMIC = "atomic"


class ConceptScope(StrEnum):
    COURSE = "course"
    PERSONAL = "personal"
    SHARED_EXTENSION = "shared_extension"


class PromotionStatus(StrEnum):
    NONE = "none"
    PROPOSED = "proposed"
    PROMOTED = "promoted"
    REJECTED = "rejected"


@dataclass
class ConceptNode:
    """A concept as consumed by graph algorithms and the personal-graph
    builder. Mirrors the `concepts` table but is independent of SQLAlchemy.
    """

    id: UUID
    course_id: UUID
    canonical_name: str
    normalized_name: str
    concept_kind: ConceptKind
    granularity: Granularity
    importance: float = 0.5
    scope: ConceptScope = ConceptScope.COURSE
    short_definition: str | None = None
    owner_student_id: UUID | None = None
    canonical_parent_concept_id: UUID | None = None
    embedding: list[float] | None = None


@dataclass
class ConceptCandidate:
    """Structured output of concept extraction, prior to canonicalization.

    Corresponds to the "Concept extraction contract" in the build spec.
    """

    name: str
    normalized_name: str
    definition: str
    concept_kind: ConceptKind
    granularity: Granularity
    importance_in_resource: float
    evidence_snippets: list["ConceptEvidenceSnippet"] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)


@dataclass
class ConceptEvidenceSnippet:
    chunk_id: str | None
    page_number: int | None
    snippet: str
