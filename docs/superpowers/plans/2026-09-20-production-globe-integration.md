# Production Globe Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authenticated Earth course-picker SVG with the approved data-driven 3D globe, full-bleed space themes, hybrid course tree, smooth fake-to-real arrival, Paper & Pixel popups, finer rendering, and upgraded ships.

**Architecture:** Keep the public SVG globe and existing inside-course island. Add a browser-only production globe module under `frontend/components/world/globe`, driven by real course summaries from `EarthShell`. The Canvas fills the authenticated Earth viewport while compact native-HTML controls float above it; explicit course-aware API reads feed the independent tree without mutating global identity until **Land** is chosen.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8 `ViewTransition`, TypeScript 5, React Three Fiber 9.7, Three.js 0.186, Tailwind 4/global CSS, Clerk 6, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-production-globe-integration-design.md`

## Global Constraints

- Keep `frontend/components/site/EarthGlobe.tsx` as the public fake globe.
- Do not import runtime code from `prototypes/world-lab`; port accepted logic into `frontend`.
- Keep the current inside-course `WorldPage`/`WorldCanvas` island as the **Land** destination.
- Production pixel grain is `1.5`; HTML text is never rendered through WebGL.
- Remove `MacroWavePatch` and `MacroWaveLayer`; never recreate the supplied three-line crest object.
- Use full-viewport space behind compact solid-paper UI. No glass blur and no gradient.
- Light space is warm near-white with black star dots. Dark space is navy-violet with cream/cyan stars.
- Theme defaults to system and persists a System/Light/Dark override at `studygotchi:space-theme`.
- Tree disclosure is independent from globe focus. Global identity changes only on **Land**.
- Preserve reduced-motion behavior and a non-WebGL SVG fallback.
- Do not create commits unless the user explicitly requests them. End each task with a review checkpoint instead.

---

### Task 1: Add the frontend test foundation and data-driven globe contract

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/components/world/globe/globe-types.ts`
- Create: `frontend/components/world/globe/globe-spec.ts`
- Create: `frontend/components/world/globe/globe-spec.test.ts`
- Reference only: `prototypes/world-lab/src/golden/camera-globe-spec.ts`
- Reference only: `prototypes/world-lab/src/golden/camera-globe-spec.test.ts`

**Interfaces:**
- Produces:

```ts
export type SpaceTheme = "light" | "dark";
export type GlobeBiome = "ice" | "city" | "meadow" | "forest" | "volcanic" | "sand" | "coast";
export type UnitDirection = [number, number, number];

export interface CourseGlobeStats {
  reached: number;
  total: number;
  mastered: number;
  residents: number;
  sources: number;
}

export interface CourseGlobeCourse {
  id: string;
  code: string | null;
  name: string;
  biome: GlobeBiome;
  progress: number | null;
  stats: CourseGlobeStats | null;
}

export interface ScreenPoint {
  x: number;
  y: number;
}
```

- Produces pure helpers used by later tasks:

```ts
export const PRODUCTION_PIXEL_GRAIN = 1.5;
export const PIXEL_ATLAS_SIZE = 320;
export const WATER_PATTERN_SIZE = 48;
export const WATER_FRAME_COUNT = 48;
export const WATER_FRAME_MS = 150;

export function seededCourseDirections(ids: string[], seed: string): UnitDirection[];
export function nearestCourseNeighbors(sourceId: string, courses: CourseGlobeCourse[], directions: Map<string, UnitDirection>, count?: number): string[];
export function continentLobes(directions: Map<string, UnitDirection>): ContinentLobe[];
export function sampleTerrain(direction: UnitDirection, courses: CourseGlobeCourse[], directions: Map<string, UnitDirection>): TerrainSample;
export function pixelGrassTone(x: number, y: number): -2 | -1 | 0 | 1 | 2;
export function waterFrameState(elapsedMs: number): { current: number; next: number; mix: number };
export function courseMarkerState(progress: number | null): MarkerState;
```

- [ ] **Step 1: Install and expose Vitest**

Run from `frontend`:

```bash
npm install --save-dev vitest
```

Add scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write failing data-driven globe tests**

Create tests that use course ids rather than fixed array indexes:

```ts
import { describe, expect, it } from "vitest";
import {
  PIXEL_ATLAS_SIZE,
  PRODUCTION_PIXEL_GRAIN,
  WATER_FRAME_COUNT,
  WATER_PATTERN_SIZE,
  continentLobes,
  pixelGrassTone,
  seededCourseDirections,
  waterFrameState,
} from "./globe-spec";

const IDS = ["6.1210", "18.06", "8.02", "21W.789"];

describe("production course globe", () => {
  it("uses the approved finer production fidelity", () => {
    expect(PRODUCTION_PIXEL_GRAIN).toBe(1.5);
    expect(PIXEL_ATLAS_SIZE).toBeGreaterThanOrEqual(320);
    expect(WATER_PATTERN_SIZE).toBeGreaterThanOrEqual(48);
  });

  it("places arbitrary course ids deterministically", () => {
    expect(seededCourseDirections(IDS, "student-a")).toEqual(
      seededCourseDirections(IDS, "student-a"),
    );
    expect(seededCourseDirections(IDS, "student-a")).not.toEqual(
      seededCourseDirections(IDS, "student-b"),
    );
  });

  it("never builds continents from one circular cap", () => {
    const directions = new Map(
      IDS.map((id, index) => [id, seededCourseDirections(IDS, "student-a")[index]]),
    );
    const lobes = continentLobes(directions);
    for (const group of new Set(lobes.map((lobe) => lobe.group))) {
      expect(lobes.filter((lobe) => lobe.group === group).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("creates sparse deterministic grass clusters", () => {
    const tones = Array.from({ length: 256 }, (_, index) =>
      pixelGrassTone(index % 16, Math.floor(index / 16)),
    );
    expect(new Set(tones).size).toBeGreaterThanOrEqual(4);
    expect(tones.filter(Boolean).length).toBeLessThan(72);
  });

  it("interpolates a seamless pixel-water loop", () => {
    expect(WATER_FRAME_COUNT).toBe(48);
    expect(waterFrameState(0)).toEqual({ current: 0, next: 1, mix: 0 });
    expect(waterFrameState(75).mix).toBeCloseTo(0.5);
  });
});
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
npm test -- components/world/globe/globe-spec.test.ts
```

Expected: FAIL because the production modules do not exist.

- [ ] **Step 4: Port and generalize the pure globe logic**

Port the accepted math from `camera-globe-spec.ts`, with these mandatory changes:

- derive directions from the stable sorted course ids;
- return maps keyed by course id;
- eliminate `CAMERA_COURSES`;
- keep multi-lobe continents, sparse pixel grass, smooth district blending, and interpolated water timing;
- `courseMarkerState(null)` returns a neutral one-tier marker without inventing progress.

Biome assignment is deterministic:

```ts
const BIOMES: GlobeBiome[] = ["ice", "city", "meadow", "forest", "volcanic", "sand", "coast"];

export function biomeForCourse(courseId: string): GlobeBiome {
  return BIOMES[hashString(courseId) % BIOMES.length];
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
npm test -- components/world/globe/globe-spec.test.ts
npm run typecheck
```

Expected: all new tests pass; typecheck exits 0.

- [ ] **Step 6: Review checkpoint**

Review the pure API for fixed demo-index assumptions and confirm no prototype UI imports entered `frontend`.

---

### Task 2: Add system-aware space themes and the account setting

**Files:**
- Create: `frontend/lib/space-theme.ts`
- Create: `frontend/lib/space-theme.test.ts`
- Create: `frontend/components/theme/SpaceThemeBootScript.tsx`
- Create: `frontend/components/theme/WorldAppearanceSettings.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/components/site/SiteHeader.tsx`
- Modify: `frontend/app/globals.css`

**Interfaces:**

```ts
export type SpaceThemePreference = "system" | "light" | "dark";
export type ResolvedSpaceTheme = "light" | "dark";
export const SPACE_THEME_STORAGE_KEY = "studygotchi:space-theme";
export function resolveSpaceTheme(preference: SpaceThemePreference, systemDark: boolean): ResolvedSpaceTheme;
export function parseSpaceThemePreference(value: unknown): SpaceThemePreference;
export function useSpaceTheme(): {
  preference: SpaceThemePreference;
  resolved: ResolvedSpaceTheme;
  setPreference(next: SpaceThemePreference): void;
};
```

- [ ] **Step 1: Write failing theme tests**

```ts
import { describe, expect, it } from "vitest";
import { parseSpaceThemePreference, resolveSpaceTheme } from "./space-theme";

describe("space theme", () => {
  it("resolves system from media preference", () => {
    expect(resolveSpaceTheme("system", false)).toBe("light");
    expect(resolveSpaceTheme("system", true)).toBe("dark");
  });

  it("honors explicit overrides", () => {
    expect(resolveSpaceTheme("light", true)).toBe("light");
    expect(resolveSpaceTheme("dark", false)).toBe("dark");
  });

  it("rejects unknown persisted values", () => {
    expect(parseSpaceThemePreference("sepia")).toBe("system");
  });
});
```

- [ ] **Step 2: Run theme tests and verify RED**

Run:

```bash
npm test -- lib/space-theme.test.ts
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement pure theme resolution and the client hook**

The hook must:

- read local storage once after mount;
- subscribe to `matchMedia("(prefers-color-scheme: dark)")`;
- set `data-space-theme` on `document.documentElement`;
- write only explicit user changes;
- clean up the media listener.

- [ ] **Step 4: Prevent theme flash before hydration**

`SpaceThemeBootScript` renders an inline script that reads
`studygotchi:space-theme`, resolves system preference, and sets
`document.documentElement.dataset.spaceTheme` before the body paints.

Add it in `app/layout.tsx` inside `<head>`. Add `suppressHydrationWarning` to
`<html>` because the data attribute is client-resolved.

- [ ] **Step 5: Add accessible appearance settings**

Add a signed-in account `<details>` menu in `SiteHeader`. Render
`WorldAppearanceSettings` as:

```tsx
<fieldset className="space-theme-settings">
  <legend>World background</legend>
  {(["system", "light", "dark"] as const).map((value) => (
    <label key={value}>
      <input
        type="radio"
        name="world-background"
        value={value}
        checked={preference === value}
        onChange={() => setPreference(value)}
      />
      {value[0].toUpperCase() + value.slice(1)}
    </label>
  ))}
</fieldset>
```

Do not change Graph's `.sg-dark` behavior.

- [ ] **Step 6: Add theme tokens**

Define:

```css
:root {
  --space-bg: #f2efe9;
  --space-star: #17151d;
  --space-star-soft: rgba(23, 21, 29, 0.42);
}

@media (prefers-color-scheme: dark) {
  :root {
    --space-bg: #080716;
    --space-star: #fff6df;
    --space-star-soft: rgba(185, 216, 234, 0.68);
  }
}

:root[data-space-theme="light"] {
  --space-bg: #f2efe9;
  --space-star: #17151d;
  --space-star-soft: rgba(23, 21, 29, 0.42);
}

:root[data-space-theme="dark"] {
  --space-bg: #080716;
  --space-star: #fff6df;
  --space-star-soft: rgba(185, 216, 234, 0.68);
}
```

- [ ] **Step 7: Verify**

Run:

```bash
npm test -- lib/space-theme.test.ts
npm run typecheck
```

Manually toggle each radio and reload to confirm persistence.

- [ ] **Step 8: Review checkpoint**

Confirm the setting is labelled **World background**, does not alter the Graph,
and produces no first-paint flash.

---

### Task 3: Port the fine-fidelity terrain and interpolated ocean

**Files:**
- Create: `frontend/components/world/globe/toon.ts`
- Create: `frontend/components/world/globe/PixelComposer.tsx`
- Create: `frontend/components/world/globe/GlobeTerrain.tsx`
- Create: `frontend/components/world/globe/GlobeOcean.tsx`
- Create: `frontend/components/world/globe/globe-materials.ts`
- Reference only: `prototypes/world-lab/src/golden/CameraGlobeScene.tsx`
- Reference only: `prototypes/world-lab/src/golden/GoldenIceScene.tsx`

**Interfaces:**

```ts
export interface GlobeSurfaceResources {
  terrainAtlas: THREE.DataTexture;
  terrainGeometry: THREE.SphereGeometry;
  waterGeometry: THREE.SphereGeometry;
}

export function useGlobeSurfaceResources(
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
): GlobeSurfaceResources;
```

- [ ] **Step 1: Extract the pixel composer**

Port only `PixelComposer` and Three.js addon imports. Give it a numeric
`pixelSize` prop and set both edge strengths to zero:

```tsx
export function PixelComposer({ pixelSize }: { pixelSize: number }) {
  // EffectComposer + RenderPixelatedPass + OutputPass
}
```

Ensure composer, passes, and render targets dispose on unmount.

- [ ] **Step 2: Build one shared terrain atlas**

Create a 320 × 320 octahedral `DataTexture`. For every pixel:

- sample irregular multi-lobe land;
- use the accepted green lowland/highland base;
- apply sparse clustered grass through `pixelGrassTone`;
- blend the nearest course palette only by the small district weight;
- encode land in alpha;
- use `NearestFilter`;
- set sRGB color space.

Memoize by stable course-layout signature and share the same texture with land
and ocean. Never generate it once per component.

- [ ] **Step 3: Port raised terrain geometry**

Use a `SphereGeometry` of at least 224 × 160. Displace land from sea by the pure
terrain sample. Recompute normals. Use the accepted three-band toon lighting
with subtle contrast so grass, not broad normal bands, carries surface detail.

- [ ] **Step 4: Restore higher-resolution pixel water**

Create a seamless 48 × 48 / 48-frame indexed texture loop. Each wavelet uses
integer velocity so frame 47 blends back to frame 0 without jumping. In
`useFrame`, set:

```ts
const frame = waterFrameState(clock.elapsedTime * 1000);
material.uniforms.uPatternA.value = frames[frame.current];
material.uniforms.uPatternB.value = frames[frame.next];
material.uniforms.uPatternMix.value = frame.mix;
material.uniforms.uTime.value = clock.elapsedTime;
```

The fragment shader mixes adjacent textures, adds slow UV advection, preserves
shore foam, and uses the resolved theme only for scene/atmosphere colors.

- [ ] **Step 5: Remove macro crest props**

Do not port `MacroWavePatch` or `MacroWaveLayer`. Search the new production
module:

```bash
rg "MacroWave|CatmullRomCurve3|#bce9ef" components/world/globe
```

Expected: no matches.

- [ ] **Step 6: Verify**

Run:

```bash
npm test -- components/world/globe/globe-spec.test.ts
npm run typecheck
```

Use a temporary `CourseGlobeCanvas` host only after Task 5 exists; do not add a
throwaway page.

- [ ] **Step 7: Review checkpoint**

Inspect atlas construction for duplicate work and confirm the removed crest
objects cannot render.

---

### Task 4: Add readable towns, routes, and higher-quality ships

**Files:**
- Create: `frontend/components/world/globe/GlobeTown.tsx`
- Create: `frontend/components/world/globe/GlobeShips.tsx`
- Create: `frontend/components/world/globe/GlobeRoutes.tsx`
- Create: `frontend/components/world/globe/CourseGlobeScene.tsx`

**Interfaces:**

```ts
export interface GlobeTownOpenEvent {
  courseId: string;
  anchor: ScreenPoint;
}

export interface CourseGlobeSceneProps {
  courses: CourseGlobeCourse[];
  activeCourseId: string | null;
  theme: SpaceTheme;
  reducedMotion: boolean;
  onActiveCourseChange(courseId: string): void;
  onCourseTownOpen(event: GlobeTownOpenEvent): void;
  spinApi: React.RefObject<GlobeSpinApi | null>;
}
```

- [ ] **Step 1: Port course focus and snapping**

Port free spin, pointer drag, shortest focus quaternion, nearest-course settle,
and local neighbor routes. Replace all numeric course indexes in callbacks with
course ids.

- [ ] **Step 2: Render data-driven course towns**

Use `courseMarkerState(course.progress)`:

- `null`: neutral one-tier footprint;
- known progress: seed/growing/thriving tiers;
- the town pad uses only the small biome district, not an entire continent;
- clicking the town calls `onCourseTownOpen` with a projected screen anchor;
- pointer focus has a matching native tree control later.

- [ ] **Step 3: Build three detailed ship silhouettes**

Implement:

```tsx
function Schooner() {
  // tapered box/wedge hull, deck, mast, two thin triangular sails, stern flag
}

function HarborTug() {
  // long hull, raised cabin, roof, stack, two portholes
}

function CargoFerry() {
  // long hull, bridge, rails, two cargo blocks
}
```

Parts must survive 1.5 px grain: mast radius ≥ 0.018 world units, sails are thin
planes/boxes rather than cones, and every silhouette has a darker waterline.
Keep three ships total. Do not use the existing 56-triangle rowboat asset as the
hero upgrade; its contact-sheet silhouette is too simple.

- [ ] **Step 4: Add ship motion without crest props**

Use deterministic ocean anchors, spherical route motion, heading tangent,
low-frequency bob, and tiny material-level wake stipples. No tube or
Catmull-Rom wake geometry.

- [ ] **Step 5: Add theme-aware stars**

Render deterministic points:

- light: black/near-black dots, no glow;
- dark: cream/cyan dots;
- varied point size within a narrow range;
- no gradients or large decorative moons over UI.

- [ ] **Step 6: Assemble `CourseGlobeScene`**

Order:

```tsx
<>
  <SceneTheme theme={theme} />
  <Lights theme={theme} />
  <AutoFitCamera />
  <StarField theme={theme} />
  <OrbitingGlobe>
    <GlobeTerrain />
    <GlobeOcean />
    <GlobeShips />
    <GlobeRoutes />
    <GlobeTowns />
  </OrbitingGlobe>
  <PixelComposer pixelSize={PRODUCTION_PIXEL_GRAIN} />
</>
```

- [ ] **Step 7: Verify**

Run typecheck now; defer browser visual review until the Task 10 production
design-gallery screen is registered.

- [ ] **Step 8: Review checkpoint**

Confirm each ship reads at globe scale, the supplied cyan crest object is
absent, and light stars are black dots.

---

### Task 5: Build the production Canvas host and performance lifecycle

**Files:**
- Create: `frontend/components/world/globe/CourseGlobeCanvas.tsx`
- Create: `frontend/components/world/globe/globe.css`
- Modify: `frontend/components/world/globe/globe-types.ts`

**Interfaces:**

`CourseGlobeCanvasProps` is the exact contract from the spec and Task 1.

- [ ] **Step 1: Create the client-only Canvas**

```tsx
"use client";

export default function CourseGlobeCanvas(props: CourseGlobeCanvasProps) {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);
  const [frameloop, setFrameloop] = useState<"always" | "demand">("always");

  // visibilitychange switches demand/always
  return (
    <Canvas
      dpr={dpr}
      frameloop={frameloop}
      camera={{ position: [0, 4, 30], fov: 26, near: 0.1, far: 80 }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      fallback={<div className="course-globe-fallback" />}
    >
      <PerformanceMonitor onDecline={() => setDpr([1, 1])} />
      <CourseGlobeScene {...props} />
    </Canvas>
  );
}
```

- [ ] **Step 2: Add wheel, keyboard, drag, and settle host logic**

Use the accepted 520 ms trackpad settle. Ignore keyboard events from native
controls. Support arrows/WASD and expose previous/next HTML controls through the
parent UI, not inside Canvas.

- [ ] **Step 3: Add arrival and reduced-motion classes**

The immediate outer stage receives `data-arriving` and
`data-reduced-motion`. CSS animates the stage transform/opacity; Canvas internals
do not mutate page layout.

- [ ] **Step 4: Verify cleanup**

Navigate away and back while watching the console. There must be no duplicate
wheel listeners, WebGL context warnings, or retained animation callbacks.

- [ ] **Step 5: Review checkpoint**

Confirm one Canvas/WebGL context exists and the host contains no prototype HUD.

---

### Task 6: Add explicit course APIs and the hybrid tree adapter

**Files:**
- Modify: `frontend/lib/api.ts`
- Create: `frontend/lib/world/course-overview.ts`
- Create: `frontend/lib/world/course-overview.test.ts`
- Create: `frontend/components/earth/useCourseOverviewCache.ts`

**Interfaces:**

```ts
export interface CourseTopicNode {
  id: string;
  label: string;
  concepts: CourseConceptNode[];
}

export interface CourseConceptNode {
  id: string;
  label: string;
  semanticState: WorldRegion["semantic_state"];
  creatureState: WorldRegion["creature_state"];
  files: CourseResource[];
}

export interface CourseOverview {
  course: CourseSummary;
  topics: CourseTopicNode[];
  unmatchedFiles: CourseResource[];
  stats: CourseGlobeStats;
  worldVersion: string;
}

export function buildCourseOverview(
  course: CourseSummary,
  world: WorldResponse,
  resources: CourseResource[],
): CourseOverview;
```

- [ ] **Step 1: Write failing tree-adapter tests**

Cover:

- regions grouped by `cluster_id`;
- files attached through `concept_ids`;
- one file can appear under multiple supported concepts;
- unmatched files appear in **Other files** once;
- reached excludes frontier;
- mastered/resident/source counts are correct.

Example:

```ts
it("attaches resources beneath supported concepts", () => {
  const overview = buildCourseOverview(course, world, [
    { ...resource, id: "r1", concept_ids: ["c1", "c2"] },
  ]);
  expect(overview.topics.flatMap((topic) => topic.concepts)
    .find((concept) => concept.id === "c1")?.files[0].id).toBe("r1");
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- lib/world/course-overview.test.ts
```

- [ ] **Step 3: Add explicit API methods**

Extend `KnowledgeApi`:

```ts
getWorldForCourse(courseId: string): Promise<WorldResponse>;
listResourcesForCourse(courseId: string): Promise<CourseResource[]>;
```

Build URLs with `getIdentity().studentId`, not `getIdentity().courseId`. Extract
the existing resource normalization into one function used by both
`listResources` methods. The mock implementation returns fixture/resources for
any course id while replacing `course_id` in the fixture clone.

- [ ] **Step 4: Implement `buildCourseOverview`**

Sort topics and concepts deterministically by label/id. Do not create fake
page references or fake progress.

- [ ] **Step 5: Implement lazy per-course cache hook**

The hook exposes:

```ts
{
  records: Map<string, { status: "idle" | "loading" | "ready" | "error"; data?: CourseOverview; error?: string }>;
  load(courseId: string): Promise<void>;
  invalidate(courseId: string): void;
}
```

Deduplicate concurrent requests with an in-flight promise map. Load the active
course and any newly expanded course only.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- lib/world/course-overview.test.ts
npm run typecheck
```

- [ ] **Step 7: Review checkpoint**

Confirm tree exploration does not call `selectCourse` and initial render does
not fetch every course.

---

### Task 7: Build the navigator, statistics, and provenance bubble

**Files:**
- Create: `frontend/components/earth/CourseNavigator.tsx`
- Create: `frontend/components/earth/ProvenanceBubble.tsx`
- Create: `frontend/components/earth/course-navigator.css`
- Modify: `frontend/components/earth/ConceptCard.tsx` only if sharing display helpers is useful

**Interfaces:**

```ts
export interface CourseNavigatorProps {
  courses: CourseSummary[];
  activeCourseId: string | null;
  overviews: CourseOverviewCacheState;
  expandedCourseIds: ReadonlySet<string>;
  expandedTopicIds: ReadonlySet<string>;
  onCourseFocus(courseId: string): void;
  onCourseToggle(courseId: string): void;
  onTopicToggle(topicId: string): void;
  onConceptOpen(conceptId: string): void;
  onLand(courseId: string): void;
}
```

- [ ] **Step 1: Build standard disclosure markup**

Use separate controls:

- chevron button toggles disclosure;
- course title button focuses globe;
- **Land** changes product mode;
- nested topic/concept/file rows are links/buttons only when actionable.

Maintain `aria-expanded`, `aria-controls`, visible focus, and active-course
state independently.

- [ ] **Step 2: Add compact active statistics**

Show reached/total, mastered, residents, sources. Unknown data displays an
honest loading state rather than zero.

- [ ] **Step 3: Build `ProvenanceBubble`**

Required props:

```ts
interface ProvenanceBubbleProps {
  open: boolean;
  anchor: ScreenPoint | null;
  tabLabel: string;
  title: string;
  body?: string;
  reference?: string;
  action?: { label: string; onActivate(): void };
  mobileDocked: boolean;
  onDismiss(): void;
}
```

Implement one-popup behavior in the owner. Focus the popup on open, close on
Escape/outside click, restore focus, and hide the action when no source exists.

- [ ] **Step 4: Style Paper & Pixel UI**

- solid cream sheet;
- ink hairline;
- content-height desktop navigator with max-height;
- no backdrop blur;
- popup is the only raised sheet;
- bottom-sheet mobile layout;
- space visible around every module.

- [ ] **Step 5: Verify keyboard behavior**

Tab through disclosure, course focus, nested items, **Land**, popup, and dismiss.
Tree use must work without Canvas.

- [ ] **Step 6: Review checkpoint**

Confirm disclosure alone never invokes `onCourseFocus` and unavailable page
references do not render a fake action.

---

### Task 8: Integrate real globe selection into `EarthShell`

**Files:**
- Modify: `frontend/components/earth/EarthShell.tsx`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/components/world/WorldPage.tsx`
- Modify: `frontend/components/world/Island.tsx`
- Modify: `frontend/components/world/Character.tsx`
- Modify: `frontend/lib/world/types.ts`

**Interfaces:**
- Consumes `CourseGlobeCanvas`, `CourseNavigator`, `useCourseOverviewCache`,
  `useSpaceTheme`, and `ProvenanceBubble`.
- Preserves current `WorldPage` props and island behavior after **Land**.

- [ ] **Step 1: Dynamically import the production globe**

```ts
const CourseGlobeCanvas = dynamic(
  () => import("@/components/world/globe/CourseGlobeCanvas"),
  { ssr: false },
);
```

- [ ] **Step 2: Replace `entered: boolean` with explicit mode state**

Use:

```ts
type EarthMode = { kind: "globe" } | { kind: "course"; courseId: string };
```

Remove the current one-course auto-enter effect. Initialize active focus from
`identity.courseId`, but always show the real globe first.

- [ ] **Step 3: Map real courses into globe courses**

For each identity course:

- deterministic biome from id;
- progress/stats from ready overview data;
- null progress before data loads.

Load active overview once identity is ready.

- [ ] **Step 4: Wire two-way selection**

- globe settle → `activeCourseId`;
- title click → `activeCourseId`;
- active change loads overview and reveals, but does not collapse, its course
  node;
- chevron toggles only expansion;
- **Land** calls `selectCourse(courseId)` and sets course mode;
- **All courses** returns to globe mode without discarding cache.

- [ ] **Step 5: Make the stage full bleed**

In globe mode:

- `.earth-stage` remains `inset: 0`;
- remove `.beside-panel` offset;
- header/navigator/popup overlay with z-index;
- background is `var(--space-bg)`;
- panel height is content/max constrained.

Course mode can retain the current island centering until its own redesign.

- [ ] **Step 6: Add loading/error/no-course behavior**

WebGL fallback uses an interactive SVG globe plus native course controls.
Course-data errors remain local to tree nodes. Empty users see the real
ocean-first planet and compact empty sheet.

- [ ] **Step 7: Wire the shared popup inside a landed course**

Extend `WorldCanvasProps` with:

```ts
onEntityOpen?: (conceptId: string, anchor: ScreenPoint) => void;
```

On spot and resident clicks, continue calling the existing `onSelect` and also
call `onEntityOpen` with `nativeEvent.clientX/clientY`. `WorldPage` forwards the
callback to Canvas. `EarthShell` resolves the concept from the current world and
opens `ProvenanceBubble`; missing source/page data hides the action.

- [ ] **Step 8: Verify**

Run:

```bash
npm test
npm run typecheck
```

With mock data, verify globe focus, independent disclosure, stats, **Land**, and
return to all courses. Click one concept and one resident in course mode and
confirm both use the shared bubble.

- [ ] **Step 9: Review checkpoint**

Confirm API identity changes only on **Land** and that globe mode never renders
the old SVG unless WebGL falls back.

---

### Task 9: Add fake-to-real route transition and arrival fallback

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/components/site/EarthGlobe.tsx`
- Modify: `frontend/components/earth/EarthShell.tsx`
- Modify: `frontend/app/globals.css`

**Interfaces:**
- Shared transition name: `study-world-globe`.
- Navigation transition type: `enter-world`.

- [ ] **Step 1: Wrap the public fake globe**

Wrap the immediate globe container, not its SVG internals:

```tsx
<ViewTransition name="study-world-globe" share="world-globe" default="none">
  <EarthGlobe decorative />
</ViewTransition>
```

- [ ] **Step 2: Mark signed-in navigation**

Use:

```tsx
<Link href="/earth" transitionTypes={["enter-world"]} className="start-btn">
  Enter your world
</Link>
```

Signed-out login behavior remains unchanged.

- [ ] **Step 3: Wrap the immediate real-stage container**

Render the named destination synchronously around the Canvas loading fallback:

```tsx
<ViewTransition name="study-world-globe" share="world-globe" default="none">
  <div className="real-globe-stage" data-arriving={arriving || undefined}>
    <CourseGlobeCanvas ... />
  </div>
</ViewTransition>
```

- [ ] **Step 4: Add transition CSS**

Use the 720 ms aperture curve for `::view-transition-group(.world-globe)`.
Destination fallback animation starts from the fake globe's bottom-right scale
and offset, fades stars during the middle third, and reveals navigator after
the globe. Animate only transform and opacity.

- [ ] **Step 5: Add reduced-motion rules**

Under `prefers-reduced-motion: reduce`, use a 100 ms opacity crossfade, no scale,
no camera tween, and immediate navigator placement.

- [ ] **Step 6: Verify both paths**

1. Signed-in link navigation: shared morph occurs when supported.
2. Login redirect/full reload: destination fallback entrance occurs.
3. Unsupported browser: normal navigation works.
4. Back navigation does not replay entrance repeatedly in the same session.

- [ ] **Step 7: Review checkpoint**

Confirm the fake globe remains public and no WebGL is downloaded on `/` before
navigation.

---

### Task 10: Extend the durable `/design` gallery

**Files:**
- Modify: `frontend/app/design/chrome-spec.ts`
- Modify: `frontend/app/design/page.tsx`
- Modify: `frontend/app/design/DesignShell.tsx`
- Create: `frontend/app/design/GlobeReview.tsx`
- Modify: `frontend/app/design/design.css`

**Interfaces:**

Add:

```ts
export type ChromeScreen = "landing" | "world" | "visit" | "globe";
export type GlobeReviewState = "overview" | "popup" | "loading" | "empty";
```

Query contract:

```text
/design?screen=globe&space=light&state=overview
/design?screen=globe&space=dark&state=popup
/design?screen=globe&space=light&state=loading
/design?screen=globe&space=dark&state=empty
```

- [ ] **Step 1: Register the globe screen**

Parse `space` and `state` defensively. Existing landing/world/visit behavior
must remain unchanged.

- [ ] **Step 2: Build a thin review wrapper**

Use the real `CourseGlobeCanvas`, `CourseNavigator`, and `ProvenanceBubble`.
Supply fixture `CourseSummary`, `WorldResponse`, and resources through the real
adapter. Do not duplicate renderer/UI logic.

- [ ] **Step 3: Show review controls**

Native HTML links switch light/dark and states. This is development review
chrome only and is excluded from `/earth`.

- [ ] **Step 4: Verify all deep links**

Open each URL at 1440, 900, and 390 widths. Confirm light black stars, dark cream
stars, popup docking, loading fallback, and empty state.

- [ ] **Step 5: Review checkpoint**

Confirm `/design` is the only added review surface; no Storybook, iframe, or
throwaway route exists.

---

### Task 11: Final integration verification

**Files:**
- Modify documentation only if implementation differs from:
  `docs/superpowers/specs/2026-09-20-production-globe-integration-design.md`

- [ ] **Step 1: Run all automated checks**

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Search forbidden remnants**

```bash
rg "MacroWave|Camera proof|Back to golden scene|Free spin · nearest lock" components/world/globe components/earth
```

Expected: no matches.

- [ ] **Step 3: Browser-test public and authenticated routes**

Verify:

- `/` signed out: fake SVG globe only;
- `/` signed in → `/earth`: shared or fallback landing;
- `/earth` light: near-white space and black star dots;
- `/earth` dark: navy space and cream stars;
- appearance preference persists;
- tree expands independently;
- globe/tree selection synchronize;
- **Land** enters old island;
- back to courses restores globe and cached tree;
- course town popup and concept popup;
- no cyan crest tubes;
- all three ships readable.

- [ ] **Step 4: Test responsive and accessibility states**

At 390, 900, and 1440:

- no UI covers the active town;
- navigator is content-height desktop / bottom sheet mobile;
- popup docks on mobile;
- keyboard can focus/select every course;
- Escape dismisses popup;
- reduced motion removes travel/scale.

- [ ] **Step 5: Inspect runtime health**

Check browser console for:

- WebGL context errors;
- duplicate Three.js imports;
- shader compilation failures;
- leaked event listeners;
- hydration warnings;
- uncaught loading errors.

- [ ] **Step 6: Compare against acceptance criteria**

Re-read the ten criteria in the design spec and record any gap before claiming
completion.

- [ ] **Step 7: Final review checkpoint**

Present the implemented routes, screenshots for light and dark space, automated
verification evidence, and any remaining backend provenance limitation. Do not
commit unless explicitly requested.
