"""Mapping raw LLM prerequisite-evidence labels onto the domain's evidence
levels (spec: "Prerequisite extraction").
"""

from app.domain.graph.prerequisite import PrerequisiteEvidenceLevel

_LEVEL_ALIASES: dict[str, PrerequisiteEvidenceLevel] = {
    "explicit": PrerequisiteEvidenceLevel.EXPLICIT,
    "instructor_dependency": PrerequisiteEvidenceLevel.INSTRUCTOR_DEPENDENCY,
    "assessment_dependency": PrerequisiteEvidenceLevel.ASSESSMENT_DEPENDENCY,
    "cross_resource_ordering": PrerequisiteEvidenceLevel.CROSS_RESOURCE_ORDERING,
    "model_inference": PrerequisiteEvidenceLevel.MODEL_INFERENCE,
}


def map_evidence_level(raw: str | None) -> PrerequisiteEvidenceLevel:
    """Unrecognized or missing labels fall back to the weakest evidence
    level (MODEL_INFERENCE) rather than raising, since this is untrusted
    free-text model output.
    """

    if not raw:
        return PrerequisiteEvidenceLevel.MODEL_INFERENCE
    key = raw.strip().lower().replace(" ", "_").replace("-", "_")
    return _LEVEL_ALIASES.get(key, PrerequisiteEvidenceLevel.MODEL_INFERENCE)
