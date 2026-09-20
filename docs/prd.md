# StudyGotchi product requirements

19 September 2026. Companion to `build_spec.md` (what the player sees) and `docs/plans/infra-and-build-plan.md` (how we build it tonight). Scoring math stays in `backend/graph_engine/backend_build_spec.md`.

## One paragraph

A student signs in and gets an island. The island is their knowledge of one course. Regions of the island are topics. When the student's own work (notes, problem sets, exams) lines up with material the course has already taught, a small character appears on that topic and stays there. Good results make the ground rise and characters grow up. Bad results crack the ground and knock characters over. The same records that draw the island also draw a concept graph, a gap list, and a study plan, so the toy and the tool never disagree. Friends can visit the island, and when the owner allows it, take a copy of their notes home.

The app never quizzes anyone. It takes the pile of files a course already produces and turns it into a place you can walk around in.

## Who it is for

MIT students in problem-set courses (18.06, 18.03, 6.1210, 8.223 and similar) who already have a folder of lecture PDFs, their own worked psets, and graded exams, and who cannot see at a glance which topics they actually own. Secondary: friends and classmates who receive a share link and can read the island without seeing any files or grades.

## Why the island and not a dashboard

A grade tells you a number. An island tells you where. Places, height, cracks, and residents map to concept, mastery, fragility, and evidence, which are things the engine already computes. The visual is a projection of records, not a separate game state, so it can never claim something the evidence does not support.

## Vocabulary

- World: one student's knowledge of one course.
- Place: a topic region on the island (biome). Stable across sessions so the island does not reshuffle.
- Spot: one concept's location inside a place. Empty, sprout, or landmark.
- Character: a resident that appears when a graded or worked assignment maps onto a place. It stays. It can grow up (evolved), fall apart (exploded), or come back (recovered).
- Evidence: an event that says the student touched or demonstrated a concept, with a source and a certainty.
- Visit: a read-only view of a world through an unlisted link.

## What ships by Sunday morning

A judge with a link can do this on the prepared demo account:

1. Sign in and see an island for one course with several places, some landmarks, and a few residents.
2. Click a resident and read where it came from: the assignment, the item, the score if there was one, and the lecture and page the concept is cited to.
3. Drop one worked problem set. Within about two seconds, sprouts appear on the matching place. Within about half a minute, a character appears on that place with its citation.
4. Drop a graded exam with weak scores on one topic. Characters on that place fall apart and the ground cracks. Open the Gaps tab and see the same concepts at the top of the study plan.
5. Switch to the Knowledge tab and find the same concepts highlighted in the graph.
6. Copy a visit link, open it in a private window, and see the island with no upload controls, no file names, and no scores.
7. Refresh and stay signed in.

## Demo arc (about four minutes)

Preload the demo account before judging: ingest the course's lecture notes, then the student's own worked psets and one graded exam. The island should already be alive when the browser opens.

1. Open the world. "This is my 8.223. Regions are topics. Height is what I have demonstrated. Each little resident is a moment my own work met the course."
2. Click a resident. Read the citation out loud.
3. Drop a worked pset. Narrate the two beats: first the island knows where the file belongs, then the character hatches once the work has been read.
4. Drop a weak exam. Let the characters fall apart. Say the honest line: "It tells me what I do not know yet, and that becomes the study plan." Click Gaps.
5. Paste the visit link into a private window. Nothing leaks.

Course choice: pick the course with the most graded, worked copies that also has a compact set of lecture notes, so preloading fits inside the evening. 8.223 (11 lecture notes, psets 1 to 4 with worked copies, midterm and final with solutions) fits best. 18.06 is the second island if there is time.

## Requirements

### Accounts and ownership

- Sign-in through Clerk. A first sign-in creates the student record.
- Every read or write under a student path checks that the caller is that student. Otherwise 403.
- Course-level ingest (lecture notes, official psets) requires a signed-in user.
- A world starts private. Sharing creates an unlisted token. Revoking the token ends the visit.

### Ingest

- A student file goes browser to API directly, never through the website host.
- Same file twice (same bytes, same student) is a no-op that returns the first result. No duplicate residents.
- The fast phase (parse, chunk, embed, match against known concepts, record exposure evidence) completes on the request and returns within about two seconds for a five-page PDF.
- The deep phase (read the work, find assessment items and visible scores, record graded evidence) runs after the response and finishes within about forty seconds for the same file. Its failure leaves the fast phase results intact and marks the file failed with a reason.
- The file row shows its status: matched, analyzing, processed, failed.
- Instructor solutions and answer keys are ingested as course material with the `solution_key` type and are never treated as the student's own work.

### World

- The island is computed on the server from the personal graph, mastery, and assessments. The browser renders and never scores.
- Places come from communities in the course concept graph, at most five per course, with stable labels.
- Spot state: empty for frontier or unseen; sprout for encountered; landmark for demonstrated (mastery at least 0.60 with confidence at least 0.25). Landmark height follows mastery. A spot is cracked when fragility is above 0.25.
- Residents: one per assignment and place pair where the place holds at least 30 percent of the assignment's item relevance. A resident's state follows the mean visible score of the items on its place: evolved at 0.70 and above, idle between 0.45 and 0.70 or when no score is visible, exploded below 0.45, recovered when a later graded item on the same place scores 0.60 or higher. An exploded resident with no new evidence on its place for 14 days fades to a marker and stays clickable.
- Wisps: one per uploaded notes file, on the place it matches most. Wisps wander and never change state.
- A new student sees open sea and a course picker. Choosing a course raises the fogged island with place outlines. The first upload clears fog where it lands.
- Clicking a spot or a character opens the same inspector the graph uses.
- The world reports a version so the client can tell when a refetch changed anything.

### Visits

- The visit projection returns places, spots (state and coarse height), and characters with generic labels ("Homework 3", "Exam 1"), their place name and state. It omits items, file names, chunk text, scores, mastery values, storage paths, and the owner's identity.
- A visitor can orbit and click, and sees citations only as "Lecture 12, page 3" style references without text.

### Performance

- The island holds 60 frames per second on a 2020 laptop with integrated graphics at 1.5x pixel ratio. Under load it drops pixel ratio before it drops frames.
- First paint of the world page under three seconds on a fresh load after sign-in.
- Character reactions are authored animation driven by state, never by a model call.

### Failure behaviour

- API down: the graph page shows its existing empty state, and the world page shows a short message with a retry.
- Sign-in down: nothing opens. Visit links still work.
- No WebGL: a message and a link to the graph.
- Deep phase failed: the file row says so, the fast phase results stay, and retry is allowed.

### Taking notes from a visit (build after everything above works)

- An owner can mark a notes file shareable. Graded work and worked solutions cannot be shared. Default is not shareable.
- A signed-in visitor can take a shareable notes file from a visit. It is copied into their account as classmate notes and matched to concepts without any model call. It raises familiarity only.
- Taking the same notes twice does nothing. The owner's scores and mastery are never part of the copy.

## Out of scope for this build

Practice questions, quizzes or flashcards of any kind (the app reads what the student already produced; it does not test them), live multiplayer, mobile layout, multiple courses per world, Canvas or Dropbox API integration, local model inference, sound design beyond a few one-shot blips, and any art pipeline that produces a unique rigged model per character.

## Acceptance checks

- Two accounts: A cannot read or write B's paths; A can open B's visit link; the visit payload contains no file names, scores, or mastery values.
- Re-uploading the same PDF returns the same resource id and creates zero new evidence events.
- Fast phase timing under two seconds and deep phase under forty seconds on the demo pset, measured on the deployed API, logged per request.
- World endpoint matches the graph endpoint on every concept id and discovery state.
- Backend unit tests pass. Frontend type check passes. The site builds.
