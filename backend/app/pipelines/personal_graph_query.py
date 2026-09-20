"""Assembles a student's personal knowledge graph from persisted state
(spec: "Personal knowledge graph"). Thin glue between the repositories and
the pure `domain.personal_graph.builder`.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.graph.algorithms import build_digraph
from app.domain.ontology.edges import ConceptEdgeType, StudentConceptEdgeType
from app.domain.personal_graph.builder import (
    PersonalConceptStats,
    PersonalGraphResult,
    build_personal_graph,
)
from app.domain.personal_graph.personal_edges import StudentConceptEdgeCandidate
from app.repositories.concepts import get_course_concepts, get_personal_concepts
from app.repositories.edges import get_course_edges, get_student_edges
from app.repositories.student_states import get_student_concept_states


async def build_student_personal_graph(
    session: AsyncSession,
    *,
    course_id: UUID,
    student_id: UUID,
    goal_concept_ids: set[UUID] = frozenset(),
) -> PersonalGraphResult:
    course_concepts = await get_course_concepts(session, course_id)
    personal_concepts = await get_personal_concepts(session, course_id, student_id)
    course_edges = await get_course_edges(session, course_id)
    prereq_graph = build_digraph(
        course_edges, edge_types={ConceptEdgeType.PREREQUISITE_FOR}
    )

    raw_student_edges = await get_student_edges(session, course_id, student_id)
    student_edges = [
        StudentConceptEdgeCandidate(
            student_id=student_id,
            source_concept_id=e["source_concept_id"],
            target_concept_id=e["target_concept_id"],
            edge_type=StudentConceptEdgeType(e["edge_type"]),
            confidence=e["confidence"],
            origin_resource_id=e["origin_resource_id"],
        )
        for e in raw_student_edges
    ]

    states = await get_student_concept_states(
        session, student_id=student_id, course_id=course_id
    )
    stats_by_concept = {
        cid: PersonalConceptStats(
            understanding=float(state.understanding)
            if state.understanding is not None
            else None,
            positive_evidence=float(state.positive_evidence),
            negative_evidence=float(state.negative_evidence),
        )
        for cid, state in states.items()
    }

    return build_personal_graph(
        course_concepts=course_concepts,
        personal_concepts=personal_concepts,
        course_prereq_graph=prereq_graph,
        course_edges=course_edges,
        student_edges=student_edges,
        stats_by_concept=stats_by_concept,
        goal_concept_ids=goal_concept_ids,
    )
