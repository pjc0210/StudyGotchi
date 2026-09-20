from uuid import uuid4

from app.domain.ontology.dedup_repair import (
    ConceptLexicalProfile,
    choose_survivor,
    cluster_duplicate_concepts,
)


def _profile(name, *, aliases=None, importance=0.5, edge_count=0, created=0):
    return ConceptLexicalProfile(
        concept_id=uuid4(),
        canonical_name=name,
        aliases=aliases or [],
        importance=importance,
        edge_count=edge_count,
        created_at_ordinal=created,
    )


def test_alias_overlap_clusters_two_concepts():
    a = _profile("Deterministic Finite Automata", aliases=["DFA"])
    b = _profile("Deterministic Finite Automaton", aliases=["DFA"])
    unrelated = _profile("Turing Machine")

    clusters = cluster_duplicate_concepts([a, b, unrelated])

    assert len(clusters) == 1
    assert set(clusters[0]) == {a.concept_id, b.concept_id}


def test_regular_plural_clusters_two_concepts():
    a = _profile("Regular Language")
    b = _profile("Regular Languages")

    clusters = cluster_duplicate_concepts([a, b])

    assert len(clusters) == 1
    assert set(clusters[0]) == {a.concept_id, b.concept_id}


def test_unrelated_concepts_are_never_clustered():
    a = _profile("Kernel")
    b = _profile("Kernel Regression")
    c = _profile("Class", aliases=[])
    d = _profile("Classifier")

    clusters = cluster_duplicate_concepts([a, b, c, d])

    assert clusters == []


def test_local_symbolic_alias_does_not_merge_different_example_languages():
    a = _profile("Language of balanced strings", aliases=["L3"])
    b = _profile("Language of repeated strings", aliases=["L 3"])
    assert cluster_duplicate_concepts([a, b]) == []


def test_empty_normalized_alias_does_not_merge_concepts():
    a = _profile("First concept", aliases=["???"])
    b = _profile("Second concept", aliases=["!!!"])
    assert cluster_duplicate_concepts([a, b]) == []


def test_reused_theorem_number_does_not_merge_unrelated_theorems():
    a = _profile("Cook-Levin Theorem", aliases=["Theorem 1.3"])
    b = _profile(
        "Equivalence of PDAs and context-free languages", aliases=["Theorem 1.3"]
    )
    assert cluster_duplicate_concepts([a, b]) == []


def test_transitive_alias_chain_clusters_three_concepts():
    # A and B share alias "X"; B and C share alias "Y" -> all three cluster
    # together even though A and C share no direct lexical form.
    a = _profile("Language of a DFA", aliases=["L(M)"])
    b = _profile("Language Accepted by a DFA", aliases=["L(M)", "Accepted Language"])
    c = _profile("Accepted Language")

    clusters = cluster_duplicate_concepts([a, b, c])

    assert len(clusters) == 1
    assert set(clusters[0]) == {a.concept_id, b.concept_id, c.concept_id}


def test_survivor_prefers_most_edges():
    a = _profile("A", edge_count=1)
    b = _profile("B", edge_count=5)
    profiles = {a.concept_id: a, b.concept_id: b}

    survivor = choose_survivor([a.concept_id, b.concept_id], profiles)

    assert survivor == b.concept_id


def test_survivor_falls_back_to_importance_then_age():
    a = _profile("A", edge_count=2, importance=0.9, created=5)
    b = _profile("B", edge_count=2, importance=0.9, created=1)
    profiles = {a.concept_id: a, b.concept_id: b}

    # Tied on edge_count and importance -> oldest (smallest ordinal) wins.
    survivor = choose_survivor([a.concept_id, b.concept_id], profiles)

    assert survivor == b.concept_id
