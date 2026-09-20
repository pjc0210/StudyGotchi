# World bible

Owner: World Designer. Draft v2, 2026-09-19 (level 2 on the planet; both scroll mappings; night = dark mode). Implementer: World Engineer, from `galaxy.ts` data. Companions: `01-layout-grammar.md`, `biomes/*.md`, `02-questions.md`, `03-city-session.md`, `refs/`.

Units: 1 world unit = 1 m at asset scale (landmark s2 = 1.0 m). `PLANET_R` and `PROP_SCALE` are replaced by §3.

## 1. Principles

1. **Nothing is random.** Every object has exactly one parent: road, plaza, shore, or cluster. Placement code takes a parent, never a free position.
2. **One marker per idea, then empty space** (Kirby). Level 1: one pedestal per course on a calm sea. Level 2: one grand landmark per topic, 3–5 dense clusters, bare ground between (Penguin Isle).
3. **Read at 48 px** (Tomodachi Life): pedestal colour plus tallest prop identify a biome without a label.
4. **Built, not grown.** Terraces near anything man-made, roads as ribbons, plazas as flat caps. No mounds, no speckle.
5. **Progress is architecture.** Learning adds tiers, buildings, lit windows, creatures; never palette or camera.
6. **Two flat colours plus one accent per object.** Night is the one exception: `window` materials go emissive.
7. **One planet, one camera.** The planet never rotates; the camera moves, and the key light rides on the camera rig so every biome is lit alike.

## 2. Two-level structure

| | Level 1: planet | Level 2: biome, on the sphere |
|---|---|---|
| Unit | one marker per course | one plaza per topic, one pad per concept |
| Structures | pedestal, signpost, 2–4 props, ≤ 1 creature | `01-layout-grammar.md` |
| Camera | scroll-driven orbit, disc fills 80 % of height | orbit around the biome centre, up = normal, island ≈ 70 % of width, horizon and sky above |
| Enter / leave | marker click, card "Enter", Enter key | Escape, back pill, dolly past 1.6 × default |

**Dive** (700 ms, `camera-dive.wav`): the camera flies from the level-1 pose to the level-2 pose on a cubic path in the biome's tangent frame; marker cross-fades out and level-2 content in between 40 % and 60 % of the flight. Reverse for `camera-rise.wav`. Nothing swaps; the same sphere is under both.

## 3. Planet layout from N courses

N is open-ended (1 … 24 in v1; beyond 24 a second planet, see `02-questions.md`).

- Biome physical radius is fixed by the grammar: `r_b = 36 m` (hub plaza plus up to 9 topics of ~10 m).
- Cell radius of an even N-packing: `θ_cell(N) = acos(1 − 2/N)` (7 → 44.4°, 12 → 33.6°, 24 → 23.6°).
- Biome angular radius: `θ_b(N) = clamp((1.9·θ_cell − 8°) / 2, 18°, 24°)`. The 8° is the minimum wilderness gap between neighbouring biome rims. N ≤ 13 → 24°; N = 20 → 20.5°; N = 24 → 18.4°.
- Planet radius: `R(N) = r_b / θ_b(N)` in radians: 86 m at N ≤ 13, 115 m at N = 24. Floor 86 m, ceiling 115 m.
- Placement: Fibonacci lattice (`i / N` in latitude by `acos(1 − 2(i + 0.5)/N)`, golden-angle longitude), rotated so course 0 sits at the home pose. Tour order = nearest-neighbour from course 0, then 2-opt; the ring road and both scroll mappings follow this order. Deterministic for a given N and seed.
- Each biome is a bounded island (§5) of angular radius θ_b; everything outside all islands is wilderness.

### Wilderness: shallow sea with causeways (recommended)

Land wilderness needs its own content or it reads as the review's mud hemisphere; sea needs one tint. Sea gives every biome a crisp shoreline (low-poly island reference), a level-2 horizon of water and sky, and turns the ring road into causeways and bridges, the only wilderness objects, each owned by a road. Sea surface at `R − 0.4`, tint `#9fd3e0`; shallows band 2° wide around every island lerped 35 % toward the island's `wet` colour; wave decals `#ffffff` 0.3 m every 6 m on the shallows isoline. Islets: one per tour edge at its midpoint, 6° to the left, the nearer biome's terrain piece at 1.5 ×, parent = that causeway. The land alternative is in `02-questions.md`.

## 4. Level 1: planet

### 4.1 Layout and camera

- Left column 45 %: one course card per stop (code, name, progress, topics, "Enter"). Right column 55 %: sticky canvas; disc centre at x = 72 %, y = 50 %; disc diameter = min(0.8 × height, 0.5 × width). Portrait: disc at y = 35 %, cards below.
- Camera: perspective FOV 22° (never above 26°, the bulbous read), distance `6.4 R`, looking at the centre.
- Key light on the camera rig: azimuth −35°, elevation 40° in camera space. No fog at level 1; rim disc 1.04 R behind the planet (§6).

### 4.2 Poses

`P[i]`: camera on the ray through `course.dir` rotated 26° toward local north, distance 6.4 R, `camera.up` = `course.north` projected perpendicular to the view; the marker is seen 26° from above with the signpost upright. `P[0]` (home) = `P[1]` backed off to 7.5 R with a 20° tilt so three markers show.

### 4.3 Scroll mapping, both variants to prototype

Shared: `s = scrollY / viewportHeight`, `i = floor(s)`, `f = s − i`, camera follows the target with `damp(λ)`. Page height = (N + 1) viewports. Cards live in the left column; the active card is the stop nearest `s`.

| | A. N stops | B. Continuous |
|---|---|---|
| eased fraction | `e = smoothstep(0.2, 0.8, f)` (40 % dwell per stop) | `e = f` |
| camera path | slerp of position on the 6.4 R sphere between `P[i]`, `P[i+1]`; up vector slerped | Catmull-Rom through all `P[·]` positions on the sphere (`squad` on orientations), sampled at `s` |
| CSS | `scroll-snap-type: y proximity`, sections 100 vh | no snap; sections exist only for card layout |
| damping λ | 8 s⁻¹ | 6 s⁻¹ |
| marker feedback | facing marker at scale 1.0, others 0.85 | marker scale = `0.85 + 0.15 · smoothstep(20°, 8°, angle to view axis)` |
| keys / card click | `scrollTo` the section, 500 ms | same |
| idle > 4 s | breathe ±3° around the stop, 12 s period | none (position is wherever scroll left it) |

One `poseAt(s, mode)` function implements both; the toggle is a URL flag `?scroll=stops|continuous` for the prototype.

### 4.4 Island at level 1

Island silhouette in the charter ground tint, flat (height ≤ 0.5 m), shallows band, no sub-tints, no level-2 structures: only the marker and the causeway ends.

### 4.5 Marker spec

Pad of radius 18 m at `course.dir`, flattened cap, oriented with the tangent frame; marker +Z points to local south (toward the viewer in the pose).

- **Pedestal**: 12-facet tiers, radii 16 / 11.5 / 7.5 m, each 2.8 m tall, cap 0.9 m thick overhanging 0.7 m. Side = biome `base`, cap = charter ground tint. Tier count = progress band: 1 below 33 % demonstrated, 2 at 33–66 %, 3 at ≥ 67 %. A new tier springs up in 400 ms (`progress-level-up.wav`).
- **Props**: `1 + tiers`, one per terrain kind ranked by concepts demonstrated in that kind's topic (tie: topic index), the biome sheet's signature recipe at `PROP_SCALE_L1 = 3`, on the tier-1 rim at radius 12 m, azimuths 200°, 270°, 330°, 130°; tallest 8 m, then 0.75 ×, 0.6 ×.
- **Signpost**: post 0.9 × 9 m wood, plank 12 × 5 m straw with 0.5 m wood frame, azimuth 20°, radius 9.5 m on the top tier, tilted 8° to camera. Text = course code, ink, Fredoka Bold or Baloo 2 via `troika-three-text`. Readability: cap height ≥ 14 px on screen; scale the signpost (not the pedestal) up to 1.5 × to meet it. Hover: course name on a second plank.
- **Creature**: latest finished pset's arrival, `idle`, 4.5 m tall, azimuth 300°, radius 5 m on the top tier.

### 4.6 Causeways

Ring road in tour order (prerequisite edges when `course.prereqs` exists). Great-circle stone causeway 1.8 m wide at `R + 0.1`, core = mean of the two biomes' road tints, edge band 0.3 m at `L+6`. Every 40 m a 6 m plank bridge arched +1.2 m with 0.5 m rails; lamps every 12 m on the left. Causeways land on the beach and continue as the island's main road to the hub.

## 5. Level 2: biome on the sphere

- Island: union of topic caps (radius `topic.radius` metres, see grammar) smoothed by a metaball threshold, rim beach 1.5 m wide sloping from `h = 0.4` to sea level, then the 2° shallows. Water topics touching the rim cut bays; interior water topics are lakes.
- Camera: perspective FOV 26°, orbit around `C = R · course.dir` with `camera.up = course.dir`. Default elevation 40° above the local tangent plane, azimuth 45° (free 360°), elevation clamp 30–55°, dolly 0.6–1.6 × default. Default distance `d = 2R sin θ_b / (1.4 · tan(FOV_h / 2))` so the island chord fills 70 % of the frame width (R = 86, θ_b = 24°, 16:9 → d ≈ 122 m). At that pose the sea horizon sits in the top 20–30 % of the frame with sky above; acceptance: the horizon is in frame at default and at max dolly.
- Implementation: rotate a wrapper group so `course.dir` → +Y, then standard `CameraControls` around `(0, R, 0)` with polar clamps. No swap, no unroll.
- Topic snaps: click a plaza → 500 ms tween to elevation 38°, same azimuth, distance `2 r_t / tan(FOV_h / 2)` (10 m topic → ≈ 49 m), target = plaza centre. Escape returns.
- Fog: linear from 1.3 d to 2.6 d toward the sky colour (§6); nothing inside the island is fogged.

Progress ledger: touched → sprout on the pad; demonstrated → building on the road (lit at night), and it counts toward marker tiers; topic fraction 0.5 / 1.0 → landmark s2 / s3; pset finished → creature on the marker and at the hub.

## 6. Day and night (page colour scheme)

`prefers-color-scheme` or the app's `.dark` class drives one uniform block; transition 1.2 s. Per-biome tweaks live in the biome sheets.

| parameter | day | night |
|---|---|---|
| page / sky colour | `#f3e4ee` | `#2b2640` |
| fog colour (level 2) | `#f3e4ee` | `#2b2640` |
| key light colour / intensity | `#fff1dc` / 2.0 | `#8fa3d8` / 0.55 |
| key light elevation (camera space) | 40° | 28° |
| hemisphere sky / ground | `#f3e4ee` / `#d9c3d6` | `#3a2f45` / `#221d30` |
| toon ramp | 3 steps (0.35, 0.7, 1.0) | 3 steps (0.25, 0.55, 0.9) |
| sea tint | `#9fd3e0` | `#3f5f88` |
| `window` materials | base `#ffe9a8`, emissive 0 | emissive `#ffe9a8` × 1.6 (demonstrated buildings and all landmarks) |
| lamps, string bulbs | emissive 0 | emissive `#ffe9a8` × 2.2, lit count = `round(d × lamps)` per topic |
| Bloom | off | threshold 1.0, intensity 0.45, mipmap blur |
| rim disc (level 1) | white 18 % | `#8fa3d8` 25 % |
| stars | none | 600 point sprites on a 40 R shell, 1.5 px |
| creature behaviour | wander | `sleep` clip on benches or pads |

Weather stays a later toggle (per-biome `Instances` field; off by default).

## 7. Screenshot acceptance

Level 1: N pedestals, zero loose structures, one readable code on the facing marker, causeways visible, no speckle. Level 2: island ≈ 70 % of width, curved sea horizon and sky visible, every building touches a road, ≥ 3 empty regions wider than 4 m, no two identical props within 1 m at the same scale. Night: only demonstrated windows lit; bloom leaves signposts readable.
