# Two-course pipeline verification

This directory contains real-source results for 6.1400 and 8.223. No additional courses were ingested.

## Scope

- **6.1400:** the 21 lectures in its original manifest, plus the official first problem set and the student's handwritten first problem set, to exercise the personal pipeline.
- **8.223:** all 24 manifest resources: 11 lectures, four official problem sets, four exam/solution documents, one external reading, and four handwritten problem sets.

This is manifest coverage, not a claim that every file in the course archives was ingested. Other 6.1400 archive materials are outside this run.

## Outputs

Each course directory contains canonical and reduced ontology JSON, source-backed concept details with ranked resources, the duplicate review and applied repair report, and `verification.json` with every successful HTTP check. Each student directory contains the personal knowledge graph, understanding state, world projection, world events, and concept/assessment-targeted study plans.

The handwritten work is real source material. Scored practice events are model assessments under the existing verification prompt and are not instructor-assigned grades. Resource exposure is kept separate from scored evidence.

Duplicate repair excludes local symbolic labels and numbered theorem references. Reviewed equivalent clusters are merged with provenance; ambiguous broad aliases remain deferred in `dedup-review.json`. Repairs re-run prerequisite cycle cleanup and recompute affected student states.

## Reproduce verification

From `backend/`:

```sh
.venv/bin/python -m scripts.verify_course_pipeline ../course-materials/6.1400-ingestion.json ../demo-data/two-course-pipeline/6.1400
.venv/bin/python -m scripts.verify_course_pipeline ../course-materials/8.223-ingestion.json ../demo-data/two-course-pipeline/8.223
```

Verification makes no AI calls and does not add evidence. It checks manifest content hashes/status, graph references and repeatability, prerequisite acyclicity, study order, concept sources, world projections, and isolation from an empty student. The live data is stored in `backend/studygotchi.db`; JSON output can be consumed independently by the frontend/world team.

## Verified results

| Course | Processed files | Canonical/shared concepts | Personal graph nodes | World regions | Study plans |
|---|---:|---:|---:|---:|---:|
| 6.1400 | 23 | 449 | 36 | 32 | 7 |
| 8.223 | 24 | 473 | 186 | 177 | 10 |

All 1,130 HTTP checks passed. Both prerequisite graphs are acyclic; every active concept has source backing. Replaying all 47 manifest entries returned `unchanged`. SQLite integrity and foreign-key checks passed. The test suite passed 70 tests.

Duplicate-concept repair is fully applied for both courses as of this export: 19 of 21 candidate clusters for 6.1400 (2 excluded as false positives — a reused per-example notation label and a reused theorem-number reference, both now also excluded automatically by `is_locally_scoped_label`), and all 3 candidate clusters for 8.223. A fresh dry-run (`scripts.repair_duplicate_concepts --dry-run`) on both courses now returns zero clusters.

## API identifiers

- **6.1400** — course `6fb9c56e-0a47-479f-a80c-588ad07ff85e`, student `61400000-0000-4000-8000-000000000001`.
- **8.223** — course `2a9366df-b7c1-45df-8666-3f14219b7a2f`, student `82230000-0000-4000-8000-000000000001`.

Use `/api/courses/{course_id}/students/{student_id}/knowledge-graph`, `/understanding`, `/world`, `/world-events`, `/gaps`, and `/study-plan`. The verification JSON lists the exact requests and tested targets.
