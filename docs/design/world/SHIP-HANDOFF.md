# World design: ship handoff

Written 2026-09-20 10:36–10:50 by the pause-and-ship audit. Read-only inventory of the world-design effort plus one integration prompt for the product chat (`a2cffcf4`). Nothing here reopens a design decision.

## 1. Status at pause (2026-09-20 10:36)

New world and biome design is paused to ship. Ice / Chilly Town went through four review rounds in `prototypes/biome-lab/` and is the only biome with a reviewed layout model, screenshots, and green layout tests (43/43 at 10:42; the lab is still being edited by another worker, §3). Marker system, landmark line, and growth rules are locked on paper. The factory produced sheets plus validated layouts for academy-town, heavy-industry, future-utopia, and map-plus-direction packs for five off-roster families. The product frontend still renders the generic circular island from `b4f0295` and has consumed nothing from the lab. The integration chat is mid-way through a product-shell plan that deferred biome work; at 10:41 a conflicting handoff (`frontend-biome-integration-handoff.md`) told it to port five factory sandboxes instead of Ice. §7 asks Philote to break that tie; this document assumes Ice ships first.

## 2. Approved and locked

- DS pixel look: fixed 2 px cell at every station, DS toon ramp, native HTML UI, no text in the world. `biome-lab-fix-plan.md` Review 2; factory Lesson 9; `PixelComposer.tsx` (`PIXEL_PROFILE = {2, 0.2, 0.14}`).
- One landmass running into a back skyline that dissolves into fog; never a closed island. `biome-lab-fix-plan.md` §1; Lesson 7.
- Districts: large, non-circular, multi-purpose polygons or strips shaped by the land, each with an anchor readable at 0 %; four big districts plus one solitary island; topics map several-to-one. Review 2; Lessons 1–4.
- Growth = population per district by band (0/25/50/75/100 %: anchor → first buildings + warm accent → half + fences + lamps → all + clutter + string lights → extras); skyline height by course fraction; settled ground never rises. `biome-lab-fix-plan.md` §3; Lesson 5.
- Landmark on the harbour headland rock: igloo → observatory → red-cap lighthouse, igloo persists as annex; stage from course fraction (`landmarkStage`: stake / s1 < 0.5 / s2 < 1 / s3). `landmark-ice-town.md`; `biome-lab-fix-plan.md` §2.
- Globe marker = pedestal (1–3 twelve-facet tiers 16/11.5/7.5 m, side/top/lip roles, material rim) + 2–4 props at 8/6/4.8/4 m in fixed slots, no signpost, occlusion crossfade on the 700 ms dive, no morph. `globe-markers.md` §1–§2, §6.
- Catastrophe: blizzard 2 s → residents fall apart 0.6 s → ruin (crack seams, lights out, props knocked over; data never reduced) → recovery 3 s. `biome-world-structure.md` §8.4; `state.ts` `PHASE_SECONDS`.
- Creature scale rule: ≈ 1.8 m and ≥ 6 % of viewport height at the district station (`creatureScale 1.65`); houses 4.5–6 m. Review 2; Lesson 6; `requiredCreatureScale`.
- ≥ 20 m of empty ground between districts. Review 2; `layouts/validate.mjs`; `biome-layout.test.ts`.
- Whale as a rare event (hidden ~90 %, every 45–90 s seeded, 1 in 4 breaches, never near a district or during a catastrophe). `biome-lab-fix-plan.md` §5; `whaleSchedule`.
- Ice / Chilly Town is the mock biome. `biome-selection.md`; `biome-factory-handoff.md`.
- Ownership: red-cap lighthouse → ice-town; ship + crane → harbor-town; jagged peak + cable → alpine (since cut). `globe-markers.md` §3.
- Day/night from the page colour scheme, 1.2 s, bible §6 table; ice adds aurora and the lighthouse sweep. `00-world-bible.md` §6; `biome-world-structure.md` §5.

## 3. What exists and is usable now

| artifact | path | state | verification (2026-09-20 10:42–10:45) |
|---|---|---|---|
| Ice / Chilly Town lab (Vite + R3F, port 5181) | `prototypes/biome-lab/` | pass 4; **mid-edit by another worker** (files touched 10:27–10:42, new `from-layout-json.test.ts`, `builtin/candy-world.layout.json`, `world/families/*`) | `npx vitest run`: 43 passed / 4 failed, all 4 failures in the new `from-layout-json.test.ts` (academy `dorm-row` 0 slots, utopia `forum` 0 slots, industry `dockyard` 7 < 8, candy gap 18.8 m < 20); `npx tsc -b`: **fails** on `from-layout-json.test.ts` (missing `@types/node`); `npx vite build`: **passes** (3.9 s, chunk-size warning) |
| Ice layout model (pure, no three.js) | `prototypes/biome-lab/src/layout/biome-layout.ts` (`ICE_TOWN_LAYOUT`, `ICE_TOWN_PALETTE`, 6 districts: harbour, town, lake, forest, glacier, station), `terrain.ts` (heightfield, slots, props, paths, seats, floes, pines), `geometry.ts` | usable; ice tests green | `biome-layout.test.ts` 43/43 |
| District / population / skyline model | `biome-layout.ts`: `bandForProgress`, `populationFor`, `courseProgress`, `mountainProfile`, `landmarkStage`, `districtOrder`, `residentSeats` (terrain.ts), `whaleSchedule` | usable | same suite |
| Camera stations + dive | `prototypes/biome-lab/src/camera/stations.ts` (arrival 30°/az 22°, overview 36°/35°, district 30°/30° fit 0.75, resident 18°/9 m; FOV 26; `poseFor`, `divePose`, `easeInOutCubic`), `CameraRig.tsx` | usable | in suite |
| Pixel pass | `prototypes/biome-lab/src/render/PixelComposer.tsx`, `materials.tsx` | usable; 2 px fixed | build passes |
| Scene primitives | `prototypes/biome-lab/src/scene/{Terrain,Structures,Props,Landmark,Residents,Ambient,Catastrophe,BiomeScene}.tsx` | primitives, acceptable for launch | screenshots below |
| Layout export | `buildLayoutExport` → `biome-layout.json` v2; `from-layout-json.ts` (`fromLayoutJson` / `toLayoutJson`) | export usable; JSON import mid-edit | 4 failing tests above |
| Screenshots (pass 4) | `/tmp/biome-shots/p4-*` (arrival-100, overview-0/100, district-forest-town-0/100 + it1–4, district-harbour-100 + it1–6, harbour-night-100, compare-forest-town, compare-harbour) | overview shows landmass, range, six districts, headland lighthouse; compare boards show density gap vs refs closing | no `p5-*` files exist |
| Layout schema + validator | `docs/design/world/layouts/layout.schema.json`, `validate.mjs`, `README.md` | usable | `node validate.mjs`: PASS academy-town (5 districts), future-utopia (5), heavy-industry (5) |
| Designed maps | `layouts/academy-town.{layout.json,map.svg}`, `heavy-industry.*`, `future-utopia.*` | drafts awaiting Philote's picks; validate | PASS; lab import currently fails slot tests |
| Candy world | `prototypes/biome-lab/src/layout/builtin/candy-world.layout.json`, `refs/biome-library/candy-world/` (no LEDGER) | lab-only draft, not in `docs/…/layouts`, no sheet | gap test fails (18.8 m) |
| Marker spec | `docs/design/world/globe-markers.md` | locked | n/a |
| Marker lab | `prototypes/marker-lab/` (`markers.ts`, `iceBouquet.ts`, `IMPLEMENTATION-PLAN.md`) | started, not reviewed | `npx vitest run`: 16/16 |
| Landmark sheet | `docs/design/world/landmark-ice-town.md` | "primitive design approved for review" (10:32) | n/a |
| Handoffs | `biome-factory-handoff.md` (+ Lessons), `landmark-marker-handoff.md`, `parallel-biome-landmark-handoff.md`, `frontend-biome-integration-handoff.md` (10:41, conflicting, §5) | written | n/a |
| Reference library | `refs/biome-library/{ancient-desert, candy-world, coastal-ruins, futuristic-utopia, ice-world, industrial-city, jungle-forest-village, medieval-meadow-kingdom, mit-college-town, nordic-volcanic-highlands, western-frontier}` + `GALLERY.md`, `SOURCES.tsv`; `refs/frontier-town/`, `refs/harbor-town/`; 24 loose ice refs in `refs/` | LEDGER.md present for coastal-ruins, futuristic-utopia, industrial-city, jungle-forest-village, medieval-meadow-kingdom, mit-college-town, nordic-volcanic-highlands, frontier-town, harbor-town; **missing** for ancient-desert, candy-world, ice-world, western-frontier and the loose ice refs | n/a |
| Globe proof (primary chat) | `prototypes/world-lab/src/golden/camera-globe-spec.ts` (grain default 2, range 1–6; `TRACKPAD_SETTLE_MS 520`, `SNAP_DAMPING 4.4`, `GLOBE_CAMERA_PADDING 0.9`, water 32 frames / 180 ms, atlas 256, `markerState` bands at 1/3, 2/3), `golden-spec.ts` (pixel profile 4 / 0.32 / 0.24, FOV 28, `progressState` at 1/3, 2/3), scenes + tests | locked numbers | not re-run here |

## 4. Paused / not started

| item | state |
|---|---|
| Roster biomes with nothing beyond a marker row: ink-world, celestial-garden, harbor-town (ledger only), wildwest (as frontier-town: map v4 + directions, no JSON), volcanic, egyptian-desert, swamp, jungle, forest, city (old sheet), whimsical-land, fractal-recursion | paused at factory step 0–3 |
| Off-roster factory packs: coastal-ruins, jungle-forest-village, medieval-meadow-kingdom, nordic-volcanic-highlands (maps + directions + `prototypes/biome-sandboxes/*`) | paused; not in `biome-selection.md` |
| `biomes/ice-town.md` (asked for in `parallel-biome-landmark-handoff.md`) | never written; `biomes/ice.md` is the superseded 09-19 sheet |
| Marker lab review, rendered pedestals, 48/96 px fixtures | started, unreviewed |
| GLBs (landmark s1–s3 exist in `assets/landmarks/ice/`; nothing for districts or markers) | no new GLBs; primitives ship |
| Factory loop for remaining biomes; `FACTORY-STATUS.md` | stale (09:57; still lists academy/industry/utopia at step 0) |
| Adaptive 3/4 px pass, spiral route, elevation-as-growth | cut |

Open questions copied verbatim from the biome sheets:

**ice.md** (09-19 sheet, largely superseded by the lab)
1. Hub: skating ring on the frozen lake, or the observatory dome on a raised terrace? (pick: ring)
2. Igloo pairs as `snow city` houses, or recoloured city houses only? (pick: alternate both)
3. Coast lighthouse always, or only when the coast topic is complete? (pick: only when complete)
4. Snowfall on by default for ice, or off like every biome? (pick: off, toggle)
5. Lake ice: plain two-facet tint, or dark crack strips? (pick: plain)

**academy-town.md**
1. Accent: **A. marigold `#f2b233`** or B. school-blue `#2f5fd0` (provisional marker row)? Pick **A**: warm against green and brick; blue fights the river.
2. Landmark line: **A. lectern → reading hall → dome hall** or B. bell post → clock tower → dome hall? Pick **A**: the bell tower already lives in the skyline.
3. Solitary island: **A. river observatory with a dock** or B. research boathouse with slipway, no dome? Pick **A**: a white dot in the water reads at 48 px.
4. Corridor: **A. open arcade lane** or B. glass-roofed enclosed corridor? Pick **A**: glass stays on two objects and the residents stay visible.
5. River: **A. across the front, camera arriving over the water at the dome** or B. along the east edge, lawn at the front? Pick **A**: the campus-on-a-river composition.

**heavy-industry.md**
1. Skyline: **A** gantry wall with chimneys between (pick) or B a chimney-and-cooling-tower field with only 3 gantries?
2. Water: **A** harbour basin plus a canal with a lift bridge (pick) or B a river down the east side, no canal?
3. Solitary island: **A** walking-beam pump station (pick) or B an offshore loading platform on legs with a small crane?
4. Residents' homes: **A** brick terraces inside the works town (pick) or B no housing, residents live in the halls?
5. Landmark line: **A** keep the catalog gear line, gear press → press house → great works (pick) or B a new flywheel line, wheel → engine house → power hall?

**future-utopia.md**
1. Skyline: **civic spire rows (pick)** or spires on a low green ridge (ref 01)?
2. Landmark s3 top: **flat observation lens deck (pick)** or a floating halo ring (the lab's `growth_hero`)?
3. Skyport Headland: **keep mast + pads + airship (pick)** or a Lagoon Baths district (terraced pools) if aircraft feel industrial?
4. Marker P4: **terrace-house pair (pick)** or the draft table's hover lamp (lab neon-ring collision at 48 px)?
5. Warm accent: **apricot `#ff9e6e` on pods, canopies and mast (pick)** or blossom `#f2a0c0` everywhere?

**city.md**
1. Downtown towers: stacked house meshes, or a new 3-storey prop? (pick: new prop)
2. Bay boats: static, or one circling at 0.3 m/s? (pick: circling, later)
3. Night flicker-on per building, or all at once? (pick: flicker)

The five off-roster `*-directions.md` sheets each end in a 9–11 line review sheet with designer picks marked; none is answered.

## 5. Integration chat: findings

Source: transcript `a2cffcf4` (672 lines, 17:24 Sat → 10:22 Sun; not flushed since, but `frontend/app/(product)/`, `product.css`, `lib/world/course-overview.ts` were written 10:36–10:44, so it is mid-turn), `git status`, `git log`.

- Asked to build: the whole product. Stack decisions (Next 16 + Vercel; Convex/Clerk later replaced by the FastAPI engine on Railway + Neon + Clerk), PRD/plans, backend build and deploy, 6.1400 / 18.06 / 8.223 loaded onto Neon, two "deepening" passes, 12 commits 01:19–04:52 (`10df697` … `e61dfd3`).
- Owns under `frontend/components/world`: `Blob`, `Character`, `Island`, `WorldCanvas`, `WorldPage`, `golden/*`; under `frontend/lib/world`: `adapter.ts`, `layout.ts`, `types.ts`, `fixture.json`. Uncommitted (10:08–10:44): edits to `Character`, `Island`, `WorldPage`, `golden/*`, `adapter.ts`; new `roster.ts`, `guest-pack.ts`, `globe-courses.ts`, `course-overview.ts(.test)`, `GlbCreature.tsx`, and the `globe/` folder (pixel planet), which the transcript attributes to another agent in the same tree.
- Consumes from the world work: nothing from `prototypes/biome-lab/` or `world-lab/src/golden/`. It read `biome-world-structure.md` and `assets/biomes/catalog.json` once (09:52). The shipped island is still `lib/world/layout.ts`: circular places on a ring (`placeCenter`, `ISLAND_RADIUS 8`), five palette biomes, terrain rising under landmarks (`landmarkHeight`), the exact things Review 1 cut.
- Where it stopped: 10:20 plan "Product shell: landing, world, constellation" (tokens/shell → landing → world motion → constellation → space transition → verify), containing "Do not rebuild the full biome-kingdom island in this pass… Biome art from the other labs slots in later behind the same `WorldPage` seam." At 10:22 it marked `tokens-shell` in progress; by 10:50 the working tree shows the `app/(product)/` route group staged and `AppShell`/`Sidebar`/`TopBar` deleted, so it is on the shell todos.
- Gaps: no district/population model, no progress → band mapping, no stations or dive, island pixel profile still `pixelSize 4`, no landmark line, catastrophe, or whale. Globe numbers drift from the proof (`PRODUCTION_PIXEL_GRAIN 1.5` vs 2; water 48 frames / 150 ms vs 32 / 180; atlas 320 vs 256).
- Conflict: `frontend-biome-integration-handoff.md` (10:41, another chat) overrides that plan line but routes the chat to five off-roster sandboxes and a front-facing camera contract (pitch 34–40°, yaw ±35°) no Ice document uses. Its registry contract is compatible with Ice first; the prompt reuses it.

## 6. Integration prompt

Copy into the `a2cffcf4` chat.

```
Ship the Ice / Chilly Town biome in the product world. Read docs/design/world/SHIP-HANDOFF.md first. Where frontend-biome-integration-handoff.md disagrees with it, SHIP-HANDOFF wins until Philote says otherwise; reuse that file's registry contract (LocalBiomeId, BiomeModule, BiomeRuntime, BiomeSceneProps, biome-adapter.ts), but the only module for launch is "ice-town".

Do not touch prototypes/, docs/, backend/. Keep the product-shell work in progress. Keep one <Canvas> in frontend/components/world/WorldCanvas.tsx; Island.tsx stays as the fallback for unknown biome ids.

(i) Ice biome from the lab.
  - Copy (never import across package roots) prototypes/biome-lab/src/layout/{biome-layout,terrain,geometry}.ts → frontend/components/world/biomes/ice-town/. Pure, no three.js. Drop the `world?: WorldSpec` generic path and from-layout-json.ts; ICE_TOWN_LAYOUT is the data. Port biome-layout.test.ts (43 tests green in frontend vitest).
  - Copy src/scene/{Terrain,Structures,Props,Landmark,Residents,Ambient,Catastrophe}.tsx as Scene.tsx internals; copy render/PixelComposer.tsx (PIXEL_PROFILE {2, 0.2, 0.14}) and render/materials.tsx once into frontend/components/world/biomes/. Do not copy App.tsx, Panel.tsx, main.tsx, app.css. Primitives ship; no GLB work.
  - frontend/lib/world/biome-adapter.ts, from the real WorldResponse:
      districts = districtOrder(ICE_TOWN_LAYOUT) (harbour, town, lake, forest, glacier, station);
      topics = regions grouped by cluster_id (as toCanvasWorld does), sorted by id, assigned round-robin to districts (several-to-one when > 6);
      district progress = mean terrain_height of its regions, 0..1 → bandForProgress → populationFor;
      course fraction = courseProgress(...) → mountainProfile + landmarkStage;
      residents = regions with creature_state !== "unhatched" → residentSeats(layout, progress, count, seed), seed = hash of `${course_id}/${student_id}`;
      one pick target per region at its district slot/seat; keep selectedId / hoveredId / changedIds from WorldCanvasProps so EarthShell's ConceptCard keeps working.
  - ICE_TOWN_PALETTE only inside materials; page tokens untouched.

(ii) Camera. Port src/camera/stations.ts (STATIONS, poseFor, fitDistance, divePose, easeInOutCubic) and CameraRig.tsx behaviour. Entering a course plays the dive once (700 ms cubic from divePose, clouds crossing at 30–50 %) into arrival, then overview; click a district → district station along its stationAzimuth; Escape returns. Globe: keep the frontend globe but re-pin to prototypes/world-lab/src/golden/camera-globe-spec.ts (DEFAULT_PIXEL_GRAIN 2, TRACKPAD_SETTLE_MS 520, SNAP_DAMPING 4.4, GLOBE_CAMERA_PADDING 0.9, water 32 frames / 180 ms; markerState bands at 1/3, 2/3). Occlusion crossfade globe ↔ biome, no morph.

(iii) Day/night from the page colour scheme (prefers-color-scheme or .dark), 1.2 s, bible §6 table (sky/fog #f3e4ee ↔ #2b2640, key #fff1dc 2.0 ↔ #8fa3d8 0.55, windows emissive #ffe9a8 ×1.6); Ambient.tsx already has aurora and stars on `night`.

(iv) Optional: whaleSchedule/whaleStateAt (Ambient.tsx); catastrophe (Catastrophe.tsx, PHASE_SECONDS blizzard 2.0 → bang 0.6 → ruin → recovering 3.0) triggered by the "explode"/"recover" WorldChange kinds adapter.ts already emits.

(v) Do not: add biomes, generate GLBs, morph marker into landscape, draw signposts or any world text, move settled ground with progress, reintroduce circular districts or the adaptive 3/4 px pass.

Acceptance: 1440×900 screenshots of one real course at arrival, overview, harbour district; 0 % vs 100 % overview clearly different (range silhouette + town density, ground unchanged); creature ≥ 6 % of viewport height at the district station (creatureViewportFraction); ported layout tests green plus adapter tests (seeds 1/7/99 deterministic, monotonic bands, ≥ 20 m gaps, stable cluster→district); hover/click updates EarthShell hint / ConceptCard; return to globe restores the pixel planet; no document scroll at /earth.

Defaults for unanswered lab decisions (use, do not ask):
  - Topic→district order: course order from the harbour outward.
  - Only harbour and forest town were polished against references; ship town, lake, glacier, station as they are.
  - Snowfall night only; whale on; clouds on.
  - Camera: lab stations as given (pitch 18–36°, free azimuth on drag), not the 34–40°/±35° contract from the other handoff.
  - Residents = hatched regions (WorldResponse has no pset count).
  - Six districts stay (Review 2 asked for four + island; pass 4 was reviewed on six).
```

## 7. Open questions for Philote

1. Which ships first: Ice / Chilly Town from `prototypes/biome-lab` (reviewed four times, 43 tests green, screenshots exist) or the five off-roster sandboxes in `frontend-biome-integration-handoff.md` (no PNG evidence, one typecheck failure, different camera contract)? Default: Ice only.
2. Camera for the shipped biome: lab stations (30/36/30/18°, free azimuth) or the other handoff's 34–40° pitch / ±35° yaw? Default: lab stations.
3. Residents from hatched concepts (available now) or finished psets (needs a backend field)? Default: hatched.
