# world-lab (spike)

Throwaway comparison of two world shapes for one course, built to answer
"planet or island?" before the real Next.js app exists. Not product code;
the reusable parts are `src/lib/world.ts` (seeded course → clusters → concept
spots), `src/components/Blob.tsx` (procedurally animated creature, no rig) and
`src/components/Props.tsx` (biome sprouts and landmarks).

```bash
npm install
npm run dev
```

Controls: Planet / Island toggle, seed text (any string; same seed = same
world), progress slider (drives the "map fills in" ledger), and on the island
either snap levels (overview → topic patch) or a fixed diorama camera. Click a
landmark, creature, or patch marker to see where it came from.

Stack: three 0.186, @react-three/fiber 9.7, @react-three/drei 10.7, Vite 8.

## Golden visual proof

`?mode=golden` is the durable art-direction fixture for the world. It compares two
rendering treatments over the exact same authored ice-observatory scene:

- **A · Modern DS** — pixelated low-poly 3D via `RenderPixelatedPass`, hard
  silhouette edges, native-resolution HTML UI.
- **B · Clean toy** — high-resolution toon/toy materials with softer shadows.

The fixture also exposes overview/resident camera states and three restrained
learning states (touched, demonstrated, mastered). New world directions should
first prove themselves here before being generalized into the procedural modes.

`?mode=camera` is the follow-up viewing proof. It locks a responsive globe to
the right side. Course locations use an even Fibonacci distribution rotated by
a deterministic user seed, with deliberate pairwise clustering so some nearby
towns read as archipelagos while the world retains large uninterrupted oceans.
Drag freely on the globe; releasing it finds the course nearest the showcase
angle and eases it into place. Wheel, two-finger scroll, WASD/arrow keys, and
course-list clicks traverse the same local neighbor graph. Trackpad deltas move
the globe continuously in both axes using content-motion direction;
nearest-course locking waits 520 ms after the last event, then uses a faster
soft settle. The settle applies only the shortest normal-to-target correction,
preserving the user's approach roll; the selected landmark contents yaw locally
toward the camera instead of canonicalizing the whole planet.
Placeholder marker tiers, tightly grouped landmarks, and resident pawns make
low- and high-progress courses distinguishable before final biome art is
introduced. The oversized planet is deliberately shifted down and right, with
the selected town held upper-left on its face; the left panel collapses into a
compact bottom sheet and distant stars and small moons fill the negative space.

Only the active course's three nearest-neighbor paths render. They regenerate
after every snap, keeping the map clean and making the next valid destinations
obvious. The planet balances broad water with several irregular raised
continents: land occupies roughly 32–45% of the sphere, and the rest remains
open sea. Geography is independent from courses. Shared continental land uses
a green lowland/highland family, while each course softly blends its palette
only into a small district around its landmark; nearby districts therefore
fade through green instead of meeting at a hard Voronoi seam. A continuous
water sphere sits beneath the raised continents, so depth establishes the
coastline without duplicated masks or dark cutout wedges. Exposed transitions
and the one-pixel shore sample are pale foam.
Sparse clouds, slow crest-shaped macro waves, tiny moving sailboats, and
low-poly land details add scale. Decorative orbit rings remain removed.

Each continent is the union of two unequal course-centered lobes and two offset
peninsula lobes; there is no dominant circular cap. Low-frequency warping adds
bays and uneven necks. Land uses a 256 × 256 octahedral nearest-filtered atlas
and a 192 × 128 sphere. Sparse 4 × 4 clusters draw tiny light/dark grass tufts
over a calmer green base, while reduced relief prevents broad sinusoidal shading
from masquerading as texture. Plates begin 0.22 units above the base sphere. A
live 1–6 pixel-grain slider controls the final render pass independently of
model detail; it defaults to 2, while the former coarse look was 4.

Water restores the indexed wave texture as a seamless 32-frame loop. The shader
smoothly interpolates adjacent frames and adds slow continuous UV advection, so
pixel crests travel instead of teleporting. A broad swell, three vertex-wave
families, and literal crest meshes provide macro motion. Three visible boat
silhouettes patrol the water (single sail, steamship, and two-mast sailboat),
with no reflection or refraction pass.

## Planet 2-zoom (third mode)

One big planet (R = 70) where every **course** is a biome and every **topic** is
a sub-region with its own terrain character. Data lives in `src/lib/galaxy.ts`
(`buildPlanet(seed)`): 7 courses → relaxed spherical Voronoi patches → 6–10
topic sub-centres per patch (best-candidate sampling) → sub-Voronoi. Each topic
gets a `TerrainKind` from its family list (ice: mountain, glacier, frozen lake,
snow city, coast, ocean, pine forest, tundra; analogous lists for forest, city,
sand, meadow, coast, volcanic), which sets a ground tint, a height profile
(peaks / raised / hills / flat / water bowl / slope / crater / volcano) and the
static decoration recipes (`src/components/Decor.tsx`, baked into one merged
mesh per colour). The water body always lands on the outermost topic of a
patch and its shore kind next to it. Concept spots and creatures follow the
same 0 / sprout / landmark ledger as the other two modes; 6.1210 is the ice
biome and uses the real topic names.

- **Level 1** orbits the whole planet (own `camera-controls` instance, slow
  idle drift). Click a patch, its marker, or a course button to zoom.
- **Level 2, variant A "Continuous"**: the same scene; the camera flies
  (~1.4 s, manual slerp of orbit direction + up vector + lerped target) to a
  pose 60° onto the patch and then hands control back to camera-controls with
  `camera.up` = patch normal, so orbiting rotates around the local surface
  normal. Topic buttons/markers fly to the topic with `up` = its own normal.
  The horizon is hidden by fog that tracks the camera-to-target distance,
  not by clamps alone (with 7 patches tiling the sphere a patch spans ~90° of
  arc, so no clamp can both show the biome and hide the curvature).
- **Level 2, variant B "Swap"**: a 0.8 s dive, then a 350 ms sky-coloured
  cross-fade to `BiomeDiorama` (`src/scenes/BiomeDiorama.tsx`): the patch
  unrolled into a flat, floating Island-style diorama sampled from the same
  terrain function, with drei `CameraControls` and Island-like snap-to-topic.
  This is the Kirby world-select model: the planet is the map, the biome is
  the level.

Deep links for side-by-side comparison:
`?mode=planet2&zoom=continuous|swap&course=6.1210&progress=0.6&seed=...`.
Screenshots from a headless GPU Chromium are in `screenshots/`
(`p2-level1.png`, `p2-continuous-level2-ice.png`, `p2-swap-level2-ice.png`, …).

## Planet 2-zoom redesign: map level 1, composed biome level 2 (current)

Planet 2-zoom is the primary mode. The paragraphs above describe the first
version (tiling Voronoi biomes, R = 70, flat diorama); this section is the
current state. The World Designer's spec in `docs/design/world/` is followed
where it exists; deviations are listed at the end.

**Layout** (`src/lib/galaxy.ts`). Biomes no longer tile the sphere. Courses sit
on a belt: azimuth `i·360°/N`, latitude alternating ±16° (tour order = index
order, so the ring road never crosses itself). Each course is a bounded cap of
angular radius `BIOME_RADIUS = min(0.42 rad, 0.42 × beltNeighbourAngle(N))`, so
neighbours never touch; the planet radius is
`PLANET_R = max(90, 48 / BIOME_RADIUS)` so a biome keeps a ~48-unit linear
radius whatever N is (N = 7: ρ = 24.1°, R = 114; N = 12: ρ = 18.3°, R = 150;
N = 20: ρ = 15.4°, R = 179). Nothing is hardcoded to 7. Outside the caps is
*wilderness*: pale grass north / pale rock south, slow-noise shallow seas with a
pale shore, gentle relief; the biome rim carries an accent-coloured band.
Inside a biome, topic sub-regions get a greedy 3-colouring of lightness shades
(0 / +0.07 / −0.07) so adjacent kinds differ, a thin lighter band on every
sub-region border, ±5% slow tint noise, and shoreline bands (wet land / shallows)
around water kinds. Roads and placement are data: `topic.roads` (Prim spanning
tree from the plaza to every spot + loop edges), `course.roads` (ring through
plazas in angular order + Prim), `course.hub`, and every `DecorItem` now has a
`parent` (`cluster` | `road` | `plaza` | `shore`): cluster recipes are placed as
3–4-member clusters (scales 1 / 0.8 / 0.65) off roads and pads, buildings sit
in road-edge slots facing the road, lamps every 6 m on main roads.

**Level 1 = map** (`Planet2.tsx`, `components/MapMarker.tsx`, `Roads.tsx`).
No per-concept structures or creatures. One Kirby-style marker per course at
its centre: cake pedestal (1 / 2 / 3 tiers at < 33 / 33–66 / ≥ 67 % of the
course demonstrated), 2–4 signature props from `assets/landmarks/<biome>/props`
(+ `terrain/mountain-cone` for ice), a wooden signpost with the course code
(drei `<Text>`), and the latest creature idling on the top tier. Markers are
scaled to ~10 % of the planet diameter (`MARKER_SCALE`) and face −north
(toward the viewer in the facing pose). Ring road between markers as a two-tone
ribbon (`RoadLayer`: stone core over a lighter edge, one great-circle arc per
link, causeway over water; bridges deferred). Camera: FOV 26, distance 6.4 R,
projection anchored at x = 0.66 via `camera.setViewOffset`; the left column is
the course cards (code, name, swatch, % demonstrated, creatures, Enter).
Lighting per the bible (warm key upper-left, hemisphere fill, no fog).

**Scroll → orbit** (`MapOrbit`, drei `<ScrollControls pages={N+1}>`). Two
modes (panel toggle, `?scroll=stops|continuous`, both from N):
`stops`: section 0 is the home pose (20° tilt), section i faces course i−1
(camera on `cos26°·dir − sin26°·north`, up = north, so the marker is seen 26°
from above with its signpost upright); the fraction inside a section is eased
with `smoothstep(0.2, 0.8)` (40 % dwell), poses are slerped, and the container
snaps to the nearest section 260 ms after scrolling stops.
`continuous`: offset → azimuth around the belt, free, active course = nearest.
Dragging the planet works between scroll moves (pointer tracking, not
camera-controls' `active`). Card click / `?course=` scroll to the stop;
`?course=X&enter=1` also flies in; `?detail=1` keeps the old level 1.

**Level 2 stays on the planet** (`components/BiomeLayers.tsx`,
`LandmarkLayer.tsx`). The swap/flat-diorama variant is rejected and only kept
behind `?zoom=swap`. The dive ends at `abovePose(course centre, polar 48°,
distance = chord / (0.7 · 2 tan(fov/2) · aspect))` with FOV 30, so the whole
biome fills ~70 % of the width with the curved horizon and sky above it; FOV
and the view anchor lerp during the flight. Camera-controls then orbit around
the biome centre with up = surface normal (clamps: polar ≤ 63°, distance
0.12–2.4 R). Topic snaps: polar 40°, 0.42 R. Layers at level 2: `BiomeRoads`
(per-course tints, main 1.5 m / minor 1.0 m), `Plazas` (12-gon per topic, hub
4 m, stone rim, 0.6 m concept pads), `TerrainPieces` (the family's
`terrain/*.glb` once per non-water, non-flat sub-region, on the rim away from
the course centre, ~⅓ of the sub-region radius), `LandmarkLayer` with the
grammar's plaza landmark (d = 0 none, < 0.5 s1, < 1 s2 (s2/s2b/s2c variants),
1 s3 on a pedestal, facing the hub) and concept pads with a sprout (touched) or
a recoloured `city-small-house` / ice igloo (demonstrated) facing the plaza,
`GlbDecorLayer` clusters and road furniture, and the focused course's
creatures. All merged per colour: 100–130 draw calls at level 2, 210 at the
map, 60 fps.

Deferred / not per spec yet: bridges and lamps on the level-1 ring road,
terraces, shoreline shard rows and decals, road winding (Catmull-Rom jitter),
fences and string lights, buildings snapping to explicit slots for concept
houses (they sit on the pad facing the plaza), 3D signposts at level 2 (pills
remain), night mode, the flat-vs-metaball footprint, creature road-walking.
Level 1 keeps sub-region tints (the bible wants flat continents) because they
are what makes the level-2 sub-regions legible from the dive.

Screenshots: `map-level1-stops.png` / `map-level1-stop-6.1210.png`,
`map-level1-continuous.png`, `map-level1-scrolling.png`, `map-left-column.png`,
`planet-level2-ice-horizon.png`, `planet-level2-topic.png`,
`place-level2-ice.png`, `place-level2-city.png`.

## Legibility pass, Tripo roster, growth / catastrophe / night (latest)

**Level 1 map** (`sampleMapColor` in `galaxy.ts`): a second per-vertex colour
set with three or four flat tones: one family ground colour per biome cap, a
`ground_alt` band (0.024 rad) then a dark outline (0.6°), flat shallow sea
`#9fd3e0` between biomes with a few large flat pale-grass islands. The terrain
lerps between map and detail colours (`mapMix`, carried in the camera Pose and
lerped by flights). Markers ×2 (`MARKER_SCALE` ≈ 20 % of the diameter for a
3-tier marker), tiers in the family palette (sides `ground_alt`, caps ground),
props and creature on the top tier (creature 1.6× the prop scale), a 5 × 2.2 u
signboard with 1.4 u bold text. Ring road 0.042 R wide, stone `#b7a58f` over
`#d9cbb5`, lifted 0.5 u as a causeway (the strips are two-sided; the winding on
these arcs was inverted, which is why the road was invisible before). Hidden
at level 2.

**Level 2 composition**: roads follow a Catmull-Rom centre line with
±jitter × length interior offsets (city 0.25, ice 0.12, others 0.18;
`roadCurve` in `galaxy.ts`, shared by rendering, house slots, lamps and
clearance tests), main 1.2 m / minor 0.9 m, core = ground −18 % L (ice
`#b9c9d6`, city `#a89aa6` pinned), edge −6 %. Stage composition: tall recipes
(mountain, pine, round tree, palm, basalt, crystal, iceberg, tower, chimney)
only on the outer third of the biome (0.62–0.94 ρ) outside 2–3 seeded gaps; low
recipes inside; each topic's terrain piece on the biome rim at its azimuth,
scaled to ~⅓ of the biome radius. Sub-region shades ±0.12 L. Water topics: wet
+ shallows bands plus a shard row (`ice-block-stack` on ice, white foam wedges
elsewhere) on the waterline, fences on the water side of shore roads. Houses
×1.4 shoulder to shoulder in city (1.9 m slots), lamps ×1.3 every 6 m, creatures
×2.37 · PROP_SCALE (≥ 6 % of the viewport at topic snap). Pills are gone: one
procedural signpost (`components/Signpost.tsx`, post + framed board + `<Text>`)
per topic at its plaza edge, facing the hub.

**Tripo creatures** (`src/data/tripo-assets.ts`, `src/lib/tripo-materials.ts`
from the handoff): `creatureUrl` / `creatureMeta` branch on `isTripoId`;
`GlbCreature` keeps the baked face texture via `tripoToonMaterial`. Policy: the
edited mouse (`tripo-mouse`) is the hero of city and meadow and always arrives
first; the 47 reference-only characters load only with `?pack=tripo`
(`TRIPO_ACTIVE`, dealt round-robin per family) and never otherwise.

**Growth** (`components/Growth.tsx`): each biome's hero
(`assets/growth/<family>-g0..g3.glb`) stands on the hub plaza (which drops its
own landmark) and steps by the course's demonstrated fraction (0 / 25 / 50 /
75 %), 1.2 s ease with squash and 3 % overshoot on change. Positive terrain
relief scales with progress (`planet.relief[course] = 0.6 + 0.7 × fraction`,
applied consistently in the sampler and the mesh, so placements follow).

**Catastrophe**: panel button "Trigger catastrophe on <topic>" (snaps the camera
to the topic). Timeline: storm cloud gathers 2 s → lightning + three boom puffs
(0.15 s pop, 0.5 s expand) → crater + scorch (family-tinted where the kit has
them) + rubble pile + debris on the plaza, the topic's plaza landmark and
concept houses hidden, its creatures play `sad` (`sadTopics` in the assets
context) → at 8 s scaffold (`city-build-1` for city, `recovery-sprout`
elsewhere) → at 11 s rebuilt. `explode-comic` / `recover-chime` play once the
user has clicked. `Topic.catastrophe?: string` is reserved for game state.
Screen-space rule at topic snap: boom ≥ 20 %, cloud ≥ 15 %, ruin ≥ 12 %.

**Night**: `prefers-color-scheme: dark` unless toggled (`day` / `night` button,
`?night=1|0`). Sky and hemisphere from the family's `palette.night`, key light
`#8fa8d8` at 0.55, 800-point star field, terrain colour multiplied by the
family's lightness offset, and every shared toon material in a window / lamp
colour (`#ffe9a8`, `#ffe36b`, `#ffd27a`) turns emissive (`setToonNight`).

Numbers (1400×900 headless Metal): map 198–210 calls; level 2 whole biome
150–160 (ice 154, city 150, night city 160, forest with hero 151); topic snap
71–104 (with the catastrophe running); all 59–60 fps. Screenshots:
`map-level1-v2.png`, `place-level2-ice-v2.png`, `place-level2-city-v2.png`,
`place-level2-topic-v2.png`, `tripo-mouse-in-world.png`, `growth-g3-forest.png`,
`catastrophe-boom.png`, `night-city.png`.

Landmarks v4 / creatures v4 follow-up: level-1 markers use the shared
`pedestal-tier-1/2/3.glb` (16.1 / 11.8 / 7.9 u, 2.8 u tall, scaled by
`TIER_K`; `-cream` → family ground, `-cream2` → `ground_alt`) and
`shared-signpost` with the course code on its board, procedural fallbacks when
the manifest lacks them. The catastrophe uses `<family>-ruin` / `-scaffold`
from the manifest (rubble pile / recovery sprout as fallbacks); growth heroes
resolve from `assets/growth/` first, then the manifest's `hero` entries
(lab, jungle, wildwest, cave, graveyard, factory, park). `creatures.ts` is
regenerated from manifest v4 (222 creatures, 16 families); the 9 new families
get manifest-derived rosters with the same archetype alternation
(`autoRoster`), loaded on demand, so a course assigned to them has creatures.
`map-level1-v3.png`, `catastrophe-ruin.png`.

Also in the tree (another agent, not this territory's spec): a "Cycle models"
tab (`scenes/SketchfabCycle.tsx`, `data/game-models.ts`: Sketchfab look-at
embeds; `scenes/CycleScene.tsx` + `data/cycle-catalog.ts`: a local GLB viewer
over the cc0 sets, currently unused). It does not touch the Tripo GLBs.

Deferred: plank bridges and lamps on the level-1 ring road, terraces, decals,
the hero visibly dropping a band during a ruin, creatures drifting to the ruin,
night per-family extras (fireflies, neon, aurora), bloom.

## Site page mode

`?mode=site` (tab "Site page") renders the world on a realistic product page
(`src/site/SitePage.tsx`, `src/site/site.css`) so the framing can be judged in
context. Structure follows `frontend/components/layout` (read-only): a 52 px
top bar (22 px brand mark, divider, current course, section nav, 260 px search,
ink "Upload Files" button), the 196 px section nav (World / Knowledge / Files /
Gaps / Study Plan, hidden under 1200 px), a scrolling content column and, on
the right, a sticky canvas taking `share` % of the viewport below the top bar.
Palette and type are the style bible's toy tokens (sky `#f3e4ee`, cream
`#fffaf3`, ink `#3a2f45`, Nunito, 16–24 px radii, 3 px sticker outlines with a
3 px hard drop on buttons) rather than the real shell's dark Geist theme.

The column is a hero ("Your notes become a world.", subtitle, "Enter 6.1210"),
then one 100 vh section per course (card: code, name, biome swatch, progress
ring, topic / concept / creature counts, "Last evidence" line, Enter, "Face
it"), then a footer. The page's own scroll drives the level-1 orbit: the scene
gets a `ScrollSource` over `window` (hero = home pose, section i = course i),
so both scroll mappings work (`?scroll=stops|continuous`). Enter (card, hero,
or clicking a marker) dives to level 2; the canvas goes full-bleed under the
top bar, which shows "← Back to planet" (Escape works too); a topic chip strip
sits bottom-left. Under 900 px the canvas is a sticky 45 vh top band (disc
centred) and the column flows below it.

Viewing panel (`v` key, or `?v=1`; `src/lib/viewing.ts`): planet anchor x
(0.45–0.85 of the viewport width) and y (0.3–0.7), camera distance (4–9 R),
FOV (18–36), pitch (−10…25°: how far above a marker the facing pose sits),
marker scale (0.6–1.6), canvas width share (40–70 %). Every change applies
live and is written to the URL (`?ax=&ay=&dist=&fov=&pitch=&marker=&share=`);
"copy settings" puts the full URL on the clipboard. Defaults are the world
bible's: 0.72 / 0.5, 6.4 R, FOV 22, pitch 26, share 55. The anchors are
viewport fractions and are converted to fractions of the canvas pane, so the
disc centre really sits at 72 % of the page. `?mode=planet2` is unchanged (it
ignores the viewing store). Screenshots: `site-1440.png`, `site-1920.png`
(panel open), `site-mobile.png`, `site-level2.png`.

Markers: the procedural pedestal tiers and signpost are the default again;
`?markerGlb=1` swaps in the shared `pedestal-tier-*` / `signpost` GLBs.

## GLB creatures and landmarks

The fleet's assets are served straight from the repo: `public/assets` is a
symlink to `../../../assets`, so `/assets/creatures/animated/<id>.glb`,
`/assets/landmarks/manifest.json` etc. resolve in dev and in `vite build`
(Vite follows the link; if it ever refuses, add the repo root to
`server.fs.allow` and map `/assets` to `/@fs/<repo>/assets`). Nothing is
copied. Vite answers unknown paths with `index.html` (200), so "missing file"
shows up as a GLTF parse error, which the boundaries below treat as missing.

Toggles in the panel (also `?creatures=glb|primitive&landmarks=glb|primitive`,
default GLB) switch every scene between the procedural `Blob`/`Props` and the
GLB assets, so both can be compared on the same seed.

**Creatures** (`src/components/GlbCreature.tsx`, roster in `src/data/roster.ts`,
manifest excerpt in `src/data/creatures.ts`): `useGLTF` + `SkeletonUtils.clone`
per instance, every material swapped for the shared `MeshToonMaterial` of the
same colour (one program for the whole roster), `useAnimations` on the clone.
`Root` is never touched; the scene's wander code moves the parent group exactly
as with `Blob`, and the same 0.32 m shadow disc and selection ring sit under it.
Clip state machine, driven by the `BlobMotion` ref every frame, 0.15 s
crossfades: `walk` while `moving`, else `idle`; click → `happy` once
(`LoopOnce` + `clampWhenFinished`, back on the mixer's `finished` event);
personality `sleepy` → `sleep` after 6 s standing still; `sad` when the `sad`
prop is set (no topic "storm" flag exists in world-lab yet, so it is never set).
Idle phase is staggered by pset index so crowds do not breathe in unison. The
whole roster is preloaded (`useGLTF.preload`) as soon as GLB mode is on; a
creature whose file fails to load falls back to the primitive `Blob` through an
error boundary (Suspense shows only the shadow while loading).

Roster rules (`ROSTER`): per creature family an ordered list hand-picked from
the 96 animated creatures, archetypes alternating blob / biped / bird / sprite /
bean, at least one sprite in every land biome, 10–13 ids per biome. `flat`
creatures (seals, fish) live only in `WATER_ROSTER` (ocean, ice) and are used
for every second creature of a water topic (`Creature water` prop, Planet 2-zoom
`kind.profile === 'water'`). `coast` maps to the `ocean` family.
`pickCreature(seed, biome, index, water)` walks the list from a seed-dependent
offset, so pset *n* is a distinct creature until the list wraps and different
seeds start on different creatures.

**Landmark grammar** (`src/lib/landmarks.ts`, `landmarkPlan`): a touched
concept is a stage-1 sprout, a demonstrated concept a stage-2 landmark, and
each topic (cluster) gets exactly ONE stage-3 monument, on its first concept,
once ≥ 60% of the topic's concepts are demonstrated (`CAPSTONE_AT`). The
monument stands on a stone pedestal disc with a ring in the biome accent.
Stage-2 files get a seeded yaw in 90° steps and their `*-accent` material is
pulled 15% toward the topic's terrain tint, so neighbouring topics differ. The
same rule runs in all four modes and in primitive mode (bigger primitive on the
disc).

**Landmark rendering** (`src/components/LandmarkLayer.tsx`): every scene hands
the layer its concept placements (`SpotPlacement`: foot position, up
quaternion, scale). Once `/assets/landmarks/manifest.json` loads, the layer
bakes `<biome>-landmark-s1|s2|s3` (`coast` → `ocean`, unknown → `meadow`) for
every spot into ONE merged mesh per colour, tints included (a full planet is
~40 draw calls, was ~4 per landmark). Clicks raycast the merged meshes and map
the hit `faceIndex` back to the concept through per-bucket triangle ranges,
so the provenance card still works; the selection ring is drawn separately.
Merged meshes rebuild on progress change (like the terrain bumps), so
landmarks no longer pop in individually. Missing manifest or a failed file →
the procedural `Props` primitives for the whole layer. Landmark props stand in
for procedural decor on the big planet where a recipe has a match
(`DECOR_PROPS` in `src/components/Decor.tsx`: ice pines, forest/meadow round
trees and bushes, meadow flowers, city houses and lamp posts, cacti, rocks per
family, ice crystals, basalt columns, geyser vents; `k` rescales metres to the
recipe's size). Props are baked into the same per-colour merged meshes as the
procedural decor (`GlbDecorLayer`), so they add no draw calls.

Scale (`src/lib/scale.ts`, creatures are authored at 0.7–0.9 m): Island ×1.0,
Planet (R = 4.5) ×1.1, Planet 2-zoom and its diorama ×`PROP_SCALE`·1.82 ≈ 4.0
(landmarks there stay at `PROP_SCALE` = 2.2: Tomodachi proportions, a creature
is taller than a stage-2 landmark and the monument still reads as the biggest
thing). The shadow disc and selection ring live inside the scaled group. The
Planet 2-zoom wander radius is 0.8 of the topic radius (was 0.7) so the larger
creatures mostly skirt the concept spots.

Measured in headless Chromium (Metal ANGLE, 1400×900, `window.__stats` is
`renderer.info` + fps, also shown in the panel; `?crowd=3` triples the Planet
2-zoom creature count for stress tests). Before → after landmark merging, GLB
creatures and landmarks on, 100% progress: swap level 2, ice, 30 creatures,
whole biome 397 → 235 calls (topic snap 282 → 155); continuous level 2
907 → 267 (primitives were 636); level 1 whole planet 2264 → 493 (primitives
1461); Island 223 → 47. All at 60 fps. Screenshots: `screenshots/glb-island.png`
(45%: sprouts, stage 2 and the first monuments), `glb-swap-level2-ice.png`
(topic snap, 30 creatures), `glb-landmarks.png` (continuous level 2).

Known caveats: the planet's terrain geometry (49.6k vertices) and the diorama
rebuild their landmark bumps on every progress change (~tens of ms, so slider
drags stutter slightly); decoration is placed at the base height, so a
landmark mound rising next to a tree can bury its foot a little; oxlint warns
about the in-place buffer mutation in those two `useLayoutEffect`s.
