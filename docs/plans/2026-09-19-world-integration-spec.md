# World ↔ knowledge-engine integration spec

Date: 2026-09-19. Sources: `origin/main` @ `8e5e703` (read through a throwaway worktree), `prototypes/world-lab/src/*`, and the team's own `backend/graph_engine/backend_build_spec.md` (§27 cluster detection, §55–57 world contracts, §65 demo fixture). Nothing under `frontend/` or `backend/` was touched. Mastery numbers below were computed by running the backend's `app.domain.mastery` code on the seed script's events.

## 1. Backend surface (`backend/app/main.py`, FastAPI + async SQLAlchemy + pgvector)

No auth, no `CORSMiddleware`, no API key. `student_id` is a bare path `UUID` with no users table: `scripts/seed_demo_course.py` mints one with `uuid4()`; the frontend reads it from `NEXT_PUBLIC_STUDENT_ID`; `Resource.owner_user_id` and `Concept.owner_student_id` carry the same value. Any URL is therefore already a read-only (and write) "visit someone's world".

| Route | Request → Response | Meaning |
|---|---|---|
| `GET /health` | → `{"status":"ok"}` | liveness |
| `POST /api/courses`, `GET /api/courses`, `GET /api/courses/{course_id}` | `CourseCreateRequest{name, code?, term?}` → `CourseOut{id, name, code, term}` | course bootstrap; every other route is scoped under `course_id` |
| `POST /api/courses/{course_id}/resources/ingest` | multipart `origin: SourceOrigin`, `artifact_type: ArtifactType`, `file` → `ResourceIngestResponse{resource_id, status, concepts_created, concepts_merged, edges_created, assessment_items_created}` | `ingest_course_resource`: parse → chunk → `extract_resource_structured` (Anthropic) → canonicalize → `Concept`/`ConceptEdge`/`EdgeEvidence`/`ConceptResourceLink`/`Assessment`+`AssessmentItem` → `_clean_up_prerequisite_graph`. One file per call, no zip; needs Anthropic + Voyage keys unless `LLM_PROVIDER=fake`. |
| `POST …/students/{student_id}/resources/ingest` | same form → `StudentResourceIngestResponse{resource_id, status, evidence_events_created, concepts_touched[], personal_concepts_created}` | `ingest_student_resource`: emits `StudentEvidenceEvent`s, creates `scope=personal` concepts, then `recompute_student_state` |
| `GET /api/courses/{course_id}/ontology` | → `OntologyResponse{course_id, concepts: ConceptOut[], edges: ConceptEdgeOut[]}` | canonical graph; docstring: debug/admin, "the world … consumes `knowledge-graph` instead, never this directly" |
| `GET …/students/{student_id}/knowledge-graph` | → `PersonalGraphResponse{student_id, course_id, nodes: PersonalGraphNodeOut[], edges: PersonalGraphEdgeOut[], hidden_concept_count}` | **the world's primary input**; only concepts with evidence/familiarity/personal material plus their `PREREQUISITE_FOR` frontier neighbours (`build_personal_graph`) |
| `GET …/students/{student_id}/mastery` | → `MasteryResponse{concepts: MasteryEntryOut[]}` | raw state incl. `positive_evidence`, `negative_evidence`, `last_evidence_at`, `last_practiced_at` |
| `GET …/students/{student_id}/gaps?target_concept_id=\|assessment_id=` | exactly one → `GapsResponse{gaps: GapOut{concept_id, name, mastery, confidence, priority, action: GapAction(lowercase), reason}}` | `compute_target_gaps` |
| `POST …/students/{student_id}/study-plan` | `StudyPlanRequest{target_concept_id?\|assessment_id?}` → `StudyPlanResponse{gaps, study_order: UUID[]}` | same pipeline plus ordering |

Shapes we depend on:

- `PersonalGraphNodeOut{concept_id, name, scope: ConceptScope, discovery_state: DiscoveryState, importance, personal_relevance, mastery: float|None, familiarity, confidence, readiness, fragility}`; `PersonalGraphEdgeOut{source, target, edge_type, origin: "course"|"personal", confidence}`.
- `ConceptOut{id, canonical_name, short_definition, concept_kind: ConceptKind, granularity: Granularity, importance, scope}`. `ConceptKind.TOPIC_CLUSTER`, `Granularity.CLUSTER` and the `Concept.canonical_parent_concept_id` column exist, but `course_ingestion.py` never sets a parent and no route carries a cluster label.
- Evidence (`db/models.py`): `StudentEvidenceEvent{concept_id, resource_id?, assessment_item_id?, evidence_type, outcome?, strength, certainty, difficulty?, occurred_at, event_metadata{concept_relevance}}`. `EvidenceType` = `graded_exam, graded_quiz, graded_homework, diagnostic, verified_practice, worked_solution, self_explanation, student_notes, resource_view, self_rating`. Only `outcome != None` events move mastery (`scorer.accumulate_evidence`); all events move familiarity (`1 - exp(-Σ exposure)`).
- State (`StudentConceptState`): `mastery` is a Beta posterior with priors `mastery_alpha_prior = mastery_beta_prior = 1.5` (0.5 with no evidence); `mastery_confidence = 1 - exp(-0.5·(pos+neg))`; `readiness = 0.65·mastery + 0.35·prereq_support`; `fragility = mastery·(1 - prereq_support)`; `discovery_state` from `classify_discovery_state`: `active` if `pos+neg ≥ 2.0` or `familiarity ≥ 0.6`, `encountered` if `pos+neg ≥ 0.5` or `familiarity ≥ 0.15`, `frontier` if adjacent to known, else `unseen`.
- Assessments: `Assessment{title, assessment_type (= ArtifactType value), resource_id?, max_score?}` → `AssessmentItem{label "Q2b", prompt, max_score, difficulty}` → `AssessmentItemConcept{concept_id, relevance_weight}`. A `student_self` upload with `artifact_type ∈ {homework, quiz, exam}` creates these; items with a visible grade (`AssessmentItemOut.score_achieved`) emit `graded_*` events with `outcome = score/max`, ungraded items emit `self_explanation` with `outcome=None`. Handwritten images → `extract_handwritten_work` → `verified_practice` (correctness known) or `worked_solution`.
- Provenance: `Resource{title, origin, artifact_type, owner_user_id, status}`, `ResourceChunk{page_number, section_title}`, `ConceptResourceLink{concept_id, resource_id, chunk_id, link_type EXPLAINED_IN|APPEARS_IN|WORKED_EXAMPLE_IN, depth_score}`, `EdgeEvidence{page_number, snippet, evidence_kind}`. **No route exposes any of this**; there is no concept-detail endpoint.

## 2. Frontend surface (`frontend/`, Next 16.3.5 / React 19.2.8 / Tailwind v4 / `@xyflow/react`)

- `lib/types.ts`: `ConceptScope`, `DiscoveryState`, `ConceptState` (`frontier|exposed|uncertain|struggling|developing|strong|mastered|fragile|stale`, i.e. spec §56), `ConceptNode{id, name, scope, discovery_state, cluster?, importance, personal_relevance, mastery|null, familiarity, confidence, readiness, fragility, state}`, `ConceptEdge{source, target, type, origin, confidence}`, `KnowledgeGraphResponse{…, graph_version, hidden_concept_count}`, `GapAction` (uppercase `"STUDY"`), `Gap{concept_name…}`, `GapsResponse{target, gaps}`, `StudyStep`, `StudyPlan`, `SourceOrigin`, `ArtifactType` (+ frontend-only `course_bundle`), `Resource`, `EvidenceKind`, `EvidencePolarity`, `Evidence{id, label, detail, kind, polarity, source: Resource}`, `ConceptDetail{concept_id, evidence[], resources[]}`, `WhyExplanation`, `UploadStatus`, `UploadItem`, `IngestResponse`, `CourseResource`. File header: "The frontend NEVER computes any of these scores – it only renders them."
- `lib/api.ts`: `API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"`, `USE_MOCK = NEXT_PUBLIC_USE_MOCK_DATA !== "false"` (**mock is the default**), `COURSE_ID`/`STUDENT_ID`/`COURSE_NAME` baked at module load from `NEXT_PUBLIC_*`, `request<T>(path)` → `fetch(`${API_URL}${path}`)` throwing `ApiError`, `KnowledgeApi` interface, `normalizeGraph()`, `api = USE_MOCK ? mockApi : httpApi`.
- `lib/store.tsx`: `StudyGotchiProvider` (mounted in `app/layout.tsx`) exposes via `useStore()`: `graph: Async<KnowledgeGraphResponse>`, `reloadGraph`, `selectedId`/`select`, `focusNonce`/`focusConcept`, `filters: GraphFilters`, `target`, `uploads`/`addUploads`/`clearFinishedUploads`.
- `app/page.tsx` redirects to `/knowledge`; `app/knowledge/page.tsx` is `<AppShell/>`: `TopBar` + `Sidebar` + optional 368px panel + `<main className="relative min-w-0 flex-1"><KnowledgeGraph/><ConceptPanel/></main>`. `Sidebar.tsx` exports `type Section = "knowledge"|"files"|"gaps"|"study"` and `ITEMS` (lucide icons). A **World** entry = add `"world"` to `Section`, `{ id: "world", label: "World", icon: Globe }` to `ITEMS`, and in `AppShell` swap `<KnowledgeGraph/>` for the world canvas when `section === "world"`, keeping `<ConceptPanel/>` as the overlay inspector.
- `AGENTS.md` (`CLAUDE.md` just includes it): Next-generated block only: read `node_modules/next/dist/docs/` before writing Next code; commit the block. Implicit conventions: `@/` alias, `"use client"` files, `@theme` tokens (`bg-canvas`, `bg-surface`, `border-line`, `text-ink`, `text-ink-dim`, `text-brand`, `--state-*`), `sg-enter` animation class.

**Contract drift already present** (blocks `/knowledge` on real data, independent of the world): `normalizeNode` reads `raw.id` but the backend sends `concept_id` (ids collapse to `concept_${i}` and every edge is dropped as dangling); `normalizeEdge` reads `type` vs `edge_type`; `state`, `cluster`, `graph_version` are never sent; `getGaps` sends `?target=` (400), `createStudyPlan` posts `{target}` (422), `listResources` hits a non-existent `GET …/resources`, `getConceptDetail` hits a non-existent `…/concepts/{id}`, `ingest` posts `source_origin` instead of `origin` (422) and `course_bundle` is not in the backend `ArtifactType` enum.

## 3. Mapping: world model → engine data

| World (`prototypes/world-lab/src/lib/world.ts`) | Engine field(s) | Rule |
|---|---|---|
| `CourseWorld.course`, `seed` | `CourseOut.name/code`; seed = `${course_id}/${student_id}` | one island per (course, student) |
| Island footprint / fog | `PersonalGraphResponse.nodes` (rendered) + `hidden_concept_count` (unexplored coast ring) | never `/ontology`, per its docstring and spec §55 |
| `Cluster` (3–5, biome each) | **missing** → proposed `PersonalGraphNodeOut.cluster: str|None` (spec §55.1 and `ConceptNode.cluster?` already expect it) | biome = `BIOMES[i]` by sorted cluster id; fallback below |
| `Concept` spot present | node in `knowledge-graph` | `unseen` never rendered |
| state 0 untouched | `discovery_state == "frontier"` (`mastery === null`) | render nothing or a fog wisp/egg |
| state 1 touched (sprout) | `discovery_state ∈ {encountered, active}` and not state 2; i.e. `familiarity > 0` or `positive_evidence+negative_evidence > 0` | produced by `student_notes`, `resource_view`, `worked_solution`, `self_explanation` (ungraded pset items) or low-outcome graded items |
| state 2 demonstrated (landmark, terrain rises) | `MasteryEntryOut.mastery ≥ 0.60 && confidence ≥ 0.25` | outcome-bearing `graded_*`/`diagnostic`/`verified_practice` with net-positive outcome; height ∝ mastery, cracks ∝ `fragility` (wobble when > 0.25), spec §55.2 |
| creature per finished pset | one `Assessment` (`assessment_type ∈ homework|quiz|exam`) whose `AssessmentItem`s have ≥ 1 of this student's `StudentEvidenceEvent.assessment_item_id` | biome = cluster with max Σ `AssessmentItemConcept.relevance_weight`; mood from mean `outcome` (§56: <0.45 weak, 0.45–0.7 normal, ≥0.7 evolved). **Not reachable from any current route** |
| provenance card (`concept.source` "L03 p.4", evidence type) | `Resource.title/origin/artifact_type` + `ResourceChunk.page_number` (via `ConceptResourceLink.chunk_id`), `StudentEvidenceEvent.evidence_type/outcome/occurred_at`, `Assessment.title` + `AssessmentItem.label` | **not reachable**; today only `last_evidence_at`, `last_practiced_at`, `positive_evidence`, `negative_evidence` from `/mastery` |

Why 0.60 rather than the engine's `gap_mastered_threshold = 0.75` or §56 "strong ≥ 0.70": with Beta(1.5, 1.5) priors and recency decay the seed student lands at Linear Algebra 0.628 (conf 0.47), Kernel Regression 0.610 (conf 0.53, fragility 0.29), Kernel Functions 0.519, Mercer 0.486, PSD 0.433. Nothing reaches 0.70 with two graded events; 0.60 yields two landmarks (one cracked) and three sprouts, the story the seed was written to tell. The constant lives in `lib/world/thresholds.ts` and disappears once the backend emits `state`/`creature_state`.

**Clustering.** The ontology has no topic edges, no communities, no parent links populated. Proposal, in the backend (it must be course-level and stable across students; `networkx>=3.4` is already a dependency): `app/domain/graph/clustering.py` (pure, the spec's planned filename) runs `nx.community.louvain_communities(G, weight="w", seed=0)` on the undirected active course graph with `w = confidence × authority_weight` over all `ConceptEdgeType`s, merges communities beyond five into their most-connected neighbour, honours `canonical_parent_concept_id` when set, and labels each community with a `concept_kind == "topic_cluster"` member if present else the highest-`importance` member's `canonical_name` (optional LLM relabel through `provider.structured_generate`). Persist as `Concept.concept_metadata["cluster"]` (JSONB, no migration) from `_clean_up_prerequisite_graph`, surface as `cluster` on `PersonalGraphNodeOut` and `ConceptOut`. Frontend fallback until then: `clusterPersonalGraph(nodes, edges)` in `lib/world/cluster.ts` (label propagation over `origin == "course"` edges, capped at five, labelled by highest-importance member), acknowledged as unstable as the graph grows.

## 4. Proposed integration

Files (all new, nothing of theirs edited except the optional Sidebar/AppShell hook):

- `frontend/app/world/page.tsx` (server component) renders `<Suspense><WorldPage/></Suspense>`; `frontend/components/world/WorldPage.tsx` (`"use client"`) reads `?course=&student=` from `useSearchParams()` (the Suspense boundary is required for static prerender) with fallback to `COURSE_ID`/`STUDENT_ID`, fetches, and mounts `const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false })`. In Next 16 `ssr:false` is only legal inside a client component, hence the split. Read `node_modules/next/dist/docs/` first, per `AGENTS.md`.
- `frontend/components/world/WorldCanvas.tsx` = prototype `App.tsx` minus the seed/progress inputs: `<Canvas shadows dpr={[1,2]}>` + `IslandScene`, HUD restyled with `bg-surface/90 border-line text-ink`.
- `frontend/components/world/{Island,Blob,Props,toon,seed}.tsx|ts` move over **unchanged** from `prototypes/world-lab/src/{scenes/Island.tsx, components/Blob.tsx, components/Props.tsx, lib/toon.ts, lib/seed.ts}` apart from import paths and the `"use client"` pragma. `Planet.tsx` stays in the lab.
- `frontend/lib/world/types.ts`: prototype `world.ts` types with `Cluster` gaining `id: string`, `conceptIds: string[]`; `Concept` gaining `id: string` (the UUID), `state: 0|1|2` (precomputed, replacing `sproutAt`/`buildAt`), `mastery`, `familiarity`, `confidence`, `fragility`, `discoveryState`, `provenance: Provenance[]`; `CourseWorld` gaining `courseId`, `studentId`, `hiddenConceptCount`, `creatures: Creature[]` (replacing `psets: number`). `conceptState(c, progress)` becomes `c.state`.
- `frontend/lib/world/adapter.ts`:

```ts
export function buildWorldFromApi(input: {
  course: CourseOut;
  graph: PersonalGraphResponse;        // raw backend shape: concept_id, edge_type
  mastery: MasteryResponse;            // joined on concept_id for positive/negative_evidence
  detail?: Record<string, ConceptDetail>;   // provenance, once the endpoint exists
  assessments?: StudentAssessmentSummary[]; // creatures, once the endpoint exists
  options?: { demonstratedMastery?: number; minConfidence?: number; maxClusters?: number };
}): CourseWorld
```

Positions are per-entity deterministic (cluster centre from `makeRng(hashString(cluster.id))`, concept offset from `hashString(concept.id)`) so the island grows when nodes appear instead of reshuffling. The adapter reads raw DTO names and bypasses `normalizeGraph`. Clicking a spot calls `useStore().select(concept.id)`, so inside `AppShell` the existing `ConceptPanel` is the provenance card; the standalone `/world` route carries its own compact card.

Dependencies to add to `frontend/package.json` (peer ranges checked against the lab's installed packages: fiber 9.7.0 wants `react >=19 <19.3`, `three >=0.156`; drei 10.7.8 wants `@react-three/fiber ^9`, `react ^19`, `three >=0.159`; react 19.2.8 and three 0.186.0 satisfy all of them):

```json
"dependencies": { "three": "0.186.0", "@react-three/fiber": "9.7.0", "@react-three/drei": "10.7.8" },
"devDependencies": { "@types/three": "0.186.0" }
```

No `transpilePackages` needed with Turbopack; if `three/examples/jsm` resolution ever fails, add `transpilePackages: ["three"]` to `next.config.ts`.

## 5. Deployment and demo path

- Backend: `docker-compose.yml` starts only `db` (`pgvector/pgvector:pg16`, user/password/db `studygotchi`, port 5432, volume `studygotchi_pgdata`). API runs on the host: `uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --port 8000`. `.env.example`: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-sonnet-5`, `ANTHROPIC_VISION_MODEL`, `VOYAGE_API_KEY`, `VOYAGE_EMBED_MODEL=voyage-3`, `LLM_PROVIDER=anthropic|fake`, `ENVIRONMENT`. No Dockerfile for the API.
- Demo course: `uv run python -m scripts.seed_demo_course` creates **"Intermediate Machine Learning" (`CS-4780`, Fall 2026)** with five concepts on one `PREREQUISITE_FOR` chain (Linear Algebra → PSD Matrices → Mercer's Theorem → Kernel Functions → Kernel Regression), one student, nine events, no LLM; it prints `Seeded course {course_id}, student {student_id}` which become `NEXT_PUBLIC_COURSE_ID`/`NEXT_PUBLIC_STUDENT_ID`. It creates **no `Resource`, `Assessment` or `AssessmentItem` rows**, so the seed world has zero creatures and provenance cards can show only evidence type and date. The seven MIT zips in `course-materials/` (6.1210 is the lab's course) require the LLM path, one PDF per `ingest` call, keys, and hours; a 20-lecture subset of 6.1210 is a stretch goal, not tomorrow's baseline.
- Frontend env: `NEXT_PUBLIC_USE_MOCK_DATA=false`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_COURSE_ID`, `NEXT_PUBLIC_STUDENT_ID`, `NEXT_PUBLIC_COURSE_NAME`.
- Vercel hosts the Next app but not FastAPI + pgvector; the API needs Fly/Railway/Render or a laptop behind `cloudflared tunnel --url http://localhost:8000`. Browser → API calls are cross-origin and `main.py` has no `CORSMiddleware`: either the backend adds it (ask 6) or `next.config.ts` gains `rewrites()` proxying `/api/:path*` with `NEXT_PUBLIC_API_URL=""` (fine for GETs; long LLM ingests should hit the API directly).
- Read-only visit: `/world?course=<uuid>&student=<uuid>` already works because the API has no auth; the page hides upload affordances when the student differs from `STUDENT_ID`.

## 6. Asks for the backend team (smallest first)

1. **`cluster` on `PersonalGraphNodeOut` and `ConceptOut`** (S) via `app/domain/graph/clustering.py` as in §3: biomes need stable course-level regions; §55.1 already promises the field.
2. **Align `/knowledge-graph` with §55.1** (S): add `id`, `type`, `state` (§56 rules), `graph_version` alongside the current names. Without it the existing `/knowledge` page drops every edge on real data; the world would also stop computing thresholds client-side.
3. **`GET /api/courses/{course_id}/students/{student_id}/concepts/{concept_id}` → `ConceptDetail`** (M): `StudentEvidenceEvent` rows joined to `Resource.title/origin/artifact_type` and `Assessment.title`+`AssessmentItem.label`, plus `ConceptResourceLink`→`ResourceChunk.page_number`. Powers the provenance card and fixes `ConceptPanel`'s current 404.
4. **`GET …/students/{student_id}/assessments`** (S): `{assessment_id, title, assessment_type, item_count, items_with_evidence, mean_outcome, concept_ids[]}` from `Assessment`/`AssessmentItem`/`AssessmentItemConcept`/`StudentEvidenceEvent`. Creatures need it. (1+3+4 may ship as the single §55.2 `…/world` endpoint instead; same data, one round trip.)
5. **Richer seed** (S): add `Resource`, `Assessment`, `AssessmentItem`, `AssessmentItemConcept` rows and set `resource_id`/`assessment_item_id` on the events; add the §65 concepts (Inner Products, Kernel Trick, Bandwidth Selection) so two communities exist. Tomorrow's real-data world is only as rich as this script.
6. **`CORSMiddleware` in `main.py`** (XS) with `cors_origins` in `Settings`, default `http://localhost:3000` plus the Vercel URL.

## 7. Risks and conflicts with the earlier plan

- The Convex/Supabase discussion is moot: persistence is Postgres + pgvector behind SQLAlchemy/Alembic, owned by the backend. No realtime layer exists; the world refreshes on `reloadGraph()` after an ingest completes (the store already does this) or by polling. `/world-events` (§57) is unbuilt.
- Confirmed from the earlier plan: Next App Router on Vercel, client-only canvas under `components/world/`, React 19.2.x, three 0.186.0, fiber 9.7.0, drei 10.7.8. New constraint: fiber's peer range `react <19.3` means a React 19.3 bump breaks the world; keep the exact `19.2.8` pin.
- Their rule that the frontend never computes scores conflicts with any client-side 0/1/2 threshold. Treat the constants as rendering thresholds mirroring §56, isolate them, and retire them when ask 2 lands.
- The frontend currently runs entirely on mocks (`USE_MOCK` default true) and its HTTP adapter disagrees with the backend on nine fields/routes (§2). The world adapter bypasses `normalizeGraph` so it renders real data even if the graph page does not.
- Threshold fragility: the seed's landmarks sit at 0.61–0.63 mastery; any prior/half-life change demotes them. Prefer backend `state`.
- Scale: `useTerrain2D.heightAt` is O(vertices × landmarks); fine below ~200 landmarks, then bake a height texture. Security: a `student_id` in a URL is also write access; fine for the hackathon, not beyond.
