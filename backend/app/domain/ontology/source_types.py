"""Source taxonomy and the authority model (spec: "Source classification").

Every ingested resource is classified along two independent axes: who it
came from (`SourceOrigin`) and what kind of artifact it is (`ArtifactType`).
Those two axes jointly determine how much weight the resource gets when
shaping canonical course structure vs. student mastery evidence.
"""

from dataclasses import dataclass
from enum import StrEnum


class SourceOrigin(StrEnum):
    INSTRUCTOR = "instructor"
    TA = "ta"
    STUDENT_SELF = "student_self"
    CLASSMATE = "classmate"
    EXTERNAL = "external"


class ArtifactType(StrEnum):
    LECTURE = "lecture"
    READING = "reading"
    SYLLABUS = "syllabus"
    STUDY_GUIDE = "study_guide"
    HOMEWORK = "homework"
    QUIZ = "quiz"
    EXAM = "exam"
    SOLUTION_KEY = "solution_key"
    STUDENT_NOTES = "student_notes"
    CLASSMATE_NOTES = "classmate_notes"
    WORKED_SOLUTION = "worked_solution"
    HANDWRITTEN_WORK = "handwritten_work"
    PHOTO = "photo"
    OTHER = "other"


@dataclass(frozen=True)
class AuthorityWeights:
    """How much a resource influences three independent decisions.

    curriculum_authority: how much this source shapes canonical concepts.
    prerequisite_authority: how much this source shapes PREREQUISITE_FOR edges.
    mastery_evidence: how much this source counts as mastery evidence (separate
        from the evidence-strength table in domain.mastery.evidence, which
        scales evidence_type; this scales the resource itself, e.g. an
        ungraded personal note vs. a graded exam of the same evidence_type).
    """

    curriculum_authority: float
    prerequisite_authority: float
    mastery_evidence: float


# Defaults from the build spec's authority table. Configurable: callers may
# override per-course if an instructor wants different weighting.
_DEFAULTS_BY_ORIGIN_ARTIFACT: dict[tuple[SourceOrigin, ArtifactType], AuthorityWeights] = {
    (SourceOrigin.INSTRUCTOR, ArtifactType.LECTURE): AuthorityWeights(1.00, 0.95, 0.00),
    (SourceOrigin.INSTRUCTOR, ArtifactType.HOMEWORK): AuthorityWeights(1.00, 0.85, 0.00),
    (SourceOrigin.INSTRUCTOR, ArtifactType.EXAM): AuthorityWeights(1.00, 0.85, 0.00),
    (SourceOrigin.INSTRUCTOR, ArtifactType.QUIZ): AuthorityWeights(1.00, 0.85, 0.00),
    (SourceOrigin.INSTRUCTOR, ArtifactType.READING): AuthorityWeights(0.90, 0.90, 0.00),
    (SourceOrigin.INSTRUCTOR, ArtifactType.STUDY_GUIDE): AuthorityWeights(0.90, 0.85, 0.00),
    (SourceOrigin.INSTRUCTOR, ArtifactType.SYLLABUS): AuthorityWeights(0.80, 0.60, 0.00),
    (SourceOrigin.INSTRUCTOR, ArtifactType.SOLUTION_KEY): AuthorityWeights(0.95, 0.70, 0.00),
    (SourceOrigin.TA, ArtifactType.STUDENT_NOTES): AuthorityWeights(0.85, 0.80, 0.00),
    (SourceOrigin.STUDENT_SELF, ArtifactType.EXAM): AuthorityWeights(0.50, 0.10, 1.00),
    (SourceOrigin.STUDENT_SELF, ArtifactType.QUIZ): AuthorityWeights(0.50, 0.10, 0.90),
    (SourceOrigin.STUDENT_SELF, ArtifactType.HOMEWORK): AuthorityWeights(0.40, 0.10, 0.80),
    (SourceOrigin.STUDENT_SELF, ArtifactType.WORKED_SOLUTION): AuthorityWeights(0.40, 0.15, 0.65),
    (SourceOrigin.STUDENT_SELF, ArtifactType.HANDWRITTEN_WORK): AuthorityWeights(0.35, 0.10, 0.55),
    (SourceOrigin.STUDENT_SELF, ArtifactType.PHOTO): AuthorityWeights(0.35, 0.10, 0.55),
    (SourceOrigin.STUDENT_SELF, ArtifactType.STUDENT_NOTES): AuthorityWeights(0.35, 0.20, 0.15),
    (SourceOrigin.CLASSMATE, ArtifactType.CLASSMATE_NOTES): AuthorityWeights(0.45, 0.35, 0.00),
    (SourceOrigin.EXTERNAL, ArtifactType.OTHER): AuthorityWeights(0.50, 0.45, 0.00),
}

# Fallbacks keyed by origin alone, used when the (origin, artifact_type) pair
# has no specific entry above.
_DEFAULTS_BY_ORIGIN: dict[SourceOrigin, AuthorityWeights] = {
    SourceOrigin.INSTRUCTOR: AuthorityWeights(0.90, 0.80, 0.00),
    SourceOrigin.TA: AuthorityWeights(0.80, 0.75, 0.00),
    SourceOrigin.STUDENT_SELF: AuthorityWeights(0.35, 0.15, 0.50),
    SourceOrigin.CLASSMATE: AuthorityWeights(0.40, 0.30, 0.00),
    SourceOrigin.EXTERNAL: AuthorityWeights(0.50, 0.45, 0.00),
}


def get_authority(origin: SourceOrigin, artifact_type: ArtifactType) -> AuthorityWeights:
    """Look up authority weights for a (origin, artifact_type) pair.

    Falls back to an origin-level default when there is no specific entry,
    so every valid combination resolves to *some* weights.
    """

    specific = _DEFAULTS_BY_ORIGIN_ARTIFACT.get((origin, artifact_type))
    if specific is not None:
        return specific
    return _DEFAULTS_BY_ORIGIN[origin]
