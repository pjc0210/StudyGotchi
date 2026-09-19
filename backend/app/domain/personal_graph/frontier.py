"""Frontier discovery: which not-yet-known concepts are immediately
learnable next (spec: "Personal knowledge graph" node-inclusion rule #4-5).
"""

from uuid import UUID

import networkx as nx

from app.domain.graph.algorithms import get_prerequisite_ancestors


def compute_frontier_neighbors(graph: nx.DiGraph, known_concept_ids: set[UUID]) -> set[UUID]:
    """A concept is on the frontier if it is not yet known but is directly
    adjacent to the known set: either all of its direct prerequisites are
    already known (it's ready to be learned next), or it is a direct
    successor of a known concept (a natural next step).
    """

    frontier: set[UUID] = set()

    for node in graph.nodes:
        if node in known_concept_ids:
            continue
        predecessors = set(graph.predecessors(node))
        if predecessors and predecessors.issubset(known_concept_ids):
            frontier.add(node)

    for node in known_concept_ids:
        if node not in graph:
            continue
        for successor in graph.successors(node):
            if successor not in known_concept_ids:
                frontier.add(successor)

    return frontier


def compute_goal_frontier(
    graph: nx.DiGraph, known_concept_ids: set[UUID], goal_concept_ids: set[UUID]
) -> set[UUID]:
    """Concepts required for an explicit learning goal that aren't known yet,
    even if they aren't adjacent to current knowledge (node-inclusion rule
    #5: "it is needed for an explicit learning goal").
    """

    needed: set[UUID] = set()
    for goal in goal_concept_ids:
        needed |= get_prerequisite_ancestors(graph, goal)
        needed.add(goal)
    return needed - known_concept_ids
