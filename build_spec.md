# StudyGotchi build spec

19 September 2026. This is the product spec for the hosted site. The knowledge engine internals live in `backend/graph_engine/backend_build_spec.md`. If the two disagree on scoring, the backend spec wins. If they disagree on what the player sees, this file wins.

StudyGotchi is a hosted website. A student signs in, keeps a personal world, and can later share a limited view of that world. The world is the student's knowledge, not a copy of the syllabus. Places on the world are topics. Small characters live on those places. Each character is a lasting record of a moment when the student's own work lined up with something already ingested from the course.

The playful world and the knowledge graph read the same records. Do not compute a second mastery number in the browser.

## What we ship tonight

A judge can open a URL, sign in, and do all of the following on one demo account:

1. See a living world for one course (seed 6.1210 is enough).
2. See the same course as a graph, with the same places and the same evidence.
3. Upload or replay a student file and watch a place grow and a character appear or change.
4. Open a character or landmark and see a citation (lecture or page, plus what kind of evidence it was).
5. Open a visit link for that world that does not expose files, grades, or storage URLs.
6. Stay signed in after refresh.

Visits are read only and not live. Note trading is out of scope. Do not treat a submitted problem set as proof of a single weak concept. Do not treat an overall grade as mastery of every topic on the exam. Instructor solutions must not be used as if they were the student's work.

`course-materials/` stays off the public site. Keep answer keys out of the retrieval path that drives the world.

## Fiction

A world is one student's knowledge for one course. Tonight that is one world per signed-in user on the demo course.

A place is a topic region (a patch, hut, or biome). The layout is stable for a given course and student so the island does not reshuffle when a new concept appears.

A character is a convergence update. When student evidence matches an ingested course topic, a character appears on that place and stays there. Later evidence can evolve it or knock it over. Clicking it later still opens that update. Characters are not "one creature per concept forever" and they are not a single companion that follows the player around.

Growth on the ground follows the knowledge engine:

- Frontier or unseen: fog or empty dirt.
- Encountered: a sprout on that concept's spot.
- Demonstrated (mastery at least 0.60 and confidence at least 0.25): a landmark, and the ground rises.
- Convergence (a finished homework, quiz, or exam that maps onto the place): a resident character.

The look of the island and the blobs can change without changing this table. Swap the renderer, keep the records.

## Stack

| Job | Choice |
| --- | --- |
| Website | Next.js App Router in `frontend/` (already on main: Next 16.3.5, React 19.2.8, Tailwind v4) |
| Host | Vercel. One teammate owns the Hobby deploy. |
| Sign-in | Clerk on the website. The API must stop treating a raw `student_id` in the path as identity. |
| Knowledge and world state | The existing FastAPI service in `backend/` (Postgres, the personal graph, mastery, ingest). |
| World canvas | React Three Fiber, loaded only in the browser. Pin `@react-three/fiber` 9.7, `@react-three/drei` 10.7, `three` 0.186. Do not hydrate the canvas on the server. |
| Graph UI | The existing `@xyflow/react` view under `/knowledge`. |

Uploads go to the backend ingest routes. Do not send large PDFs through a Vercel serverless body (Hobby limit is 4.5 MB).

The Vite sketch in `prototypes/world-lab/` is a look test. Copy the pieces we keep into `frontend/`. Do not deploy the lab.

## How data moves

1. Clerk identifies the user. The backend stores a user row (or maps Clerk id onto today's `student_id`) and never trusts the client to pick another student's id.
2. Course ingest writes resources, chunks, concepts, and edges. Hash a file once. Skip unchanged files.
3. Student ingest writes evidence events and recomputes personal graph and mastery.
4. `GET /api/courses/{course_id}/students/{student_id}/knowledge-graph` is what the world and the graph both consume. Do not point the world at `/ontology`.
5. `GET .../mastery` supplies the numbers for height, cracks, and sprouts.
6. Provenance (file title, page, evidence type) needs a concept-detail route. Until that exists, the inspector can show mastery fields only, and we treat a full citation card as a required follow-up the same night if time allows.
7. Characters need a summary of the student's assessments mapped onto clusters. Until that route exists, derive residents in an adapter from evidence events that already sit in the database, or add a small read endpoint. Do not invent residents in React.

Idempotence: one evidence event produces at most one world change. Re-ingesting the same file must not hatch a second character.

## Privacy and visits

Worlds start private.

A visit link is an unlisted token. It returns places, characters, public concept labels, and discovery state. It does not return PDFs, chunk text, storage URLs, scores, or the owner's account email.

Test with two Clerk users before calling this done. Owner A visits B's token and cannot hit B's ingest or mastery write routes.

## Website routes

| Path | Who | What |
| --- | --- | --- |
| `/` | anyone | Sign-in or jump to the signed-in world |
| `/sign-in`, `/sign-up` | Clerk | Hosted screens |
| `/world` | owner | Living world. Query `course` if we have more than one later. |
| `/knowledge` | owner | Graph, files, gaps, study plan (already built) |
| `/w/[token]` | anyone with the token | Read-only world. Same canvas, no upload, no Clerk requirement |

The sidebar already has Knowledge, Files, Gaps, and Study. Add World and switch the main pane. Keep `ConceptPanel` as the inspector so a click on the island and a click on the graph open the same side sheet.

`/world` is a server page that renders a client child. The canvas is `dynamic(() => import(...), { ssr: false })` from that client child. In Next 16, `ssr: false` is only legal there.

## Repository layout

Keep the two apps. Do not start a third Next root.

```
frontend/
  app/
    page.tsx
    knowledge/page.tsx
    world/page.tsx              # add
    w/[token]/page.tsx          # add
    sign-in/[[...sign-in]]/     # add with Clerk
  components/
    layout/                     # AppShell, Sidebar, TopBar
    graph/                      # existing xyflow view
    concepts/                   # inspector
    world/                      # add: WorldPage, WorldCanvas, Island, Blob, Props
    upload/ files/ gaps/ study/
  lib/
    api.ts
    types.ts
    store.tsx
    world/                      # add: types, adapter, thresholds, cluster fallback
backend/
  app/api/routes/               # courses, resources, personal_graph, mastery, study
  app/domain/                   # graph, mastery, personal_graph, gaps
  app/pipelines/                # course and student ingest
  graph_engine/backend_build_spec.md
prototypes/world-lab/           # local look test only
course-materials/               # owner files; not a public route
build_spec.md                   # this file
```

Lift from the lab, do not rewrite: `Island.tsx`, `Blob.tsx`, `Props.tsx`, `toon.ts`, `seed.ts` (seed stays for layout noise only). Leave `Planet.tsx` in the lab. The adapter `frontend/lib/world/adapter.ts` turns the personal graph plus mastery into the lab's `CourseWorld` shape: clusters, concept spots with state 0/1/2, and a `creatures` list. Positions come from hashes of stable ids so new nodes append instead of reshuffling.

Suggested types in `frontend/lib/world/types.ts`:

```ts
export type PlaceId = string
export type CharacterId = string

export type CharacterState = "idle" | "evolved" | "exploded" | "recovered"

export type Creature = {
  id: CharacterId
  placeId: PlaceId
  evidenceId: string
  conceptIds: string[]
  state: CharacterState
  appearance: { hue: number; body: "blob" }
}

export type CourseWorld = {
  courseId: string
  studentId: string
  seed: string
  hiddenConceptCount: number
  clusters: Array<{
    id: PlaceId
    label: string
    biome: string
    conceptIds: string[]
  }>
  concepts: Array<{
    id: string
    placeId: PlaceId
    name: string
    state: 0 | 1 | 2
    mastery: number | null
    familiarity: number
    confidence: number
    fragility: number
    discoveryState: string
  }>
  creatures: Creature[]
}
```

`frontend/lib/world/thresholds.ts` holds `demonstratedMastery = 0.60` and `minConfidence = 0.25` until the backend emits a ready `state` field.

## Failures

Ingest: show status on the file row (queued, running, failed, done). A failed file does not wipe the world. Retry is the same hash.

Missing WebGL: the canvas fallback is a short message and a link to `/knowledge`. The graph still works.

Clerk down: the site does not fall open. Visit links still work.

Backend down: empty states already used by `/knowledge`, not a fake full island.

## Checks

- Backend unit tests already under `backend/tests/unit/` for mastery, merge, personal graph, gaps. Keep them green.
- Adapter tests in `frontend` (or a small node test) for: empty graph, frontier-only, one demonstrated landmark, one assessment that creates a single creature, re-ingest does not duplicate that creature.
- Two-account visit test, manual is fine tonight: owner link vs visitor link.
- Canvas: load `/world` in a browser, orbit, click a landmark, confirm the inspector matches `/knowledge` for the same concept.

## Work split

- Backend: Clerk-aware auth on writes, visit projection, concept-detail and assessment-summary reads, cluster label on personal graph nodes.
- World: adapter, canvas, sidebar entry, visit page.
- Site: Clerk, Vercel env, one deploy owner.
- Graph and ingest: already on main; fix the known request/response name mismatches in `frontend/lib/api.ts` (the client still reads `id` where the API sends `concept_id`, and a few query params do not match). Until those are fixed, `/knowledge` on live data drops edges.

Art direction (island vs planet, blob palette, landmarks) is still open. The island in the lab is the default renderer because a sphere hides half the course. Do not block ingest or auth on a final look.
