"""Deterministic demo fixture, no LLM required (spec: "Use deterministic
fixtures first if necessary" / end-to-end exit criteria).

Seeds one course with a canonical prerequisite backbone and one student
with evidence events chosen to exercise every layer of the pipeline:

    Linear Algebra -> PSD Matrices -> Mercer's Theorem -> Kernel Functions -> Kernel Regression

The student ends up strong on Linear Algebra, weak on PSD Matrices, weak on
Mercer's Theorem, developing on Kernel Functions, and *apparently* strong on
Kernel Regression despite the shaky foundation underneath it — which is
exactly the "fragile" case the mastery/readiness model exists to catch.

Requires the local SQLite schema migrated (`alembic upgrade head` from
`backend/`). Does not call any LLM provider — concepts/edges/evidence are
inserted directly via the repository layer.

Usage: `uv run python -m scripts.seed_demo_course`
"""

import asyncio
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.db.session import async_session_factory
from app.domain.mastery.evidence import EvidenceEvent, EvidenceType
from app.domain.ontology.concepts import ConceptKind, Granularity
from app.domain.ontology.edges import ConceptEdgeType
from app.pipelines.gap_query import compute_target_gaps
from app.pipelines.incremental_update import recompute_student_state
from app.pipelines.personal_graph_query import build_student_personal_graph
from app.repositories.concepts import create_concept
from app.repositories.courses import create_course
from app.repositories.edges import upsert_concept_edge
from app.repositories.student_states import create_evidence_event

NOW = datetime.now(UTC)


def days_ago(n: int) -> datetime:
    return NOW - timedelta(days=n)


async def seed() -> tuple[UUID, UUID, dict[str, UUID]]:
    student_id = uuid4()

    async with async_session_factory() as session:
        course = await create_course(
            session,
            name="Intermediate Machine Learning",
            code="CS-4780",
            term="Fall 2026",
        )
        course_id = course.id

        names = [
            ("Linear Algebra", ConceptKind.TOPIC_CLUSTER, Granularity.CLUSTER, 0.6),
            (
                "Positive Semidefinite Matrices",
                ConceptKind.DEFINITION,
                Granularity.CORE,
                0.75,
            ),
            ("Mercer's Theorem", ConceptKind.THEOREM, Granularity.CORE, 0.85),
            ("Kernel Functions", ConceptKind.DEFINITION, Granularity.CORE, 0.8),
            ("Kernel Regression", ConceptKind.METHOD, Granularity.CORE, 0.9),
        ]
        concept_ids: dict[str, UUID] = {}
        for name, kind, granularity, importance in names:
            node = await create_concept(
                session,
                course_id=course_id,
                canonical_name=name,
                short_definition=f"({name} — demo fixture definition)",
                concept_kind=kind,
                granularity=granularity,
                importance=importance,
            )
            concept_ids[name] = node.id

        backbone = [
            "Linear Algebra",
            "Positive Semidefinite Matrices",
            "Mercer's Theorem",
            "Kernel Functions",
            "Kernel Regression",
        ]
        for source_name, target_name in zip(
            backbone, backbone[1:], strict=False
        ):  # pairwise, intentionally unequal length
            await upsert_concept_edge(
                session,
                course_id=course_id,
                source_concept_id=concept_ids[source_name],
                target_concept_id=concept_ids[target_name],
                edge_type=ConceptEdgeType.PREREQUISITE_FOR,
                confidence=0.9,
                authority_weight=0.95,
            )

        # --- Student evidence, chosen to reproduce the spec's worked example ---
        events: list[EvidenceEvent] = [
            # Linear Algebra: strong, well-evidenced.
            EvidenceEvent(
                concept_id=concept_ids["Linear Algebra"],
                student_id=student_id,
                evidence_type=EvidenceType.GRADED_EXAM,
                outcome=0.95,
                certainty=0.9,
                occurred_at=days_ago(30),
            ),
            EvidenceEvent(
                concept_id=concept_ids["Linear Algebra"],
                student_id=student_id,
                evidence_type=EvidenceType.GRADED_HOMEWORK,
                outcome=0.9,
                certainty=0.85,
                occurred_at=days_ago(45),
            ),
            # PSD Matrices: weak, the primary bottleneck.
            EvidenceEvent(
                concept_id=concept_ids["Positive Semidefinite Matrices"],
                student_id=student_id,
                evidence_type=EvidenceType.GRADED_EXAM,
                outcome=0.25,
                certainty=0.9,
                occurred_at=days_ago(10),
            ),
            EvidenceEvent(
                concept_id=concept_ids["Positive Semidefinite Matrices"],
                student_id=student_id,
                evidence_type=EvidenceType.GRADED_HOMEWORK,
                outcome=0.35,
                certainty=0.8,
                occurred_at=days_ago(20),
            ),
            # Mercer's Theorem: weak, moderate confidence.
            EvidenceEvent(
                concept_id=concept_ids["Mercer's Theorem"],
                student_id=student_id,
                evidence_type=EvidenceType.GRADED_HOMEWORK,
                outcome=0.4,
                certainty=0.7,
                occurred_at=days_ago(8),
            ),
            EvidenceEvent(
                concept_id=concept_ids["Mercer's Theorem"],
                student_id=student_id,
                evidence_type=EvidenceType.STUDENT_NOTES,
                outcome=None,
                certainty=0.8,
                occurred_at=days_ago(9),
            ),
            # Kernel Functions: developing, uncertain (fewer events).
            EvidenceEvent(
                concept_id=concept_ids["Kernel Functions"],
                student_id=student_id,
                evidence_type=EvidenceType.GRADED_HOMEWORK,
                outcome=0.65,
                certainty=0.6,
                occurred_at=days_ago(5),
            ),
            # Kernel Regression: strong graded performance, but its
            # foundations (PSD/Mercer) are weak -> should come out fragile.
            EvidenceEvent(
                concept_id=concept_ids["Kernel Regression"],
                student_id=student_id,
                evidence_type=EvidenceType.GRADED_EXAM,
                outcome=0.85,
                certainty=0.9,
                occurred_at=days_ago(3),
            ),
            EvidenceEvent(
                concept_id=concept_ids["Kernel Regression"],
                student_id=student_id,
                evidence_type=EvidenceType.GRADED_HOMEWORK,
                outcome=0.8,
                certainty=0.85,
                occurred_at=days_ago(4),
            ),
        ]

        for event in events:
            await create_evidence_event(session, course_id=course_id, event=event)

        await recompute_student_state(
            session,
            course_id=course_id,
            student_id=student_id,
            touched_concept_ids=set(concept_ids.values()),
        )
        await session.commit()

    return course_id, student_id, concept_ids


async def report(
    course_id: UUID, student_id: UUID, concept_ids: dict[str, UUID]
) -> None:
    async with async_session_factory() as session:
        graph = await build_student_personal_graph(
            session, course_id=course_id, student_id=student_id
        )
        print("\n=== Personal knowledge graph ===")
        for node in sorted(graph.nodes, key=lambda n: -n.importance):
            understanding = (
                f"{node.understanding:.2f}" if node.understanding is not None else "—"
            )
            print(
                f"  {node.name:32s} state={node.discovery_state.value:12s} "
                f"understanding={understanding:>5s} "
                f"personal_relevance={node.personal_relevance:.2f}"
            )
        print(f"  hidden_concept_count={graph.hidden_concept_count}")

        gap_result = await compute_target_gaps(
            session,
            course_id=course_id,
            student_id=student_id,
            target_concept_id=concept_ids["Kernel Regression"],
        )
        print("\n=== Gaps toward 'Kernel Regression' ===")
        for gap in gap_result.gaps:
            print(
                f"  priority={gap.priority:.3f}  action={gap.action.value:8s}  {gap.reason}"
            )
        print("\n=== Minimal study order ===")
        name_by_id = {v: k for k, v in concept_ids.items()}
        print(
            "  "
            + " -> ".join(
                name_by_id.get(cid, str(cid)) for cid in gap_result.study_order
            )
        )


async def main() -> None:
    course_id, student_id, concept_ids = await seed()
    print(f"Seeded course {course_id}, student {student_id}")
    await report(course_id, student_id, concept_ids)


if __name__ == "__main__":
    asyncio.run(main())
