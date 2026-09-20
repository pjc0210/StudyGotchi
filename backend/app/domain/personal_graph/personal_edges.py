"""Student-specific semantic edges (spec: "Supported relationships" —
student-specific list). These are never silently promoted into canonical
`concept_edges`; they live in `student_concept_edges` and are scoped to one
student's graph.
"""

from dataclasses import dataclass
from uuid import UUID

from app.domain.ontology.edges import StudentConceptEdgeType


@dataclass(frozen=True)
class StudentConceptEdgeCandidate:
    student_id: UUID
    source_concept_id: UUID
    target_concept_id: UUID
    edge_type: StudentConceptEdgeType
    confidence: float
    origin_resource_id: UUID | None = None
    evidence_snippet: str | None = None


def is_valid_student_edge(candidate: StudentConceptEdgeCandidate) -> bool:
    """A student edge is invalid if it's a self-loop or has no confidence."""

    if candidate.source_concept_id == candidate.target_concept_id:
        return False
    return 0.0 < candidate.confidence <= 1.0


def dedupe_student_edges(
    candidates: list[StudentConceptEdgeCandidate],
) -> list[StudentConceptEdgeCandidate]:
    """Keep the highest-confidence candidate per
    (student, source, target, edge_type) — mirrors the unique constraint on
    `student_concept_edges`.
    """

    best: dict[
        tuple[UUID, UUID, UUID, StudentConceptEdgeType], StudentConceptEdgeCandidate
    ] = {}
    for candidate in candidates:
        if not is_valid_student_edge(candidate):
            continue
        key = (
            candidate.student_id,
            candidate.source_concept_id,
            candidate.target_concept_id,
            candidate.edge_type,
        )
        existing = best.get(key)
        if existing is None or candidate.confidence > existing.confidence:
            best[key] = candidate
    return list(best.values())
