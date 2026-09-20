# Site design fleet, round 1 gate

Date: 2026-09-20. Plans scored: `docs/design/site/directions/{a-paper-and-pixel,b-modern-ds,c-sticker-toybox}.md`. Three critics scored independently on the five round-1 axes (Hierarchy, Type discipline, Colour restraint, Distinctiveness, World fit). Notes: `round-1-critic-hig.md`, `round-1-critic-linear.md`, `round-1-critic-cozy.md`.

## Scores

| Direction | HIG | Linear | Cozy | Average |
|---|---|---|---|---|
| A, Paper & Pixel | 8.4 | 8.0 | 8.6 | 8.33 |
| B, Modern DS | 7.4 | 7.6 | 7.8 | 7.60 |
| C, Sticker Toybox | 6.6 | 5.8 | 6.6 | 6.33 |

Ranking is A, B, C from all three critics. No direction meets the stop rule yet (9.0 average, no axis under 8); that is expected for plans and is the job of round 2.

## Why A won

- Colour restraint 9 from all three: five tokens, every one a world colour unchanged, all states through the ink alpha ramp, coral demoted to a single live dot.
- World fit 8 to 9: the recessed lilac window with an inset shadow makes the world the brightest object on the page rather than a card floating on it.
- Copy: the cozy critic judged A's the only copy a resident would actually say. B's is good narration; C's is the ad.
- Anti-defaults: A is the only plan with no partial match. B partially matches the developer-tool shell in structure (its landing proof is an ID table, its lower screen is the Linear layout relit). C partially matches cream plus coral primary, and its `0 4px 0 ink` button edge is neubrutalism's hard offset shadow, not the claymorphism recipe.

## What A must fix in the merge (defects the critics found)

1. The state metaphor runs backwards (cozy critic). A's Demonstrated and Mastered chips fill with ink and get darker while the world's windows light up. Invert: states should lighten or light up, in line with the observatory's windows and the lamp token.
2. Type is A's weakest axis at 7 (Linear critic). Zen Maru Gothic at four sizes including 20 px, three UI weights, one off-grid leading (28/34), sub-pixel 0.08em tracking on the pixel face. Cut to three display sizes, two UI weights, every leading on 4, integer tracking on Departure Mono.
3. No evidence list at 1440 (Linear critic). The signed-in world view has nothing under the window where the data should live.
4. Two bars of chrome around the window (HIG critic). On scroll-out there should be one bar at any moment.
5. Drop A's own proposed borrow of C's 2 px badge outline (HIG critic). It contradicts A's hairline depth model.

## Absorb candidates

Named by two or more critics:

- From C, section 2, the accent cap tokens (`accent-cap`, `card-accent`, `primary-per-screen`, `outline-places`) written into `tokens.json` so restraint is auditable by count. Named by HIG and Linear.
- From B, sections 3.3 and 4, the single pinned bar: on scroll-out the eyebrow, camera control, and counters collapse into one 36 px bar, and there is one bar at any moment. Named by HIG; Linear named the same region of B for the evidence table. Together these are one move: B's lower screen becomes A's sheet under the window.

Named by one critic, worth taking:

- From B, section 3.3 and 2, the evidence table under the window (208 topic column, 28 px rows at 13/500, 320 detail pane), plus B's rule that every leading sits on 4. Named by Linear; it also fixes defect 3 above.
- From C, sections 2 and 5, the extruded press on the one primary button, kept in ink with an `ink-20` ledge and 4 px face travel. Named by the cozy critic as the only move that gives the chrome feedback with weight; research 3.4 sanctions it on exactly that control. Note the HIG critic flagged C's version as a hard offset shadow; the merged version must use the claymorphism recipe (inset light, inset dark, tinted drop) and animate `transform`, never `box-shadow`.
- From B, section 6, the page-numbered provenance label ("Open page 3" replacing "Show the page") and B's error grammar (cause in one sentence, next step in the next). Named by the cozy critic.

## Recommendation to the owner

Winner: A, Paper & Pixel. Absorb: B's sheet under the window (evidence table plus the single pinned bar, counted as one move) and C's accent cap tokens (the second move). Take B's "Open page N" label and error grammar as copy, not as a design move. The extruded ink primary from C is a judgment call for the owner: it is the only tactile move on the table, and it is also the one most likely to drift back toward the sticker look.

On approval the design lead writes `docs/design/site/02-design-brief.md` and `docs/design/site/tokens.json`, the motion director writes `03-motion.md`, and round 2 builds the `frontend/app/design` gallery route.
