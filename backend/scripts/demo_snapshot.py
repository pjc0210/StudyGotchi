"""Portable JSON database + API exports for the hackathon demo.

python -m scripts.demo_snapshot export ../demo-data/current
python -m scripts.demo_snapshot restore ../demo-data/sample
No AI calls. Export is read-only; restore requires migrated, empty tables.
"""

import argparse
import asyncio
import json
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from sqlalchemy import DateTime, Numeric, Uuid, func, select, text, update

from app.api.routes.ontology import get_ontology_endpoint
from app.api.routes.personal_graph import get_knowledge_graph_endpoint
from app.api.routes.world import get_world
from app.db import models  # noqa: F401 - register application tables
from app.db.base import Base
from app.db.session import async_session_factory, engine

SCHEMA_VERSION = 1


def json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    if isinstance(value, dict):
        return {str(key): json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_value(item) for item in value]
    if hasattr(value, "tolist"):
        return json_value(value.tolist())
    return value


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    content = (
        json.dumps(json_value(value), indent=2, sort_keys=True, allow_nan=False) + "\n"
    )
    path.write_text(content)


def decode_row(table, row):
    if set(row) != set(table.columns.keys()):
        raise ValueError(
            f"Snapshot columns do not match {table.name}; use the matching backend revision"
        )
    result = {}
    for column in table.columns:
        value = row[column.name]
        if value is not None:
            if isinstance(column.type, Uuid):
                value = UUID(value)
            elif isinstance(column.type, DateTime):
                value = datetime.fromisoformat(value)
            elif isinstance(column.type, Numeric):
                value = Decimal(str(value))
        result[column.name] = value
    return result


def read_snapshot(directory):
    snapshot = json.loads((directory / "database.json").read_text())
    if snapshot.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported snapshot schema version")
    if set(snapshot["tables"]) != set(Base.metadata.tables):
        raise ValueError("Snapshot tables do not match this backend revision")
    decoded = {
        table.name: [decode_row(table, row) for row in snapshot["tables"][table.name]]
        for table in Base.metadata.sorted_tables
    }
    return snapshot, decoded


async def export_snapshot(
    directory, *, kind="database", description="Local database snapshot"
):
    # One consistent view even if ingestion commits while we export.
    async with async_session_factory() as session:
        if session.bind.dialect.name == "postgresql":
            await session.execute(
                text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            )
        revisions = list(
            (
                await session.execute(
                    text("SELECT version_num FROM alembic_version ORDER BY version_num")
                )
            ).scalars()
        )
        tables = {}
        for table in Base.metadata.sorted_tables:
            rows = (
                (
                    await session.execute(
                        select(table).order_by(*table.primary_key.columns)
                    )
                )
                .mappings()
                .all()
            )
            tables[table.name] = [dict(row) for row in rows]
        manifest = {
            "schema_version": SCHEMA_VERSION,
            "snapshot_kind": kind,
            "description": description,
            "exported_at": datetime.now(UTC).isoformat(),
            "alembic_revisions": revisions,
            "database_file": "database.json",
            "table_counts": {name: len(rows) for name, rows in tables.items()},
            "courses": [],
        }
        student_pairs = set()
        for rows in tables.values():
            for row in rows:
                student = row.get("student_id") or row.get("owner_student_id")
                if student is not None and row.get("course_id") is not None:
                    student_pairs.add((row["course_id"], student))
        for course in tables["courses"]:
            cid = course["id"]
            course_dir = Path("courses") / str(cid)
            ontology = await get_ontology_endpoint(course_id=cid, session=session)
            write_json(
                directory / course_dir / "ontology.json",
                ontology.model_dump(mode="json"),
            )
            entry = {
                "course_id": cid,
                "name": course["name"],
                "ontology": str(course_dir / "ontology.json"),
                "students": [],
            }
            for pair_course, student in sorted(
                student_pairs, key=lambda pair: tuple(map(str, pair))
            ):
                if pair_course != cid:
                    continue
                student_dir = course_dir / "students" / str(student)
                graph = await get_knowledge_graph_endpoint(
                    course_id=cid, student_id=student, session=session
                )
                world = await get_world(
                    course_id=cid, student_id=student, session=session
                )
                write_json(
                    directory / student_dir / "knowledge-graph.json",
                    graph.model_dump(mode="json"),
                )
                write_json(
                    directory / student_dir / "world.json",
                    world.model_dump(mode="json"),
                )
                entry["students"].append(
                    {
                        "student_id": student,
                        "knowledge_graph": str(student_dir / "knowledge-graph.json"),
                        "world": str(student_dir / "world.json"),
                    }
                )
            manifest["courses"].append(entry)
        write_json(
            directory / "database.json",
            {
                "schema_version": SCHEMA_VERSION,
                "snapshot_kind": kind,
                "description": description,
                "alembic_revisions": revisions,
                "tables": tables,
            },
        )
        # The manifest is the authoritative index; old unreferenced files aren't loaded.
        write_json(directory / "manifest.json", manifest)
        await session.rollback()
    return manifest


async def restore_snapshot(directory):
    snapshot, tables = read_snapshot(directory)
    async with async_session_factory() as session:
        async with session.begin():
            if session.bind.dialect.name == "postgresql":
                await session.execute(text("SELECT pg_advisory_xact_lock(734920180)"))
            revisions = list(
                (
                    await session.execute(
                        text(
                            "SELECT version_num FROM alembic_version ORDER BY version_num"
                        )
                    )
                ).scalars()
            )
            if revisions != snapshot["alembic_revisions"]:
                raise ValueError(
                    "Database migration version differs from snapshot; run alembic upgrade head with matching code"
                )
            for table in Base.metadata.sorted_tables:
                if await session.scalar(select(func.count()).select_from(table)):
                    raise ValueError(
                        f"Destination is not empty ({table.name}); use a new database. Nothing was replaced."
                    )
            for table in Base.metadata.sorted_tables:
                rows = tables[table.name]
                if table.name == "concepts":
                    rows = [
                        {**row, "canonical_parent_concept_id": None} for row in rows
                    ]
                if rows:
                    await session.execute(table.insert(), rows)
            concepts = Base.metadata.tables["concepts"]
            for row in tables["concepts"]:
                if row["canonical_parent_concept_id"] is not None:
                    await session.execute(
                        update(concepts)
                        .where(concepts.c.id == row["id"])
                        .values(
                            canonical_parent_concept_id=row[
                                "canonical_parent_concept_id"
                            ]
                        )
                    )
    return {name: len(rows) for name, rows in tables.items()}


async def main(args):
    directory = Path(args.directory).resolve()
    try:
        if args.action == "export":
            result = await export_snapshot(
                directory, kind=args.kind, description=args.description
            )
            print(
                json.dumps(
                    {
                        "directory": str(directory),
                        "table_counts": result["table_counts"],
                    },
                    indent=2,
                )
            )
        elif args.action == "validate":
            snapshot, tables = read_snapshot(directory)
            print(
                json.dumps(
                    {
                        "schema_version": snapshot["schema_version"],
                        "table_counts": {k: len(v) for k, v in tables.items()},
                    },
                    indent=2,
                )
            )
        else:
            print(json.dumps({"restored": await restore_snapshot(directory)}, indent=2))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["export", "restore", "validate"])
    parser.add_argument("directory")
    parser.add_argument(
        "--kind",
        choices=["database", "synthetic_demo", "mixed_demo"],
        default="database",
    )
    parser.add_argument("--description", default="Local database snapshot")
    asyncio.run(main(parser.parse_args()))
