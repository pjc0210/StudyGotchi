"""Pure graph algorithms over the prerequisite structure.

No FastAPI, no SQLAlchemy, no model-provider SDKs — everything here takes
plain data in and returns plain data out, per the domain-layer boundary
rules in the build spec. Callers (repositories/pipelines) are responsible
for loading `ConceptEdgeData` from Postgres and translating UUIDs.
"""

from collections.abc import Callable, Hashable
from uuid import UUID

import networkx as nx

from app.domain.ontology.edges import ConceptEdgeData, ConceptEdgeType


def build_digraph(
    edges: list[ConceptEdgeData],
    edge_types: set[ConceptEdgeType] | None = None,
    *,
    nodes: list[UUID] | None = None,
) -> nx.DiGraph:
    """Build a directed graph from concept edges.

    `edge_types` restricts which edge types participate (e.g. only
    PREREQUISITE_FOR for prerequisite algorithms). `nodes` optionally seeds
    isolated nodes (concepts with no prerequisite edges) so callers can still
    look them up.
    """

    graph = nx.DiGraph()
    if nodes:
        graph.add_nodes_from(nodes)
    for edge in edges:
        if edge_types is not None and edge.edge_type not in edge_types:
            continue
        if edge.status != "active":
            continue
        graph.add_edge(
            edge.source_concept_id,
            edge.target_concept_id,
            confidence=edge.confidence,
            edge_id=edge.id,
        )
    return graph


def get_prerequisite_ancestors(graph: nx.DiGraph, concept_id: UUID) -> set[UUID]:
    """All concepts that are (transitively) prerequisites of `concept_id`."""

    if concept_id not in graph:
        return set()
    return nx.ancestors(graph, concept_id)


def get_prerequisite_descendants(graph: nx.DiGraph, concept_id: UUID) -> set[UUID]:
    """All concepts that (transitively) require `concept_id`."""

    if concept_id not in graph:
        return set()
    return nx.descendants(graph, concept_id)


def detect_cycles(graph: nx.DiGraph) -> list[list[UUID]]:
    """Return all simple cycles in the graph (empty list if acyclic)."""

    return [cycle for cycle in nx.simple_cycles(graph)]


def break_low_confidence_cycles(
    graph: nx.DiGraph,
) -> tuple[nx.DiGraph, list[tuple[UUID, UUID]]]:
    """Repeatedly find a cycle and drop its lowest-confidence edge until the
    graph is acyclic. Returns the acyclic graph and the list of (source,
    target) edges that were removed, so the caller can downgrade them to
    RELATED_TO rather than discarding the evidence.
    """

    working = graph.copy()
    removed: list[tuple[UUID, UUID]] = []

    while True:
        try:
            cycle_nodes = nx.find_cycle(working, orientation="original")
        except nx.NetworkXNoCycle:
            break

        # cycle_nodes is a list of (u, v, direction) edge tuples forming the cycle.
        weakest = min(
            cycle_nodes,
            key=lambda e: working.edges[e[0], e[1]].get("confidence", 0.0),
        )
        u, v = weakest[0], weakest[1]
        working.remove_edge(u, v)
        removed.append((u, v))

    return working, removed


def transitive_reduce(graph: nx.DiGraph) -> nx.DiGraph:
    """Return the transitive reduction of a DAG.

    If `A -> C` is implied by `A -> B -> C`, the direct `A -> C` edge is
    suppressed from the returned graph. The caller decides whether to hide
    or merely flag the corresponding DB edge as redundant; raw evidence is
    never deleted.
    """

    if not nx.is_directed_acyclic_graph(graph):
        raise ValueError("transitive_reduce requires an acyclic graph; break cycles first")
    return nx.transitive_reduction(graph)


def topological_order_with_priority(
    graph: nx.DiGraph,
    priority_key: Callable[[UUID], Hashable],
) -> list[UUID]:
    """Kahn's algorithm topological sort, breaking ties among concurrently
    "ready" (zero remaining in-degree) nodes by `priority_key`.

    `priority_key` should return a sortable value where *smaller* sorts
    first (e.g. `lambda c: -gap_priority[c]` to prefer higher priority).
    This implements "Study-path ordering": among nodes available at the same
    prerequisite stage, prefer higher gap priority / importance / relevance.
    """

    if not nx.is_directed_acyclic_graph(graph):
        raise ValueError("topological_order_with_priority requires an acyclic graph")

    in_degree = dict(graph.in_degree())
    ready = sorted((n for n, d in in_degree.items() if d == 0), key=priority_key)
    order: list[UUID] = []

    while ready:
        node = ready.pop(0)
        order.append(node)
        newly_ready = []
        for successor in graph.successors(node):
            in_degree[successor] -= 1
            if in_degree[successor] == 0:
                newly_ready.append(successor)
        ready.extend(newly_ready)
        ready.sort(key=priority_key)

    return order


def shortest_prerequisite_path(
    graph: nx.DiGraph, source: UUID, target: UUID
) -> list[UUID] | None:
    try:
        return nx.shortest_path(graph, source, target)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def shortest_path_length(graph: nx.DiGraph, source: UUID, target: UUID) -> int | None:
    try:
        return nx.shortest_path_length(graph, source, target)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def compute_downstream_reach(graph: nx.DiGraph) -> dict[UUID, int]:
    """Raw count of transitive descendants per node (bigger = more of the
    course depends on this concept).
    """

    return {node: len(nx.descendants(graph, node)) for node in graph.nodes}


def normalized_downstream_reach(graph: nx.DiGraph) -> dict[UUID, float]:
    """`compute_downstream_reach`, normalized to `(0, 1]` via `(reach + 1) /
    (max_reach + 1)`. Used as the bottleneck-weight signal in gap scoring:
    the `+1` guarantees leaf nodes (nothing else depends on them within the
    subgraph) still get a small nonzero weight rather than zeroing out
    `gap_priority` entirely, since a leaf prerequisite can still matter.
    """

    raw = compute_downstream_reach(graph)
    max_reach = max(raw.values(), default=0)
    return {node: (count + 1) / (max_reach + 1) for node, count in raw.items()}
