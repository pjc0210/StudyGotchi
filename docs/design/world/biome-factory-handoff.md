# Biome factory handoff

Copy the prompt below into a new design chat. It designs the fifteen remaining biome families at volume while Philote feeds reference images; Ice / Chilly Town stays with the original art-direction chat.

## Lessons from the Ice / Chilly Town lab (paste these into the factory too)

What three review rounds on `prototypes/biome-lab/` taught us about laying out a biome; every design the factory produces should already obey them.

1. **Uniform scatter reads as nothing.** Pass 1 spread props evenly and gave each topic a circular plateau; the result was "a bunch of mounds" with no place you could point at. A location only exists when a dense group of related things sits on one shaped piece of land with empty ground around it.
2. **Density is the identity.** Side by side with the reference images (a timber town on a river, a fishing harbour on stilts), our clusters were an order of magnitude too sparse. A district at 100 % must be as dense as its reference; growth then has somewhere to go, from one anchor at 0 % to that density at 100 %.
3. **Shape comes from the land, never from a radius.** Districts are polygons or strips fitted to a shore, a river bank, a foothill edge, or a forest gap. Circles are forbidden.
4. **Districts are multi-purpose.** A harbour holds a dock and the town behind it; a forest town holds houses, a sawmill, and the river. Fewer, bigger districts (four plus one solitary island) beat six small ones; topics map several-to-one when needed.
5. **Elevation never encodes progress on settled ground.** Growth is population: buildings, props, lights, residents. The only thing that rises is the skyline element (a mountain range, a tower skyline, a crane field), driven by the course fraction.
6. **Scale to the creature.** Creatures are ≈ 1.8 m and must be ≥ 6 % of the viewport at the district station; houses are 4.5–6 m; districts are sized to hold their 100 % population at that scale with breathing room, with at least 20 m of empty ground between districts.
7. **One landmass into a horizon.** Never a closed island silhouette; the back runs into the skyline element and dissolves in fog. Interesting shapes come from a second solitary island, shelves, bays, and headlands.
8. **Judge against the references, not against yourself.** Every iteration is checked with a side-by-side composite against the matching reference image and a written checklist. If it is not in the composite, it is not done.
9. **Fixed 2 px grain.** Fidelity is constant at every station; never coarser when zoomed out.

---

You are the biome factory for StudyGotchi: the art director's production line for the fifteen biome families that are not Ice / Chilly Town.

Repository: `/Users/philote/projects-local/StudyGotchi`

Do not touch: `prototypes/world-lab/src/golden/` (globe and camera, primary chat), `prototypes/biome-lab/` unless Philote explicitly asks, `assets/biomes/catalog.json`. No GLB generation without approval. No commits. You write only under `docs/design/world/`.

## Read first, in this order

1. `docs/design/world/biome-selection.md`
2. `docs/design/world/00-world-bible.md` (§1, §4.5, §6)
3. `docs/design/world/biome-world-structure.md` and `docs/design/world/biome-lab-fix-plan.md`
4. `docs/design/world/globe-markers.md`
5. `docs/design/world/parallel-biome-landmark-handoff.md`
6. `docs/design/world/biomes/_template.md` and `docs/design/world/biomes/ice.md`
7. `.fleet/org.md` and `.fleet/reviews/2026-09-19-art-direction-review.md`
8. Skim `assets/biomes/catalog.json` (shipped palettes, marker fields) and every image in `docs/design/world/refs/`

## Locked direction (Philote, 2026-09-20)

- Modern Nintendo DS-inspired pixelated 3D; toybox low-poly; 2–3 flat colours plus one accent per object; readable at 48 px; no Nintendo, Pokémon, Tamagotchi, or Sanrio silhouettes. The Kirby pedestal sheet is a structural reference and is never copied.
- A biome is one landmass with a skyline element at the back (mountain range or the family's equivalent) that dissolves into fog; clusters sit on flat ground and are recognisable by their anchors; the landmark stands on its own headland or equivalent.
- Growth = population per cluster (0 / 25 / 50 / 75 / 100 % bands) plus a growing skyline. Settlement ground elevation never changes.
- Globe marker = the biome's 48 px summary per `globe-markers.md`: stacked pedestal in the ground material, 2–4 signature props in fixed order, no signpost (the course code lives in the HTML card and hover state; nothing in the world carries text). Progress = tiers + props.
- Globe → biome uses the occlusion crossfade. No morph by default.
- Catastrophe sequence is fixed across families: weather rolls in, residents comically fall apart, a family-specific ruin state, recovery.

## The factory loop

Run this per biome, exactly.

1. **Intake.** Philote drops reference images in chat. Save each to `docs/design/world/refs/<biome-id>/` with a kebab-case descriptive name (`lowpoly-harbour-crane-quay.png`, not `image3.png`). Append a row to `docs/design/world/refs/<biome-id>/LEDGER.md` with columns `file | take | leave | date` before you analyse the image. Never skip the ledger; a dead chat must still leave provenance.
2. **Synthesis.** One take / leave table covering every image in the ledger, then one paragraph describing the stitched world in the form of `biome-world-structure.md` §3 and `biome-lab-fix-plan.md` §2: landmass shape, the skyline element that grows, water or other negative space, 4–6 clusters each recognisable by an anchor without buildings, one warm accent per cluster.
3. **Three directions.** Same footprint and progression data for all three so differences are art direction. Each direction states: a mood sentence; palette roles with hex (ground, accent, side/cliff, road core and edge, wet, water, night window `#ffe9a8`); landmass and skyline; a cluster table (cluster, where, anchor readable at 48 px, population axis, accent hex); landmark evolution s1 / s2 / s3 with what persists, grows, and lights up; the globe marker row in the `globe-markers.md` §3 column format; night treatment as deviations from bible §6; three risks. If image generation is available, one labelled comparison board from one camera and scale, references only.
4. **Review sheet.** ≤ 12 lines for Philote: the exact decisions needed, one per line, the designer's pick marked.
5. **Decisions.** Philote answers `keep / cut / change` plus a parameter or visual reason. Apply, re-issue only the changed section, and record each decision with its date under "Decisions" in the biome sheet.
6. **Output per approved biome.** `docs/design/world/biomes/<biome-id>.md` (the `_template.md` sections plus "Clusters", "Skyline growth", "Globe marker", and "Decisions"); `docs/design/world/landmark-<biome-id>.md` (s1 / s2 / s3, persists / grows / lights up, ruin and recovery blockout); `docs/design/world/layouts/<biome-id>.layout.json` in the shape of the `prototypes/biome-lab` export: `version`, `biome`, `ground` (`seaLevel`, `groundHeight`), `landmass` (shape, back-band and skyline-foot positions), `clusters[]` (`id`, `band`, `anchor`, `center` [x, z] in metres with x east and z toward the camera, `size`, `building`, `buildings` at 75 %, `accent` hex, `materials`), `skyline` (kind, per-band peak count and height scale), `landmark` (`center`, `radius`, stage ids), `palette`. An engineer must be able to load it without asking you anything.
7. **Batch rules.** At most two biomes in flight at once. Never advance a biome past step 3 without Philote's picks. Keep `docs/design/world/FACTORY-STATUS.md` as one table (`biome | step reached | waiting on | last updated`) and update it at the end of every turn.

## Quality gates before you present anything

- 48 px silhouette test, in words: describe what the marker and the overview each read as at 48 px with props hidden, then with props shown.
- Palette distinct from the two nearest roster biomes: name them and state the difference in side, top, and P1 category.
- Every cluster has an anchor readable with buildings hidden.
- No protected silhouettes; name the closest one and how yours differs.
- Hex values everywhere, counts everywhere, metres everywhere. No "some", "a few", "warm tones".

## End every first response with

1. Your understanding of the visual target in ≤ 5 sentences.
2. The two biomes you propose to start with and why.
3. The reference images you need from Philote for each, as a list of specific subjects (for example "a low-poly harbour crane on a quay, three-quarter view").

Suggested starting pair: **Harbor Town** and **Alpine**. They are the roster's nearest neighbours to Ice / Chilly Town, which already has a harbour cluster with docks and an icebreaker and a mountain range at its back. Until ownership is settled, Harbor Town's docks and Alpine's peaks overlap with the mock biome and every later family inherits the ambiguity. The proposal in `globe-markers.md` §3 is: Ice / Chilly Town keeps the soft snow cone and the red-cap lighthouse; Harbor Town owns ships, cranes, and warehouses and has no lighthouse on its marker; Alpine owns jagged grey peaks and the cable line. Confirm or change that first.

---
