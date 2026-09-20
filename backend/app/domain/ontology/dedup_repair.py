"""Duplicate-concept clustering for the repair pass (spec: "Concept
canonicalization" — fixing concepts already ingested under the old,
alias-blind normalization without re-running ingestion). Pure grouping
logic, unit-testable without a database; the repository-level remapping
lives in `scripts/repair_duplicate_concepts.py`.
"""

from dataclasses import dataclass
from uuid import UUID

from app.resolution.normalize import (
    is_locally_scoped_label,
    normalize_concept_name,
    plural_variant_candidates,
)


@dataclass(frozen=True)
class ConceptLexicalProfile:
    concept_id: UUID
    canonical_name: str
    aliases: list[str]
    importance: float
    edge_count: int
    created_at_ordinal: int  # smaller = older; tiebreaker only


def lexical_forms(name: str, aliases: list[str]) -> set[str]:
    forms = {normalize_concept_name(name)}
    forms.update(normalize_concept_name(alias) for alias in aliases)
    forms = {form for form in forms if form and not is_locally_scoped_label(form)}
    for form in tuple(forms):  # snapshot: the loop body mutates `forms`
        forms.update(plural_variant_candidates(form))
    return forms


def cluster_duplicate_concepts(
    profiles: list[ConceptLexicalProfile],
) -> list[list[UUID]]:
    """Union-find over concepts that share at least one exact lexical form
    (own name, alias, or a regular-plural variant of either) — exactly the
    same forms `resolve_concept_candidate` now checks, so this finds
    precisely what the fixed ingestion would no longer create as separate
    concepts going forward. Returns only clusters with >1 member; singletons
    are not duplicates and are omitted.
    """

    parent: dict[UUID, UUID] = {p.concept_id: p.concept_id for p in profiles}

    def find(x: UUID) -> UUID:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: UUID, b: UUID) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    form_to_concept: dict[str, UUID] = {}
    for profile in profiles:
        for form in lexical_forms(profile.canonical_name, profile.aliases):
            if form in form_to_concept:
                union(form_to_concept[form], profile.concept_id)
            else:
                form_to_concept[form] = profile.concept_id

    clusters: dict[UUID, list[UUID]] = {}
    for profile in profiles:
        root = find(profile.concept_id)
        clusters.setdefault(root, []).append(profile.concept_id)
    return [members for members in clusters.values() if len(members) > 1]


def choose_survivor(
    cluster_ids: list[UUID], profiles_by_id: dict[UUID, ConceptLexicalProfile]
) -> UUID:
    """Deterministic survivor choice: best-connected concept first (most
    edges — the one others already point to), then highest importance, then
    oldest, then lowest UUID as a fully deterministic final tiebreak.
    """

    def sort_key(cid: UUID) -> tuple[int, float, int, str]:
        profile = profiles_by_id[cid]
        return (
            -profile.edge_count,
            -profile.importance,
            profile.created_at_ordinal,
            str(cid),
        )

    return min(cluster_ids, key=sort_key)
