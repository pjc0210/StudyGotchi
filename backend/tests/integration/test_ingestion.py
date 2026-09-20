"""Real SQLite transactions against a throwaway database; fixture
extraction, no live AI calls. Set STUDYGOTCHI_TEST_DATABASE_URL to point at
a different (already-migrated) database instead of the default temp file.
"""

import os
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.dependencies import current_student, get_db, get_provider
from app.db.base import Base
from app.db.models import Resource, StudentEvidenceEvent
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.main import app
from app.pipelines.course_ingestion import ingest_course_resource
from app.pipelines.student_ingestion import ingest_student_resource
from app.providers.llm.fake_provider import FakeLLMProvider
from app.repositories.concepts import get_alias_index
from app.repositories.courses import create_course

URL = os.getenv("STUDYGOTCHI_TEST_DATABASE_URL")
MIGRATE_URL = URL is None


def _extraction(name: str, *, graded: bool) -> dict:
    result = {
        "document_type": "notes",
        "concept_candidates": [
            {
                "name": name,
                "definition": "A scalar-valued operation on two vectors.",
                "concept_kind": "definition",
                "granularity": "core",
                "importance_in_resource": 0.8,
            }
        ],
    }
    if graded:
        result["assessment_items"] = [
            {
                "label": "Q1",
                "max_score": 10,
                "score_achieved": 0,
                "concept_links": [{"concept_name": name, "relevance_weight": 1.0}],
            }
        ]
    return result


def fixture_provider() -> FakeLLMProvider:
    # The first marker found in the prompt wins, so the graded exam is listed first.
    return FakeLLMProvider(
        structured=[
            ("GRADED", _extraction("Inner Product", graded=True)),
            ("PRIVATE", _extraction("Personal Analogy", graded=False)),
            ("Inner products", _extraction("Inner Product", graded=False)),
        ],
        strict=True,
    )


@pytest.mark.asyncio
async def test_ingestion_is_idempotent_isolated_and_world_is_explainable(tmp_path):
    url = URL or f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"
    engine = create_async_engine(url)
    if MIGRATE_URL:
        async with engine.begin() as setup_connection:
            await setup_connection.run_sync(Base.metadata.create_all)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        factory = async_sessionmaker(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        async with factory() as session:
            course = await create_course(
                session, name="Integration fixture", code=None, term=None
            )
            provider = fixture_provider()
            student, other = uuid4(), uuid4()
            base = {
                "course_id": course.id,
                "origin": SourceOrigin.INSTRUCTOR,
                "artifact_type": ArtifactType.LECTURE,
                "filename": "lecture.txt",
                "content_bytes": b"Inner products explain orthogonality.",
            }
            first = await ingest_course_resource(session, provider, **base)
            assert first.concepts_created == 1
            assert (
                await ingest_course_resource(session, provider, **base)
            ).status == "unchanged"
            personal = {
                "course_id": course.id,
                "student_id": student,
                "origin": SourceOrigin.STUDENT_SELF,
                "artifact_type": ArtifactType.STUDENT_NOTES,
                "filename": "notes.txt",
                "content_bytes": b"PRIVATE analogy",
            }
            await ingest_student_resource(session, provider, **personal)
            assert "personal analogy" not in await get_alias_index(
                session, course.id, other
            )
            count_before = await session.scalar(
                select(func.count())
                .select_from(StudentEvidenceEvent)
                .where(StudentEvidenceEvent.student_id == student)
            )
            assert (
                await ingest_student_resource(session, provider, **personal)
            ).status == "unchanged"
            assert count_before == await session.scalar(
                select(func.count())
                .select_from(StudentEvidenceEvent)
                .where(StudentEvidenceEvent.student_id == student)
            )
            graded = {
                "course_id": course.id,
                "student_id": student,
                "origin": SourceOrigin.STUDENT_SELF,
                "artifact_type": ArtifactType.EXAM,
                "filename": "exam.txt",
                "content_bytes": b"GRADED Q1: 0/10",
            }
            await ingest_student_resource(session, provider, **graded)
            await ingest_student_resource(
                session,
                provider,
                **(graded | {"student_id": other, "origin": SourceOrigin.CLASSMATE}),
            )
            assert (
                await session.scalar(
                    select(func.count())
                    .select_from(StudentEvidenceEvent)
                    .where(StudentEvidenceEvent.student_id == other)
                )
                == 0
            )
            assert (await session.get(Resource, first.resource_id)).raw_text

            async def db_override():
                yield session

            app.dependency_overrides[get_db] = db_override
            app.dependency_overrides[get_provider] = lambda: provider
            app.dependency_overrides[current_student] = lambda: student
            try:
                async with httpx.AsyncClient(
                    transport=httpx.ASGITransport(app=app), base_url="http://test"
                ) as client:
                    prefix = f"/api/courses/{course.id}/students/{student}"
                    graph = (await client.get(prefix + "/knowledge-graph")).json()
                    world_response = await client.get(prefix + "/world")
                    assert world_response.status_code == 200, world_response.text
                    world = world_response.json()
                    assert world["regions"]
                    assert {r["concept_id"] for r in world["regions"]} <= {
                        n["concept_id"] for n in graph["nodes"]
                    }
                    events = (await client.get(prefix + "/world-events")).json()[
                        "events"
                    ]
                    assert any(
                        e["event"] == "UNDERSTANDING_DROP" and e["resource_id"]
                        for e in events
                    )
                    cid = graph["nodes"][0]["concept_id"]
                    detail = await client.get(prefix + f"/concepts/{cid}/why")
                    assert detail.status_code == 200, detail.text
                    assert detail.json()["resources"]
            finally:
                app.dependency_overrides.clear()
        await transaction.rollback()
    await engine.dispose()
