"""Minimal study path construction (spec: "Minimal study path").

Given a target concept/assessment, walk its prerequisite ancestors, drop
what's already understood, rank what's left by gap priority, and return a
topologically valid study sequence — the smallest useful path, not the
entire prerequisite tree.
"""

from dataclasses import dataclass
from uuid import UUID

import networkx as nx

from app.domain.gaps.prerequisite_support import PrerequisiteLink, weak_prerequisites
from app.domain.gaps.scoring import (
    GapAction,
    GapPriorityInputs,
    compute_gap_priority,
    recommend_action,
)
from app.domain.graph.algorithms import (
    normalized_downstream_reach,
    shortest_path_length,
    topological_order_with_priority,
    transitive_reduce,
)


@dataclass(frozen=True)
class GapEntry:
    concept_id: UUID
    understanding: float
    priority: float
    action: GapAction
    reason: str


@dataclass(frozen=True)
class StudyPlanResult:
    target_concept_id: UUID
    gaps: list[GapEntry]
    study_order: list[UUID]


def build_minimal_study_subgraph(
    ancestor_subgraph: nx.DiGraph,
    target_concept_id: UUID,
    understanding_by_concept: dict[UUID, float],
    *,
    understood_threshold: float,
) -> nx.DiGraph:
    """Step 1-4 of the spec's minimal-study-path recipe: the ancestor
    subgraph, with already-understood concepts removed and transitively
    reduced. `ancestor_subgraph` should already be restricted to the target's
    prerequisite ancestors (+ the target itself as the sink).
    """

    to_remove = [
        node
        for node in ancestor_subgraph.nodes
        if node != target_concept_id
        and understanding_by_concept.get(node, 0.0) >= understood_threshold
    ]
    trimmed = ancestor_subgraph.copy()
    for node in to_remove:
        # Reconnect predecessors -> successors so removing an understood
        # middle node doesn't sever the prerequisite chain around it.
        preds = list(trimmed.predecessors(node))
        succs = list(trimmed.successors(node))
        trimmed.remove_node(node)
        for p in preds:
            for s in succs:
                if p != s:
                    trimmed.add_edge(p, s)

    return transitive_reduce(trimmed) if trimmed.number_of_nodes() else trimmed


def build_study_plan(
    ancestor_subgraph: nx.DiGraph,
    target_concept_id: UUID,
    *,
    understanding_by_concept: dict[UUID, float],
    effective_evidence_by_concept: dict[UUID, float],
    course_importance_by_concept: dict[UUID, float],
    is_stale_by_concept: dict[UUID, bool],
    relevance_alpha: float,
    understood_threshold: float = 0.75,
    weak_prerequisite_threshold: float = 0.5,
) -> StudyPlanResult:
    """Full pipeline: trim understood concepts, rank gaps, topologically
    order the remainder. `ancestor_subgraph` is the target's prerequisite
    ancestor subgraph (edges pointing toward the target); the target node
    itself may or may not be present — it is always excluded from the
    returned gaps.
    """

    study_subgraph = build_minimal_study_subgraph(
        ancestor_subgraph,
        target_concept_id,
        understanding_by_concept,
        understood_threshold=understood_threshold,
    )

    bottleneck_weight_by_concept = normalized_downstream_reach(study_subgraph)

    gaps: dict[UUID, GapEntry] = {}
    for concept_id in study_subgraph.nodes:
        if concept_id == target_concept_id:
            continue

        understanding = understanding_by_concept.get(concept_id, 0.0)
        effective_evidence = effective_evidence_by_concept.get(concept_id, 0.0)
        distance = shortest_path_length(study_subgraph, concept_id, target_concept_id)

        priority = compute_gap_priority(
            GapPriorityInputs(
                concept_id=concept_id,
                understanding=understanding,
                course_importance=course_importance_by_concept.get(concept_id, 0.5),
                shortest_path_distance=distance,
                bottleneck_weight=bottleneck_weight_by_concept.get(concept_id, 0.0),
            ),
            relevance_alpha=relevance_alpha,
        )
        action = recommend_action(
            understanding,
            effective_evidence,
            is_stale=is_stale_by_concept.get(concept_id, False),
        )

        prereq_links = [
            PrerequisiteLink(prerequisite_concept_id=p, edge_confidence=1.0)
            for p in study_subgraph.predecessors(concept_id)
        ]
        own_weak_prereqs = weak_prerequisites(
            prereq_links,
            understanding_by_concept,
            threshold=weak_prerequisite_threshold,
        )

        gaps[concept_id] = GapEntry(
            concept_id=concept_id,
            understanding=understanding,
            priority=priority,
            action=action,
            reason=_explain_gap(
                action,
                distance,
                bottleneck_weight_by_concept.get(concept_id, 0.0),
                has_weak_prerequisites=bool(own_weak_prereqs),
            ),
        )

    order_subgraph = study_subgraph.copy()
    if target_concept_id in order_subgraph:
        order_subgraph.remove_node(target_concept_id)

    def priority_key(concept_id: UUID) -> tuple[float, float, float]:
        entry = gaps.get(concept_id)
        importance = course_importance_by_concept.get(concept_id, 0.0)
        if entry is None:
            return (0.0, -importance, 0.0)
        return (
            -entry.priority,
            -importance,
            -understanding_by_concept.get(concept_id, 0.0),
        )

    study_order = topological_order_with_priority(order_subgraph, priority_key)

    ranked_gaps = sorted(gaps.values(), key=lambda g: -g.priority)
    return StudyPlanResult(
        target_concept_id=target_concept_id, gaps=ranked_gaps, study_order=study_order
    )


def _explain_gap(
    action: GapAction,
    distance: int | None,
    bottleneck_weight: float,
    *,
    has_weak_prerequisites: bool,
) -> str:
    proximity = (
        "a direct prerequisite of" if distance == 1 else "an upstream prerequisite of"
    )
    if action is GapAction.STUDY:
        base = f"Weak and well-evidenced; {proximity} the target."
    elif action is GapAction.DIAGNOSE:
        base = f"Possibly weak but under-evidenced; {proximity} the target."
    elif action is GapAction.REVIEW:
        base = "Previously understood but evidence is stale."
    else:
        base = "Not currently a priority for this target."
    if bottleneck_weight > 0.66:
        base += " Multiple target-relevant concepts depend on it."
    if has_weak_prerequisites:
        base += " Its own prerequisites are also weak."
    return base
