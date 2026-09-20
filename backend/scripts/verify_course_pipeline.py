"""Exercise persisted course data through HTTP and export reviewable pipeline results.

No LLM calls or fabricated student evidence. Run after ingestion and repairs:
python -m scripts.verify_course_pipeline MANIFEST OUTPUT_DIRECTORY
"""

import argparse
import asyncio
import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

import httpx
import networkx as nx
from sqlalchemy import select

from app.db.models import Assessment, Concept, Course, Resource, StudentEvidenceEvent
from app.db.session import async_session_factory, engine
from app.main import app
from app.repositories.resources import compute_content_hash
from scripts.ingest_manifest import read_entry


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, default=str) + "\n")


async def run(manifest_path, output):
    manifest = json.loads(manifest_path.read_text())
    checks = []
    async with async_session_factory() as session:
        course = (
            await session.scalars(
                select(Course).where(
                    Course.code == manifest["course"]["code"],
                    Course.name == manifest["course"]["name"],
                    Course.term == manifest["course"].get("term"),
                )
            )
        ).one()
        course_id = str(course.id)
        resources = (
            await session.scalars(
                select(Resource).where(Resource.course_id == course.id)
            )
        ).all()
        for entry in manifest["resources"]:
            filename, content = read_entry(manifest_path.parent, entry)
            matches = [
                r
                for r in resources
                if r.content_hash == compute_content_hash(content)
                and r.origin == entry["origin"]
                and r.artifact_type == entry["artifact_type"]
                and (str(r.owner_user_id) if r.owner_user_id else None)
                == entry.get("student_id")
            ]
            assert len(matches) == 1 and matches[0].status == "processed", (
                f"Incomplete: {filename}"
            )
            checks.append(
                {
                    "filename": filename,
                    "resource_id": str(matches[0].id),
                    "status": matches[0].status,
                }
            )
        concepts = (
            await session.scalars(
                select(Concept).where(
                    Concept.course_id == course.id, Concept.status == "active"
                )
            )
        ).all()
        events = (
            await session.scalars(
                select(StudentEvidenceEvent).where(
                    StudentEvidenceEvent.course_id == course.id
                )
            )
        ).all()
        assessments = (
            await session.scalars(
                select(Assessment).where(Assessment.course_id == course.id)
            )
        ).all()
    base = f"/api/courses/{course_id}"
    requests = []
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://pipeline"
    ) as client:

        async def request(method, path, **kwargs):
            response = await client.request(method, path, **kwargs)
            assert response.status_code == 200, (
                f"{method} {path}: {response.status_code} {response.text[:300]}"
            )
            requests.append(
                {"method": method, "path": path, "status": response.status_code}
            )
            return response.json()

        ontology = await request("GET", base + "/ontology")
        reduced = await request("GET", base + "/ontology?view=reduced")
        ids = {c["id"] for c in ontology["concepts"]}
        assert all(
            e["source_concept_id"] in ids and e["target_concept_id"] in ids
            for e in ontology["edges"]
        )
        prereqs = nx.DiGraph()
        prereqs.add_nodes_from(ids)
        prereqs.add_edges_from(
            (e["source_concept_id"], e["target_concept_id"])
            for e in ontology["edges"]
            if e["edge_type"] == "PREREQUISITE_FOR" and e["status"] == "active"
        )
        assert nx.is_directed_acyclic_graph(prereqs), "Prerequisite cycle"
        save(output / "ontology.json", ontology)
        save(output / "ontology-reduced.json", reduced)
        metrics = await request("GET", base + "/debug/metrics")
        # Source backing is checked for every active concept, including private ones.
        details = {}
        student_ids = sorted(
            {e["student_id"] for e in manifest["resources"] if e.get("student_id")}
        )
        student_reports = []
        for sid in student_ids:
            prefix = base + f"/students/{sid}"
            graph = await request("GET", prefix + "/knowledge-graph")
            assert graph == await request("GET", prefix + "/knowledge-graph"), (
                "Unstable graph serialization"
            )
            understanding = await request("GET", prefix + "/understanding")
            graph_ids = {n["concept_id"] for n in graph["nodes"]}
            assert graph_ids, "No personal graph from ingested student work"
            assert all(
                e["source"] in graph_ids and e["target"] in graph_ids
                for e in graph["edges"]
            )
            directory = output / "students" / sid
            for name, payload in [
                ("knowledge-graph", graph),
                ("understanding", understanding),
            ]:
                save(directory / f"{name}.json", payload)
            targets = sorted(
                ontology["concepts"],
                key=lambda c: (-prereqs.in_degree(c["id"]), -c["importance"], c["id"]),
            )[:3]
            target_specs = [{"target_concept_id": c["id"]} for c in targets]
            target_specs += [
                {"assessment_id": str(a.id)}
                for a in assessments
                if any(
                    r.id == a.resource_id
                    and (r.owner_user_id is None or str(r.owner_user_id) == sid)
                    for r in resources
                )
            ]
            plans = []
            for target in target_specs:
                try:
                    gaps = await request("GET", prefix + "/gaps", params=target)
                    plan = await request("POST", prefix + "/study-plan", json=target)
                except AssertionError as exc:
                    # A large course can have assessments whose items never
                    # mapped to any concept (e.g. a pure-writeup question);
                    # that is a legitimate empty target, not a pipeline bug.
                    if "assessment_id" in target and "no associated concepts" in str(
                        exc
                    ).lower():
                        continue
                    raise
                assert {g["concept_id"] for g in gaps["gaps"]} == {
                    g["concept_id"] for g in plan["gaps"]
                }
                positions = {cid: i for i, cid in enumerate(plan["study_order"])}
                assert len(positions) == len(plan["study_order"])
                assert all(
                    positions[a] < positions[b]
                    for a, b in prereqs.edges
                    if a in positions and b in positions
                )
                plans.append({"target": target, "gaps": gaps, "study_plan": plan})
            save(directory / "study-plans.json", plans)
            student_reports.append(
                {
                    "student_id": sid,
                    "graph_nodes": len(graph["nodes"]),
                    "graph_edges": len(graph["edges"]),
                    "understanding_entries": len(understanding["concepts"]),
                    "study_plans": len(plans),
                    "evidence_events": sum(str(e.student_id) == sid for e in events),
                    "scored_evidence_events": sum(
                        str(e.student_id) == sid and e.outcome is not None
                        for e in events
                    ),
                }
            )
        for concept in concepts:
            if concept.owner_student_id:
                path = (
                    base
                    + f"/students/{concept.owner_student_id}/concepts/{concept.id}/why"
                )
            else:
                path = base + f"/concepts/{concept.id}/why"
            detail = await request("GET", path)
            assert detail["resources"], (
                f"Concept without sources: {concept.canonical_name}"
            )
            details[str(concept.id)] = detail
        save(output / "concept-details.json", details)
        stranger = str(uuid5(NAMESPACE_URL, "studygotchi:empty-student:" + course_id))
        empty_graph = await request(
            "GET", base + f"/students/{stranger}/knowledge-graph"
        )
        assert not empty_graph["nodes"], "Student evidence leaked"
        private = next((c for c in concepts if c.owner_student_id), None)
        if private:
            denied = await client.get(
                base + f"/students/{stranger}/concepts/{private.id}"
            )
            assert denied.status_code == 404, "Private concept leaked"
    result = {
        "verified_at": datetime.now(UTC).isoformat(),
        "course_id": course_id,
        "code": course.code,
        "manifest_resources": len(checks),
        "processed_resources": checks,
        "active_concepts_by_scope": dict(Counter(c.scope for c in concepts)),
        "metrics": metrics,
        "active_prerequisite_edges": prereqs.number_of_edges(),
        "students": student_reports,
        "concept_details_verified": len(details),
        "empty_student_isolation": "passed",
        "http_checks": len(requests),
        "requests": requests,
    }
    save(output / "verification.json", result)
    print(
        json.dumps(
            {
                k: v
                for k, v in result.items()
                if k not in ("requests", "processed_resources")
            },
            indent=2,
        )
    )
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    asyncio.run(run(args.manifest.resolve(), args.output.resolve()))
