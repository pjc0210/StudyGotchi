# Infrastructure and build plan

19 September 2026, 8:30 PM. Submission Sunday 8 AM. Twelve working hours, four people.

This plan turns `docs/prd.md` into work. It fixes the stack, the hosting, the contracts between people, and the order. Tasks under "Backend" and "World" are Philote's. Tasks under "Web" and "Ops" are for the rest of the team and are written as contracts plus acceptance checks so they can start without waiting.

## Stack, fixed

| Layer | Choice | Why |
| --- | --- | --- |
| Website | Next.js 16.3.5 App Router in `frontend/`, React 19.2.8 (exact pin), Tailwind v4 | Already on main. Fiber 9 needs React below 19.3. |
| Website host | Vercel Hobby, one deploy owner | Preview URLs, env vars, zero ops. |
| Sign-in | Clerk (`@clerk/nextjs`), session JWT sent to the API as a bearer token | Prebuilt screens; the API verifies offline against the JWKS public key. |
| API | FastAPI in `backend/`, Python 3.12, uv, SQLAlchemy async, Alembic | Already on main with tests. |
| Database | Postgres 16 with pgvector on Neon | Managed, free tier, pgvector available, no server to babysit. |
| API host | Railway from `backend/Dockerfile`, one always-on instance | Long requests and background work need a process that stays up. Vercel functions cannot host this. |
| Extraction model | Anthropic through the existing provider. Two model ids: a strong one for course material, a fast one for student files | Course ontology needs quality once. Student files need speed every time. |
| Embeddings | Voyage `voyage-3`, 1024 dims, as already wired | Changing it means re-embedding everything. Not tonight. |
| World renderer | `three` 0.186.0, `@react-three/fiber` 9.7.0, `@react-three/drei` 10.7.8, client only | Verified peer ranges. |
| Types across the wire | `openapi-typescript` from the API's `/openapi.json` into `frontend/lib/api/schema.ts`, committed | One source of field names. Ends the current drift. |
| CI | GitHub Actions: `ruff` + `pytest` for the API, `tsc --noEmit` + `next build` for the site | Self-merge on green. |

Fallback if Railway or Neon fights us past 10 PM: run the API on Philote's Mac against the Docker Postgres and expose it with `cloudflared tunnel --url http://localhost:8000`. Same env vars, different URL.

## Ports between people

These are the only things one person needs from another. Everything else is internal to its owner.

1. The API's OpenAPI document. Any route change runs `npm run gen:api` in `frontend/` and commits `lib/api/schema.ts`. The web team codes against those types, not against memory.
2. `GET /api/me` returns the caller's `student_id` and their courses. The web app stops baking `NEXT_PUBLIC_STUDENT_ID` at build time.
3. `GET /api/courses/{course_id}/students/{student_id}/world` returns `WorldOut` (below). The canvas takes exactly this object.
4. `GET /api/courses/{course_id}/students/{student_id}/resources/{resource_id}` returns the file status. The upload queue polls it.
5. `frontend/lib/world/fixture.json` is a real `WorldOut` dumped from the seeded database. Mock mode serves it, so the world renders with the API off.
6. `WorldCanvas` props: `{ world: WorldOut; readOnly?: boolean; selectedId: string | null; onSelect: (conceptId: string | null) => void }`. Nothing else.
7. `useStore().select(conceptId)` opens the inspector. The island and the graph both call it.

## Environment variables

API (Railway):

```
DATABASE_URL=postgresql+asyncpg://...neon.tech/...?ssl=require
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=            # strong model for course ingest
ANTHROPIC_FAST_MODEL=       # fast model for student files
ANTHROPIC_VISION_MODEL=
VOYAGE_API_KEY=
VOYAGE_EMBED_MODEL=voyage-3
LLM_PROVIDER=anthropic
AUTH_MODE=clerk             # or "dev" to accept X-Student-Id (local only)
CLERK_ISSUER=https://<your-app>.clerk.accounts.dev
CLERK_AUTHORIZED_PARTIES=http://localhost:3000,https://<site>.vercel.app
CORS_ORIGINS=http://localhost:3000,https://<site>.vercel.app
INGEST_CONCURRENCY=6
ENVIRONMENT=production
```

Web (Vercel):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=https://<api>.up.railway.app
NEXT_PUBLIC_USE_MOCK_DATA=false
```

Never put `ANTHROPIC_API_KEY` or `VOYAGE_API_KEY` in the web project.

## Timeline

| Hours | Backend and world (Philote) | Web (two people) | Ops and content (one person) |
| --- | --- | --- | --- |
| 0 to 1 | Dockerfile, CORS, settings, deploy to Railway against Neon, run migrations, seed | Clerk provider, `proxy.ts`, sign-in pages, `gen:api` script | Neon project, Railway project, Vercel project, Clerk app, CI workflow, hand out env values |
| 1 to 3 | Auth dependency, `students` table, `/api/me`, fast ingest (phase A and B), resource status route, concurrency for course ingest | Typed API client replaces hand-parsing, bearer token on every call, upload queue polls status | Start course preload for 8.223 with `scripts/ingest_folder.py` as soon as ingest is deployed |
| 3 to 5 | Clustering, world projection, `/world`, tests, richer seed, fixture dump | `/world` route shell, sidebar entry, inspector wired to `select`, empty and error states | Preload the student's worked psets and exam on the demo account |
| 5 to 8 | Canvas lift from the lab, characters and reactions, share token and visit route | `/w/[token]` page, share button, visit chrome without upload | Two-account privacy check, timing log review |
| 8 to 10 | Bug fixes from rehearsal, timing tuning | Polish, loading states, copy | Rehearse the demo arc twice, record the backup video |
| 10 to 12 | Freeze. Only fixes that a rehearsal exposed | Freeze | Submission form, final deploy, screenshots |

Rule for the last two hours: no new routes, no schema changes, no dependency bumps.

## Repository layout after tonight

```
backend/
  Dockerfile
  app/
    auth/clerk.py                      # bearer verification
    api/dependencies.py                # get_db, get_provider, current_student, require_student
    api/routes/
      me.py                            # GET /api/me
      resources.py                     # ingest (course, student), GET status
      world.py                         # GET .../world
      shares.py                        # POST .../share, DELETE .../share, GET /api/w/{token}
    domain/graph/clustering.py         # places from the concept graph (pure)
    domain/world/projection.py         # WorldOut from states and assessments (pure)
    pipelines/
      student_ingestion.py             # match_student_resource (phase A), analyze_student_resource (phase B)
      ingest_jobs.py                   # run phase B after the response, own session, status updates
      world_query.py                   # DB reads -> projection
      batching.py                      # gather_bounded
    schemas/world.py                   # WorldOut, PlaceOut, SpotOut, CharacterOut, ResourceStatusOut
    db/migrations/versions/0002_students_and_shares.py
  scripts/
    seed_demo_course.py                # richer fixture
    ingest_folder.py                   # resumable batch preload
    dump_world_fixture.py              # writes frontend/lib/world/fixture.json
  tests/unit/
    test_clustering.py
    test_world_projection.py
    test_match_phase.py
frontend/
  proxy.ts                             # clerkMiddleware
  app/
    layout.tsx                         # ClerkProvider
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
    world/page.tsx
    w/[token]/page.tsx
  components/world/
    WorldPage.tsx                      # fetch + dynamic import of the canvas
    WorldCanvas.tsx                    # Canvas, camera, lights, HUD-free
    Island.tsx  Props.tsx  Blob.tsx  Character.tsx
  lib/
    api/schema.ts                      # generated
    api.ts                             # typed client, bearer token
    world/fixture.json
    toon.ts  seed.ts
.github/workflows/ci.yml
```

`prototypes/world-lab/` stays as the look test. Nothing imports from it.

---

# Backend tasks

## Task 1: Deployable API

Files: `backend/Dockerfile`, `backend/app/main.py`, `backend/app/config.py`, `backend/.env.example`.

Dockerfile:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
ENV PATH="/app/.venv/bin:$PATH"
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

`main.py` adds CORS from settings:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`Settings` gains `cors_origins: list[str]`, `anthropic_fast_model: str`, `auth_mode: str = "clerk"`, `clerk_issuer: str | None`, `clerk_authorized_parties: list[str]`, `ingest_concurrency: int = 6`. Pydantic settings parses comma-separated env into lists with a field validator.

Check: `curl https://<api>/health` returns `{"status":"ok"}` from Railway. `alembic upgrade head` ran against Neon (the `0001` migration creates the `vector` extension itself). Seed script runs from the Mac against Neon and prints ids.

## Task 2: Identity

Files: `backend/app/auth/clerk.py`, `backend/app/api/dependencies.py`, `backend/app/db/models.py`, `backend/app/db/migrations/versions/0002_students_and_shares.py`, `backend/app/api/routes/me.py`, `backend/pyproject.toml` (add `pyjwt[crypto]>=2.9`).

Model:

```python
class Student(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "students"
    clerk_user_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    display_name: Mapped[str | None] = mapped_column(Text, nullable=True)
```

Verification (offline, cached JWKS):

```python
# app/auth/clerk.py
import jwt
from jwt import PyJWKClient

class ClerkVerifier:
    def __init__(self, issuer: str, authorized_parties: list[str]) -> None:
        self._issuer = issuer
        self._parties = set(authorized_parties)
        self._jwks = PyJWKClient(f"{issuer}/.well-known/jwks.json", cache_keys=True)

    def verify(self, token: str) -> str:
        key = self._jwks.get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, key, algorithms=["RS256"], issuer=self._issuer, options={"require": ["exp", "sub"]})
        if claims.get("azp") not in self._parties:
            raise jwt.InvalidTokenError("azp not authorized")
        return claims["sub"]
```

Dependencies:

```python
async def current_student(request: Request, session: AsyncSession = Depends(get_db)) -> UUID:
    settings = get_settings()
    if settings.auth_mode == "dev":
        raw = request.headers.get("X-Student-Id")
        if raw is None:
            raise HTTPException(401, "X-Student-Id required in dev mode")
        return UUID(raw)
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    try:
        clerk_user_id = get_verifier().verify(auth.removeprefix("Bearer "))
    except jwt.PyJWTError as exc:
        raise HTTPException(401, "Invalid token") from exc
    return await get_or_create_student(session, clerk_user_id=clerk_user_id)

def require_student(student_id: UUID, caller: UUID = Depends(current_student)) -> UUID:
    if student_id != caller:
        raise HTTPException(403, "Not your world")
    return caller
```

Every route with `student_id` in its path adds `_: UUID = Depends(require_student)`. Course-level ingest adds `_: UUID = Depends(current_student)`.

`GET /api/me` returns `{ "student_id": UUID, "courses": [CourseOut] }` where courses are those with any resource or evidence owned by this student, falling back to all courses when the student has none yet (so a fresh account can pick the demo course).

Check: without a token, `GET .../knowledge-graph` is 401. With A's token on B's path, 403. `AUTH_MODE=dev` plus header works locally. Unit test for `ClerkVerifier` with a locally generated RSA key pair and a fake JWKS, covering good token, wrong issuer, wrong `azp`, expired.

## Task 3: Fast student ingest

Files: `backend/app/pipelines/student_ingestion.py`, `backend/app/pipelines/ingest_jobs.py`, `backend/app/pipelines/batching.py`, `backend/app/api/routes/resources.py`, `backend/app/schemas/api.py`, `backend/app/schemas/extraction.py`, `backend/app/providers/llm/base.py`, `backend/app/providers/llm/anthropic_provider.py`, `backend/app/repositories/resources.py`.

Where the time goes today, per file: one strong-model call per chunk in sequence with `max_tokens=4096`; one embedding call per candidate concept; alias index, concept embeddings and personal concepts re-read from Postgres inside the chunk loop. A ten-page pset is several minutes.

The shape after:

Phase A, on the request, target under two seconds:

1. Hash. If `(course_id, owner_user_id, content_hash)` exists, return it with status unchanged. Add `owner_user_id` to `get_resource_by_hash` as an optional filter.
2. Parse, chunk, one embedding call for all chunks, save chunks. Status `matched` once the next step lands.
3. Match: load course concept embeddings once. For each chunk, cosine against every concept; keep matches with similarity at or above `settings.match_threshold` (start at 0.80, tune against the seed and one real pset), at most three per chunk. Emit one exposure event per matched concept (`student_notes` or `worked_solution` by artifact type, no outcome, certainty 0.6, relevance 1/k). Recompute state.
4. Return `StudentResourceIngestResponse` with `status="matched"`, `concepts_touched`, and `analysis="queued"`.

Phase B, after the response, target under forty seconds:

5. `ingest_jobs.run_analysis(resource_id)` opens its own session from `async_session_factory`, sets status `analyzing`, and calls `analyze_student_resource`.
6. Analysis loads alias index, concept embeddings and personal concepts once. Chunks run through `gather_bounded(extract(chunk) for chunk in chunks, limit=settings.ingest_concurrency)`. Extraction uses the fast model, a student-mode schema (`StudentChunkExtractionOut`: concept names, assessment items with labels, scores and concept links; no relationships, no resource links), and `max_tokens=1500`.
7. All candidate names from all chunks embed in one call. Resolution is the existing merge or create-personal logic, unchanged.
8. Assessment items and graded events are written exactly as today. Recompute state. Status `processed`. On any exception: status `failed`, `resource_metadata["error"]` set, phase A results untouched.

Batching helper:

```python
async def gather_bounded(coros: Iterable[Awaitable[T]], *, limit: int) -> list[T]:
    sem = asyncio.Semaphore(limit)
    async def run(c: Awaitable[T]) -> T:
        async with sem:
            return await c
    return await asyncio.gather(*(run(c) for c in coros))
```

Provider changes: `structured_generate` takes `model: str | None = None` and `max_tokens: int = 4096`; the Anthropic client is built with `max_retries=4` so 429s back off instead of failing the file.

Route changes: `POST .../students/{student_id}/resources/ingest` runs phase A, commits, schedules phase B with `BackgroundTasks`, and returns 202. `GET .../students/{student_id}/resources/{resource_id}` returns `ResourceStatusOut { resource_id, title, artifact_type, status, error, evidence_events, updated_at }`. `GET .../students/{student_id}/resources` lists the student's files (the web app already calls a list route that does not exist).

Course ingest gets the same treatment where it is free: hoist the per-chunk lookups, one embedding call per chunk for all candidates, `gather_bounded` over chunks for extraction only (the write phase stays sequential to keep the in-call name map correct). Strong model stays. This is what makes preloading a course fit in twenty minutes instead of two hours.

Timing: log `phase_a_ms` and `phase_b_ms` per resource into `resource_metadata` and one structured log line each. The PRD acceptance check reads them.

Tests: `test_match_phase.py` uses the fake provider with a fixed embedding function to check that a chunk near a known concept produces one exposure event and nothing else, that a second upload of the same bytes creates zero events, and that phase A never writes graded events. Existing tests stay green.

## Task 4: Places

Files: `backend/app/domain/graph/clustering.py`, `backend/app/pipelines/course_ingestion.py`, `backend/tests/unit/test_clustering.py`.

```python
@dataclass(frozen=True)
class Place:
    id: str            # stable: "p" + first 8 hex of sha1 of sorted member names
    label: str
    concept_ids: tuple[UUID, ...]

def compute_places(concepts: dict[UUID, ConceptNode], edges: list[ConceptEdge], *, max_places: int = 5) -> list[Place]:
```

Louvain communities (`networkx.community.louvain_communities`, `seed=0`) on the undirected active graph weighted by `confidence * authority_weight`. Communities beyond `max_places` merge into the neighbour they share the most weight with. Label is a `topic_cluster` member's name if one exists, else the highest-importance member. Concepts with no edges attach to the place whose members are nearest by embedding cosine; if there are no edges at all, one place named after the course.

`_clean_up_prerequisite_graph` calls `compute_places` at the end of course ingest and writes `place_id` and `place_label` into each concept's `concept_metadata`. Personal concepts inherit the place of their nearest course concept at creation time.

Test: a graph with two obvious communities yields two places with the expected labels; ids are identical across two runs; a singleton attaches to the nearer community.

## Task 5: World projection and endpoint

Files: `backend/app/domain/world/projection.py`, `backend/app/pipelines/world_query.py`, `backend/app/schemas/world.py`, `backend/app/api/routes/world.py`, `backend/tests/unit/test_world_projection.py`.

Schema:

```python
class PlaceOut(BaseModel):
    id: str
    label: str
    biome: str                          # one of forest, meadow, ice, city, sand, assigned by place index
    concept_ids: list[UUID]

class SpotOut(BaseModel):
    concept_id: UUID
    place_id: str
    name: str
    state: int                          # 0 empty, 1 sprout, 2 landmark
    height: float                       # 0..1, mastery when state 2 else 0
    cracked: bool
    discovery_state: str
    citation: str | None                # "Lecture 12, p. 3" from the strongest resource link

class CharacterOut(BaseModel):
    id: str                             # f"{assessment_id}:{place_id}" for residents, resource id for wisps
    kind: str                           # resident, wisp
    place_id: str
    label: str
    state: str                          # idle, evolved, exploded, recovered, faded (wisps are always idle)
    mean_outcome: float | None
    concept_ids: list[UUID]
    occurred_at: datetime

class WorldOut(BaseModel):
    course_id: UUID
    student_id: UUID
    version: str
    seed: str
    hidden_concept_count: int
    places: list[PlaceOut]
    spots: list[SpotOut]
    characters: list[CharacterOut]
```

Rules in `projection.py`, pure functions over dataclasses so they unit test without a database:

- Spot state: 2 when `mastery >= 0.60 and confidence >= 0.25`; 1 when discovery is `encountered` or `active`; else 0. `cracked = fragility > 0.25`.
- Resident per (assessment, place) pair where the place holds at least 30 percent of the assessment's summed item relevance and the student has at least one evidence event on those items. `mean_outcome` is the mean of outcome-bearing events on the items in that place, or null. State: `evolved` at 0.70 and above, `exploded` below 0.45, `recovered` when it would be exploded but a later graded event on the same place has outcome at or above 0.60, `faded` when exploded and the place has had no evidence for 14 days, `idle` otherwise or with no outcome.
- Wisp per student resource of artifact type `student_notes` (or `worked_solution` with no assessment) on the place its exposure events point to most. Always `idle`.
- `version` is the max `updated_at` across the student's concept states and evidence events, ISO format.
- Thresholds are module constants in `projection.py` with the same names as `build_spec.md`.

`world_query.py` loads concept states, personal graph nodes, assessments with items and links, and evidence, then calls the projection. The endpoint is `GET /api/courses/{course_id}/students/{student_id}/world` with `require_student`.

Tests: no evidence gives all spots state 0 and no characters; one strong graded homework gives one evolved character on the expected place; a weak exam after it gives an exploded character; a later good homework on the same place turns the exam's character recovered; version changes when an event is added.

## Task 6: Richer seed and fixture

Files: `backend/scripts/seed_demo_course.py`, `backend/scripts/dump_world_fixture.py`, `frontend/lib/world/fixture.json`.

The seed adds three concepts (Inner Products, Kernel Trick, Bandwidth Selection) so two communities exist, one `Resource` per lecture with `ConceptResourceLink` rows carrying page numbers, one homework `Assessment` with three items linked to concepts and graded events on them, and one exam with a weak item. `dump_world_fixture.py` calls `world_query` and writes the JSON. The web team gets the fixture the moment Task 5 lands, before the deployed API has real data.

## Task 7: Share tokens and visits

Files: `backend/app/db/models.py`, migration `0002`, `backend/app/api/routes/shares.py`, `backend/app/domain/world/projection.py`.

```python
class WorldShare(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "world_shares"
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)   # secrets.token_urlsafe(16)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

`POST /api/courses/{course_id}/students/{student_id}/share` (owner) returns `{token}`, reusing an unrevoked one. `DELETE` revokes. `GET /api/w/{token}` is public and returns `public_view(world)`: spot `height` rounded to one decimal, `citation` kept, `mean_outcome` set to null, character `label` replaced by `f"{assessment_type.title()} {n}"` in date order, `student_id` replaced by a zero UUID.

Check: the visit payload string-searched for the demo file names, "score", and any mastery value returns nothing.

## Task 7b: Taking notes from a visit (only after Tasks 1 to 11 and 14 are live)

Files: `backend/app/api/routes/shares.py`, `backend/app/repositories/resources.py`, `backend/app/pipelines/student_ingestion.py`, `backend/app/db/models.py` (a `shareable` boolean on `resources`, default false).

- `PATCH .../students/{student_id}/resources/{resource_id}` with `{ "shareable": true }`, owner only, rejected for artifact types other than `student_notes`.
- The visit projection marks wisps whose resource is shareable with `shareable: true` and a `page_count`.
- `POST /api/w/{token}/notes/{resource_id}/take` requires a bearer token (the visitor). It copies the resource and its chunks into the visitor's account with `origin="classmate"`, `artifact_type="classmate_notes"`, `metadata.taken_from=token`, then runs phase A matching against the course concepts and writes `resource_view` evidence at certainty 0.5. Same content hash for the visitor is a no-op.
- Web: on `/w/[token]`, a shareable wisp's card shows "Take notes" for signed-in visitors. The Files tab labels the copy "from a visit".

Check: two accounts. A shares notes, B takes them from A's link; B's Files gains one classmate entry, B's familiarity rises on the matched concepts, B's mastery is unchanged, and taking again creates nothing.

## Task 8: Preload script

File: `backend/scripts/ingest_folder.py`.

`uv run python -m scripts.ingest_folder --course <id> --origin official --artifact-type lecture_notes ./unzipped/8.223/lectures` walks a folder, skips files whose hash already exists, posts each file to the deployed API with `X-Student-Id` (dev mode) or a bearer token, runs three files at a time, and prints a table of statuses and timings. Student files use `--student <id>` and the student route. The ops teammate runs this in the first hour for lecture notes and again for the demo student's worked psets.

---

# World tasks

## Task 9: Canvas lift

Files: `frontend/components/world/{WorldPage,WorldCanvas,Island,Props,Blob,Character}.tsx`, `frontend/lib/{toon,seed}.ts`, `frontend/app/world/page.tsx`, `frontend/package.json`.

Dependencies: `three@0.186.0`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8`, dev `@types/three@0.186.0`. Exact pins.

`app/world/page.tsx` is a server component that renders `<Suspense><WorldPage /></Suspense>`. `WorldPage` is a client component that reads `useStore()` for the student and course, fetches `/world`, and mounts `const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false })`. In Next 16 `ssr: false` is only legal inside a client component; read `node_modules/next/dist/docs/` before touching the App Router files.

`Island.tsx`, `Props.tsx`, `Blob.tsx`, `toon.ts`, `seed.ts` come from `prototypes/world-lab/src/` with import paths changed and `"use client"` added. Layout replaces the lab's course table: place centres from `makeRng(hashString(place.id))`, spot offsets from `hashString(concept_id)`, so new spots append without moving old ones. Spot state comes from `spot.state`, height from `spot.height`, cracks from `spot.cracked`. Nothing in the canvas computes from mastery.

Canvas settings: `dpr={[1, 1.5]}`, `PerformanceMonitor` dropping to 1 on decline, no shadow maps, `ContactShadows frames={1}` under characters, `frameloop="always"` paused with `document.hidden`. Camera is the lab's clamped orbit with snap-to-place.

Check: `/world` renders the fixture in mock mode at 60 frames per second on the dev laptop; clicking a spot calls `select(concept_id)` and the existing `ConceptPanel` opens.

## Task 10: Characters

Files: `frontend/components/world/Character.tsx`, `frontend/components/world/GlbCreature.tsx` (lifted from the lab), `frontend/public/assets/creatures/tripo-cleaned/textured/*.glb` (active roster only, about 15 files, 4.5 MB).

Residents use the animated GLB roster from `assets/creatures/tripo-cleaned/textured/` through the lab's `GlbCreature` (idle, walk, happy, sad, sleep clips; textured toon material that keeps the face atlas). The active roster and biome assignment live in the lab's `data/tripo-assets.ts` and move over unchanged. Wisps use the primitive blob at half size. The blob also remains the fallback when a GLB fails to load.

State to clip: `idle` plays idle (sleep for sleepy personalities after six seconds still); `evolved` plays idle at 1.15 scale with a brighter tint; `exploded` plays `sad` and the body tips onto its side with a small puff, then lies still; `recovered` plays `happy` once on the transition and returns to idle; `faded` is the exploded pose at 0.6 scale and 0.6 opacity. Appear is the lab's pop-in. Every transition is the existing 0.15 s crossfade.

The blob-only description below is the fallback path when a resident has no GLB:

- Appear (first render of an id not seen before): scale 0 to 1 with overshoot over 600 ms, dust ring of eight instanced discs.
- `idle`: bob and slow look-around from the lab.
- `evolved`: 15 percent larger, brighter tint, a hat accessory.
- `exploded`: on transition, body splits into six instanced chunks that arc outward and settle; a small puff; the chunks stay as a heap with two eyes on top. Comic, not violent.
- `recovered`: chunks fly back and the blob reassembles with the appear overshoot.

Sound: three one-shot samples (appear, pop, reassemble) through one `AudioContext` unlocked on first click. Optional; drop first if time is short.

Check: toggling the fixture's character states in a story page under `/world?fixture=states` plays each transition once.

## Task 11: Visit page

Files: `frontend/app/w/[token]/page.tsx`, `frontend/components/world/WorldPage.tsx`.

`WorldPage` accepts `{ source: { kind: "own" } | { kind: "visit"; token: string } }`. Visit mode fetches `/api/w/{token}` without a bearer token, passes `readOnly`, hides upload and share controls, and the inspector shows the citation string only. Sign-in is not required on this route.

---

# Web tasks (contracts)

## Task 12: Clerk in the site

`ClerkProvider` in `app/layout.tsx`. `proxy.ts` exporting `clerkMiddleware()` with a matcher that skips `/w/(.*)`, static files and `_next`. `/world` and `/knowledge` call `auth.protect()`. Sign-in and sign-up pages use the prebuilt components. Read the Clerk Next.js quickstart for the exact matcher; the docs call the file `proxy.ts` for this Next version.

Check: signed-out visit to `/world` redirects to sign-in; `/w/anything` loads without sign-in.

## Task 13: Typed API client

Add `"gen:api": "openapi-typescript $NEXT_PUBLIC_API_URL/openapi.json -o lib/api/schema.ts"` to `frontend/package.json` and commit the output. Rewrite `lib/api.ts` so `httpApi` builds URLs from the schema's paths, reads response types from the schema, and drops the hand-written `normalizeNode` and `normalizeEdge`. Every request attaches `Authorization: Bearer ${await getToken()}` from `useAuth()`; expose a `useApi()` hook that closes over the token getter. Replace `NEXT_PUBLIC_STUDENT_ID` with `/api/me`.

Known mismatches this fixes: `id` vs `concept_id`, `type` vs `edge_type`, `?target=` vs `?target_concept_id=`, `{target}` vs `{target_concept_id}`, `source_origin` vs `origin`, and the missing resources list and concept detail routes (the second one stays a stub returning mastery fields until the backend adds it).

Check: `/knowledge` renders the seeded course from the deployed API with edges present.

## Task 14: Upload queue with status

`UploadQueue` posts to the student ingest route, receives 202 with `status: "matched"`, calls `reloadGraph()` immediately, then polls `GET .../resources/{id}` every 1500 ms until `processed` or `failed`, and calls `reloadGraph()` again. The file row shows matched, analyzing, processed, failed with the error text on hover. The world page listens to the same store signal and refetches `/world` when `version` changes.

Check: dropping the demo pset shows two visible updates on the island, seconds apart.

## Task 15: World in the shell

Add `"world"` to `Section` and a Globe entry to `Sidebar.ITEMS`. `AppShell` renders `WorldPage` instead of `KnowledgeGraph` when the section is world, keeping `ConceptPanel` as the overlay. A share button in the top bar calls `POST .../share` and copies `${origin}/w/${token}`.

---

# Ops tasks

## Task 16: Accounts and projects

Neon project with a database named `studygotchi`; copy the pooled connection string with `sslmode=require` and rewrite it as `postgresql+asyncpg://...?ssl=require`. Railway project from the GitHub repo with root `backend/`, all API env vars set, one instance. Vercel project with root `frontend/`, env vars set, production branch `main`. Clerk application with the Vercel domain and `http://localhost:3000` as allowed origins; copy the issuer URL from the JWT template page and the publishable and secret keys.

## Task 17: CI

`.github/workflows/ci.yml` with two jobs on pull requests and pushes to `main`: `backend` runs `uv sync --frozen` then `uv run ruff check .` and `uv run pytest -q`; `frontend` runs `npm ci`, `npx tsc --noEmit`, `npm run build` with `NEXT_PUBLIC_USE_MOCK_DATA=true`. Branch protection on `main`: require the two checks, block force pushes, no required reviewers. Anyone touching `app/auth`, `app/api/routes/world.py` or `shares.py` asks for one pair of eyes in the PR description.

## Task 18: Demo content

Unzip `course-materials/8.223.zip` locally (never into the site). Preload lecture notes as `official` and `lecture_notes`, the official pset PDFs as `official` and `homework`, solutions as `solution_key`. Then preload the demo student's worked psets 1 to 3 as `student_self` and `homework`, and the midterm with visible scores as `exam`. Keep pset 4 and the final aside as the two live files for the demo arc. Record fast and deep phase timings from the status route into a note for the pitch.

---

# Review and merge

- Branch per task, named `be/fast-ingest`, `world/characters`, `web/typed-client` and so on.
- Pull request into `main` with a two-line description and a checklist item for the task's check above.
- Merge when CI is green and the check passed. Squash.
- After 6 AM only Philote merges, and only fixes.

# What is deliberately not here

No job queue or worker service: one always-on API process with background tasks is enough for one demo account. No realtime channel: two refetches per upload are enough. No SSR of the canvas. No prompt caching. No second embedding model. No unique art per character. Each of these is a Sunday afternoon idea, not a Saturday night one.
