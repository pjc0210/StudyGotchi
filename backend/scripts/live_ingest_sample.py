"""Live course+student ingest against a real LLM provider.

Reads `backend/.env` via Settings (never prints secrets). Intended for
manual validation of structured extraction against a couple of real PDFs.

Usage (from backend/):

    uv run python -m scripts.live_ingest_sample
"""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
from uuid import uuid4

from openai import APIStatusError
from sqlalchemy import func, select

from app.config import get_settings
from app.db.models import (
    AssessmentItem,
    Concept,
    ConceptAlias,
    ConceptEdge,
    EdgeEvidence,
)
from app.db.session import async_session_factory
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.pipelines.course_ingestion import ingest_course_resource
from app.pipelines.student_ingestion import ingest_student_resource
from app.providers.llm import get_llm_provider
from app.repositories.courses import create_course

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_DIR.parent
_DEFAULT_FILES = (
    ("18.03.zip", "18.03/rs6.pdf", ArtifactType.READING, "18.03-rs6.pdf"),
    ("18.03.zip", "18.03/rs7.pdf", ArtifactType.READING, "18.03-rs7.pdf"),
    ("8.223.zip", "8.223/local-coursework/pset2.pdf", ArtifactType.HOMEWORK, "8.223-pset2.pdf"),
)


def _extract_member(zip_name: str, member: str, dest: Path) -> Path:
    import zipfile

    archive = _REPO_ROOT / "course-materials" / zip_name
    if not archive.exists():
        raise FileNotFoundError(f"Missing course archive: {archive}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as zf:
        names = zf.namelist()
        if member not in names:
            matches = [n for n in names if n.endswith(Path(member).name)]
            if not matches:
                raise FileNotFoundError(f"{member} not in {zip_name}")
            member = matches[0]
        dest.write_bytes(zf.read(member))
    return dest


def _provider_label() -> str:
    settings = get_settings()
    provider = settings.llm_provider
    if provider == "openai":
        return f"openai/{settings.openai_model}"
    if provider == "anthropic":
        return f"anthropic/{settings.anthropic_model}"
    return provider


async def _summarize(session, course_id) -> None:
    concept_count = (
        await session.execute(select(func.count()).select_from(Concept).where(Concept.course_id == course_id))
    ).scalar_one()
    alias_count = (
        await session.execute(select(func.count()).select_from(ConceptAlias))
    ).scalar_one()
    edge_count = (
        await session.execute(
            select(func.count()).select_from(ConceptEdge).where(ConceptEdge.course_id == course_id)
        )
    ).scalar_one()
    evidence_count = (await session.execute(select(func.count()).select_from(EdgeEvidence))).scalar_one()
    item_count = (await session.execute(select(func.count()).select_from(AssessmentItem))).scalar_one()
    print(
        "graph summary:",
        {
            "concepts": concept_count,
            "aliases": alias_count,
            "edges": edge_count,
            "edge_evidence": evidence_count,
            "assessment_items": item_count,
        },
    )
    rows = (
        await session.execute(
            select(Concept.canonical_name, Concept.concept_kind, Concept.short_definition)
            .where(Concept.course_id == course_id)
            .order_by(Concept.canonical_name)
            .limit(40)
        )
    ).all()
    print("sample concepts:")
    for name, kind, definition in rows:
        snippet = (definition or "").replace("\n", " ")[:120]
        print(f"  - {name} [{kind}] {snippet}")


async def run(scratch: Path) -> None:
    settings = get_settings()
    if settings.llm_provider == "openai" and not settings.openai_api_key:
        raise SystemExit("OPENAI_API_KEY is not set")
    if settings.llm_provider == "anthropic" and not settings.anthropic_api_key:
        raise SystemExit("ANTHROPIC_API_KEY is not set")

    provider = get_llm_provider()
    print("provider:", _provider_label())
    try:
        vectors = await provider.embed(["openai key preflight"])
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    except APIStatusError as exc:
        raise SystemExit(f"OpenAI preflight failed with HTTP {exc.status_code}.") from exc
    if not vectors or len(vectors[0]) != settings.openai_embed_dimensions:
        raise SystemExit("OpenAI embedding preflight returned an unexpected vector width.")
    print("openai embedding preflight: ok")

    files: list[tuple[Path, ArtifactType, str]] = []
    for zip_name, member, artifact, dest_name in _DEFAULT_FILES:
        path = _extract_member(zip_name, member, scratch / dest_name)
        files.append((path, artifact, dest_name))
        print(f"extracted {dest_name} ({path.stat().st_size} bytes)")

    student_notes = (
        "Student notes: separable ODEs vs integrating factors.\n"
        "I can separate dy/dx = g(x)h(y), but I still confuse when to use mu(x).\n"
    )

    async with async_session_factory() as session:
        course = await create_course(
            session,
            name="18.03 Differential Equations (live ingest)",
            code="18.03",
            term="live-openai",
        )
        print("course_id:", course.id)
        for path, artifact, dest_name in files:
            print(f"ingesting {dest_name} as {artifact.value} ...")
            outcome = await ingest_course_resource(
                session,
                provider,
                course_id=course.id,
                origin=SourceOrigin.INSTRUCTOR,
                artifact_type=artifact,
                filename=dest_name,
                content_bytes=path.read_bytes(),
            )
            await session.commit()
            print(
                "  outcome:",
                {
                    "status": outcome.status,
                    "concepts_created": outcome.concepts_created,
                    "concepts_merged": outcome.concepts_merged,
                    "edges_created": outcome.edges_created,
                    "assessment_items_created": outcome.assessment_items_created,
                },
            )

        student_id = uuid4()
        print("ingesting fabricated student notes ...")
        student_outcome = await ingest_student_resource(
            session,
            provider,
            course_id=course.id,
            student_id=student_id,
            origin=SourceOrigin.STUDENT_SELF,
            artifact_type=ArtifactType.STUDENT_NOTES,
            filename="student-ode-notes.txt",
            content_bytes=student_notes.encode("utf-8"),
        )
        await session.commit()
        print(
            "  student outcome:",
            {
                "status": student_outcome.status,
                "evidence_events_created": student_outcome.evidence_events_created,
                "concepts_touched": len(student_outcome.concepts_touched),
                "personal_concepts_created": student_outcome.personal_concepts_created,
            },
        )
        await _summarize(session, course.id)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scratch", type=Path, default=Path("/tmp/sg_test"))
    args = parser.parse_args()
    asyncio.run(run(args.scratch))


if __name__ == "__main__":
    main()
