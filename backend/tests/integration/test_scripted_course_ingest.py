"""Pipeline integration tests that never call a live LLM.

Requires a running Postgres+pgvector instance (the same DATABASE_URL as
local ingest). Tests skip when the database is unreachable so unit CI can
stay offline.
"""

from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import AssessmentItem, Concept, ConceptEdge, EdgeEvidence
from app.db.session import async_session_factory, engine
from app.domain.ontology.concepts import ConceptKind, Granularity
from app.domain.ontology.edges import ConceptEdgeType
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.pipelines.course_ingestion import ingest_course_resource
from app.pipelines.student_ingestion import ingest_student_resource
from app.repositories.courses import create_course
from app.schemas.extraction import (
    AssessmentItemConceptLinkOut,
    AssessmentItemOut,
    ConceptCandidateOut,
    ConceptRelationshipOut,
    ResourceConceptLinkOut,
    ResourceExtractionResult,
)
from tests.helpers.scripted_provider import ScriptedLLMProvider

READING_TEXT = """Separable differential equations.

A first-order ODE dy/dx = g(x) h(y) is separable. Integrating both sides
after rearranging yields an implicit solution. Existence and uniqueness
for the associated IVP follow from the Picard–Lindelöf theorem when the
right-hand side is Lipschitz in y.

Integrating factor for linear first-order ODEs.

The linear equation y' + p(x) y = q(x) is solved by multiplying through by
mu(x) = exp(int p(x) dx). Separable structure is a prerequisite for some
nonlinear substitutions, but the integrating-factor method is the standard
attack on linear first-order equations.
"""

HOMEWORK_TEXT = """18.03 Recitation

1. Solve the separable equation dy/dx = x y. Identify the equilibrium
   solutions and sketch a slope field.

2. Find an integrating factor for y' + 2x y = x and solve the IVP y(0)=1.
"""

STUDENT_NOTES = """My notes from recitation.

Separable equations: move y terms to the left, x terms to the right, then
integrate. I still mix this up with the integrating factor method for
linear first-order ODEs.
"""


def _reading_extraction() -> ResourceExtractionResult:
    return ResourceExtractionResult(
        document_type="reading",
        concept_candidates=[
            ConceptCandidateOut(
                name="Separable Differential Equation",
                definition="First-order ODE that can be written dy/dx = g(x)h(y).",
                concept_kind=ConceptKind.DEFINITION,
                granularity=Granularity.CORE,
                importance_in_resource=0.9,
                aliases=["separable ODE"],
            ),
            ConceptCandidateOut(
                name="Integrating Factor",
                definition="Multiplier mu(x) that turns a linear first-order ODE into an exact derivative.",
                concept_kind=ConceptKind.METHOD,
                granularity=Granularity.CORE,
                importance_in_resource=0.85,
                aliases=["mu(x)"],
            ),
        ],
        concept_relationships=[
            ConceptRelationshipOut(
                source_concept_name="Separable Differential Equation",
                target_concept_name="Integrating Factor",
                edge_type=ConceptEdgeType.RELATED_TO,
                evidence_snippet="contrasted in the same recitation notes",
            )
        ],
        resource_concept_links=[
            ResourceConceptLinkOut(
                concept_name="Separable Differential Equation",
                link_type="EXPLAINED_IN",
                depth_score=0.8,
                confidence=0.9,
            ),
            ResourceConceptLinkOut(
                concept_name="Integrating Factor",
                link_type="EXPLAINED_IN",
                depth_score=0.75,
                confidence=0.88,
            ),
        ],
    )


def _homework_extraction() -> ResourceExtractionResult:
    return ResourceExtractionResult(
        document_type="homework",
        concept_candidates=[
            ConceptCandidateOut(
                name="Separable Differential Equation",
                definition="ODE solvable by separating variables.",
                concept_kind=ConceptKind.DEFINITION,
                granularity=Granularity.CORE,
                importance_in_resource=0.8,
            ),
            ConceptCandidateOut(
                name="Integrating Factor",
                definition="Used to solve y' + p(x)y = q(x).",
                concept_kind=ConceptKind.METHOD,
                granularity=Granularity.CORE,
                importance_in_resource=0.8,
            ),
        ],
        concept_relationships=[
            ConceptRelationshipOut(
                source_concept_name="Separable Differential Equation",
                target_concept_name="Integrating Factor",
                edge_type=ConceptEdgeType.PREREQUISITE_FOR,
                prerequisite_evidence_level="assessment_dependency",
                evidence_snippet="Q1 separable then Q2 integrating factor",
            )
        ],
        assessment_items=[
            AssessmentItemOut(
                label="Q1",
                prompt="Solve the separable equation dy/dx = x y.",
                difficulty=0.4,
                concept_links=[
                    AssessmentItemConceptLinkOut(
                        concept_name="Separable Differential Equation",
                        relevance_weight=1.0,
                    )
                ],
            ),
            AssessmentItemOut(
                label="Q2",
                prompt="Find an integrating factor for y' + 2x y = x.",
                difficulty=0.55,
                concept_links=[
                    AssessmentItemConceptLinkOut(
                        concept_name="Integrating Factor",
                        relevance_weight=1.0,
                    )
                ],
            ),
        ],
        resource_concept_links=[
            ResourceConceptLinkOut(
                concept_name="Separable Differential Equation",
                link_type="APPEARS_IN",
                depth_score=0.7,
                confidence=0.8,
            )
        ],
    )


def _student_extraction() -> ResourceExtractionResult:
    return ResourceExtractionResult(
        document_type="student_notes",
        concept_candidates=[
            ConceptCandidateOut(
                name="Separable Differential Equation",
                definition="Student restatement of separable ODE method.",
                concept_kind=ConceptKind.DEFINITION,
                granularity=Granularity.CORE,
                importance_in_resource=0.5,
            )
        ],
        resource_concept_links=[
            ResourceConceptLinkOut(
                concept_name="Separable Differential Equation",
                link_type="APPEARS_IN",
                depth_score=0.4,
                confidence=0.6,
            )
        ],
    )


async def _db_available() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except (SQLAlchemyError, OSError):
        return False


@pytest.mark.asyncio
async def test_scripted_course_and_student_ingest_persists_graph():
    if not await _db_available():
        pytest.skip("Postgres is not reachable")

    provider = ScriptedLLMProvider(
        by_document_type={
            "reading": _reading_extraction(),
            "homework": _homework_extraction(),
            "student_notes": _student_extraction(),
        }
    )
    student_id = uuid4()

    async with async_session_factory() as session:
        course = await create_course(
            session, name="Differential Equations", code="18.03", term="live-test"
        )
        reading = await ingest_course_resource(
            session,
            provider,
            course_id=course.id,
            origin=SourceOrigin.INSTRUCTOR,
            artifact_type=ArtifactType.READING,
            filename="ode-notes.txt",
            content_bytes=READING_TEXT.encode("utf-8"),
        )
        homework = await ingest_course_resource(
            session,
            provider,
            course_id=course.id,
            origin=SourceOrigin.INSTRUCTOR,
            artifact_type=ArtifactType.HOMEWORK,
            filename="rs-separable.txt",
            content_bytes=HOMEWORK_TEXT.encode("utf-8"),
        )
        student = await ingest_student_resource(
            session,
            provider,
            course_id=course.id,
            student_id=student_id,
            origin=SourceOrigin.STUDENT_SELF,
            artifact_type=ArtifactType.STUDENT_NOTES,
            filename="my-notes.txt",
            content_bytes=STUDENT_NOTES.encode("utf-8"),
        )
        await session.commit()

        concepts = (
            await session.execute(select(Concept).where(Concept.course_id == course.id))
        ).scalars().all()
        names = {c.canonical_name for c in concepts}
        course_scope = [c for c in concepts if c.scope == "course"]
        edges = (
            await session.execute(select(ConceptEdge).where(ConceptEdge.course_id == course.id))
        ).scalars().all()
        evidence = (
            await session.execute(select(EdgeEvidence))
        ).scalars().all()
        items = (await session.execute(select(AssessmentItem))).scalars().all()

        assert reading.status == "processed"
        assert reading.concepts_created >= 2
        assert homework.status == "processed"
        assert homework.assessment_items_created >= 1
        assert student.status == "processed"
        assert student.evidence_events_created >= 1
        assert "Separable Differential Equation" in names
        assert "Integrating Factor" in names
        assert len(course_scope) <= 3
        assert edges
        assert any(e.edge_type == "PREREQUISITE_FOR" or e.edge_type == "RELATED_TO" for e in edges)
        assert evidence
        assert {item.label for item in items} >= {"Q1", "Q2"}
