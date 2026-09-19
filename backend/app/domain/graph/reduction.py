"""Prerequisite graph cleanup pipeline (spec: "Prerequisite extraction" post
-processing): remove self-edges, break cycles, and compute a transitively
reduced display graph — without ever deleting raw evidence.

Duplicate-edge merging is handled at the repository layer via an upsert on
the `(course_id, source_concept_id, target_concept_id, edge_type)` unique
constraint, since the DB schema already forbids literal duplicates.
"""

from dataclasses import dataclass, field
from uuid import UUID

import networkx as nx

from app.domain.graph.algorithms import (
    break_low_confidence_cycles,
    build_digraph,
    transitive_reduce,
)
from app.domain.ontology.edges import ConceptEdgeData, ConceptEdgeType


@dataclass
class PrerequisiteCleanupResult:
    #: edges removed to break a cycle; caller should downgrade these to
    #: RELATED_TO rather than deleting them, preserving the evidence.
    cycle_broken_edge_ids: set[UUID] = field(default_factory=set)
    #: edges that survive cycle-breaking but are implied by a shorter
    #: prerequisite chain (A->B->C implies A->C); suppress these from the
    #: *display* graph only, keep them active in the raw data.
    redundant_edge_ids: set[UUID] = field(default_factory=set)
    #: the final acyclic, transitively-reduced graph (concept-id nodes).
    reduced_graph: nx.DiGraph = field(default_factory=nx.DiGraph)


def clean_prerequisite_edges(edges: list[ConceptEdgeData]) -> PrerequisiteCleanupResult:
    non_self_edges = [e for e in edges if e.source_concept_id != e.target_concept_id]

    graph = build_digraph(non_self_edges, edge_types={ConceptEdgeType.PREREQUISITE_FOR})
    acyclic_graph, removed_pairs = break_low_confidence_cycles(graph)

    removed_pair_set = set(removed_pairs)
    cycle_broken_edge_ids = {
        e.id
        for e in non_self_edges
        if e.edge_type == ConceptEdgeType.PREREQUISITE_FOR
        and (e.source_concept_id, e.target_concept_id) in removed_pair_set
    }

    reduced_graph = transitive_reduce(acyclic_graph) if acyclic_graph.number_of_nodes() else acyclic_graph

    surviving_edge_ids_by_pair = {
        (e.source_concept_id, e.target_concept_id): e.id
        for e in non_self_edges
        if e.edge_type == ConceptEdgeType.PREREQUISITE_FOR
        and (e.source_concept_id, e.target_concept_id) not in removed_pair_set
    }
    reduced_pairs = set(reduced_graph.edges)
    redundant_edge_ids = {
        edge_id
        for pair, edge_id in surviving_edge_ids_by_pair.items()
        if pair not in reduced_pairs
    }

    return PrerequisiteCleanupResult(
        cycle_broken_edge_ids=cycle_broken_edge_ids,
        redundant_edge_ids=redundant_edge_ids,
        reduced_graph=reduced_graph,
    )
