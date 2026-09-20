# Architecture

Diagrams for the system described in `build_spec.md`, `docs/prd.md` and `docs/plans/infra-and-build-plan.md`. Each diagram answers one question. Names match the code.

## What talks to what

```mermaid
flowchart LR
  subgraph browser["Browser"]
    site["Next.js site\n/world /knowledge /w/[token]"]
    canvas["WorldCanvas\nthree + fiber, client only"]
    site --> canvas
  end

  subgraph vercel["Vercel"]
    next["Next.js server\nstatic pages, Clerk proxy"]
  end

  subgraph clerk["Clerk"]
    clerkfe["Sign-in, session JWT"]
    jwks["JWKS public keys"]
  end

  subgraph railway["Railway"]
    api["FastAPI\napp.main"]
    bg["Background analysis\nsame process"]
    api --> bg
  end

  subgraph neon["Neon"]
    pg[("Postgres 16 + pgvector")]
  end

  subgraph vendors["Model vendors"]
    anth["Anthropic\nstrong model: course files\nfast model: student files"]
    voy["Voyage\nvoyage-3 embeddings"]
  end

  preload["scripts/ingest_folder.py\nrun from a laptop"]

  browser -- "HTML, JS" --> next
  browser -- "sign in" --> clerkfe
  browser -- "JSON + Bearer JWT\nPDF uploads go here, not to Vercel" --> api
  api -- "verify JWT offline" --> jwks
  api --> pg
  bg --> pg
  api --> anth
  api --> voy
  bg --> anth
  bg --> voy
  preload -- "POST ingest" --> api
```

Two hosts, one database, two vendors. The site never holds a model key. The API never renders.

## Who owns which code

```mermaid
flowchart TB
  subgraph web["frontend/  (web team)"]
    pages["app/*  routes"]
    shell["components/layout  AppShell, Sidebar, TopBar"]
    graph["components/graph  xyflow view"]
    inspector["components/concepts  ConceptPanel"]
    upload["components/upload  queue + status polling"]
    client["lib/api.ts  typed client, bearer token"]
    schema["lib/api/schema.ts  generated from /openapi.json"]
    store["lib/store.tsx  select(), reloadGraph()"]
    pages --> shell --> graph & inspector & upload
    graph & upload --> client --> schema
    shell --> store
  end

  subgraph world["frontend/components/world  (Philote)"]
    wpage["WorldPage  fetch + dynamic import"]
    wcanvas["WorldCanvas  props: world, readOnly, selectedId, onSelect"]
    island["Island, Props, Blob, Character"]
    wpage --> wcanvas --> island
    wpage --> client
    wcanvas -- "onSelect" --> store
  end

  subgraph api["backend/app  (Philote)"]
    routes["api/routes  me, resources, world, shares, knowledge-graph, mastery, study"]
    deps["api/dependencies  get_db, current_student, require_student"]
    auth["auth/clerk.py"]
    pipes["pipelines  student_ingestion, ingest_jobs, world_query, course_ingestion"]
    domain["domain  mastery, graph, personal_graph, world/projection  (pure, tested)"]
    repos["repositories  SQLAlchemy reads and writes"]
    providers["providers/llm  anthropic + voyage, fake"]
    routes --> deps --> auth
    routes --> pipes --> domain
    pipes --> repos
    pipes --> providers
  end

  client -- "HTTPS JSON" --> routes
```

The three arrows that cross a boundary are the ports: the generated schema, the store's `select` and `reloadGraph`, and the `WorldCanvas` props. Everything else can change inside its box without telling anyone.

## Sign-in and a protected read

```mermaid
sequenceDiagram
  participant B as Browser
  participant C as Clerk
  participant A as FastAPI
  participant P as Postgres

  B->>C: sign in (prebuilt screens)
  C-->>B: session, JWT via useAuth().getToken()
  B->>A: GET /api/me  Authorization: Bearer JWT
  A->>A: verify signature with cached JWKS, check iss, azp, exp
  A->>P: SELECT students WHERE clerk_user_id = sub (insert on first sight)
  P-->>A: student_id
  A-->>B: { student_id, courses }
  B->>A: GET /api/courses/{c}/students/{student_id}/world  Bearer JWT
  A->>A: require_student: path student_id must equal caller
  A->>P: read states, assessments, evidence
  A-->>B: WorldOut
```

`AUTH_MODE=dev` swaps the JWT step for an `X-Student-Id` header so scripts and local work do not need Clerk. Production never runs in dev mode.

## Student file ingest, two phases

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as FastAPI (request)
  participant V as Voyage
  participant P as Postgres
  participant G as Background task
  participant M as Anthropic fast model

  B->>A: POST .../students/{s}/resources/ingest (multipart PDF)
  A->>P: same hash for this student already? return it
  A->>A: parse (pymupdf), chunk by question or section
  A->>V: embed all chunks (one call)
  A->>P: save chunks with embeddings
  A->>P: load course concept embeddings (once)
  A->>A: cosine match, keep >= 0.80, top 3 per chunk
  A->>P: exposure evidence events (no outcome), recompute state
  A-->>B: 202 { status: "matched", concepts_touched }
  Note over B: sprouts appear on the matched place
  A->>G: schedule analysis(resource_id)
  par up to INGEST_CONCURRENCY chunks at once
    G->>M: student-mode extraction (items, scores, concept names)
  end
  G->>V: embed all candidate names (one call)
  G->>P: resolve to course or personal concepts, items, graded events
  G->>P: recompute state, status = processed (or failed + reason)
  loop every 1.5 s until processed or failed
    B->>A: GET .../resources/{id}
  end
  B->>A: GET .../world, GET .../knowledge-graph
  Note over B: character hatches, or falls apart on a weak exam
```

Targets: phase A under two seconds, phase B under forty seconds for a five-page pset. Both are logged per file.

## Course file ingest

```mermaid
flowchart LR
  f["PDF"] --> h{"hash seen?"}
  h -- yes --> u["unchanged"]
  h -- no --> parse["parse + chunk"] --> emb["embed chunks (1 call)"]
  emb --> ext["extract per chunk\nstrong model, bounded concurrency"]
  ext --> cand["candidates + relationships + items"]
  cand --> res["resolve: alias hit, high similarity, adjudicate, or create"]
  res --> write["concepts, aliases, edges, edge evidence, resource links, assessment items"]
  write --> clean["cycle break + transitive reduction"]
  clean --> places["compute places, store place_id on each concept"]
```

Only extraction is parallel. Writes stay in order so a relationship can name a concept found in an earlier chunk of the same file.

## Data model

```mermaid
erDiagram
  courses ||--o{ resources : has
  courses ||--o{ concepts : has
  courses ||--o{ concept_edges : has
  courses ||--o{ assessments : has
  resources ||--o{ resource_chunks : split_into
  resources ||--o{ assessments : may_define
  concepts ||--o{ concept_aliases : known_as
  concept_edges ||--o{ edge_evidence : supported_by
  concepts ||--o{ concept_resource_links : cited_in
  resources ||--o{ concept_resource_links : cites
  assessments ||--o{ assessment_items : contains
  assessment_items ||--o{ assessment_item_concepts : tests
  concepts ||--o{ assessment_item_concepts : tested_by
  students ||--o{ student_evidence_events : produces
  concepts ||--o{ student_evidence_events : about
  assessment_items o|--o{ student_evidence_events : from_item
  students ||--o{ student_concept_states : has
  concepts ||--o{ student_concept_states : for
  students ||--o{ student_concept_edges : associates
  students ||--o{ world_shares : shares
  courses ||--o{ world_shares : of

  courses { uuid id PK  text name  text code  text term }
  students { uuid id PK  text clerk_user_id UK  text display_name }
  resources { uuid id PK  uuid course_id FK  uuid owner_user_id  text origin  text artifact_type  text title  text content_hash  text status  jsonb metadata }
  resource_chunks { uuid id PK  uuid resource_id FK  int chunk_index  int page_number  text section_title  text text  vector embedding }
  concepts { uuid id PK  uuid course_id FK  text canonical_name  text concept_kind  text granularity  numeric importance  vector embedding  text scope  uuid owner_student_id  jsonb metadata }
  concept_aliases { uuid id PK  uuid concept_id FK  text normalized_alias }
  concept_edges { uuid id PK  uuid source_concept_id FK  uuid target_concept_id FK  text edge_type  numeric confidence  numeric authority_weight  text status }
  edge_evidence { uuid id PK  uuid edge_id FK  uuid resource_id FK  int page_number  text snippet }
  concept_resource_links { uuid id PK  uuid concept_id FK  uuid resource_id FK  uuid chunk_id  text link_type  numeric depth_score }
  assessments { uuid id PK  uuid course_id FK  uuid resource_id  text title  text assessment_type }
  assessment_items { uuid id PK  uuid assessment_id FK  text label  numeric max_score  numeric difficulty }
  assessment_item_concepts { uuid assessment_item_id PK  uuid concept_id PK  numeric relevance_weight }
  student_evidence_events { uuid id PK  uuid student_id  uuid concept_id FK  uuid resource_id  uuid assessment_item_id  text evidence_type  numeric outcome  numeric certainty  timestamptz occurred_at }
  student_concept_states { uuid student_id PK  uuid concept_id PK  text discovery_state  numeric mastery  numeric familiarity  numeric mastery_confidence  numeric readiness  numeric fragility  timestamptz updated_at }
  student_concept_edges { uuid id PK  uuid student_id  uuid source_concept_id FK  uuid target_concept_id FK  text edge_type }
  world_shares { uuid id PK  text token UK  uuid student_id  uuid course_id FK  timestamptz revoked_at }
```

`students` and `world_shares` are new tonight. `student_id` columns on older tables stay plain UUIDs; adding foreign keys to them is a Sunday change. `metadata.place_id` and `metadata.place_label` on `concepts` carry the island regions.

## From records to island

```mermaid
flowchart LR
  subgraph tables["Postgres"]
    st["student_concept_states"]
    ev["student_evidence_events"]
    as["assessments + items + item_concepts"]
    co["concepts (metadata.place_id)"]
    li["concept_resource_links + chunks (page numbers)"]
  end

  wq["pipelines/world_query.py\nloads rows"] --> proj["domain/world/projection.py\npure rules"]
  tables --> wq
  proj --> out["WorldOut\nplaces, spots, characters, version"]
  out --> own["GET .../world  (owner)"]
  out --> pub["public_view()  ->  GET /api/w/{token}"]
  own --> canvas["WorldCanvas"]
  own --> panel["ConceptPanel (same inspector as the graph)"]
  pub --> visit["/w/[token]  read only"]
```

Rules that turn numbers into things on the island live in `projection.py` and in `docs/learning-model.md`. The browser never recomputes them.

## Status of a file

```mermaid
stateDiagram-v2
  [*] --> parsing : upload received
  parsing --> matched : chunks embedded, exposure evidence written
  parsing --> failed : unreadable file
  matched --> analyzing : background task starts
  analyzing --> processed : items, scores, graded evidence written
  analyzing --> failed : model or vendor error (matched results stay)
  failed --> analyzing : retry
```

## Spot on the island

```mermaid
stateDiagram-v2
  [*] --> empty : concept unseen or frontier
  empty --> sprout : encountered or active (familiarity or any evidence)
  sprout --> landmark : mastery >= 0.60 and confidence >= 0.25
  landmark --> sprout : decay or negative evidence drops mastery
  note right of landmark : height follows mastery; cracked when fragility > 0.25
```

## Character on a place

```mermaid
stateDiagram-v2
  [*] --> idle : first evidence on an assignment (appear animation)
  idle --> evolved : mean visible score >= 0.70
  idle --> exploded : mean visible score < 0.45
  evolved --> exploded : a later weak score pulls the mean under 0.45
  exploded --> recovered : later graded item on the same place >= 0.60
  recovered --> evolved : mean climbs to 0.70
```

Characters never disappear. A weak exam knocks them over; later work stands them back up.

## Visit

```mermaid
sequenceDiagram
  participant O as Owner browser
  participant A as FastAPI
  participant F as Friend browser

  O->>A: POST .../students/{s}/share  Bearer JWT
  A-->>O: { token }
  O->>F: sends https://site/w/{token}
  F->>A: GET /api/w/{token}  (no sign-in)
  A->>A: token unrevoked? build WorldOut, apply public_view
  A-->>F: places, spots (coarse height), characters (generic labels, no scores)
```
