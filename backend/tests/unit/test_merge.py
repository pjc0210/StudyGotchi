from uuid import uuid4

from app.domain.ontology.concepts import ConceptCandidate, ConceptKind, Granularity
from app.resolution.merge import ResolutionAction, resolve_concept_candidate

MERGE_THRESHOLD = 0.94
ADJUDICATE_THRESHOLD = 0.82


def _candidate(name: str, *, aliases: list[str] | None = None) -> ConceptCandidate:
    return ConceptCandidate(
        name=name,
        normalized_name=name.lower(),
        definition="test definition",
        concept_kind=ConceptKind.DEFINITION,
        granularity=Granularity.CORE,
        importance_in_resource=0.5,
        aliases=aliases or [],
    )


def test_exact_alias_merges():
    existing_id = uuid4()
    resolution = resolve_concept_candidate(
        _candidate("PSD Matrix"),
        alias_index={"psd matrix": existing_id},
        existing_concept_embeddings={},
        candidate_embedding=None,
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.MERGE_EXACT_ALIAS
    assert resolution.matched_concept_id == existing_id


def test_high_similarity_merges_without_llm():
    existing_id = uuid4()
    resolution = resolve_concept_candidate(
        _candidate("Positive Semidefinite Matrix"),
        alias_index={},
        existing_concept_embeddings={existing_id: [1.0, 0.0, 0.0]},
        candidate_embedding=[0.999, 0.001, 0.0],
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.MERGE_HIGH_SIMILARITY
    assert resolution.matched_concept_id == existing_id


def test_ambiguous_similarity_needs_adjudication():
    existing_id = uuid4()
    resolution = resolve_concept_candidate(
        _candidate("Kernel Approximation"),
        alias_index={},
        existing_concept_embeddings={existing_id: [1.0, 0.0, 0.0]},
        candidate_embedding=[
            0.85,
            0.53,
            0.0,
        ],  # cosine sim ~0.85, inside adjudicate band
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.NEEDS_ADJUDICATION
    assert resolution.adjudication_candidates


def test_dissimilar_concept_is_not_merged():
    # "Kernel" vs "Kernel Regression" must never merge, per the spec example.
    existing_id = uuid4()
    resolution = resolve_concept_candidate(
        _candidate("Kernel Regression"),
        alias_index={},
        existing_concept_embeddings={existing_id: [1.0, 0.0, 0.0]},
        candidate_embedding=[0.0, 1.0, 0.0],  # orthogonal -> similarity 0
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.CREATE


def test_candidate_alias_matches_existing_alias_even_when_own_name_differs():
    # Regression: "Deterministic Finite Automata" (own name) doesn't match
    # anything yet, but its extracted alias "DFA" matches an existing
    # concept's alias — the candidate's own name is not the only thing that
    # should be checked against the alias index.
    existing_id = uuid4()
    resolution = resolve_concept_candidate(
        _candidate("Deterministic Finite Automata", aliases=["DFA"]),
        alias_index={"dfa": existing_id},
        existing_concept_embeddings={},
        candidate_embedding=None,
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.MERGE_EXACT_ALIAS
    assert resolution.matched_concept_id == existing_id


def test_regular_plural_of_existing_alias_merges():
    # Regression: "Regular Languages" vs "Regular Language" duplicated
    # because normalization didn't handle plain regular plurals.
    existing_id = uuid4()
    resolution = resolve_concept_candidate(
        _candidate("Regular Languages"),
        alias_index={"regular language": existing_id},
        existing_concept_embeddings={},
        candidate_embedding=None,
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.MERGE_EXACT_ALIAS
    assert resolution.matched_concept_id == existing_id


def test_regular_singular_matches_existing_plural_alias():
    # Same rule, opposite direction: candidate is singular, index has plural.
    existing_id = uuid4()
    resolution = resolve_concept_candidate(
        _candidate("Assumption"),
        alias_index={"assumptions": existing_id},
        existing_concept_embeddings={},
        candidate_embedding=None,
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.MERGE_EXACT_ALIAS
    assert resolution.matched_concept_id == existing_id


def test_plural_variant_never_fabricates_a_match_for_unrelated_concept():
    # Safety net: plural-variant matching is exact-string-only against the
    # real alias index — it must never merge two concepts that just happen
    # to share a prefix/suffix shape when neither form is actually indexed.
    resolution = resolve_concept_candidate(
        _candidate("Class"),
        alias_index={"classifier": uuid4()},
        existing_concept_embeddings={},
        candidate_embedding=None,
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.CREATE


def test_no_existing_concepts_creates():
    resolution = resolve_concept_candidate(
        _candidate("Gradient Descent"),
        alias_index={},
        existing_concept_embeddings={},
        candidate_embedding=[1.0, 0.0, 0.0],
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.CREATE


def test_reused_symbolic_alias_does_not_trigger_exact_merge():
    resolution = resolve_concept_candidate(
        _candidate("A different example language", aliases=["L3"]),
        alias_index={"l3": uuid4(), "l3s": uuid4()},
        existing_concept_embeddings={},
        candidate_embedding=None,
        merge_threshold=MERGE_THRESHOLD,
        adjudicate_threshold=ADJUDICATE_THRESHOLD,
    )
    assert resolution.action == ResolutionAction.CREATE
