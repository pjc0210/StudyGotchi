# Questions for Philote

Decided 2026-09-19: level 2 stays on the planet (no flat swap); both scroll mappings get prototyped; night mode is in scope and follows the page colour scheme. The remaining decisions that change the most engineering, each with the designer's pick. Answer by number; "1B, 2A" is enough.

## 1. Wilderness between islands

- A. Shallow sea with stone causeways and plank bridges; islets only at causeway midpoints.
- B. Land: a neutral moor tint (`#cfd6c9`) with sparse boulder clusters, roads as dirt ribbons.
- C. Sea near islands (2° shallows), land beyond, coast all round.

Pick **A**: one tint, crisp island silhouettes, water-and-sky horizon at level 2, and the ring road becomes causeways that belong to something (bible §3).

## 2. Level-2 default elevation

- A. 40° above the tangent plane, horizon in the top 20–30 % of the frame.
- B. 32°: more sky, flatter island, buildings overlap more.
- C. 50°: map-like, horizon only at max dolly.

Pick **A**; B is the fallback if the horizon crowds the island on 16:10 screens.

## 3. Topic snaps

- A. Click a plaza → 500 ms tween to a 38° pose at `2 r_t / tan(FOV_h/2)`, azimuth kept; Escape returns.
- B. No snaps; dolly and orbit only, pills highlight the topic.
- C. Snaps as A plus ←/→ cycling through topics in road order.

Pick **C**: A's pose plus keyboard cycling; costs one extra handler.

## 4. What causeways mean

- A. Ring road in tour order (no data).
- B. Prerequisite edges from `course.prereqs`, ring as fallback.
- C. Edges between courses sharing a demonstrated concept name.

Pick **B**, with A shipping first.

## 5. Marker progress encoding

- A. Tier count = band (1 / 2 / 3 at < 33 / 33–66 / ≥ 67 % demonstrated).
- B. Fixed 2 tiers; progress = prop count and creature presence.
- C. Fixed 3 tiers; progress = lit lamps ringing the pedestal.

Pick **A**: a silhouette change reads at 48 px.

## 6. First biome to build

- A. Ice (assets 5/5, lowest risk).
- B. City (highest payoff, needs 3–4 new props; session agenda in `03-city-session.md`).
- C. Both in parallel.

Pick **A then B**: ice proves the sphere grammar, city applies it after the live session.

## 7. Creatures visible per topic

- A. 0–3: newest three at the hub, then one per topic by progress.
- B. Every finished pset at once, round-robin.
- C. One per topic, never at the hub.

Pick **A**.

## 8. Label style

- A. 3D signpost per marker (level 1) and per plaza (level 2), text on hover or select only.
- B. HTML pills, capped to the selected topic.
- C. Signposts at level 1, pills at level 2.

Pick **A**.

## 9. Concept buildings

- A. A demonstrated concept becomes a building on the road; static decor houses go.
- B. Concepts stay pads with sprout or flag; houses stay static decor.
- C. Both.

Pick **A**: an untouched island is visibly empty, a finished one is visibly a town.

## 10. More than 24 courses

- A. A second planet reachable by a rocket at the last stop; each planet ≤ 24.
- B. Shrink `θ_b` below 18° and let islands touch.
- C. Cap enrolment display at 24, oldest courses archived to a list.

Pick **A** (only needs `R(N)` per planet; nothing else changes). Not needed before N > 24.
