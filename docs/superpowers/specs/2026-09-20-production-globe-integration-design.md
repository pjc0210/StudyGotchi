# Production globe integration

Date: 2026-09-20  
Status: approved in chat; awaiting review of this written specification

## Goal

Move the approved interactive course globe from `prototypes/world-lab` into the
production Next.js frontend without embedding the lab or shipping its proof UI.
The public landing page keeps the simple fake SVG globe. Entering the signed-in
Earth experience reveals the real globe through a smooth landing transition.

The authenticated Earth page becomes a full-viewport space scene with native
HTML controls floating over it. Uncovered areas remain space, so the planet
feels large instead of framed inside a dashboard.

## Decisions

- The public `/` route keeps `components/site/EarthGlobe.tsx` as the fake globe.
- `/earth` receives the real, data-driven React Three Fiber globe.
- The globe first opens in course-selection mode.
- The existing course island remains the destination of an explicit **Land**
  action. This project does not redesign the inside-biome experience.
- Pixel grain is fixed at `1.5` for production. Text and controls remain native
  resolution.
- The three-line 3D crest props shown in the user's reference are removed.
- Pixel-water texture remains, with interpolation between frames so the texture
  travels instead of teleporting.
- Continents use fine pixel grass, irregular multi-lobe silhouettes, and small
  course-biome districts.
- The left navigator is a hybrid tree: Course → topics/concepts → supporting
  files.
- Space follows the operating-system light/dark preference by default. A user
  setting can override it with System, Light, or Dark.
- The approved Paper & Pixel provenance bubble is the popup language for
  courses, concepts, landmarks, and residents.

## Current production flow

- `frontend/app/page.tsx` renders the public hero and fake `EarthGlobe`.
- `frontend/app/earth/page.tsx` renders `EarthShell`.
- `frontend/components/earth/EarthShell.tsx` currently places either the fake
  `EarthGlobe` or the old `WorldPage` behind a nearly full-height left panel.
- `frontend/components/world/WorldPage.tsx` loads one selected course and
  dynamically imports the existing island canvas.
- `frontend/components/world/WorldCanvas.tsx` owns the current island renderer.
- `frontend/app/globals.css` owns the paper site and Earth layout.

The real globe replaces the fake globe branch inside `EarthShell`; the existing
`WorldPage` branch remains the course destination.

## Architecture

### Production renderer boundary

Create a production-owned globe module under:

```text
frontend/components/world/globe/
  CourseGlobeCanvas.tsx
  CourseGlobeScene.tsx
  GlobeTerrain.tsx
  GlobeOcean.tsx
  GlobeShips.tsx
  GlobeTown.tsx
  PixelComposer.tsx
  globe-spec.ts
  globe-types.ts
  globe.css
```

The production frontend must not import from `prototypes/world-lab`. The lab
remains the visual proving ground; the production module ports the accepted
logic behind a smaller data-driven API.

`CourseGlobeCanvas` is a Client Component and is dynamically imported with
`ssr: false`. The surrounding route and paper UI remain ordinary Next.js
components. This follows the Next.js browser-only component boundary and keeps
Three.js out of server execution.

The component contract is:

```ts
interface CourseGlobeCourse {
  id: string
  code: string | null
  name: string
  biome: GlobeBiome
  progress: number | null
  stats: CourseStats | null
}

interface CourseGlobeCanvasProps {
  courses: CourseGlobeCourse[]
  activeCourseId: string | null
  theme: "light" | "dark"
  arriving: boolean
  reducedMotion: boolean
  onActiveCourseChange(courseId: string): void
  onCourseTownOpen(courseId: string, anchor: ScreenPoint): void
}
```

No prototype story copy, pixel slider, back button, or navigation card ships in
the canvas. All user-facing UI remains HTML in `EarthShell`.

### State ownership

`EarthShell` owns:

- `activeCourseId`: the course focused by the globe and reflected in statistics.
- `expandedCourseIds`: tree disclosure state, independent of globe focus.
- `expandedTopicIds`: nested tree disclosure state.
- `enteredCourseId`: null in globe mode; set by the explicit **Land** action.
- `popup`: the one currently open course/concept/resident popup.
- `arrivalPhase`: fake-to-real entrance state.

Expanding a disclosure never rotates the globe. Clicking a course title changes
`activeCourseId`, rotates the globe, and updates the statistics. Globe snapping
changes the same `activeCourseId` and reveals that course in the tree without
collapsing any independently explored branches.

The current global identity course changes only when the user chooses **Land**.
Exploration and camera focus must not mutate API identity.

### Data access

Add explicit course-aware API methods rather than temporarily mutating the
identity store:

```ts
getWorldForCourse(courseId: string): Promise<WorldResponse>
listResourcesForCourse(courseId: string): Promise<CourseResource[]>
```

Both methods use the current student id and an explicit course id in the URL.
The existing identity-dependent methods remain for current callers.

The overview lazily loads:

1. active-course world and resources;
2. a course when its tree node is first expanded;
3. no hidden course data until either event occurs.

Cache results by course id for the session and invalidate the active course
after ingest. Do not issue one request per course on initial page load.

Build the hybrid tree from:

- topics/concepts: `WorldResponse.regions`, grouped by `cluster_id`;
- files: `ResourceOut`, attached through `concept_ids`;
- unmatched files: a final **Other files** node;
- statistics: reached/total concepts, mastered count, resident count, source
  count, and world version.

Unknown progress is represented honestly. A course town uses a neutral
footprint until its world summary has loaded; no fabricated percentages ship.

## Authenticated Earth layout

### Desktop

The WebGL stage is `position: absolute; inset: 0` and remains full viewport.
The current `.earth-stage.beside-panel` horizontal crop is removed for globe
mode.

The header and navigator float above the stage:

```text
+--------------------------------------------------------------------------------+
| StudyGotchi  Earth  Graph                   [account / settings]                |
|                                                                                |
| + Course navigator + stats +                       REAL GLOBE                  |
| | ▾ 6.1210 Algorithms                          (course selection)              |
| |   ▾ Sorting                                                                |
| |     Merge sort                                                             |
| |       pset-02.pdf                                                           |
| |   ▸ Graphs                                                                 |
| |                                                                            |
| | 68% reached · 3 residents                                                  |
| | [Land]                                                                     |
| +----------------------------+                                               |
|                                                                                |
+--------------------------------------------------------------------------------+
```

The navigator is content-height with a viewport-constrained maximum, not a
full-height opaque rail. It uses solid cream paper, the ink alpha ramp, a
hairline edge, and the existing Paper & Pixel typography. Space remains visible
above, below, and between controls. No glass blur or gradient is introduced.

### Mobile

- The globe remains full-screen.
- The navigator becomes a bottom sheet capped near 42dvh.
- The active course summary and **Land** action remain visible above the scroll
  area.
- The provenance bubble docks above the sheet rather than obscuring the globe.
- Course focus remains operable with swipe, wheel-equivalent controls, arrow
  buttons, and the tree.

## Public fake globe and entry motion

The public landing globe stays SVG and decorative for signed-out visitors.

Wrap the fake globe on `/` and the real globe stage on `/earth` in React
`ViewTransition` elements with the same name. Signed-in navigation uses a typed
Next.js route transition. Supported browsers morph the fake globe's screen
bounds into the real stage. The named destination is the immediate stage
container, not the dynamically loaded Canvas, so the shared pair still exists
while WebGL is loading.

The destination also owns a fallback entrance for login redirects and browsers
without shared transitions:

1. The real globe starts at the fake globe's bottom-right scale and offset.
2. Over 720 ms on the existing aperture curve, it expands and settles into the
   authenticated composition.
3. Stars fade in during the middle third.
4. The navigator rises 8 px and fades in after the globe is recognizable.
5. Camera rotation settles on the active course without overshoot.

Only transform and opacity animate. Nothing changes layout during the entrance.
With `prefers-reduced-motion`, the globe crossfades for 100 ms and all movement
snaps to its destination.

## Space themes and user setting

The Earth space theme is separate from the paper chrome and the dark knowledge
graph shell.

### Light space

- Background: warm near-white/light lilac, flat rather than gradient.
- Stars: sparse black or near-black single-pixel dots with deterministic
  placement and varied size.
- Atmosphere: cool pale cyan, kept faint enough to read on light space.
- Routes: ink/lilac values that maintain contrast.

### Dark space

- Background: deep navy-violet.
- Stars: cream and pale cyan.
- Atmosphere and routes reuse the globe palette.

CSS uses `prefers-color-scheme` for the default. A signed-in account settings
popover adds **World background** with System, Light, and Dark radio options.
Store the preference at `studygotchi:space-theme`. A tiny pre-hydration script
sets the resolved data attribute before paint to avoid a light/dark flash.

The setting affects Earth and visited-world space only. It does not silently
restyle the knowledge graph.

## Globe visual changes

### Fidelity

- Production pixel grain: `1.5`.
- Terrain atlas: at least 320 × 320, nearest filtered.
- Water pattern: at least 48 × 48.
- Terrain/water sphere density: at least 224 × 160.
- Canvas DPR: adaptive `[1, 1.5]`, with performance decline falling back to 1.
- HTML text never enters the pixel pass.

This makes land and water pixels slightly smaller than the accepted 2 px proof
and communicates a larger planet without removing the Modern DS treatment.

### Water

- Keep indexed pixel crests.
- Use a seamless interpolated loop and slow UV advection.
- Remove `MacroWavePatch` and `MacroWaveLayer` entirely. The three cyan crest
  tubes in the supplied image must not render.
- Keep low-amplitude continuous vertex motion.
- Keep shore foam in the material rather than as floating crest objects.

### Ships

Replace the current primitive silhouettes with three readable low-poly models:

1. schooner: tapered hull, deck, mast, two sails, stern flag;
2. harbor tug: hull, cabin, roof, stack, two portholes;
3. small ferry/cargo boat: hull, raised bridge, rail blocks, two cargo shapes.

Ships retain toon materials and the same palette. Their motion follows a
spherical route with slow heading changes and gentle bobbing. Wakes are flat,
short pixel stipples in the water material; they must not recreate the removed
three-line crest objects.

### Geography

Keep the accepted rules:

- green shared continents;
- sparse clustered pixel grass;
- irregular multi-lobe continents with bays, necks, and peninsulas;
- small softly blended biome districts around course towns;
- no circular continent caps and no hard biome-to-biome seam.

## Popups

Create a reusable native-HTML `ProvenanceBubble` based on Direction A:

- one popup at a time;
- paper sheet, hairline edge, speaker/entity tab;
- title/line in the Paper & Pixel hierarchy;
- source reference in utility mono;
- optional **Show the page** action only when the API supplies a resolvable
  source/page;
- Escape, outside click, and selecting another entity dismiss it;
- focus moves into the popup and returns to the triggering control;
- desktop tail points to the projected world anchor;
- mobile presentation docks above the navigator sheet.

In globe overview, a town opens a course summary bubble. Inside a course, concept
and resident interactions use the same component. The current API does not
provide page-level provenance in `WorldRegionOut`; the UI must hide unavailable
actions rather than invent references.

## Loading, failure, and fallback

- While WebGL loads, show the fake globe silhouette in the destination bounds.
- If WebGL is unavailable, keep the SVG globe interactive through accessible
  course buttons.
- If active-course data fails, the globe remains usable and the corresponding
  tree node shows a retry action.
- If resource loading fails, concepts and course statistics still render; only
  the file children show the error.
- Empty accounts show an ocean-first real globe and a compact **No courses yet**
  paper state.
- Canvas resources and custom textures/materials are disposed on unmount.

## Accessibility

- Every course town has a matching native course control in the tree.
- The canvas is not the only way to select or enter a course.
- The tree follows standard disclosure button semantics.
- Theme controls are a labelled radio group.
- Popup focus and dismissal follow dialog/popover expectations.
- Light and dark route, star, and text colors meet contrast requirements.
- Reduced-motion behavior is complete, not merely shorter.

## Performance

- Dynamically load the production globe only on authenticated Earth/visit pages.
- Lazy-load course details and cache by id.
- Reuse one terrain atlas between land and water materials.
- Avoid a second renderer, iframe, or hidden lab canvas.
- Pause or demand-render when the document is hidden.
- Use adaptive DPR and keep the number of ships small.
- Preserve deterministic generation so terrain does not rebuild on ordinary
  React renders.

## Verification

### Automated

- Pure globe tests: deterministic layout, irregular continent construction,
  course positions on land, grass variation, interpolated water frames, and
  theme palette selection.
- Tree adapter tests: clusters, concept/file attachment, unmatched files,
  statistics, lazy-cache behavior, and independent disclosure/focus state.
- Theme tests: system resolution and persisted override.
- Typecheck and production Next.js build.

Add a focused Vitest setup to `frontend` for pure modules if no test runner is
present. Do not duplicate the world-lab test suite wholesale.

### Browser

Verify on the real `/` and `/earth` routes:

- signed-out landing still shows the fake globe;
- signed-in navigation morphs or falls back cleanly to the real globe;
- light space uses black star dots;
- dark space uses cream stars;
- settings persist System/Light/Dark;
- tree disclosure does not move the globe;
- course selection synchronizes both surfaces;
- **Land** enters the existing course island;
- popup desktop and mobile states;
- no three-line macro wave objects;
- ships remain readable at 1.5 px grain;
- reduced motion;
- 390 px, 900 px, and 1440 px layouts.

Use the existing production `/design` gallery as the durable review surface;
do not add Storybook or a throwaway harness. Register a thin screen that renders
the real production components and exposes light/dark space plus overview,
popup, loading, and empty states through query controls. The gallery must not
fork globe or navigator implementation.

## Non-goals

- Redesigning the inside-course biome or replacing the current island renderer.
- Building page-level provenance not supplied by the backend.
- Replacing the knowledge graph's dark shell.
- Making the public landing globe real WebGL.
- Importing production code directly from `prototypes/world-lab`.

## Acceptance criteria

1. The public landing page keeps the fake globe.
2. Authenticated Earth shows the real interactive globe in course-selection
   mode after a smooth, reduced-motion-safe arrival.
3. Space fills the viewport behind compact paper UI.
4. Light mode is light space with black stars; System/Light/Dark can be chosen
   in signed-in settings and persists.
5. The left hybrid tree and globe selection stay synchronized while disclosure
   remains independently explorable.
6. An explicit **Land** action enters the existing course island.
7. Production grain is finer than the proof, macro crest objects are gone, and
   all three ships are visibly upgraded.
8. Provenance/course popups use the approved Paper & Pixel bubble behavior.
9. Loading, errors, no-WebGL, empty accounts, mobile, and reduced motion all
   have usable states.
10. Pure tests, typecheck, build, and browser verification pass.
