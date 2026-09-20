"""Structured LLM extraction contracts (spec: "Structured extraction").

Every LLM call that produces graph data returns one of these Pydantic
models, validated before anything touches the database. Free-form LLM text
is never persisted directly.
"""

from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field

from app.schemas.coercion import (
    ConceptEdgeTypeField,
    ConceptKindField,
    GranularityField,
    OptionalUnitInterval,
    ResourceLinkTypeField,
    UnitInterval,
    none_to,
    none_to_empty_list,
)

StringList = Annotated[list[str], BeforeValidator(none_to_empty_list)]


class EvidenceSnippetOut(BaseModel):
    page_number: int | None = None
    snippet: str = Field(..., description="Verbatim source text supporting this extraction.")


class ConceptCandidateOut(BaseModel):
    name: str = Field(..., description="Canonical-style concept name, e.g. 'Positive Semidefinite Matrix'.")
    definition: str = Field(..., description="Concise, course-context definition.")
    concept_kind: ConceptKindField
    granularity: GranularityField
    importance_in_resource: UnitInterval
    aliases: StringList = Field(default_factory=list)
    evidence: Annotated[list[EvidenceSnippetOut], BeforeValidator(none_to_empty_list)] = Field(
        default_factory=list
    )


class ConceptRelationshipOut(BaseModel):
    """A candidate relationship between two concepts named in this
    resource's own `ConceptCandidateOut.name` outputs (resolved to concept
    IDs downstream, after canonicalization).
    """

    source_concept_name: str
    target_concept_name: str
    edge_type: ConceptEdgeTypeField
    # Only populated for PREREQUISITE_FOR: which of the spec's evidence
    # levels this relationship was inferred at, in the model's own words
    # (e.g. "explicit", "instructor_dependency", "assessment_dependency",
    # "cross_resource_ordering", "model_inference"). Free text so the model
    # isn't forced into a level it isn't confident about; the extractor maps
    # it onto `PrerequisiteEvidenceLevel`.
    prerequisite_evidence_level: str | None = None
    evidence_snippet: str | None = None


class AssessmentItemConceptLinkOut(BaseModel):
    concept_name: str
    relevance_weight: UnitInterval


class AssessmentItemOut(BaseModel):
    label: str = Field(..., description="e.g. 'Q2', 'Question 4b'.")
    prompt: str | None = None
    max_score: float | None = None
    difficulty: OptionalUnitInterval = None
    concept_links: Annotated[
        list[AssessmentItemConceptLinkOut], BeforeValidator(none_to_empty_list)
    ] = Field(default_factory=list)
    # Populated only when this document is a student's own graded
    # submission and an actual score/grade mark is visible for this item
    # (e.g. "4/5", a circled grade). Left null for an official assignment
    # definition, or when no grade mark is visible — never guessed.
    score_achieved: float | None = None


class ResourceConceptLinkOut(BaseModel):
    concept_name: str
    link_type: ResourceLinkTypeField = Field(..., description="EXPLAINED_IN | APPEARS_IN | WORKED_EXAMPLE_IN")
    depth_score: UnitInterval
    confidence: Annotated[UnitInterval, BeforeValidator(none_to(0.7))] = 0.7
    snippet: str | None = None


class ResourceExtractionResult(BaseModel):
    """Top-level structured output for one resource/document."""

    document_type: str
    concept_candidates: Annotated[
        list[ConceptCandidateOut], BeforeValidator(none_to_empty_list)
    ] = Field(default_factory=list)
    concept_relationships: Annotated[
        list[ConceptRelationshipOut], BeforeValidator(none_to_empty_list)
    ] = Field(default_factory=list)
    assessment_items: Annotated[list[AssessmentItemOut], BeforeValidator(none_to_empty_list)] = (
        Field(default_factory=list)
    )
    resource_concept_links: Annotated[
        list[ResourceConceptLinkOut], BeforeValidator(none_to_empty_list)
    ] = Field(default_factory=list)


class ConceptAdjudicationOut(BaseModel):
    """Output of the merge-adjudication prompt (spec: "Concept
    canonicalization" step 5): does a new candidate represent the same
    learnable concept as an existing one?
    """

    same_concept: bool
    matched_candidate_index: int | None = Field(
        default=None, description="Index into the candidate list this matches, if same_concept is true."
    )
    reasoning: str


class StudentWorkExtractionOut(BaseModel):
    """Structured output for handwritten work / photos (spec: "Student-file
    evidence extraction" -> "Handwritten work / photos").
    """

    problem_identity: str | None = None
    concepts_used: StringList = Field(default_factory=list)
    attempted_steps_summary: str | None = None
    final_answer: str | None = None
    correctness: OptionalUnitInterval = Field(
        default=None, description="null if correctness can't be established from the image."
    )
    uncertainty_notes: str | None = None
