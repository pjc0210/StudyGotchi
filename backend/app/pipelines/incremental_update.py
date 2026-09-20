"""Recompute per-student `understanding`/`discovery_state` after new evidence
(spec: "Understanding scoring", "Personal knowledge graph"). Only concepts
that could actually be affected are touched: the evidence's own concepts,
their direct successors (whose gap analysis depends on this concept's
understanding), and any concept that newly becomes a frontier neighbor.
"""

from collections import defaultdict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.graph.algorithms import build_digraph
from app.domain.mastery.evidence import EvidenceEvent
from app.domain.mastery.scorer import score_understanding_by_concept
from app.domain.ontology.edges import ConceptEdgeType
from app.domain.personal_graph.discovery import classify_discovery_state
from app.domain.personal_graph.frontier import compute_frontier_neighbors
from app.domain.world.events import WorldEventKind
from app.repositories.concepts import get_personal_concepts
from app.repositories.edges import get_course_edges
from app.repositories.student_states import (
    get_evidence_events,
    get_student_concept_states,
    upsert_student_concept_state,
)
from app.repositories.world import add_world_event


async def recompute_student_state(
    session: AsyncSession,
    *,
    course_id: UUID,
    student_id: UUID,
    touched_concept_ids: set[UUID],
) -> None:
    if not touched_concept_ids:
        return

    previous = await get_student_concept_states(
        session, course_id=course_id, student_id=student_id
    )
    settings = get_settings()
    course_edges = await get_course_edges(session, course_id)
    prereq_graph = build_digraph(
        course_edges, edge_types={ConceptEdgeType.PREREQUISITE_FOR}
    )

    affected: set[UUID] = set(touched_concept_ids)
    for concept_id in touched_concept_ids:
        if concept_id in prereq_graph:
            affected.update(prereq_graph.successors(concept_id))

    all_events = await get_evidence_events(
        session, student_id=student_id, course_id=course_id
    )
    events_by_concept: dict[UUID, list[EvidenceEvent]] = defaultdict(list)
    for event in all_events:
        events_by_concept[event.concept_id].append(event)

    known_ids = set(events_by_concept.keys())
    personal_concepts = await get_personal_concepts(session, course_id, student_id)
    known_ids |= set(personal_concepts.keys())

    frontier_ids = compute_frontier_neighbors(prereq_graph, known_ids)
    affected |= frontier_ids

    understanding_results = score_understanding_by_concept(
        {cid: events_by_concept.get(cid, []) for cid in known_ids},
        alpha_prior=settings.understanding_alpha_prior,
        beta_prior=settings.understanding_beta_prior,
    )

    for concept_id in affected:
        events = events_by_concept.get(concept_id, [])
        result = understanding_results.get(concept_id)
        if result is None:
            from app.domain.mastery.scorer import score_concept_understanding

            result = score_concept_understanding(
                events,
                alpha_prior=settings.understanding_alpha_prior,
                beta_prior=settings.understanding_beta_prior,
            )

        effective_evidence = result.positive_evidence + result.negative_evidence
        discovery_state = classify_discovery_state(
            effective_evidence=effective_evidence,
            is_frontier_neighbor=concept_id in frontier_ids,
            is_learning_goal_ancestor=False,
        )

        last_evidence_at = max((e.occurred_at for e in events), default=None)
        practiced_events = [e for e in events if e.outcome is not None]
        last_practiced_at = max((e.occurred_at for e in practiced_events), default=None)

        old = previous.get(concept_id)
        event_args = {
            "student_id": student_id,
            "course_id": course_id,
            "concept_id": concept_id,
            "resource_id": events[-1].resource_id if events else None,
        }
        if old is None or (old.discovery_state in ("unseen", "frontier") and events):
            await add_world_event(
                session,
                **event_args,
                event=WorldEventKind.CONCEPT_DISCOVERED if events else WorldEventKind.FRONTIER_EXPANDED,
                explanation="Source evidence introduced this concept."
                if events
                else "Adjacent prerequisite structure exposed this frontier.",
            )
        old_understanding = (
            float(old.understanding)
            if old is not None and old.understanding is not None
            else 0.5
        )
        delta = result.understanding - old_understanding
        if abs(delta) > 0.001 and any(e.outcome is not None for e in events):
            await add_world_event(
                session,
                **event_args,
                event=WorldEventKind.UNDERSTANDING_GAIN if delta > 0 else WorldEventKind.UNDERSTANDING_DROP,
                delta=delta,
                explanation=(
                    f"Recomputed from {len(practiced_events)} scored evidence events; "
                    f"understanding {old_understanding:.3f} → {result.understanding:.3f}."
                ),
            )
        if result.understanding >= 0.88 and (
            old is None or old.understanding is None or float(old.understanding) < 0.88
        ):
            await add_world_event(
                session,
                **event_args,
                event=WorldEventKind.CONCEPT_MASTERED,
                explanation="Understanding crossed the mastered threshold.",
            )
        await upsert_student_concept_state(
            session,
            student_id=student_id,
            course_id=course_id,
            concept_id=concept_id,
            discovery_state=discovery_state.value,
            understanding=result.understanding if events else None,
            personal_relevance=min(1.0, result.understanding if events else 0.0),
            positive_evidence=result.positive_evidence,
            negative_evidence=result.negative_evidence,
            last_evidence_at=last_evidence_at,
            last_practiced_at=last_practiced_at,
        )
