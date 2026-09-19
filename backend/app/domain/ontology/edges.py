"""Edge-level domain types (spec: "Supported relationships").

Three independent edge families:
  * canonical concept<->concept relationships (course ontology)
  * resource<->concept relationships (provenance)
  * student-specific concept<->concept relationships (personal graph)

`PREREQUISITE_FOR` carries a strong pedagogical claim and is never inferred
from co-occurrence, embedding similarity, or syllabus ordering alone; see
`app.domain.graph.prerequisite`.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID


class ConceptEdgeType(StrEnum):
    PREREQUISITE_FOR = "PREREQUISITE_FOR"
    RELATED_TO = "RELATED_TO"
    BUILDS_ON = "BUILDS_ON"
    EXAMPLE_OF = "EXAMPLE_OF"
    APPLICATION_OF = "APPLICATION_OF"
    CONTRASTS_WITH = "CONTRASTS_WITH"


# Only PREREQUISITE_FOR is treated as directionally load-bearing for
# readiness/fragility/gap computations; the others are descriptive.
STRONG_DIRECTIONAL_EDGE_TYPES = frozenset({ConceptEdgeType.PREREQUISITE_FOR})


class ResourceLinkType(StrEnum):
    EXPLAINED_IN = "EXPLAINED_IN"
    APPEARS_IN = "APPEARS_IN"
    WORKED_EXAMPLE_IN = "WORKED_EXAMPLE_IN"


class StudentConceptEdgeType(StrEnum):
    ASSOCIATES_WITH = "ASSOCIATES_WITH"
    LEARNED_THROUGH = "LEARNED_THROUGH"
    PERSONAL_EXAMPLE_OF = "PERSONAL_EXAMPLE_OF"
    PERSONAL_BUILDS_ON = "PERSONAL_BUILDS_ON"


@dataclass
class ConceptEdgeData:
    """A canonical concept<->concept edge as consumed by graph algorithms."""

    id: UUID
    course_id: UUID
    source_concept_id: UUID
    target_concept_id: UUID
    edge_type: ConceptEdgeType
    confidence: float
    authority_weight: float
    status: str = "active"
    metadata: dict = field(default_factory=dict)


@dataclass
class EdgeEvidenceData:
    edge_id: UUID
    resource_id: UUID
    evidence_kind: str
    confidence: float
    chunk_id: UUID | None = None
    page_number: int | None = None
    snippet: str | None = None
