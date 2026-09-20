"""Near-duplicate explanation clustering (spec: "Resource redundancy",
"Cross-source support"). Five copies of the same classmate note must not
count as five independent confirmations of a prerequisite, and must not all
surface as separate "resources for this concept" — both problems are the
same clustering operation.
"""

from uuid import UUID

from app.domain.resources.novelty import cosine_similarity

DEFAULT_DUPLICATE_THRESHOLD = 0.92


def detect_near_duplicate_clusters(
    embeddings: dict[UUID, list[float]],
    *,
    threshold: float = DEFAULT_DUPLICATE_THRESHOLD,
) -> list[set[UUID]]:
    """Union-find clustering of resource/explanation embeddings by cosine
    similarity. Returns disjoint clusters; a resource with no near-duplicates
    is its own singleton cluster.
    """

    ids = list(embeddings.keys())
    parent = {resource_id: resource_id for resource_id in ids}

    def find(x: UUID) -> UUID:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: UUID, b: UUID) -> None:
        root_a, root_b = find(a), find(b)
        if root_a != root_b:
            parent[root_a] = root_b

    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if cosine_similarity(embeddings[ids[i]], embeddings[ids[j]]) >= threshold:
                union(ids[i], ids[j])

    clusters: dict[UUID, set[UUID]] = {}
    for resource_id in ids:
        clusters.setdefault(find(resource_id), set()).add(resource_id)
    return list(clusters.values())


def independent_source_count(resource_ids: set[UUID], clusters: list[set[UUID]]) -> int:
    """How many *distinct* duplicate-clusters are touched by `resource_ids`.
    Used both to rank resources (don't show 5 near-identical notes) and to
    score prerequisite cross-source support (don't let 5 copies of one note
    out-vote a single official lecture).
    """

    touched_cluster_indices = {
        idx for idx, cluster in enumerate(clusters) if cluster & resource_ids
    }
    return len(touched_cluster_indices)
