from app.extractors.concepts import grounded, is_grounded
from app.schemas.extraction import ConceptCandidateOut, ConceptRelationshipOut, ResourceExtractionResult


def candidate(name: str, aliases: list[str] | None = None) -> ConceptCandidateOut:
    return ConceptCandidateOut(
        name=name,
        definition="d",
        concept_kind="definition",
        granularity="core",
        importance_in_resource=0.5,
        aliases=aliases or [],
    )


HEADER = "# 6.1400 Quiz 1 — graded (returned copy)\n\nStudent: demo student\nTotal: 22 / 30"
BODY = "Define the language of a DFA. Regular languages are closed under union via the product DFA."


def test_title_chunk_rejects_invented_subject_concepts():
    assert not is_grounded(candidate("Probability Mass Function (PMF)"), HEADER)
    assert not is_grounded(candidate("Bayes' Theorem"), HEADER)


def test_mentioned_concepts_and_aliases_pass():
    assert is_grounded(candidate("Language of a DFA"), BODY)
    assert is_grounded(candidate("Deterministic Finite Automaton", aliases=["DFA"]), BODY) is False  # DFA is too short a token
    assert is_grounded(candidate("Closure Properties", aliases=["closed under union"]), BODY)
    assert is_grounded(candidate("Personal Analogy"), "PRIVATE analogy")


def test_grounded_drops_relationships_to_removed_candidates():
    extraction = ResourceExtractionResult(
        document_type="quiz",
        concept_candidates=[candidate("Regular Languages"), candidate("Bayes' Theorem")],
        concept_relationships=[
            ConceptRelationshipOut(
                source_concept_name="Bayes' Theorem",
                target_concept_name="Regular Languages",
                edge_type="RELATED_TO",
                confidence=0.5,
            )
        ],
    )
    kept = grounded(extraction, BODY)
    assert [c.name for c in kept.concept_candidates] == ["Regular Languages"]
    assert kept.concept_relationships == []
