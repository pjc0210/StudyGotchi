"""Pure semantic world projection; coordinates and animation belong to the
renderer.

Terrain fields are derived only from `PersonalGraphNode.understanding` (plus
discovery state and evidence recency) — there is no longer a separate
confidence/familiarity/fragility signal to draw `stability`/`vegetation`
from, so those fields were dropped rather than faked from `understanding`
under another name.
"""

import hashlib
import json
from dataclasses import asdict
from datetime import UTC, datetime

from app.domain.mastery.evidence import recency_weight
from app.domain.personal_graph.builder import PersonalGraphResult


def semantic_state(node, *, stale: bool = False) -> str:
    if node.discovery_state in ("unseen", "frontier"):
        return node.discovery_state.value
    if node.understanding is None:
        return "exposed"
    if node.understanding >= 0.88:
        return "mastered"
    if node.understanding >= 0.7:
        return "stale" if stale else "strong"
    if node.understanding < 0.45:
        return "struggling"
    return "developing"


def project_world(
    graph: PersonalGraphResult,
    *,
    last_practiced=None,
    last_evidence=None,
    now: datetime | None = None,
    staleness_days: float = 45.0,
) -> dict:
    now = now or datetime.now(UTC)
    last_practiced = last_practiced or {}
    last_evidence = last_evidence or {}
    regions = []
    for node in sorted(graph.nodes, key=lambda n: str(n.concept_id)):
        if node.discovery_state == "unseen":
            continue
        practiced = last_practiced.get(node.concept_id)
        if practiced is not None and practiced.tzinfo is None:
            practiced = practiced.replace(tzinfo=UTC)
        stale = (
            practiced is not None
            and (now - practiced).total_seconds() > staleness_days * 86400
        )
        state = semantic_state(node, stale=stale)
        seen = last_evidence.get(node.concept_id)
        recency = (
            recency_weight(seen, now=now, half_life_days=staleness_days)
            if seen
            else 0.0
        )
        understanding = node.understanding if node.understanding is not None else 0.0
        regions.append(
            {
                "concept_id": node.concept_id,
                "name": node.name,
                "cluster_id": node.cluster_id,
                "cluster": node.cluster,
                "terrain_height": node.understanding
                if node.understanding is not None
                else 0.05,
                "terrain_area": node.importance * node.personal_relevance,
                # Rounded so the version hash only moves when the world visibly does,
                # not with every tick of the recency clock.
                "fog": 0.9 if state == "frontier" else round(0.5 * (1 - understanding) * (1 - 0.5 * recency), 3),
                "semantic_state": state,
                "creature_state": {
                    "frontier": "unhatched",
                    "struggling": "weak",
                    "strong": "evolved",
                    "mastered": "ascended",
                    "stale": "sleepy",
                }.get(state, "normal"),
            }
        )
    included = {r["concept_id"] for r in regions}
    edges = sorted(
        [
            asdict(e)
            for e in graph.edges
            if e.source in included and e.target in included
        ],
        key=lambda e: (str(e["source"]), str(e["target"]), e["edge_type"]),
    )
    payload = {
        "regions": regions,
        "edges": edges,
        "hidden_concept_count": graph.hidden_concept_count,
    }
    # Content revision, deliberately not an incrementing database sequence.
    payload["world_version"] = hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str).encode()
    ).hexdigest()[:16]
    return payload
