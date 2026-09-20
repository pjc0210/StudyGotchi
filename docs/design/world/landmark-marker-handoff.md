# Landmark and globe-marker handoff

Where this work stands (2026-09-20 09:28) and the prompt to continue it in a new chat.

## State

- **Done**: `docs/design/world/globe-markers.md` is the marker system spec: pedestal grammar (1–3 stacked 12-facet discs, side/top/lip colour roles, material-specific rim treatment), 2–4 signature props in fixed slots at 8 / 6 / 4.8 / 4 m, no signpost (course code lives in the HTML card and hover state), progression by tiers + props + creature, 48 / 96 px acceptance checks, a roster table for all 16 biomes plus Fractal Recursion, and three ownership rules (red-cap lighthouse → ice-town; ship + crane → harbor-town; jagged grey peak + cable → alpine). Transition rule locked: occlusion crossfade, no morph.
- **Done in the lab, not on paper**: the Ice / Chilly Town landmark line (igloo → observatory → red-cap lighthouse on a harbour headland ice rock) exists as primitives in `prototypes/biome-lab/src/scene/Landmark.tsx`; the harbour-headland placement is Philote's pick.
- **Not done**: `docs/design/world/landmark-ice-town.md` (the per-stage landmark sheet asked for in the original handoff), any rendered marker (no pedestal has been drawn or modelled for any biome), a marker review fixture at 48 / 96 px, and any GLB work. The original `parallel-biome-landmark-handoff.md` deliverables were partly superseded by the district-based lab; this handoff picks up the landmark and marker half.

---

You are the landmark and globe-marker artisan for StudyGotchi.

Repository: `/Users/philote/projects-local/StudyGotchi`.

Other chats are active. Do not edit `prototypes/world-lab/`, `prototypes/biome-lab/`, `assets/biomes/catalog.json`, or any existing file under `docs/design/world/` except the two you own below. Do not generate GLBs or run Blender without Philote's explicit approval in this chat. Do not commit.

## Read first

1. `docs/design/world/globe-markers.md` (your spec; every rule in it is binding)
2. `docs/design/world/biome-factory-handoff.md`, section "Lessons from the Ice / Chilly Town lab"
3. `docs/design/world/biome-lab-fix-plan.md`, sections "Fix list" §2 (landmark on the harbour headland) and "Review 2 decisions"
4. `docs/design/world/00-world-bible.md` §4.5 (marker spec; the signpost part is superseded) and §6 (night)
5. `.fleet/org.md` (aesthetic and technical contract, triangle budgets: landmark s1 < 400, s2 < 900, s3 < 1600 tris; props < 300) and `.fleet/reviews/2026-09-19-art-direction-review.md` (how landmarks were scored; ice 5/5 with two fixes)
6. `docs/design/world/refs/kirby-world-pedestals-w1-w9.jpg`, `refs/kirby-w3-pedestal.png`, `refs/penguin-isle-lighthouse-rock.png`, `refs/lowpoly-island-lighthouse.png`, and `docs/design/world/refs/biome-library/GALLERY.md`
7. `assets/landmarks/ice/` renders in `assets/landmarks/renders/ice-*.png` (the existing s1/s2/s3 GLBs, scored reference-grade) and `prototypes/biome-lab/src/scene/Landmark.tsx` (read-only: the current primitive line)

## Locked direction

- Modern DS pixelated 3D, toybox low-poly, 2–3 flat colours + 1 accent per object, readable at 48 px, no protected silhouettes (the Kirby sheet is structure only).
- The globe marker is the biome's 48 px summary: same palette and same 2–4 signature props as the local biome. No signpost, no text in the world.
- Occlusion crossfade on the dive; no morph.
- Landmark line per biome: s1 small and instantly readable; s2 changed silhouette; s3 dominates the district skyline; parts must visibly persist, grow, light up, or gain motion across stages. Ice / Chilly Town: igloo → observatory → red-cap lighthouse on the harbour headland rock; the igloo persists as the keeper's annex.

## Your deliverables

You own exactly two paths:

1. `docs/design/world/landmark-ice-town.md`: stage sheet for s1 / s2 / s3 with dimensions in metres, colour roles with hex, what persists / grows / lights up / moves, the headland rock, the night sweep, the ruin-and-recovery blockout (low priority), and the fixes already requested by the art review (snow cap 0.05 → 0.08 m, lighthouse bands 2 → 3).
2. `prototypes/marker-lab/`: a small Vite + React Three Fiber fixture (mirror `prototypes/biome-lab/` toolchain: same package versions, `tsc -b`, oxlint, vitest, its own port 5182) that renders any roster row from `globe-markers.md` as primitives on a neutral globe patch, with: a biome picker, tier 1/2/3, prop count 2–4, creature on/off, day/night, and three fixed views at 48 px, 96 px, and a 512 px close-up side by side, plus a "sheet" mode that renders all 17 markers in a grid at 96 px. Fixed 2 px pixel pass (reuse the approach in `prototypes/biome-lab/src/render/PixelComposer.tsx`). Marker data lives in `src/markers.ts` as a typed table transcribed from the spec; a vitest suite checks the spec's acceptance rules (no two biomes share both pedestal colour and tallest-prop category; every row has 2–4 props; heights match the slot table; lip contrast vs side ≥ the spec's threshold).

## Working method

- Ice / Chilly Town first; do not touch the other 16 rows beyond transcribing them until the ice marker is approved.
- For each review, present three variants of the ice marker on one board (same camera, same 96 px cell), recommend one, state the trade-off. Philote answers `keep / cut / change` + parameter; apply, re-issue only the changed section, and record the decision with the date in a "Decisions" list at the end of `landmark-ice-town.md`.
- Judge against the references with a side-by-side composite (your render next to the Kirby W3 pedestal and the Penguin Isle lighthouse rock), never against your own impression. Screenshots via headless Playwright to `/tmp/marker-shots/`; do not use the shared Cursor browser tab.
- Ask Philote for a reference image whenever a material or silhouette is ambiguous; save each to `docs/design/world/refs/markers/` with a kebab-case name and a `LEDGER.md` row before analysing it.
- GLBs come later, through `tools/landmark-factory/` and `tools/qa/check_glb.py`, only after Philote approves the primitive marker and says so explicitly.

End your first response with:

1. Your understanding of the marker-to-biome relationship in two sentences.
2. The three ice marker variants you intend to render (one line each).
3. The reference images you need from Philote.
