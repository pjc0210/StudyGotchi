# Frontend biome integration handoff

Audience: the active frontend implementation conversation in transcript `a2cffcf4-0922-417c-97d1-fd3bb175b203`.

## Override from Philote

The earlier product-shell plan line, "Do not rebuild the full biome-kingdom island in this pass," is superseded by Philote's 10:37 request. Integrate the actual planet biomes into the frontend now.

This changes the World implementation scope, not the product-shell direction. Keep the shared Paper & Pixel tokens, viewport-locked pages, shared header, World/Space navigation, account/settings placement, landing work, and globe-to-constellation transition already in progress. The biome work should stay under the existing world renderer seams. Do not rewrite `ProductHeader`, `SiteHeader`, top-bar tokens, global typography, landing copy, or constellation chrome as part of this integration.

## Correct local camera contract

Every local biome is a front-facing diorama:

- Camera stays south/front and looks north/back.
- Pitch is clamped to `34-40deg`.
- Yaw is clamped to `-35deg..+35deg`.
- The skyline exists only at north/back. East and west wings may taper into fog.
- Land or water continues beneath the south/front camera and disappears through crop/fog.
- No front ridge, front cliff, front coastline, visible terrain edge, 360-degree orbit, or circular enclosure.
- District focus changes the target and framing while remaining in the same front hemisphere.
- Acceptance uses left, centre, and right yaw at default and maximum dolly, at both `34deg` and `40deg` where the sandbox contract exposes both pitches.

Do not restore the older free-orbit interpretation to make an imported scene fit the current `Island` controls.

## Source-of-truth inventory

Machine-readable details are in `prototypes/biome-sandboxes/integration-manifest.json`.

### Frontier Town

- Selected direction: `A - Ochre Railhead`.
- Latest plan: `docs/design/world/maps/frontier-town-plan-v4.svg`.
- Direction sheet: `docs/design/world/biomes/frontier-town-directions.md`.
- Sandbox: `prototypes/biome-sandboxes/frontier-town`.
- Reuse: `src/layout/biome-layout.ts`, `src/camera/stations.ts`, `src/state.ts`, `src/scene/FrontierScene.tsx`, `src/render/PixelComposer.tsx`, and `src/render/materials.tsx`.
- Current technical result: 19/19 tests pass, oxlint passes, both TypeScript projects pass, and a Vite production build passes. The standalone bundle has the common `>500 kB` warning.
- Current visual result: `screenshots/` contains 27 PNG files. The worker verified the core v4 camera/art pass and inspected six district images plus `reference-comparison-board.png`, but the stop arrived during replacement of the legacy screenshot suite. Some old horizon files still describe the rejected eight-azimuth/circular model, so the 27-file count is not a fully current acceptance matrix.
- Additional visual source: `public/comparisons/` contains six inspected district captures: `main-town.png`, `railway.png`, `ranch.png`, `mine.png`, `dig.png`, and `reserve.png`.
- Integration recommendation: `ready`. This is the most integration-ready sandbox. Reuse current source and the six comparison images, but generate a fresh frontend camera matrix instead of treating every legacy screenshot as current.

### Coastal Ruins

- Selected direction: `A - Salt-White Working Coast`.
- Latest plan: `docs/design/world/maps/coastal-ruins-plan-v3.svg`.
- Direction sheet: `docs/design/world/biomes/coastal-ruins-directions.md`.
- Sandbox: `prototypes/biome-sandboxes/coastal-ruins`.
- Reuse: `src/layout/biome-layout.ts`, `src/layout/terrain.ts`, `src/camera/`, all modules in `src/scene/`, `src/state.ts`, `src/render/PixelComposer.tsx`, and `src/render/materials.tsx`.
- Current technical result: the latest interrupted art edits had no worker verification at stop. A post-stop re-audit now has 14/14 tests passing, oxlint passing, both TypeScript projects passing, and a Vite production build passing. This proves the current source compiles; it does not visually approve the latest edits.
- Current visual result: `screenshots/` contains 26 files: 25 prior verified PNGs plus `manifest.md`. The suite includes overview, five districts, landmark stages, six yaw/dolly views, seeds, catastrophe, boat, marker, and comparison evidence. Every PNG predates the latest partial terrain, skyline, and district-anchor edits.
- Additional visual source: `public/reference/` contains five downloaded source-reference JPGs plus the older plan-v2 SVG.
- Known drift: the active layout and tests are plan v3, but `README.md`, `App.tsx`, and `public/reference/coastal-ruins-plan-v2.svg` still cite v2. Port v3 data.
- Integration recommendation: `blockout`. The prior images validate the camera and pre-polish blockout. Review the current scene modules as partial art source and recapture before calling the new art pass accepted.

### Jungle / Forest Village

- Selected direction: `A - River-Canopy Commons`.
- Latest plan: `docs/design/world/maps/jungle-forest-village-plan-v3.svg`.
- Direction sheet: `docs/design/world/biomes/jungle-forest-village-directions.md`.
- Sandbox: `prototypes/biome-sandboxes/jungle-forest-village`.
- Reuse only the active Jungle path: `src/layout/jungle-layout.ts`, `src/layout/terrain.ts`, `src/camera/stations.ts`, `src/jungle-state.ts`, `src/scene/JungleScene.tsx`, `src/render/PixelComposer.tsx`, and `src/render/materials.tsx`.
- Do not reuse the copied Ice Town path: `src/layout/biome-layout.ts`, `src/scene/BiomeScene.tsx`, and the generic copied scene/state files paired with it.
- Current technical result: 45/45 tests pass. Oxlint exits successfully with an unused-function warning. TypeScript fails on `src/scene/JungleScene.tsx:57` because `Ellipse` is unused, so the production-build command stops before Vite.
- Current visual result: `screenshots/` contains 23 files: 22 PNGs from the prior verified pass plus `README.md`. That suite covers overview, arrival, five districts, landmark stages, six camera views, seeds, catastrophe, and a real-reference comparison board. The latest partial terrain polish was not rebuilt, tested, or recaptured.
- Additional visual source: `public/references/` contains five source images and `public/comparisons/` contains `canopy.png`, `falls.png`, `lagoon.png`, `ruins.png`, and `riverworks.png`.
- Known drift: README cites plan v2; the current direction and latest map are v3.
- Integration recommendation: `hold` until the unused `Ellipse` failure is fixed, the active-source boundary is isolated, and current polish is recaptured. The 22 verified PNGs remain valid evidence for the prior blockout, not the interrupted polish.

### Medieval Meadow Kingdom

- Selected direction: `A - Green Crown Commons`.
- Latest plan: `docs/design/world/maps/medieval-meadow-kingdom-plan-v3.svg`.
- Direction sheet: `docs/design/world/biomes/medieval-meadow-kingdom-directions.md`.
- Sandbox: `prototypes/biome-sandboxes/medieval-meadow-kingdom`.
- Reuse: `src/layout/biome-layout.ts`, `src/layout/terrain.ts`, `src/camera/`, all modules in `src/scene/`, `src/state.ts`, `src/render/PixelComposer.tsx`, and `src/render/materials.tsx`.
- Current technical result: 16/16 tests pass, oxlint passes, both TypeScript projects pass, and a Vite production build passes. The standalone bundle has the common `>500 kB` warning.
- Current visual result: `screenshots/` contains nine verified PNGs only: six left/centre/right default/max-dolly camera frames and three growth frames at 0, 50, and 100 percent. There are no verified district, landmark-detail, catastrophe, reference-board, or full art-pass captures.
- Stop state: the art-direction pass was intentionally aborted and must not be described as complete.
- Integration recommendation: `blockout`. Reuse the tested layout/camera contract and the nine images as camera/growth evidence only.

### Nordic Volcanic Highlands

- Selected direction: `A - Fjord First / Ashen Homesteads`.
- Latest plan: `docs/design/world/maps/nordic-volcanic-highlands-plan-v4.svg`.
- Direction sheet: `docs/design/world/biomes/nordic-volcanic-highlands-directions.md`.
- Sandbox: `prototypes/biome-sandboxes/nordic-volcanic-highlands`.
- Reuse: `src/layout/biome-layout.ts`, `src/camera/stations.ts`, `src/camera/CameraRig.tsx`, `src/state.ts`, `src/scene/BiomeScene.tsx`, `src/render/PixelComposer.tsx`, and `src/render/materials.tsx`.
- Current technical result: 15/15 tests pass, oxlint passes, both TypeScript projects pass, and a Vite production build passes. The standalone bundle has the common `>500 kB` warning.
- Current visual result: `screenshots/` contains 40 files: 34 PNGs and six JPG source references. The set includes verified overview, six camera views, five district views, three landmark stages, seeds, catastrophe, comparison board, contact sheet, plan reference, and QA captures. This is valid evidence for the prior blockout/camera state, not proof that every proposed major-art-pass item was completed.
- Stop state: the final continuation performed inspection only and made no edits, ran no checks, and captured no new screenshots. Existing files were preserved.
- Known drift: README cites plan v2 while the current direction and latest map are v4.
- Integration recommendation: `blockout`. Use the existing screenshot/contact set as a reference baseline and recapture in the frontend after porting.

## Screenshot truth

Shell `rg --files` confirms these exact screenshot-root counts:

- Frontier: 27 PNGs. Reuse the six `public/comparisons/*.png` district captures and treat the mixed legacy `screenshots/` folder cautiously because its refresh was interrupted.
- Coastal: 26 files, comprising 25 PNGs and `manifest.md`. They prove the prior blockout/camera pass and predate the latest interrupted art edits.
- Jungle: 23 files, comprising 22 PNGs and `README.md`. They prove the prior verified art pass and predate the latest partial polish.
- Medieval: nine PNGs. They prove camera closure and three growth states only; the art pass was intentionally aborted.
- Nordic: 40 files, comprising 34 PNGs and six JPG source references. They prove the inherited blockout/camera/contact-sheet state; the final continuation made no edits.

These captures are reusable visual evidence, but none substitutes for fresh frontend acceptance after the scenes are ported. Use the five latest SVG maps as layout authority. Never describe the interrupted Coastal/Jungle polish or aborted Medieval art pass as complete.

## Current frontend seams

### `frontend/components/earth/EarthShell.tsx`

This remains the product-level owner of:

- globe versus local-biome level;
- selected course and the left panel;
- selected/hovered concept coordination;
- upload, change feed, and concept card;
- entry/exit audio.

Its biome change should be small: resolve the selected course's local biome id and pass it to `WorldPage`. Do not move shell or header styling into biome modules.

### `frontend/components/world/WorldPage.tsx`

This remains the data boundary:

- fetch and validate `WorldResponse`;
- compute changes and audio;
- adapt API data into render data;
- preserve `selectedId`, `hoveredId`, and callbacks.

Add a required local-biome id for owned worlds and an optional one for shared worlds. Keep API loading and error UI here.

### Globe roster and marker

The current roster path is:

- `frontend/lib/world/globe-courses.ts`
- `frontend/components/world/globe/globe-types.ts`
- `frontend/components/world/globe/globe-spec.ts`
- `frontend/components/world/globe/GlobeTown.tsx`

`CourseGlobeCourse.biome` currently selects one of seven broad globe palettes. Keep that field for globe terrain, and add a separate `localBiome` field for the five actual local scenes. Do not overload the existing five-value `frontend/lib/world/types.ts#BiomeId`, which currently describes resident/place palettes inside the generic island.

Replace the generic marker body in `GlobeTown.tsx` with a registered biome marker when `localBiome` is present. Preserve `GlobeTownOpenEvent`, focus behavior, course selection, and the existing `CourseGlobe` public props.

### Island and local renderer

The current local path is:

- `frontend/components/world/WorldCanvas.tsx`, which owns one `<Canvas>`;
- `frontend/components/world/Island.tsx`, which renders the generic circular island and free camera;
- `frontend/lib/world/adapter.ts`, which maps clusters to generic island places.

Keep one Canvas. `Island` becomes a fallback for unknown or shared legacy worlds. Actual courses render through a biome registry. Do not nest a sandbox Canvas, mount a Vite app, import a sandbox panel, or copy five app shells.

## Target frontend files and interfaces

Create these integration-owned files:

- `frontend/components/world/biomes/types.ts`
- `frontend/components/world/biomes/registry.ts`
- `frontend/components/world/biomes/BiomeWorld.tsx`
- `frontend/components/world/biomes/BiomeConceptLayer.tsx`
- `frontend/components/world/biomes/BiomeCameraRig.tsx`
- `frontend/components/world/biomes/PixelComposer.tsx`
- `frontend/components/world/globe/BiomeGlobeMarker.tsx`
- `frontend/lib/world/biome-assignment.ts`
- `frontend/lib/world/biome-adapter.ts`

Create one lazy module folder per biome:

- `frontend/components/world/biomes/frontier-town/`
- `frontend/components/world/biomes/coastal-ruins/`
- `frontend/components/world/biomes/jungle-forest-village/`
- `frontend/components/world/biomes/medieval-meadow-kingdom/`
- `frontend/components/world/biomes/nordic-volcanic-highlands/`

Each folder should contain only its pure layout/generation files and a scene component. Use names such as `layout.ts`, `terrain.ts` when present, `stations.ts`, and `Scene.tsx`. Import shared materials, pixel composer, camera behavior, concept interaction, and creature rendering from the integration layer.

Use this contract:

```ts
export type LocalBiomeId =
  | "frontier-town"
  | "coastal-ruins"
  | "jungle-forest-village"
  | "medieval-meadow-kingdom"
  | "nordic-volcanic-highlands";

export interface BiomeModule {
  id: LocalBiomeId;
  direction: string;
  districtIds: readonly string[];
  camera: {
    pitch: readonly [34, 40];
    yaw: readonly [-35, 35];
    defaultDolly: number;
    maxDolly: number;
  };
  createLayout(seed: number): unknown;
  conceptAnchor(
    districtId: string,
    conceptId: string,
    index: number,
  ): readonly [number, number, number];
  Scene: React.ComponentType<BiomeSceneProps>;
}

export interface BiomeSceneProps {
  runtime: BiomeRuntime;
  selectedConceptId: string | null;
  hoveredConceptId: string | null;
  changedConceptIds: ReadonlySet<string>;
  onSelectConcept(id: string | null): void;
  onHoverConcept(id: string | null): void;
}

export interface BiomeRuntime {
  seed: number;
  districtProgress: Readonly<Record<string, number>>;
  courseProgress: number;
  night: boolean;
  concepts: readonly BiomeConcept[];
}
```

`biome-adapter.ts` should map engine clusters to biome districts deterministically:

1. Sort places by stable cluster id.
2. Assign each place to a biome district by stable seeded order.
3. Map each region's `terrain_height` to its district population contribution.
4. Average contributions for district progress, clamped to `0..1`.
5. Keep concept ids, semantic state, creature state, and change pulses attached to generated concept anchors.
6. Use the sandbox's fixed terrain, hydrology, preserves, routes, skyline, seed rules, and landmark progression. API progress changes population and skyline, never settled-ground elevation.

`BiomeConceptLayer.tsx` replaces the sandbox debug panel as the interaction surface. It should render pick targets and residents at module-provided anchors, call the existing selection/hover callbacks, and leave the concept card in `EarthShell`.

## Safe porting rules

- Copy source logic, not package structure.
- Do not copy any sandbox `package.json`, `main.tsx`, `App.tsx`, `Panel.tsx`, `app.css`, `index.html`, Vite config, download helper, URL-query harness, reference board, or nested `<Canvas>`.
- Keep one shared `@react-three/fiber` Canvas in `WorldCanvas.tsx`.
- Consolidate the five copied `PixelComposer` and material helpers into one frontend implementation.
- Lazy-load each local scene from `registry.ts`. A course visit should load one biome chunk, not all five.
- Preserve `EarthShell` panel state and `WorldPage` API state. A biome scene receives derived runtime state and interaction callbacks only.
- Keep sandbox testable pure layout/generator functions close to their original shape. Avoid a visual rewrite during the first port.
- Treat `Island.tsx` as fallback until all five modules meet screenshot acceptance.
- Keep product tokens in the shell. Biome palettes apply inside WebGL materials, not to the header, page background, or Paper & Pixel controls.
- Keep the globe's current space field and route transition. Local biome entry should replace the generic island only after the current globe selection animation.

## Integration sequence

1. Add `LocalBiomeId`, `biome-assignment.ts`, the registry contract, and unit tests. Add `localBiome` to `CourseGlobeCourse` while preserving its current `biome` field.
2. Add `BiomeWorld`, the shared camera rig, shared pixel composer/materials, and `biome-adapter.ts`. Keep `Island` as fallback.
3. Port Frontier Town first through a thin `Scene.tsx` wrapper. It is technically green and has six inspected comparison captures; split the monolithic scene only where concept anchors or shared rendering require it.
4. Port Coastal and Medieval as blockouts. Coastal's current source is technically green after the post-stop re-audit but newer than its images; Medieval has camera/growth evidence only.
5. Port Nordic as a blockout against plan v4, using its existing 40-file visual set as reference evidence. Do not call the major art pass complete.
6. Fix Jungle's unused `Ellipse` typecheck failure, isolate the active Jungle files from the copied Ice Town files, then port and recapture Jungle.
7. Add the five registered globe-marker silhouettes in `BiomeGlobeMarker.tsx`, driven by the selected direction sheets. Keep existing click/focus behavior.
8. Wire `EarthShell -> WorldPage -> WorldCanvas -> BiomeWorld`, then verify left-panel hover/click selection and globe return behavior.
9. Generate fresh acceptance captures and only then remove the generic `Island` fallback for known local-biome ids.

## Acceptance tests

Port or retain these pure tests for every module:

- deterministic seeds `1`, `7`, and `99`;
- monotonic `0/25/50/75/100%` population bands;
- fixed terrain/hydrology/routes/preserves across progress and seed changes;
- required inter-district gaps;
- fixed landmark stage progression;
- south/front camera clamp, `34-40deg` pitch, `+/-35deg` yaw;
- left/centre/right at default and maximum dolly;
- no south/front skyline or circular enclosure;
- no visible world edge;
- creature framing at least 6% at district stations;
- stable concept-to-district and concept-anchor assignment;
- registry lazy-loads one scene and unknown ids use `Island`.

Add frontend integration tests for:

- globe course selection resolves the expected `localBiome`;
- `WorldPage` passes the API world and change set into the selected biome;
- concept hover updates the `EarthShell` hint;
- concept click opens the existing `ConceptCard`;
- returning to "The planet" restores the globe without remounting product chrome;
- no document scroll at `/earth`; only the left panel may scroll;
- reduced-motion mode removes entry motion but keeps the same final state;
- the World/Space header, account control, and palette tokens are unchanged by biome loading.

## Acceptance screenshots

Capture at `1440x900` with the product header and left panel visible where relevant:

1. Globe with all five actual biome marker types visible across the roster.
2. For each biome: progress 0 overview and progress 100 overview.
3. For each biome: yaw `-35/0/+35` at default dolly and maximum dolly. Foreground must remain open and edge-free.
4. For each biome: one district focus with a resident at least 6% of viewport height.
5. For each biome: selected concept with the existing left `ConceptCard` open.
6. For each biome: night state and one catastrophe/ruin state.
7. Globe-to-biome entry and biome-to-globe return, including reduced-motion.
8. `/earth` at desktop and a narrow supported viewport, proving no document scroll and no header/token regression.

Store new baselines under `frontend/tests/visual/biomes/<biome-id>/`. Do not copy or cite sandbox PNGs until files actually exist and have been reviewed.

## Completion boundary

The integration is complete when all five actual biome ids resolve from the course roster, render through the shared Canvas, obey the corrected front-camera contract, drive the existing concept panel, pass the tests above, and have fresh frontend acceptance screenshots. Passing sandbox unit tests alone does not complete visual integration.
