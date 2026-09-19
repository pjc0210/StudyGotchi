"""Recompute per-student mastery/familiarity/confidence/readiness/fragility/
discovery_state after new evidence (spec: "Mastery scoring" through
"Fragility", "Personal knowledge graph"). Only concepts that could actually
be affected are touched: the evidence's own concepts, their direct
successors (whose readiness/fragility depends on this concept's mastery),
and any concept that newly becomes a frontier neighbor.
"""

from collections import defaultdict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.graph.algorithms import build_digraph
from app.domain.mastery.evidence import EvidenceEvent
from app.domain.mastery.familiarity import compute_familiarity
from app.domain.mastery.readiness import (
    PrerequisiteLink,
    compute_fragility,
    compute_prerequisite_support,
    compute_readiness,
)
from app.domain.mastery.scorer import score_mastery_by_concept
from app.domain.ontology.edges import ConceptEdgeType
from app.domain.personal_graph.discovery import classify_discovery_state
from app.domain.personal_graph.frontier import compute_frontier_neighbors
from app.repositories.concepts import get_personal_concepts
from app.repositories.edges import get_course_edges
from app.repositories.student_states import (
    get_evidence_events,
    upsert_student_concept_state,
)


async def recompute_student_state(
    session: AsyncSession, *, course_id: UUID, student_id: UUID, touched_concept_ids: set[UUID]
) -> None:
    if not touched_concept_ids:
        return

    settings = get_settings()
    course_edges = await get_course_edges(session, course_id)
    prereq_graph = build_digraph(course_edges, edge_types={ConceptEdgeType.PREREQUISITE_FOR})

    affected: set[UUID] = set(touched_concept_ids)
    for concept_id in touched_concept_ids:
        if concept_id in prereq_graph:
            affected.update(prereq_graph.successors(concept_id))

    all_events = await get_evidence_events(session, student_id=student_id, course_id=course_id)
    events_by_concept: dict[UUID, list[EvidenceEvent]] = defaultdict(list)
    for event in all_events:
        events_by_concept[event.concept_id].append(event)

    known_ids = set(events_by_concept.keys())
    personal_concepts = await get_personal_concepts(session, course_id, student_id)
    known_ids |= set(personal_concepts.keys())

    frontier_ids = compute_frontier_neighbors(prereq_graph, known_ids)
    affected |= frontier_ids

    mastery_results = score_mastery_by_concept(
        {cid: events_by_concept.get(cid, []) for cid in known_ids},
        alpha_prior=settings.mastery_alpha_prior,
        beta_prior=settings.mastery_beta_prior,
        confidence_k=settings.mastery_confidence_k,
    )
    mastery_by_concept = {cid: result.mastery for cid, result in mastery_results.items()}
    familiarity_by_concept = {cid: compute_familiarity(events_by_concept.get(cid, [])) for cid in known_ids}

    for concept_id in affected:
        events = events_by_concept.get(concept_id, [])
        mastery_result = mastery_results.get(concept_id)
        if mastery_result is None:
            from app.domain.mastery.scorer import score_concept_mastery

            mastery_result = score_concept_mastery(
                events,
                alpha_prior=settings.mastery_alpha_prior,
                beta_prior=settings.mastery_beta_prior,
                confidence_k=settings.mastery_confidence_k,
            )
        familiarity = familiarity_by_concept.get(concept_id) or compute_familiarity(events)

        prereq_links = (
            [
                PrerequisiteLink(
                    prerequisite_concept_id=p,
                    edge_confidence=prereq_graph.edges[p, concept_id].get("confidence", 0.5),
                )
                for p in prereq_graph.predecessors(concept_id)
            ]
            if concept_id in prereq_graph
            else []
        )
        support = compute_prerequisite_support(prereq_links, mastery_by_concept)
        readiness = compute_readiness(mastery_result.mastery, support)
        fragility = compute_fragility(mastery_result.mastery, support)

        discovery_state = classify_discovery_state(
            effective_evidence=mastery_result.positive_evidence + mastery_result.negative_evidence,
            familiarity=familiarity,
            is_frontier_neighbor=concept_id in frontier_ids,
            is_learning_goal_ancestor=False,
        )

        last_evidence_at = max((e.occurred_at for e in events), default=None)
        practiced_events = [e for e in events if e.outcome is not None]
        last_practiced_at = max((e.occurred_at for e in practiced_events), default=None)

        await upsert_student_concept_state(
            session,
            student_id=student_id,
            course_id=course_id,
            concept_id=concept_id,
            discovery_state=discovery_state.value,
            mastery=mastery_result.mastery,
            familiarity=familiarity,
            mastery_confidence=mastery_result.confidence,
            readiness=readiness,
            fragility=fragility,
            personal_relevance=min(1.0, familiarity + mastery_result.mastery),
            positive_evidence=mastery_result.positive_evidence,
            negative_evidence=mastery_result.negative_evidence,
            last_evidence_at=last_evidence_at,
            last_practiced_at=last_practiced_at,
        )
