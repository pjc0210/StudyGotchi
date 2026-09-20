# BACKEND_BUILD_SPEC.md
# StudyGotchi Backend — Personal Knowledge Graph, Mastery Engine, and Learning-World State

**Status:** Implementation-ready  
**Primary responsibility:** Build the semantic backend that turns course + student files into a personalized student knowledge graph, concept-level mastery, and the world-state that powers each student's StudyGotchi terrain.

---

# 0. Executive directive

Build the backend intelligence for **StudyGotchi**, a learning system that converts heterogeneous academic files into:

1. a **canonical course ontology** used as hidden pedagogical scaffolding
2. a **personal knowledge graph for each student**
3. a **mastery / familiarity / confidence model**
4. a **resource consolidation layer**
5. a **knowledge-gap and study-path engine**
6. a **world-state projection** that drives the student's terrain and StudyGotchi creatures

The most important product rule is:

> **The terrain/world represents the student's knowledge base and understanding, not the course syllabus.**

The course ontology is supporting infrastructure. It answers what the course teaches and how those concepts relate. The personal knowledge graph answers what *this student* has encountered, understands, struggles with, personally associates, or is ready to learn next.

The backend must be useful even if the world visualization is removed, but every world element must be derivable from meaningful semantic state.

The system should answer, with evidence:

- What concepts exist in the course?
- Which concepts has this student actually encountered?
- Which concepts has this student personally added beyond the course?
- Which concepts are on the student's immediate learning frontier?
- Which prerequisite relationships come from the course versus the student's own knowledge structure?
- Which files teach or evidence each concept?
- Which assignments/questions assess each concept?
- Which resources are official vs personal vs classmate-contributed?
- What has this student actually demonstrated mastery of?
- Which concepts are weak, uncertain, stale, or fragile?
- What should appear as mountains, valleys, frontier/fog, or unstable terrain?
- What is the smallest useful set of concepts the student should study before a target assignment/exam/topic?
- Which resources are redundant?
- Which resource adds a genuinely new explanation, example, or perspective?
- Why did a mastery score change?
- Why does a prerequisite edge exist?
- Why did the student's world expand, strengthen, weaken, or become unstable?

Optimize for **semantic quality, personalization, and explainability**, not raw node count.

# 1. Core architecture: canonical course ontology + real personal knowledge graph

## 1.1 The course graph is hidden scaffolding

StudyGotchi still needs one canonical course ontology per course. It defines:

```text
what concepts exist
how the instructor/course relates them
what is prerequisite for what
what resources and assessments map to each concept
```

Example:

```text
Linear Algebra
      ↓
PSD Matrices
      ↓
Mercer's Theorem
      ↓
Kernel Functions
      ↓
Kernel Regression
```

This is the **reference model**, not the world.

## 1.2 The student's personal knowledge graph is the product state

Each student gets a real derived graph:

```text
PERSONAL KNOWLEDGE GRAPH
= relevant canonical concepts
+ student-specific concept states
+ student-created concepts
+ student-specific semantic edges
+ evidence
+ immediate frontier concepts
```

The world/terrain is built from this graph only.

The personal graph may contain:

### Encountered concepts
The student has interacted with them through notes, lectures, assignments, practice, or assessments.

### Frontier concepts
The student has not meaningfully learned them yet, but they are directly adjacent to current knowledge or required for a current goal.

### Personal concepts
Ideas that came from the student's own files or external exploration and are not part of the official course ontology.

### Shared-extension concepts
Ideas contributed by classmates that are not part of the official course ontology but are relevant and semantically connected.

### Personal edges
Relationships present in the student's own knowledge structure, such as:

```text
ASSOCIATES_WITH
LEARNED_THROUGH
PERSONAL_EXAMPLE_OF
PERSONAL_BUILDS_ON
```

## 1.3 Do not clone the entire course graph per student

The database should not duplicate all canonical concept rows.

Instead:

```text
canonical concepts
        +
student concept states
        +
student-specific concepts/edges
        =
personal graph projection
```

This avoids duplicate concept IDs while still allowing every student's world to differ.

## 1.4 The personal graph may diverge from the course

Canonical course:

```text
Kernel Functions
      ↓
Kernel Approximation
```

Student research notes may add:

```text
Kernel Approximation
      ↓
Random Fourier Features
```

`Random Fourier Features` should be allowed to exist in the student's personal world even if the professor never teaches it.

> **StudyGotchi models the learner, not merely the syllabus.**

# 2. Product principles

## 2.1 A concept node must be learnable

Do not extract every noun.

A concept should usually be something that can be:

- independently explained
- independently practiced
- independently assessed
- required as a prerequisite
- meaningfully mastered

Good:

```text
Positive Semidefinite Matrix
Mercer's Theorem
Kernel Trick
Kernel Regression
Bias–Variance Decomposition
Gradient Descent
Conditional Probability
```

Bad:

```text
Lecture
Equation
Machine Learning
Example
Page 7
Problem
Tuesday
```

"Machine Learning" can exist as a cluster, but should not replace specific concepts.

---

## 2.2 Prerequisite edges are stronger than relatedness

```text
PSD Matrices --PREREQUISITE_FOR--> Mercer's Theorem
```

makes a pedagogical claim.

```text
Mercer's Theorem --RELATED_TO--> Kernel Methods
```

only makes an association.

Never infer `PREREQUISITE_FOR` merely because:
- two concepts co-occur
- one appears earlier in the semester
- embeddings are similar
- an LLM says they are related

Prerequisites require evidence or strong pedagogical justification.

---

## 2.3 Provenance is mandatory

The system must be able to answer:

```text
Why does this concept exist?
Why is A a prerequisite for B?
Why did mastery decrease?
Why is this resource recommended?
Why was this classmate note merged here?
```

No opaque graph mutations.

---

## 2.4 Course resources and student evidence have different roles

**Course resources** define what is taught and expected.

Examples:
- professor slides
- official readings
- problem sets
- study guides
- syllabi
- answer keys

**Student resources** reveal exposure and performance.

Examples:
- personal notes
- handwritten solutions
- quizzes/tests
- homework attempts
- photos of work

Reading a lecture is not evidence that a student mastered it.

---

## 2.5 Mastery and familiarity are different

Store both.

Example:

```text
Concept: Mercer's Theorem

familiarity = 0.82
mastery     = 0.34
confidence  = 0.76
```

A student may have seen a concept many times while still being unable to solve problems about it.

---

## 2.6 The graph should remove redundancy

The value is not:

```text
14 files became 14 file nodes.
```

The value is:

```text
14 files became 23 canonical concepts,
37 meaningful relationships,
and 8 distinct explanations after duplicate information was collapsed.
```

---

# 3. Recommended technical stack

For the backend:

```text
Python 3.12+
FastAPI
Pydantic
SQLAlchemy
PostgreSQL
pgvector
NetworkX
Alembic
pytest
```

Optional only if required:

```text
Redis + RQ/Celery
```

For HackMIT scale, do not introduce infrastructure unless necessary.

## Persistence strategy

Use PostgreSQL as source of truth.

Represent nodes and edges in relational tables.

Use:
- `pgvector` for concept/chunk embeddings
- `NetworkX` for in-memory graph algorithms

Do not add Neo4j unless the team already knows it well.

---

# 4. System architecture

```text
                         FILE SOURCES
       ┌────────────────────┼─────────────────────┐
       │                    │                     │
       ▼                    ▼                     ▼
   Dropbox              manual upload        shared resource
       │                    │                     │
       └────────────────────┼─────────────────────┘
                            ▼
                  SOURCE CLASSIFICATION
                   ownership + authority
                            │
                            ▼
                      FILE PARSING
                 PDF / image / text / DOCX
                            │
                            ▼
                       CHUNKING
                            │
                            ▼
                  SEMANTIC EXTRACTION
           concepts / questions / relationships
                            │
                    ┌───────┴────────┐
                    ▼                ▼
          COURSE STRUCTURE      STUDENT EVIDENCE
          extraction            extraction
                    │                │
                    ▼                │
          CANONICAL COURSE           │
             ONTOLOGY                │
                    │                │
                    └───────┬────────┘
                            ▼
                  PERSONAL GRAPH BUILDER
               relevant canonical concepts
               + personal concepts/edges
               + mastery/familiarity state
               + frontier discovery
                            │
          ┌─────────────────┼────────────────┐
          ▼                 ▼                ▼
      GAP ENGINE        STUDY PATH       RESOURCE RANKER
          │                 │                │
          └─────────────────┼────────────────┘
                            ▼
                    PERSONAL WORLD STATE
                 mountains / valleys / fog
                 stability / recency / pets
```

The **world renderer never consumes the raw canonical course graph directly**.

It consumes the student's personal knowledge graph / world-state projection.

# 5. Source taxonomy

Every file must be classified along two independent axes.

## Origin

```ts
type SourceOrigin =
  | "instructor"
  | "ta"
  | "student_self"
  | "classmate"
  | "external";
```

## Artifact type

```ts
type ArtifactType =
  | "lecture"
  | "reading"
  | "syllabus"
  | "study_guide"
  | "homework"
  | "quiz"
  | "exam"
  | "solution_key"
  | "student_notes"
  | "classmate_notes"
  | "worked_solution"
  | "handwritten_work"
  | "photo"
  | "other";
```

Do not collapse origin and artifact type.

---

# 6. Authority model

Different sources should influence different tasks differently.

Suggested defaults:

| Source | Curriculum authority | Prerequisite authority | Mastery evidence |
|---|---:|---:|---:|
| Instructor lecture | 1.00 | 0.95 | 0.00 |
| Instructor assignment | 1.00 | 0.85 | 0.00 |
| Solution key | 0.95 | 0.70 | 0.00 |
| TA notes | 0.85 | 0.80 | 0.00 |
| Official reading | 0.90 | 0.90 | 0.00 |
| Student graded exam | 0.50 | 0.10 | 1.00 |
| Student homework attempt | 0.40 | 0.10 | 0.80 |
| Student notes | 0.35 | 0.20 | 0.15 |
| Classmate notes | 0.45 | 0.35 | 0.00 |
| External article | 0.50 | 0.45 | 0.00 |

These are configurable defaults.

Key rule:

> **Professor/class materials strongly influence graph structure. Student performance strongly influences mastery.**

---

# 7. Graph ontology

StudyGotchi uses two graph layers:

1. **canonical course ontology**
2. **student personal knowledge graph**

The second references the first but can extend beyond it.

## 7.1 Canonical `Concept`

```text
id
course_id
canonical_name
normalized_name
short_definition
concept_kind
granularity
importance
embedding
scope = course
created_at
updated_at
```

`concept_kind`:

```text
principle
definition
theorem
method
procedure
skill
model
formula
application
topic_cluster
```

`granularity`:

```text
cluster
core
atomic
```

Most learning logic operates on `core` and `atomic`.

## 7.2 Personal / extension concepts

Some concepts may not belong to the official course ontology.

Add:

```text
scope:
  course
  personal
  shared_extension
```

For personal concepts, store:

```text
owner_student_id nullable
created_from_resource_id
canonical_parent_concept_id nullable
promotion_status
```

A personal concept can later be promoted to `shared_extension` if multiple students/resources support it.

## 7.3 `Resource`

Represents a file/document.

```text
id
course_id
source_origin
artifact_type
owner_user_id
external_file_id
path
title
hash
metadata
```

## 7.4 `Assessment`

Examples:

```text
HW3
Quiz 2
Midterm
Final
```

## 7.5 `AssessmentItem`

Examples:

```text
HW3 Question 2
Midterm Question 4b
```

This is the correct granularity for mastery evidence.

## 7.6 `Person`

Optional in visualization; useful for provenance.

## 7.7 `StudentConceptState`

This is a first-class domain object, not merely display metadata.

```text
student_id
concept_id
discovery_state
mastery
familiarity
confidence
readiness
fragility
personal_relevance
last_evidence_at
last_practiced_at
```

`discovery_state`:

```text
unseen
frontier
encountered
active
```

The world should normally render only `frontier`, `encountered`, and `active`. `unseen` concepts stay hidden unless explicitly requested.

# 8. Edge ontology

## 8.1 Canonical course semantic edges

### `PREREQUISITE_FOR`

```text
A --PREREQUISITE_FOR--> B
```

Strong pedagogical claim.

### `RELATED_TO`

Weak conceptual association.

### `BUILDS_ON`

Directional but weaker than prerequisite.

### `EXAMPLE_OF`

```text
Gaussian Kernel --EXAMPLE_OF--> Kernel Function
```

### `APPLICATION_OF`

```text
Kernel Regression --APPLICATION_OF--> Kernel Methods
```

### `CONTRASTS_WITH`

Meaningful conceptual contrast.

## 8.2 Resource edges

### `EXPLAINED_IN`
Concept is substantively taught in a resource.

### `APPEARS_IN`
Concept is mentioned/used but not taught.

### `ASSESSED_BY`
Concept is tested by an assessment item.

## 8.3 Student-specific semantic edges

Recommended types:

### `ASSOCIATES_WITH`
The student's own notes explicitly connect two concepts.

### `LEARNED_THROUGH`

```text
Kernel Regression --LEARNED_THROUGH--> Wildfire Modeling
```

### `PERSONAL_EXAMPLE_OF`
Student-created example relationship.

### `PERSONAL_BUILDS_ON`
Personal extension relationship not asserted as a canonical prerequisite.

### `PERSONAL_PREREQUISITE_FOR`
Use rarely and keep separate from canonical prerequisite structure unless promoted/validated.

Every personal edge stores:

```text
student_id
origin_resource_id
confidence
evidence
created_at
```

Do not silently convert personal relationships into canonical course relationships.

# 9. Evidence records, not sentence nodes

Do not make every statement a graph node.

Store evidence records:

```text
Concept: Mercer's Theorem
Resource: lecture_07.pdf
Page: 14
Chunk: xyz
Evidence type: explanation
Snippet: ...
```

This keeps the graph navigable while preserving explainability.

---

# 10. Database schema

Use UUID primary keys.

## `courses`

```sql
id uuid primary key
name text not null
code text null
term text null
created_at timestamptz not null
updated_at timestamptz not null
```

## `resources`

```sql
id uuid primary key
course_id uuid not null references courses(id)
origin text not null
artifact_type text not null
owner_user_id uuid null
external_file_id text null
path text null
title text not null
content_hash text null
status text not null
raw_text text null
metadata jsonb not null default '{}'
created_at timestamptz not null
updated_at timestamptz not null
```

## `resource_chunks`

```sql
id uuid primary key
resource_id uuid not null references resources(id)
course_id uuid not null references courses(id)
chunk_index int not null
page_number int null
section_title text null
text text not null
embedding vector null
metadata jsonb not null default '{}'
created_at timestamptz not null
```

## `concepts`

```sql
id uuid primary key
course_id uuid not null references courses(id)
canonical_name text not null
normalized_name text not null
short_definition text null
concept_kind text not null
granularity text not null
importance real not null default 0.5
embedding vector null
status text not null default 'active'
metadata jsonb not null default '{}'
created_at timestamptz not null
updated_at timestamptz not null
```

## `concept_aliases`

```sql
id uuid primary key
concept_id uuid not null references concepts(id)
alias text not null
normalized_alias text not null
source_resource_id uuid null
confidence real not null
created_at timestamptz not null
```

## `concept_edges`

```sql
id uuid primary key
course_id uuid not null references courses(id)
source_concept_id uuid not null references concepts(id)
target_concept_id uuid not null references concepts(id)
edge_type text not null
confidence real not null
authority_weight real not null
status text not null default 'active'
metadata jsonb not null default '{}'
created_at timestamptz not null
updated_at timestamptz not null
```

Unique on:

```text
course_id + source_concept_id + target_concept_id + edge_type
```

## `edge_evidence`

```sql
id uuid primary key
edge_id uuid not null references concept_edges(id)
resource_id uuid not null references resources(id)
chunk_id uuid null references resource_chunks(id)
page_number int null
evidence_kind text not null
snippet text null
confidence real not null
created_at timestamptz not null
```

## `concept_resource_links`

```sql
id uuid primary key
concept_id uuid not null references concepts(id)
resource_id uuid not null references resources(id)
chunk_id uuid null references resource_chunks(id)
link_type text not null
depth_score real not null
confidence real not null
created_at timestamptz not null
```

`link_type`:

```text
EXPLAINED_IN
APPEARS_IN
WORKED_EXAMPLE_IN
ASSESSED_IN
```

## `assessments`

```sql
id uuid primary key
course_id uuid not null references courses(id)
resource_id uuid null references resources(id)
title text not null
assessment_type text not null
date timestamptz null
max_score real null
metadata jsonb not null default '{}'
```

## `assessment_items`

```sql
id uuid primary key
assessment_id uuid not null references assessments(id)
label text not null
prompt text null
max_score real null
difficulty real null
metadata jsonb not null default '{}'
```

## `assessment_item_concepts`

```sql
assessment_item_id uuid not null references assessment_items(id)
concept_id uuid not null references concepts(id)
relevance_weight real not null
primary key (assessment_item_id, concept_id)
```

## `student_concept_states`

Materialized/current state:

```sql
student_id uuid not null
course_id uuid not null references courses(id)
concept_id uuid not null references concepts(id)
discovery_state text not null
mastery real not null
familiarity real not null
mastery_confidence real not null
readiness real not null default 0
fragility real not null default 0
personal_relevance real not null default 0
last_evidence_at timestamptz null
last_practiced_at timestamptz null
positive_evidence real not null default 0
negative_evidence real not null default 0
metadata jsonb not null default '{}'
updated_at timestamptz not null
primary key (student_id, concept_id)
```

## `student_concept_edges`

Student-specific graph structure:

```sql
id uuid primary key
student_id uuid not null
course_id uuid not null references courses(id)
source_concept_id uuid not null references concepts(id)
target_concept_id uuid not null references concepts(id)
edge_type text not null
origin_resource_id uuid null references resources(id)
confidence real not null
metadata jsonb not null default '{}'
created_at timestamptz not null
updated_at timestamptz not null
```

Unique on:

```text
student_id + source_concept_id + target_concept_id + edge_type
```

## `student_evidence_events`

Source of truth for mastery.

```sql
id uuid primary key
student_id uuid not null
course_id uuid not null references courses(id)
concept_id uuid not null references concepts(id)
resource_id uuid null references resources(id)
assessment_item_id uuid null references assessment_items(id)
evidence_type text not null
outcome real null
strength real not null
certainty real not null
difficulty real null
occurred_at timestamptz not null
metadata jsonb not null default '{}'
created_at timestamptz not null
```

---

# 11. File ingestion pipeline

## Stage A — discovery

For every incoming file:
- identify course
- identify source origin
- identify owner
- identify artifact type
- compute content hash
- skip if unchanged

## Stage B — parsing

PDF:
- extract text by page
- preserve headings/page boundaries

Images:
- multimodal transcription/extraction
- do not invent unreadable content
- mark uncertainty

DOCX/Markdown/Text:
- preserve headings/sections

## Stage C — structural chunking

Prefer:
1. question/problem boundary
2. section heading
3. page boundary
4. paragraph grouping
5. token fallback

Target:

```text
500–900 tokens
10–15% overlap
```

Assessment files should chunk by **question**, not arbitrary token windows.

---

# 12. Structured semantic extraction

Every resource produces validated structured output:

```json
{
  "document_type": "...",
  "concept_candidates": [],
  "assessment_items": [],
  "concept_relationships": [],
  "resource_concept_links": []
}
```

Do not parse free prose into database rows.

Validate with Pydantic before persistence.

---

# 13. Concept extraction contract

Example:

```json
{
  "name": "Positive Semidefinite Matrix",
  "normalized_name": "positive semidefinite matrix",
  "definition": "A symmetric matrix whose quadratic form is nonnegative.",
  "concept_kind": "definition",
  "granularity": "core",
  "importance_in_resource": 0.81,
  "evidence": [
    {
      "chunk_id": "...",
      "page_number": 12,
      "snippet": "..."
    }
  ]
}
```

Prompt rules:
- output learnable concepts, not keywords
- prefer specific meaningful concepts over huge umbrella topics
- avoid hyper-specific notation
- extract methods/procedures as concepts
- extract important theorems
- prefer canonical terminology
- identify obvious aliases

---

# 14. Concept granularity test

Use:

> Could a teacher reasonably write a question that independently tests this?

Examples:

```text
Kernel Methods          -> cluster
Kernel Function         -> core
Gaussian Kernel         -> atomic/core
Bandwidth Selection     -> core
sigma = 0.5             -> not concept
Equation 4              -> not concept
```

---

# 15. Concept canonicalization

Never persist a new concept before resolution.

## Step 1 — lexical normalization

Normalize:
- lowercase
- punctuation
- whitespace
- acronyms
- notation variants

## Step 2 — alias lookup

Search `concept_aliases`.

## Step 3 — embedding candidate search

Embed candidate name + definition.

Search concepts in same course.

## Step 4 — threshold

Illustrative:

```python
if exact_alias:
    merge()
elif similarity >= 0.94:
    merge_or_quick_check()
elif similarity >= 0.82:
    adjudicate_with_llm()
else:
    create()
```

Tune thresholds empirically.

## Step 5 — semantic adjudication

Question:

```text
Do these represent the same learnable concept in this course?
```

Do merge:

```text
PSD Matrix
Positive Semidefinite Matrix
```

Do not merge:

```text
Kernel
Kernel Regression
```

or:

```text
Bias
Bias–Variance Decomposition
```

---

# 16. Canonical summaries

Do not use the first file's wording as canonical truth.

For each concept:
1. collect high-authority explanations
2. collapse semantic duplicates
3. synthesize a concise course-context definition
4. preserve source-specific explanations separately

---

# 17. Resource redundancy reduction

For each concept, classify semantic contribution.

Example:

```text
Kernel Regression

Professor Lecture 7
  -> canonical explanation

Sarah's Notes
  -> alternate intuition

Textbook
  -> formal derivation

Edward's HW
  -> worked example

Bob's Notes
  -> 94% redundant with Sarah's Notes
```

Do not show every matching file equally.

---

# 18. Explanation fingerprinting

For each concept-resource link, compute:
- chunk embedding
- explanation type
- worked-example flag
- formal-vs-intuitive label
- authority
- depth

Use semantic similarity to detect near-duplicates.

---

# 19. Representative resource selection

Prefer a compact portfolio:

1. official anchor
2. best alternate explanation
3. best worked example
4. optional formal reference

Use a Maximal Marginal Relevance style score:

```text
resource_score =
    relevance
  + authority
  + depth
  + marginal_novelty
```

Classmate notes surface because they add something new, not merely because they exist.

---

# 20. Prerequisite extraction

Evidence levels:

## Level 1 — explicit

Examples:

```text
"Recall..."
"Assuming familiarity with..."
"Before learning X, we need Y..."
"X requires Y..."
```

## Level 2 — assessment dependency

Solving B materially requires A.

## Level 3 — pedagogical inference

Model-inferred from definitions and learning structure. Lower confidence.

## Level 4 — ordering/co-occurrence

Not enough by itself.

---

# 21. Prerequisite edge score

Illustrative:

```text
edge_score =
    0.35 * explicit_evidence
  + 0.25 * authority
  + 0.20 * assessment_dependency
  + 0.10 * cross_source_support
  + 0.10 * semantic_reasonableness
```

Suggested:

```text
>= 0.75 active prerequisite
0.55–0.75 suggested/weak
< 0.55 reject or RELATED_TO
```

---

# 22. Cross-source support

An edge gets stronger if independently supported by:
- official lecture
- official reading
- assignment usage
- TA explanation

Do not count five copied classmate notes as five independent confirmations.

Cluster duplicate sources first.

---

# 23. Cycle handling

`PREREQUISITE_FOR` should be approximately acyclic.

After edge insertion:
- detect cycles
- identify lowest-confidence edge
- downgrade/remove it
- preserve evidence as `RELATED_TO` when appropriate

---

# 24. Transitive reduction

Critical for graph clarity.

If:

```text
A -> B
B -> C
A -> C
```

and `A -> C` adds no unique pedagogical meaning, suppress it from the display prerequisite graph.

Use DAG transitive reduction.

Keep raw evidence separately if useful.

This is a concrete way the backend removes redundant information.

---

# 25. Course graph post-processing

After ingestion:

1. resolve aliases
2. merge duplicate concepts
3. score edges
4. remove self-edges
5. deduplicate edges
6. detect cycles
7. transitive reduction
8. compute concept importance
9. detect concept clusters
10. increment graph version

---

# 26. Concept importance

Importance means pedagogical significance, not popularity.

Suggested:

```text
importance(c) =
    0.30 * assessment_frequency
  + 0.20 * prerequisite_centrality
  + 0.20 * official_source_frequency
  + 0.15 * downstream_reach
  + 0.15 * instructor_emphasis
```

Normalize to `[0,1]`.

---

# 27. Cluster detection

The world renderer may need semantic regions.

Generate clusters from a combination of:
- official syllabus units
- graph community structure
- embedding clusters

Preferred hierarchy:

```text
Course
  Unit / region
    Concept
```

Do not force one exclusive cluster when cross-topic membership is meaningful.

---

# 28. Personal knowledge graph builder

This module creates the graph that StudyGotchi actually visualizes.

For student `s`, derive:

```text
G_s = (V_s, E_s)
```

from:

```text
canonical course ontology
+ student evidence
+ student resources
+ personal concepts
+ student-specific edges
+ current learning goals
```

## 28.1 Node inclusion rules

A canonical course concept belongs in `V_s` when at least one is true:

1. student has direct evidence for it
2. student has meaningful familiarity/exposure
3. student created or uploaded material about it
4. it is an immediate prerequisite/frontier neighbor of an active concept
5. it is needed for an explicit learning goal
6. it is a personal/shared-extension concept connected to the student's active graph

Do **not** render the entire syllabus by default.

## 28.2 Discovery states

### `unseen`
Known to course ontology but absent from the student's current personal graph. Normally hidden.

### `frontier`
Not yet meaningfully learned, but directly adjacent to current knowledge or required by a target. This should map naturally to fog, distant terrain, locked regions, or unhatched StudyGotchis.

### `encountered`
Student has seen/worked with the concept but evidence is limited.

### `active`
Student has enough evidence that the concept is a meaningful part of their knowledge base.

## 28.3 World expansion

Example:

```text
known:
PSD Matrices
     ↓
Mercer's Theorem

frontier:
Kernel Functions

hidden:
Kernel Regression
Gaussian Processes
```

After the student studies Kernel Functions:

```text
Kernel Functions -> active
Kernel Regression -> frontier
```

The world genuinely grows as knowledge expands.

## 28.4 Personal extensions

Personal/external files may create concepts not in the course ontology.

Example:

```text
Kernel Approximation
      ↓
Random Fourier Features
```

If this comes from the student's own paper/notes, it may appear as a personal region in the world.

Preserve:

```text
scope = personal
origin_resource
owner_student
semantic connection to course concepts
```

# 29. Mastery signal hierarchy

Strong:
```text
graded exam correctness
graded quiz correctness
graded homework correctness
diagnostic problem correctness
repeated successful practice
```

Medium:
```text
verified ungraded solution
rubric-evaluated self-explanation
```

Weak:
```text
student notes
highlighting
resource views
file presence
```

Passive exposure must never strongly increase mastery.

---

# 30. Mastery model

Use a weighted Bayesian evidence model.

For each concept:

```text
alpha = alpha_prior + positive evidence
beta  = beta_prior  + negative evidence
```

Mastery:

```text
mastery = alpha / (alpha + beta)
```

Suggested prior:

```text
alpha_prior = 1.5
beta_prior  = 1.5
```

This starts near 0.5 with low confidence rather than assuming ignorance/mastery.

---

# 31. Weighted evidence

For event `i`:

```text
outcome_i             in [0,1]
strength_i            in [0,1]
certainty_i           in [0,1]
difficulty_i          in [0.5,1.5]
recency_i             in [0,1]
concept_relevance_i   in [0,1]
```

Weight:

```text
w_i =
  strength_i
  * certainty_i
  * difficulty_i
  * recency_i
  * concept_relevance_i
```

Update:

```text
positive += w_i * outcome_i
negative += w_i * (1 - outcome_i)
```

---

# 32. Evidence strength defaults

```text
graded_exam        1.00
graded_quiz        0.90
graded_homework    0.75
diagnostic         0.80
verified_practice  0.65
worked_solution    0.45
self_explanation   0.35
student_notes      0.10
resource_view      0.02
self_rating        0.10
```

Configurable.

---

# 33. Partial credit

Preserve partial credit.

Example:

```text
6/10 -> outcome = 0.6
```

Do not binarize everything.

---

# 34. Multi-concept questions

A question can test multiple concepts.

Example:

```text
HW3 Q2
  Kernel Function        0.3
  PSD Matrix             0.2
  Kernel Regression      0.5
```

Distribute evidence by relevance.

If failure cannot be attributed confidently, lower `certainty`.

Never punish all linked concepts equally.

---

# 35. Targeted negative evidence

A failed question explicitly designed to test Mercer has high certainty.

A broad problem involving five possible concepts has lower certainty.

This prevents one failure from collapsing the entire terrain.

---

# 36. Recency

Evidence should decay gradually.

Suggested:

```text
recency_weight = exp(-lambda * age_days)
```

Possible half-lives:

```text
assessment evidence: 90–180 days
practice evidence:   45–90 days
familiarity:         14–30 days
```

Use mild decay for the hackathon.

---

# 37. Familiarity model

Familiarity can rise from:
- notes
- views
- annotations
- repeated exposure
- class discussions

Simple saturating formula:

```text
familiarity = 1 - exp(-sum(exposure_weights))
```

This allows:

```text
high familiarity
low mastery
```

which is pedagogically useful.

---

# 38. Mastery confidence

Confidence answers:

> How much evidence exists?

Suggested:

```text
effective_evidence = positive + negative
confidence = 1 - exp(-k * effective_evidence)
```

Examples:

```text
mastery 0.90, confidence 0.20
```

means probably strong but barely tested.

```text
mastery 0.55, confidence 0.95
```

means substantial evidence of inconsistent performance.

---

# 39. Do not blindly propagate mastery

Do not infer:

```text
low PSD mastery
=> automatically low Kernel Regression mastery
```

A student may demonstrate downstream competence.

Keep direct mastery evidence-based.

Use prerequisites for:
- readiness
- fragility
- gap priority

---

# 40. Readiness

For target concept `c`:

```text
prereq_support =
weighted_average(mastery(p) for direct prerequisite p)

readiness(c) =
0.65 * mastery(c)
+ 0.35 * prereq_support
```

No prerequisites:

```text
readiness = mastery
```

---

# 41. Fragility

A concept may be mastered but poorly supported by foundations.

```text
fragility(c) =
mastery(c) * (1 - prerequisite_support(c))
```

Example:

```text
Kernel Regression mastery = 0.82
PSD mastery               = 0.25
```

Kernel Regression can be flagged as fragile rather than simply weak.

---

# 42. Student-file evidence extraction

## Personal notes

Extract:
- concepts discussed
- explanations in student's own words
- worked examples
- explicit confusion markers

Mostly:
- familiarity evidence
- weak mastery evidence unless explanation is evaluated

Do not strongly reward copied text.

## Handwritten work / photos

Extract:
- problem identity
- attempted steps
- final answer
- concepts used
- correctness when verifiable
- uncertainty

If correctness cannot be established:
- record practice/familiarity
- avoid strong positive mastery evidence

## Homework/test score files

Highest priority.

Extract:
- assessment
- item score
- max score
- feedback
- item prompt
- concept mappings

---

# 43. Assessment-to-concept mapping

Map each item to the smallest reasonable concept set.

Bad:

```text
Q3 -> Machine Learning
```

Good:

```text
Q3 ->
  Positive Semidefinite Matrix
  Mercer's Theorem
  Kernel Function
```

Use:
- official rubric
- solution key
- question text
- course graph
- instructor emphasis

Store mapping confidence.

---

# 44. Knowledge-gap engine

A gap is contextual, not just `mastery < threshold`.

Given target `T`, get prerequisite ancestors and score:

```text
gap_priority(c,T) =
    mastery_deficit(c)
  * goal_relevance(c,T)
  * bottleneck_weight(c,T)
  * course_importance(c)
  * confidence_adjustment(c)
```

Where:

```text
mastery_deficit = 1 - mastery
```

---

# 45. Goal relevance

Use graph distance.

```text
goal_relevance(c,T) =
alpha ^ shortest_path_distance(c,T)
```

Suggested:

```text
alpha = 0.75
```

Closer prerequisites matter more.

---

# 46. Bottleneck weight

A prerequisite matters more when many target-relevant downstream concepts depend on it.

Within the target prerequisite subgraph:

```text
bottleneck_weight =
normalized downstream reach
```

This surfaces foundational gaps.

---

# 47. Confidence-aware actions

If mastery is low but evidence is sparse, recommend diagnosis rather than claiming weakness.

Example:

```text
if mastery < 0.5 and confidence > 0.6:
    action = STUDY
elif mastery < 0.6 and confidence <= 0.6:
    action = DIAGNOSE
elif mastery >= 0.75 and recency_low:
    action = REVIEW
else:
    action = OPTIONAL
```

---

# 48. Minimal study set

Optimize learning efficiency.

Given a target:

1. collect prerequisite ancestors
2. remove mastered concepts
3. remove irrelevant concepts
4. transitive-reduce the target subgraph
5. rank gaps
6. topologically order
7. return smallest useful sequence

Example:

```text
Target: HW3

Full prerequisites:
A B C D E F G H

Already mastered:
A B E

Irrelevant/redundant:
H

Study:
C -> D -> F -> G
```

---

# 49. Study-path ordering

Use topological order.

Among nodes available at the same stage, prefer:
- higher gap priority
- higher importance
- higher assessment relevance

---

# 50. Resource selection per study step

Return:

```text
1 official explanation
1 meaningfully different alternate explanation
1 worked example
```

Do not dump every matching file.

---

# 51. Classmate resource integration

A classmate file should not aggressively rewrite the canonical graph.

Process:

1. parse
2. extract
3. resolve concepts
4. identify novel concepts
5. propose edges
6. weight authority lower than official sources
7. add alternate explanations
8. calculate novelty

Classmate resources should mostly **enrich concepts**, not redefine the curriculum.

---

# 52. Contradictions

If a classmate explanation conflicts with official material:

- do not overwrite canonical definition
- preserve the source separately
- mark conflict or lower confidence

Future UI can say:

```text
This explanation conflicts with the professor's slides.
```

---

# 53. Incremental graph updates

New resource:

- hash
- parse
- extract
- resolve
- add evidence
- recompute affected relationships
- refresh affected summaries
- recompute impacted student state only

Do not rebuild the whole course.

---

# 54. Graph versioning

Maintain:

```text
course_graph_version
```

Increment when:
- concept added/merged
- prerequisite edge changes
- canonical concept materially changes

Frontend responses include the graph version.

---

# 55. Personal knowledge graph and world-state contracts

The visualization teammate should not consume the canonical course graph.

Provide two explicit endpoints:

```text
GET /api/courses/{course_id}/students/{student_id}/knowledge-graph
GET /api/courses/{course_id}/students/{student_id}/world
```

## 55.1 Personal knowledge graph DTO

```json
{
  "student_id": "student-1",
  "course_id": "course-1",
  "graph_version": 18,
  "nodes": [
    {
      "id": "mercer",
      "name": "Mercer's Theorem",
      "scope": "course",
      "discovery_state": "active",
      "cluster": "Kernel Methods",
      "importance": 0.83,
      "personal_relevance": 0.94,
      "mastery": 0.34,
      "familiarity": 0.78,
      "confidence": 0.72,
      "readiness": 0.41,
      "fragility": 0.18,
      "state": "struggling"
    },
    {
      "id": "kernel-regression",
      "name": "Kernel Regression",
      "scope": "course",
      "discovery_state": "frontier",
      "cluster": "Kernel Methods",
      "mastery": null,
      "familiarity": 0.08,
      "confidence": 0.03,
      "state": "frontier"
    }
  ],
  "edges": [
    {
      "source": "psd",
      "target": "mercer",
      "type": "PREREQUISITE_FOR",
      "origin": "course",
      "confidence": 0.91
    }
  ],
  "hidden_concept_count": 37
}
```

## 55.2 World-state DTO

The world projection is a semantic rendering contract.

```json
{
  "student_id": "student-1",
  "world_version": 22,
  "regions": [
    {
      "concept_id": "mercer",
      "terrain_height": 0.34,
      "terrain_area": 0.83,
      "stability": 0.72,
      "vegetation": 0.66,
      "fog": 0.0,
      "fragility": 0.18,
      "creature_state": "weak",
      "semantic_state": "struggling"
    },
    {
      "concept_id": "kernel-regression",
      "terrain_height": 0.05,
      "terrain_area": 0.71,
      "stability": 0.10,
      "vegetation": 0.05,
      "fog": 0.90,
      "fragility": 0.0,
      "creature_state": "unhatched",
      "semantic_state": "frontier"
    }
  ]
}
```

Recommended semantic mapping:

```text
terrain height       <- mastery
region size          <- importance × personal relevance
stability            <- mastery confidence
vegetation/activity  <- familiarity + recency
cracks/instability   <- fragility
fog                  <- discovery/frontier uncertainty
creature evolution   <- mastery + confidence thresholds
```

The backend exposes normalized semantic dimensions; the frontend owns exact visual styling and animation.

# 56. Derived StudyGotchi semantic states

Backend provides stable semantic states:

```text
unseen
frontier
exposed
uncertain
struggling
developing
strong
mastered
fragile
stale
```

Possible rules:

```text
unseen:
  discovery_state = unseen

frontier:
  discovery_state = frontier

exposed:
  familiarity >= 0.3 and confidence < 0.25

struggling:
  mastery < 0.45 and confidence >= 0.55

developing:
  mastery 0.45–0.70

strong:
  mastery 0.70–0.88

mastered:
  mastery >= 0.88 and confidence >= 0.65

fragile:
  mastery >= 0.70 and prereq_support < 0.45

stale:
  mastery >= 0.70 and last_practiced_at is old
```

The frontend can map these to playful creature behavior:

```text
frontier   -> egg / hidden / fog
struggling -> weak / injured
developing -> normal
strong     -> evolved
mastered   -> ascended
```

The backend should emit semantic events, not animation instructions.

Example:

```json
{
  "event": "MASTERY_DROP",
  "concept_id": "mercer",
  "delta": -0.18,
  "severity": "high"
}
```

The frontend decides whether that means wobbling, fainting, exploding, etc.

# 57. API endpoints

## Ingest course resources

```text
POST /api/courses/{course_id}/resources/ingest
```

## Canonical course ontology

```text
GET /api/courses/{course_id}/ontology?view=canonical|reduced
```

Primarily backend/debug/admin use.

## Concept detail

```text
GET /api/courses/{course_id}/concepts/{concept_id}
```

Returns definition, aliases, canonical prerequisites, resources, assessments, and provenance.

## Personal knowledge graph

```text
GET /api/courses/{course_id}/students/{student_id}/knowledge-graph
```

Primary semantic product endpoint.

## World state

```text
GET /api/courses/{course_id}/students/{student_id}/world
```

Primary visualization endpoint.

## Student analytical overlay

```text
GET /api/courses/{course_id}/students/{student_id}/overlay
```

## Ingest student resource

```text
POST /api/courses/{course_id}/students/{student_id}/resources/ingest
```

## Gaps

```text
GET /api/courses/{course_id}/students/{student_id}/gaps
```

Optional target parameters:

```text
?target_concept_id=
?assessment_id=
```

## Study plan

```text
POST /api/courses/{course_id}/students/{student_id}/study-plan
```

## World change events

```text
GET /api/courses/{course_id}/students/{student_id}/world-events
```

Examples:

```text
CONCEPT_DISCOVERED
FRONTIER_EXPANDED
MASTERY_GAIN
MASTERY_DROP
CONCEPT_BECAME_FRAGILE
CONCEPT_MASTERED
RESOURCE_ADDED
```

This gives the visualization deterministic semantic events to animate.

# 58. Graph algorithms module

Implement pure functions where possible:

```python
get_prerequisite_ancestors()
get_prerequisite_descendants()
detect_cycles()
break_low_confidence_cycles()
transitive_reduce()
topological_study_order()
shortest_prerequisite_path()
compute_downstream_reach()
compute_goal_relevance()
compute_gap_priorities()
build_minimal_study_subgraph()
```

Use NetworkX internally.

Keep these independent from FastAPI/database I/O.

---

# 59. Domain models

Example:

```python
@dataclass
class ConceptState:
    concept_id: UUID
    mastery: float
    familiarity: float
    confidence: float
    readiness: float
    fragility: float


@dataclass
class EvidenceEvent:
    concept_id: UUID
    evidence_type: str
    outcome: float | None
    strength: float
    certainty: float
    difficulty: float
    relevance: float
    occurred_at: datetime
```

---

# 60. AI provider abstraction

Keep provider SDK code isolated:

```python
class LLMProvider(Protocol):
    async def structured_generate(
        self,
        *,
        system: str,
        prompt: str,
        schema: type[BaseModel],
    ) -> BaseModel: ...

    async def embed(self, texts: list[str]) -> list[list[float]]: ...

    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
    ) -> str: ...
```

Domain code should never import provider SDKs directly.

---

# 61. Recommended monorepo structure

```text
studygotchi/
├── apps/
│   └── web/                          # world / terrain / StudyGotchi visualization
│
├── services/
│   └── knowledge-engine/             # YOUR backend
│       ├── pyproject.toml
│       ├── alembic.ini
│       ├── app/
│       │   ├── main.py
│       │   ├── api/
│       │   │   ├── routes/
│       │   │   │   ├── courses.py
│       │   │   │   ├── resources.py
│       │   │   │   ├── ontology.py
│       │   │   │   ├── personal_graph.py
│       │   │   │   ├── students.py
│       │   │   │   ├── mastery.py
│       │   │   │   ├── study.py
│       │   │   │   └── world.py
│       │   │   └── dependencies.py
│       │   ├── domain/
│       │   │   ├── ontology/
│       │   │   │   ├── concepts.py
│       │   │   │   ├── edges.py
│       │   │   │   └── source_types.py
│       │   │   ├── personal_graph/
│       │   │   │   ├── builder.py
│       │   │   │   ├── discovery.py
│       │   │   │   ├── frontier.py
│       │   │   │   ├── personal_edges.py
│       │   │   │   └── extensions.py
│       │   │   ├── graph/
│       │   │   │   ├── algorithms.py
│       │   │   │   ├── prerequisite.py
│       │   │   │   ├── reduction.py
│       │   │   │   ├── clustering.py
│       │   │   │   └── importance.py
│       │   │   ├── mastery/
│       │   │   │   ├── evidence.py
│       │   │   │   ├── scorer.py
│       │   │   │   ├── familiarity.py
│       │   │   │   ├── readiness.py
│       │   │   │   └── states.py
│       │   │   ├── gaps/
│       │   │   │   ├── scoring.py
│       │   │   │   └── study_plan.py
│       │   │   ├── world/
│       │   │   │   ├── projection.py
│       │   │   │   ├── events.py
│       │   │   │   └── semantic_state.py
│       │   │   └── resources/
│       │   │       ├── ranking.py
│       │   │       ├── redundancy.py
│       │   │       └── novelty.py
│       │   ├── pipelines/
│       │   │   ├── course_ingestion.py
│       │   │   ├── student_ingestion.py
│       │   │   ├── assessment_ingestion.py
│       │   │   └── incremental_update.py
│       │   ├── extractors/
│       │   │   ├── parser.py
│       │   │   ├── pdf.py
│       │   │   ├── image.py
│       │   │   ├── text.py
│       │   │   ├── chunker.py
│       │   │   ├── concepts.py
│       │   │   ├── prerequisites.py
│       │   │   ├── assessments.py
│       │   │   └── student_work.py
│       │   ├── resolution/
│       │   │   ├── normalize.py
│       │   │   ├── aliases.py
│       │   │   ├── semantic_match.py
│       │   │   └── merge.py
│       │   ├── repositories/
│       │   │   ├── courses.py
│       │   │   ├── resources.py
│       │   │   ├── concepts.py
│       │   │   ├── edges.py
│       │   │   ├── personal_graph.py
│       │   │   ├── assessments.py
│       │   │   └── student_states.py
│       │   ├── db/
│       │   │   ├── session.py
│       │   │   ├── models.py
│       │   │   └── migrations/
│       │   ├── providers/
│       │   │   ├── llm/
│       │   │   ├── storage/
│       │   │   └── embeddings/
│       │   ├── schemas/
│       │   │   ├── extraction.py
│       │   │   ├── ontology.py
│       │   │   ├── personal_graph.py
│       │   │   ├── mastery.py
│       │   │   ├── world.py
│       │   │   └── api.py
│       │   ├── prompts/
│       │   │   ├── concept_extraction.txt
│       │   │   ├── prerequisite_extraction.txt
│       │   │   ├── merge_adjudication.txt
│       │   │   └── student_work_analysis.txt
│       │   └── config.py
│       ├── tests/
│       │   ├── unit/
│       │   │   ├── test_normalization.py
│       │   │   ├── test_merge.py
│       │   │   ├── test_personal_graph.py
│       │   │   ├── test_frontier.py
│       │   │   ├── test_mastery.py
│       │   │   ├── test_transitive_reduction.py
│       │   │   ├── test_gap_scoring.py
│       │   │   └── test_world_projection.py
│       │   ├── integration/
│       │   │   ├── test_course_ingestion.py
│       │   │   ├── test_student_ingestion.py
│       │   │   ├── test_personal_graph_api.py
│       │   │   └── test_world_api.py
│       │   └── fixtures/
│       └── scripts/
│           ├── seed_demo_course.py
│           ├── rebuild_course_ontology.py
│           ├── rebuild_personal_graph.py
│           ├── inspect_student_world.py
│           └── export_world_json.py
├── packages/
│   └── contracts/
├── demo-data/
├── docs/
│   ├── STUDYGOTCHI_BACKEND_BUILD_SPEC.md
│   └── ontology.md
└── README.md
```

# 62. Why this repo structure

Separate by domain responsibility, not generic "utils".

Avoid:

```text
utils.py
helpers.py
graph_utils.py
ai_utils.py
```

Use:

```text
domain/mastery/
domain/graph/
domain/gaps/
resolution/
extractors/
repositories/
providers/
```

This keeps:
- graph math pure
- AI replaceable
- persistence isolated
- mastery logic unit-testable

---

# 63. Boundary rules

## `domain/`

No:
- FastAPI
- Dropbox SDK
- direct SQL
- model-provider SDKs

Pure learning/graph logic.

## `extractors/`

File content -> structured semantic candidates.

## `resolution/`

Candidate concept -> existing canonical concept/new concept.

## `repositories/`

Persistence only.

## `providers/`

External services only.

## `pipelines/`

Orchestration.

## `api/`

Thin HTTP layer.

---

# 64. Build order

## Phase 1 — ontology + DB

Build:
- concepts
- edges
- resources
- evidence
- assessments
- student states

Exit:
manual graph can be persisted/retrieved.

## Phase 2 — graph algorithms

Build:
- ancestors
- descendants
- cycles
- transitive reduction
- topological ordering
- goal relevance

Exit:
unit tests pass.

## Phase 3 — parsing

Support:
- PDF
- TXT/MD
- image

Exit:
demo files create clean chunks.

## Phase 4 — concept extraction

Exit:
one lecture reliably yields meaningful concepts.

## Phase 5 — canonicalization

Build:
- normalization
- alias lookup
- embedding matching
- adjudication

Exit:
10 files do not create obvious duplicate concepts.

## Phase 6 — prerequisites

Build:
- candidate extraction
- confidence
- evidence
- cycle handling
- transitive reduction

Exit:
graph has believable prerequisite backbone.

## Phase 7 — assessments

Build:
- item extraction
- item-to-concept mapping
- score parsing

Exit:
one homework/test creates concept-level evidence.

## Phase 8 — mastery

Build:
- evidence events
- Bayesian score
- familiarity
- confidence
- readiness
- fragility

Exit:
fixture state updates predictably.

## Phase 9 — personal graph builder

Build:
- node inclusion rules
- discovery states
- frontier expansion
- personal concepts
- student-specific edges

Exit:
two students in the same course produce visibly different personal graphs.

## Phase 10 — gaps

Build:
- target subgraph
- priority
- minimal study set
- order

Exit:
HW3 yields intuitive path.

## Phase 11 — resource consolidation

Build:
- explanation duplicate detection
- representative source ranking

Exit:
concept detail shows a few useful resources, not every duplicate.

## Phase 12 — world projection

Build:
- `/knowledge-graph`
- `/world`
- world events

Exit:
visual teammate can render a student's world without touching the canonical ontology or backend internals.

---

# 65. Demo fixture

Use one deterministic course:

```text
Intermediate Machine Learning
```

Backbone:

```text
Linear Algebra
  ↓
Inner Products
  ↓
Positive Semidefinite Matrices
  ↓
Mercer's Theorem
  ↓
Kernel Functions
  ↓
Kernel Trick
  ↓
Kernel Regression
  ↓
Bandwidth Selection
```

Include:
- professor lecture
- homework
- graded homework/test
- personal notes
- classmate notes
- handwritten work image

Deliberately include:
- duplicate terminology
- alternate explanation
- failed assessment concept
- strong concept
- weak prerequisite
- redundant classmate note

---

# 66. Example student state

```text
Linear Algebra
mastery = 0.92
confidence = 0.85

PSD Matrices
mastery = 0.31
confidence = 0.78

Mercer's Theorem
mastery = 0.39
confidence = 0.65

Kernel Functions
mastery = 0.68
confidence = 0.52

Kernel Regression
mastery = 0.74
confidence = 0.71
```

System should infer:

```text
Primary bottleneck:
PSD Matrices

Fragile:
Kernel Regression

Reason:
Kernel Regression performance is fairly strong, but its prerequisite chain contains weak PSD/Mercer mastery.
```

---

# 67. Example gap query

Input:

```json
{
  "target": "HW3"
}
```

Process:

1. map HW3 items to concepts
2. collect prerequisite ancestors
3. read student mastery
4. compute goal relevance
5. compute bottleneck weight
6. separate uncertain from known weakness
7. remove mastered nodes
8. produce topological minimal path
9. select representative resources

Output:

```json
{
  "target": "HW3",
  "gaps": [
    {
      "concept": "Positive Semidefinite Matrices",
      "mastery": 0.31,
      "confidence": 0.78,
      "priority": 0.93,
      "action": "study",
      "reason": "Foundational prerequisite for 3 HW3-relevant concepts."
    },
    {
      "concept": "Mercer's Theorem",
      "mastery": 0.39,
      "confidence": 0.65,
      "priority": 0.84,
      "action": "study"
    },
    {
      "concept": "Kernel Functions",
      "mastery": 0.68,
      "confidence": 0.52,
      "priority": 0.55,
      "action": "diagnose"
    }
  ],
  "study_order": [
    "Positive Semidefinite Matrices",
    "Mercer's Theorem",
    "Kernel Functions"
  ]
}
```

---

# 68. Explainability endpoint

Build:

```text
GET /api/.../concepts/{concept_id}/why
```

Return:

```json
{
  "mastery_explanation": [
    "Midterm Q4: 2/8 points",
    "Homework 3 Q2: 4/5 points"
  ],
  "prerequisite_explanation": [
    "Lecture 6 explicitly introduces PSD matrices before Mercer's theorem.",
    "HW3 Q2 requires checking a PSD condition."
  ],
  "resource_explanation": [
    "Lecture 6 is the primary official explanation.",
    "Sarah's notes add a visual intuition not present in the lecture."
  ]
}
```

This is valuable both for debugging and the judge demo.

---

# 69. Debug tooling

Expose dev-only views/data for:

```text
resources
chunks
concept candidates
merge decisions
aliases
edge candidates
cycle removals
assessment mappings
student evidence
mastery breakdown
gap-score breakdown
```

You will need this during the hackathon.

---

# 70. Unit tests

Must cover:

## Canonicalization

```text
PSD matrix == positive semidefinite matrix
kernel != kernel regression
```

## Transitive reduction

```text
A->B, B->C, A->C
```

Display graph suppresses redundant A->C.

## Cycle handling

Lowest-confidence edge is removed/downgraded.

## Mastery

Correct graded answer increases mastery.

## Negative evidence

Incorrect high-certainty assessment decreases mastery.

## Passive exposure

Viewing/notes barely affect mastery.

## Confidence

More evidence increases confidence.

## Study ordering

Prerequisites occur before dependent concepts.

## Gap ranking

Weak foundational concept outranks weak irrelevant concept.

---

# 71. Integration tests

## Course ingestion

Three lectures + assignment:
- concepts extracted
- aliases merged
- prerequisite graph formed

## Student ingestion

Graded homework:
- assessment identified
- item mapped to concepts
- evidence events created
- mastery updated

## Classmate notes

- existing concepts reused
- alternate explanation added
- no duplicate explosion

## World API

- stable schema
- scores in `[0,1]`
- all edges point to valid concepts

---

# 72. Graph quality metrics

Log:

```text
concept_count
prerequisite_edge_count
related_edge_count
duplicate_merge_count
cycle_count_before_cleanup
cycle_count_after_cleanup
average_prerequisite_degree
resources_per_concept
concepts_without_sources
concepts_without_assessments
```

The demo graph should be sparse and interpretable.

---

# 73. Manual semantic quality checklist

For top concepts ask:

1. Is it actually learnable?
2. Is the name canonical?
3. Too broad?
4. Too narrow?
5. Is prerequisite direction correct?
6. Is the edge necessary?
7. Can we show evidence?
8. Are useful resources attached?
9. Would a student understand why it matters?

---

# 74. Failure modes

## Keyword graph

Bad nodes:
```text
data
example
algorithm
lecture
```

Fix:
learnable-concept prompt + filtering.

## Hairball

Fix:
strict prerequisite semantics,
confidence thresholds,
transitive reduction,
weak-related suppression.

## Duplicate concepts

Fix:
canonicalization.

## Mastery inflation

Fix:
passive exposure -> familiarity, not mastery.

## One failed question destroys everything

Fix:
relevance + certainty + partial credit.

## Classmate notes override professor

Fix:
authority + provenance.

## Five identical resources shown

Fix:
novelty ranking.

---

# 75. Acceptable hackathon shortcuts

You may:
- support one course
- use one demo student
- manually label source origin in fixtures
- use rule-based authority defaults
- use one LLM provider
- recompute graph algorithms in memory
- recompute mastery synchronously
- use a deterministic demo graph

Do not fake:
- assessment scores
- source provenance
- concept evidence
- mastery updates

---

# 76. Do not build this weekend

Do not spend time on:
- GNN training
- full knowledge tracing
- Neo4j migration
- multi-school ontology
- real-time collaboration
- reinforcement learning
- custom embeddings
- production queues
- full graph editor

The graph-algorithm + probabilistic mastery approach is more defensible for the available data.

---

# 77. Future GNN path

Leave room for a future heterogeneous GNN.

Possible node features:
- text embeddings
- importance
- resource coverage
- aggregate student outcomes

Possible tasks:
- missing prerequisite edge prediction
- resource recommendation
- mastery propagation
- student outcome prediction

But do not train a GNN on one small course graph during HackMIT.

---

# 78. Technical pitch

Do not describe the backend as:

> "We send files to an LLM and ask what to study."

Describe it as:

> **StudyGotchi compiles course content into a canonical pedagogical ontology, then builds a personalized knowledge graph for each student from their notes, work, assessments, and learning history. We estimate concept-level mastery with uncertainty, discover the student's learning frontier, and use graph algorithms to identify the smallest knowledge gaps blocking their goals. That personal graph is projected into the StudyGotchi world as terrain and evolving creatures.**

The course graph describes the curriculum.

The personal graph describes the learner.

**The world visualizes the learner.**

# 79. Definition of done

The StudyGotchi backend is HackMIT-ready when:

1. official course files generate high-quality canonical concepts
2. duplicate concepts merge correctly
3. prerequisite edges are sparse and explainable
4. file links retain provenance
5. personal student files can enrich or extend the personal graph
6. student notes affect familiarity much more than mastery
7. graded work creates concept-level evidence
8. mastery includes confidence
9. weak prerequisites affect readiness/fragility without overwriting direct mastery
10. classmate resources enrich available knowledge without altering another student's mastery
11. redundant resources are suppressed
12. the personal graph hides irrelevant/unseen syllabus concepts by default
13. frontier concepts appear when they become immediately learnable/relevant
14. personal concepts can exist beyond the official course ontology
15. two students in the same course produce different personal graphs/world states
16. a target assignment creates a minimal study subgraph
17. every knowledge gap has a human-readable reason
18. `/knowledge-graph` returns the student's actual personal graph
19. `/world` returns stable semantic terrain/creature-driving state
20. a failed assessment item changes only relevant concept states
21. the system emits a meaningful world event describing that change
22. the system can explain why the world changed

# 80. Final priority order

If time becomes limited:

```text
1. Concept quality
2. Canonicalization / duplicate removal
3. Prerequisite quality
4. Student assessment mapping
5. Mastery + confidence
6. Personal graph construction
7. Frontier discovery
8. World-state API
9. Gap engine
10. Classmate resource integration
11. Resource redundancy reduction
12. Everything else
```

A smaller personal graph with excellent semantics is better than a huge syllabus graph.

The StudyGotchi world is impressive only if every mountain, valley, frontier region, and creature state corresponds to a meaningful fact about the student's knowledge.

