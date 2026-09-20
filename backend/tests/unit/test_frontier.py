from uuid import uuid4

import networkx as nx

from app.domain.personal_graph.discovery import DiscoveryState, classify_discovery_state
from app.domain.personal_graph.frontier import (
    compute_frontier_neighbors,
    compute_goal_frontier,
)


def test_frontier_neighbor_when_prerequisite_known():
    known = uuid4()
    frontier_candidate = uuid4()
    graph = nx.DiGraph()
    graph.add_edge(known, frontier_candidate)

    frontier = compute_frontier_neighbors(graph, {known})
    assert frontier_candidate in frontier


def test_not_frontier_when_unrelated():
    known = uuid4()
    unrelated = uuid4()
    graph = nx.DiGraph()
    graph.add_node(known)
    graph.add_node(unrelated)

    frontier = compute_frontier_neighbors(graph, {known})
    assert unrelated not in frontier


def test_goal_frontier_includes_unmet_ancestors_of_target():
    a, b, target = uuid4(), uuid4(), uuid4()
    graph = nx.DiGraph()
    graph.add_edge(a, b)
    graph.add_edge(b, target)

    goal_frontier = compute_goal_frontier(
        graph, known_concept_ids=set(), goal_concept_ids={target}
    )
    assert {a, b, target} == goal_frontier


def test_discovery_state_active_with_sufficient_evidence():
    state = classify_discovery_state(
        effective_evidence=3.0,
        is_frontier_neighbor=False,
        is_learning_goal_ancestor=False,
    )
    assert state == DiscoveryState.ACTIVE


def test_discovery_state_unseen_without_any_signal():
    state = classify_discovery_state(
        effective_evidence=0.0,
        is_frontier_neighbor=False,
        is_learning_goal_ancestor=False,
    )
    assert state == DiscoveryState.UNSEEN


def test_discovery_state_frontier_when_adjacent_but_untouched():
    state = classify_discovery_state(
        effective_evidence=0.0,
        is_frontier_neighbor=True,
        is_learning_goal_ancestor=False,
    )
    assert state == DiscoveryState.FRONTIER
