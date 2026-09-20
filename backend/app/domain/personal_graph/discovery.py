"""Discovery states (spec: "Personal knowledge graph"): unseen/frontier/
encountered/active. The personal graph never renders the entire syllabus —
only concepts the student has touched, is about to touch, or personally
created.
"""

from enum import StrEnum


class DiscoveryState(StrEnum):
    UNSEEN = "unseen"
    FRONTIER = "frontier"
    ENCOUNTERED = "encountered"
    ACTIVE = "active"


def classify_discovery_state(
    *,
    effective_evidence: float,
    is_frontier_neighbor: bool,
    is_learning_goal_ancestor: bool,
    encountered_evidence_threshold: float = 0.5,
    active_evidence_threshold: float = 2.0,
) -> DiscoveryState:
    """`effective_evidence` is `positive_evidence + negative_evidence` from
    the understanding scorer (section "Understanding scoring") — any
    evidence at all, including the small weight passive exposure (notes,
    resource views) contributes, not just strong graded evidence. A concept
    the student has seen but bombed is still `encountered`/`active`, not
    `unseen`.
    """

    if effective_evidence >= active_evidence_threshold:
        return DiscoveryState.ACTIVE

    if effective_evidence >= encountered_evidence_threshold:
        return DiscoveryState.ENCOUNTERED

    if is_frontier_neighbor or is_learning_goal_ancestor:
        return DiscoveryState.FRONTIER

    return DiscoveryState.UNSEEN
