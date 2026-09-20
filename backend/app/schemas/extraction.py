"""Structured LLM extraction contracts (spec: "Structured extraction").

Every LLM call that produces graph data returns one of these Pydantic
models, validated before anything touches the database. Free-form LLM text
is never persisted directly.
"""

from pydantic import BaseModel, Field

from app.domain.ontology.concepts import ConceptKind, Granularity
from app.domain.ontology.edges import ConceptEdgeType


class EvidenceSnippetOut(BaseModel):
    page_number: int | None = None
    snippet: str = Field(
        ..., description="Verbatim source text supporting this extraction."
    )


class ConceptCandidateOut(BaseModel):
    name: str = Field(
        ...,
        description="Canonical-style concept name, e.g. 'Positive Semidefinite Matrix'.",
    )
    definition: str = Field(..., description="Concise, course-context definition.")
    concept_kind: ConceptKind
    granularity: Granularity
    importance_in_resource: float = Field(..., ge=0.0, le=1.0)
    aliases: list[str] = Field(default_factory=list)
    evidence: list[EvidenceSnippetOut] = Field(default_factory=list)


class ConceptRelationshipOut(BaseModel):
    """A candidate relationship between two concepts named in this
    resource's own `ConceptCandidateOut.name` outputs (resolved to concept
    IDs downstream, after canonicalization).
    """

    source_concept_name: str
    target_concept_name: str
    edge_type: ConceptEdgeType
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
    relevance_weight: float = Field(..., ge=0.0, le=1.0)


class AssessmentItemOut(BaseModel):
    label: str = Field(..., description="e.g. 'Q2', 'Question 4b'.")
    prompt: str | None = None
    max_score: float | None = None
    difficulty: float | None = Field(default=None, ge=0.0, le=1.0)
    concept_links: list[AssessmentItemConceptLinkOut] = Field(default_factory=list)
    # Populated only when this document is a student's own graded
    # submission and an actual score/grade mark is visible for this item
    # (e.g. "4/5", a circled grade). Left null for an official assignment
    # definition, or when no grade mark is visible — never guessed.
    score_achieved: float | None = None


class ResourceConceptLinkOut(BaseModel):
    concept_name: str
    link_type: str = Field(
        ..., description="EXPLAINED_IN | APPEARS_IN | WORKED_EXAMPLE_IN"
    )
    depth_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    snippet: str | None = None


class ResourceExtractionResult(BaseModel):
    """Top-level structured output for one resource/document."""

    document_type: str
    concept_candidates: list[ConceptCandidateOut] = Field(default_factory=list)
    concept_relationships: list[ConceptRelationshipOut] = Field(default_factory=list)
    assessment_items: list[AssessmentItemOut] = Field(default_factory=list)
    resource_concept_links: list[ResourceConceptLinkOut] = Field(default_factory=list)


class ConceptAdjudicationOut(BaseModel):
    """Output of the merge-adjudication prompt (spec: "Concept
    canonicalization" step 5): does a new candidate represent the same
    learnable concept as an existing one?
    """

    same_concept: bool
    matched_candidate_index: int | None = Field(
        default=None,
        description="Index into the candidate list this matches, if same_concept is true.",
    )
    reasoning: str


class StudentWorkExtractionOut(BaseModel):
    """Structured output for handwritten work / photos (spec: "Student-file
    evidence extraction" -> "Handwritten work / photos").
    """

    problem_identity: str | None = None
    concepts_used: list[str] = Field(default_factory=list)
    attempted_steps_summary: str | None = None
    final_answer: str | None = None
    correctness: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="null if correctness can't be established from the image.",
    )
    uncertainty_notes: str | None = None
