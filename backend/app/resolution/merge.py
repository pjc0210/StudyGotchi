"""Concept canonicalization decision pipeline (spec: "Concept
canonicalization"). Combines lexical normalization, alias lookup, and
embedding similarity into a single resolution decision. Never persists a new
concept before this resolves — every merge is explainable via the `reason`
field.

Step 5 (semantic adjudication for the ambiguous 0.82-0.94 band) needs an LLM
call, which is out of scope for a pure `domain`/`resolution` module; callers
get back `ConceptResolution(action=NEEDS_ADJUDICATION, ...)` and are
expected to call an LLM adjudicator, then `finalize_adjudication` to turn
that yes/no into the final action.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID

from app.domain.ontology.concepts import ConceptCandidate
from app.resolution.aliases import lookup_alias
from app.resolution.normalize import normalize_concept_name, plural_variant_candidates
from app.resolution.semantic_match import (
    EmbeddingMatch,
    SimilarityBucket,
    classify_similarity,
    rank_embedding_candidates,
)


class ResolutionAction(StrEnum):
    MERGE_EXACT_ALIAS = "merge_exact_alias"
    MERGE_HIGH_SIMILARITY = "merge_high_similarity"
    NEEDS_ADJUDICATION = "needs_adjudication"
    CREATE = "create"


@dataclass(frozen=True)
class ConceptResolution:
    action: ResolutionAction
    normalized_name: str
    reason: str
    matched_concept_id: UUID | None = None
    similarity: float | None = None
    adjudication_candidates: list[EmbeddingMatch] = field(default_factory=list)


def resolve_concept_candidate(
    candidate: ConceptCandidate,
    *,
    alias_index: dict[str, UUID],
    existing_concept_embeddings: dict[UUID, list[float]],
    candidate_embedding: list[float] | None,
    merge_threshold: float,
    adjudicate_threshold: float,
) -> ConceptResolution:
    normalized_name = normalize_concept_name(candidate.name)

    # Check the candidate's own name AND every alias it was extracted with —
    # a candidate named "Deterministic Finite Automata" whose aliases
    # include "DFA" must still match an existing concept aliased "DFA", even
    # though its own chosen name doesn't lexically match anything yet.
    # Regular-plural variants of each form are checked too (exact-match
    # only — never a fuzzy merge on their own).
    candidate_forms = [normalized_name]
    candidate_forms.extend(normalize_concept_name(alias) for alias in candidate.aliases)
    candidate_forms = list(dict.fromkeys(candidate_forms))
    for form in list(candidate_forms):
        candidate_forms.extend(plural_variant_candidates(form))
    candidate_forms = list(dict.fromkeys(candidate_forms))

    for form in candidate_forms:
        exact_match = lookup_alias(form, alias_index)
        if exact_match is not None:
            return ConceptResolution(
                action=ResolutionAction.MERGE_EXACT_ALIAS,
                normalized_name=normalized_name,
                matched_concept_id=exact_match,
                similarity=1.0,
                reason=f'"{candidate.name}" exactly matches a known alias ("{form}") of an existing concept.',
            )

    if candidate_embedding is None or not existing_concept_embeddings:
        return ConceptResolution(
            action=ResolutionAction.CREATE,
            normalized_name=normalized_name,
            reason="No alias match and no embedding candidates available; treated as a new concept.",
        )

    ranked = rank_embedding_candidates(candidate_embedding, existing_concept_embeddings)
    if not ranked:
        return ConceptResolution(
            action=ResolutionAction.CREATE,
            normalized_name=normalized_name,
            reason="No embedding candidates in this course; treated as a new concept.",
        )

    best = ranked[0]
    bucket = classify_similarity(
        best.similarity,
        merge_threshold=merge_threshold,
        adjudicate_threshold=adjudicate_threshold,
    )

    if bucket is SimilarityBucket.MERGE:
        return ConceptResolution(
            action=ResolutionAction.MERGE_HIGH_SIMILARITY,
            normalized_name=normalized_name,
            matched_concept_id=best.concept_id,
            similarity=best.similarity,
            reason=(
                f'"{candidate.name}" has {best.similarity:.2f} embedding similarity to an existing '
                "concept, above the merge threshold."
            ),
        )

    if bucket is SimilarityBucket.ADJUDICATE:
        return ConceptResolution(
            action=ResolutionAction.NEEDS_ADJUDICATION,
            normalized_name=normalized_name,
            similarity=best.similarity,
            adjudication_candidates=ranked,
            reason=(
                f'"{candidate.name}" has {best.similarity:.2f} embedding similarity to an existing '
                "concept — ambiguous, needs semantic adjudication."
            ),
        )

    return ConceptResolution(
        action=ResolutionAction.CREATE,
        normalized_name=normalized_name,
        similarity=best.similarity,
        reason=(
            f'"{candidate.name}" has only {best.similarity:.2f} similarity to the closest existing '
            "concept; treated as genuinely distinct."
        ),
    )


def finalize_adjudication(
    resolution: ConceptResolution,
    *,
    llm_says_same_concept: bool,
    matched_concept_id: UUID | None,
) -> ConceptResolution:
    """Turn an LLM adjudication answer into a final MERGE/CREATE decision."""

    if llm_says_same_concept and matched_concept_id is not None:
        return ConceptResolution(
            action=ResolutionAction.MERGE_HIGH_SIMILARITY,
            normalized_name=resolution.normalized_name,
            matched_concept_id=matched_concept_id,
            similarity=resolution.similarity,
            reason=resolution.reason
            + " Confirmed as the same concept by semantic adjudication.",
        )
    return ConceptResolution(
        action=ResolutionAction.CREATE,
        normalized_name=resolution.normalized_name,
        similarity=resolution.similarity,
        reason=resolution.reason
        + " Semantic adjudication determined this is a distinct concept.",
    )
