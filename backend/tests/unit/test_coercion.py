from app.domain.ontology.concepts import ConceptKind, Granularity
from app.domain.ontology.edges import ConceptEdgeType
from app.schemas.coercion import (
    clamp_unit_interval,
    coerce_resource_link_type,
    coerce_str_enum,
)
from app.schemas.extraction import (
    ConceptCandidateOut,
    ResourceConceptLinkOut,
    ResourceExtractionResult,
)


def test_clamp_unit_interval_clips_and_parses_strings():
    assert clamp_unit_interval(1.04) == 1.0
    assert clamp_unit_interval(-0.2) == 0.0
    assert clamp_unit_interval("0.75") == 0.75


def test_enum_coercion_accepts_case_and_spacing_variants():
    coerce_kind = coerce_str_enum(ConceptKind)
    coerce_granularity = coerce_str_enum(Granularity)
    coerce_edge = coerce_str_enum(ConceptEdgeType)
    assert coerce_kind("DEFINITION") is ConceptKind.DEFINITION
    assert coerce_kind("topic cluster") is ConceptKind.TOPIC_CLUSTER
    assert coerce_granularity("Core") is Granularity.CORE
    assert coerce_edge("prerequisite_for") is ConceptEdgeType.PREREQUISITE_FOR


def test_resource_link_type_normalizes():
    assert coerce_resource_link_type("explained in") == "EXPLAINED_IN"
    assert coerce_resource_link_type("WORKED_EXAMPLE_IN") == "WORKED_EXAMPLE_IN"


def test_extraction_schema_coerces_messy_model_payload():
    result = ResourceExtractionResult.model_validate(
        {
            "document_type": "reading",
            "concept_candidates": [
                {
                    "name": "Separable Differential Equation",
                    "definition": "An ODE that can be written dy/dx = g(x)h(y).",
                    "concept_kind": "Definition",
                    "granularity": "CORE",
                    "importance_in_resource": 1.2,
                    "aliases": None,
                    "evidence": None,
                }
            ],
            "concept_relationships": None,
            "assessment_items": None,
            "resource_concept_links": [
                {
                    "concept_name": "Separable Differential Equation",
                    "link_type": "explained_in",
                    "depth_score": 0.9,
                    "confidence": None,
                }
            ],
        }
    )
    candidate = result.concept_candidates[0]
    assert isinstance(candidate, ConceptCandidateOut)
    assert candidate.concept_kind is ConceptKind.DEFINITION
    assert candidate.importance_in_resource == 1.0
    assert candidate.aliases == []
    link = result.resource_concept_links[0]
    assert isinstance(link, ResourceConceptLinkOut)
    assert link.link_type == "EXPLAINED_IN"
    assert link.confidence == 0.7
