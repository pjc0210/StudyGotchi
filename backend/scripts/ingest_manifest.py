"""Import explicitly classified local files or ZIP members, one transaction per file.

Run: python -m scripts.ingest_manifest manifest.json [--dry-run] [--limit N]
Paths resolve relative to the manifest; no archive is extracted to disk.
"""

import argparse
import asyncio
import json
from dataclasses import asdict
from pathlib import Path
from uuid import UUID
from zipfile import ZipFile

from sqlalchemy import select

from app.config import get_settings
from app.db.models import Course
from app.db.session import async_session_factory, engine
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.pipelines.course_ingestion import ingest_course_resource
from app.pipelines.student_ingestion import ingest_student_resource
from app.providers.llm import get_llm_provider
from app.repositories.courses import create_course


def read_entry(base: Path, entry: dict) -> tuple[str, bytes]:
    path = (base / entry["path"]).resolve()
    maximum = get_settings().max_upload_bytes
    if entry.get("member"):
        with ZipFile(path) as archive:
            info = archive.getinfo(entry["member"])
            if info.file_size > maximum:
                raise ValueError("Archive member exceeds upload limit")
            return info.filename, archive.read(info)
    if path.stat().st_size > maximum:
        raise ValueError("File exceeds upload limit")
    return path.name, path.read_bytes()


async def run(args):
    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text())
    entries = (
        manifest["resources"][: args.limit] if args.limit else manifest["resources"]
    )
    prepared = []
    for entry in entries:
        origin, artifact = (
            SourceOrigin(entry["origin"]),
            ArtifactType(entry["artifact_type"]),
        )
        student_id = UUID(entry["student_id"]) if entry.get("student_id") else None
        if origin == SourceOrigin.STUDENT_SELF and student_id is None:
            raise ValueError("Personal work requires an explicit student_id")
        filename, content = read_entry(manifest_path.parent, entry)
        prepared.append((entry, origin, artifact, student_id, filename, content))
    if args.dry_run:
        print(
            json.dumps(
                {
                    "course": manifest["course"],
                    "resources": [
                        {
                            "filename": p[4],
                            "bytes": len(p[5]),
                            "origin": p[1],
                            "artifact_type": p[2],
                            "student_id": p[3],
                        }
                        for p in prepared
                    ],
                },
                default=str,
                indent=2,
            )
        )
        return
    provider = get_llm_provider()
    async with async_session_factory() as session:
        metadata = manifest["course"]
        course = (
            (
                await session.execute(
                    select(Course).where(
                        Course.code == metadata.get("code"),
                        Course.name == metadata["name"],
                        Course.term == metadata.get("term"),
                    )
                )
            )
            .scalars()
            .first()
        )
        if course is None:
            course = await create_course(
                session,
                name=metadata["name"],
                code=metadata.get("code"),
                term=metadata.get("term"),
            )
        course_id = course.id
        await session.commit()
    print(json.dumps({"course_id": str(course_id)}), flush=True)
    failures = 0
    for entry, origin, artifact, student_id, filename, content in prepared:
        async with async_session_factory() as session:
            try:
                kwargs = {
                    "course_id": course_id,
                    "origin": origin,
                    "artifact_type": artifact,
                    "filename": filename,
                    "content_bytes": content,
                }
                if student_id is not None:
                    outcome = await ingest_student_resource(
                        session, provider, student_id=student_id, **kwargs
                    )
                else:
                    outcome = await ingest_course_resource(session, provider, **kwargs)
                await session.commit()
                print(
                    json.dumps({"filename": filename, **asdict(outcome)}, default=str),
                    flush=True,
                )
            except Exception as exc:  # noqa: BLE001 — report type only; never log credentials or request bodies
                await session.rollback()
                failures += 1
                # Avoid printing provider request bodies or credentials.
                print(
                    json.dumps(
                        {
                            "filename": filename,
                            "status": "failed",
                            "error_type": type(exc).__name__,
                        }
                    ),
                    flush=True,
                )
    await engine.dispose()
    if failures:
        raise SystemExit(
            f"{failures} files failed; successful files committed. Re-run safely to resume."
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    asyncio.run(run(parser.parse_args()))
