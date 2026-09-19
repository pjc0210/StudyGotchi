"""Knowledge-gap / minimal-study-path query pipeline (spec: "Knowledge-gap
engine", "Minimal study path"). Backs both `GET .../gaps` and
`POST .../study-plan` — they're the same computation, one just also returns
`study_order`.

A single target concept and an assessment target are unified via a
synthetic sink node: every actual target concept gets an edge into it, so
"ancestors of the goal" and "distance to the goal" naturally cover the
multi-concept-assessment case (e.g. HW3 tests three concepts) the same way
they cover a single concept target.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4

import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.gaps.study_plan import GapEntry, build_study_plan
from app.domain.graph.algorithms import build_digraph, get_prerequisite_ancestors
from app.domain.ontology.edges import ConceptEdgeType
from app.repositories.assessments import get_assessment_items, get_item_concept_links
from app.repositories.concepts import get_course_concepts
from app.repositories.edges import get_course_edges
from app.repositories.student_states import get_student_concept_states


@dataclass
class TargetGapResult:
    target_concept_ids: set[UUID]
    gaps: list[GapEntry]
    study_order: list[UUID]


async def _resolve_target_concept_ids(
    session: AsyncSession, *, target_concept_id: UUID | None, assessment_id: UUID | None
) -> set[UUID]:
    if target_concept_id is not None:
        return {target_concept_id}

    assert assessment_id is not None
    items = await get_assessment_items(session, assessment_id)
    concept_ids: set[UUID] = set()
    for item in items:
        links = await get_item_concept_links(session, item.id)
        concept_ids.update(cid for cid, _ in links)
    return concept_ids


async def compute_target_gaps(
    session: AsyncSession,
    *,
    course_id: UUID,
    student_id: UUID,
    target_concept_id: UUID | None = None,
    assessment_id: UUID | None = None,
) -> TargetGapResult:
    settings = get_settings()

    target_ids = await _resolve_target_concept_ids(
        session, target_concept_id=target_concept_id, assessment_id=assessment_id
    )
    if not target_ids:
        return TargetGapResult(target_concept_ids=set(), gaps=[], study_order=[])

    course_edges = await get_course_edges(session, course_id)
    prereq_graph = build_digraph(course_edges, edge_types={ConceptEdgeType.PREREQUISITE_FOR})

    goal_node = uuid4()
    ancestor_ids: set[UUID] = set()
    working_graph = prereq_graph.copy()
    working_graph.add_node(goal_node)
    for target_id in target_ids:
        if target_id in prereq_graph:
            ancestor_ids |= get_prerequisite_ancestors(prereq_graph, target_id)
        ancestor_ids.add(target_id)
        working_graph.add_edge(target_id, goal_node, confidence=1.0)

    subgraph: nx.DiGraph = working_graph.subgraph(ancestor_ids | {goal_node}).copy()

    course_concepts = await get_course_concepts(session, course_id)
    states = await get_student_concept_states(session, student_id=student_id, course_id=course_id)

    mastery_by_concept = {cid: float(state.mastery) for cid, state in states.items()}
    confidence_by_concept = {cid: float(state.mastery_confidence) for cid, state in states.items()}
    importance_by_concept = {cid: float(concept.importance) for cid, concept in course_concepts.items()}

    now = datetime.now(timezone.utc)
    staleness_cutoff_days = settings.staleness_days
    is_stale_by_concept = {}
    for cid, state in states.items():
        if state.last_practiced_at is None:
            is_stale_by_concept[cid] = False
            continue
        age_days = (now - state.last_practiced_at).total_seconds() / 86400.0
        is_stale_by_concept[cid] = age_days > staleness_cutoff_days

    result = build_study_plan(
        subgraph,
        goal_node,
        mastery_by_concept=mastery_by_concept,
        confidence_by_concept=confidence_by_concept,
        course_importance_by_concept=importance_by_concept,
        is_stale_by_concept=is_stale_by_concept,
        relevance_alpha=settings.gap_relevance_alpha,
        mastered_threshold=settings.gap_mastered_threshold,
    )

    return TargetGapResult(target_concept_ids=target_ids, gaps=result.gaps, study_order=result.study_order)
