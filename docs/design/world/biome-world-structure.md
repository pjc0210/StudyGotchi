# Biome world structure: one course, one kingdom

Status: draft for Philote, 2026-09-20. Owner: biome and landmark art direction (parallel chat). Supersedes the fixed `r_b = 36 m` island assumption in `00-world-bible.md` §3 for the level-2 view; the planet-level marker spec is unchanged.

## 1. The principle

A biome is not a decorated pedestal. It is a self-contained world for one course, the way a Super Mario Odyssey kingdom is a world for one chapter: the planet shows a summary marker, the dive reveals a place with regions, elevation, weather, and residents, and the player can spend the whole course there watching it grow.

Consequences:

- **Expansive**: the local view must show several distinct regions at once, with empty landscape between them, and a horizon that hides the edge (fog, sea, or cloud). The island never reads as one plateau with props on it.
- **Sectioned**: each topic in the course owns one region. Regions are visually distinct (elevation band, ground material, prop family) so a student can point at "the lake" or "the summit" and know which part of the course it is.
- **Vertical**: elevation is the main compositional axis. Regions stack from sea level to a summit; the landmark sits at the top or at the heart, never in a flat field.
- **Alive**: clouds, snowfall, water ambient life (whales, birds), residents on roads, and day/night are always running, independent of progress.
- **Legible growth**: progress changes architecture and terrain, in discrete beats, per region (§4).

## 2. Reference synthesis (`refs/`)

| file | take | leave |
|---|---|---|
| `snowy-fishing-village.jpg` | Painted timber houses (rust red, teal, slate blue, cream) with thick snow-cap roofs; winding road ribbons; plaza with lit tree, bunting, benches, and a frozen fountain; stilted houses and plank docks over dark teal water; lamps and fences parenting everything | Photoreal soft snow shading; the bus; the overall flatness |
| `iso-ice-terrace-spiral.png` | The whole-island structure: a spiral of ice terraces from water to summit, a lake basin at mid-height fed by a waterfall, ladders and stairs between tiers, flags marking the route, a small settlement at the top, mountain ring as backdrop | Mobile-level-map framing; the grey void background |
| `penguin-isle-terraces.png`, `penguin-isle-plates-crystals.png` | Archipelago of plates joined by boardwalks; each plate is one themed zone (camp, crystal spires, igloo, grove); dense resident clusters with empty ice between; blue crystal spires as the one saturated vertical; floating floes as filler; fog horizon | Balloon and unrelated fauna; lighthouse copied literally |
| `penguin-isle-archipelago-dithered.jpg` | Proof that this composition survives a dithered, low-resolution pass; bridges between plates; whales in the water | Nothing |
| `penguin-isle-sunset-camp.png`, `penguin-isle-sunset-whale.png` | Gradient sky (peach, coral, violet) as the time-of-day instrument; warm orange accents (tent, crates, trees) on pale ice; ice shards at cliff edges; whale as ambient life | Sky gradient at midday (day stays the charter sky) |
| `lowpoly-icebreaker-cracked-ice.png` | Saturated ice-block silhouettes; cracked plates with dark water in the seams; one warm object (ship) against cold; the crack pattern is the catastrophe language | The saturation level for the whole island (accent only) |
| `kirby-w3-pedestal.png` | 48 px marker: tiers, thick snow lip, three pine heights, signpost | Everything else |
| `lowpoly-island-lighthouse.png` | One white vertical landmark dominating a small island; two-tone ground; white shard row at the waterline | Autumn palette |

## 3. Ice / Chilly Town stitched into one world

Read bottom to top; each band is a candidate topic region. Bands are ordered by elevation, not by course order; the course order assigns topics to bands.

| band | h (m) | region | material | contents | reference |
|---|---|---|---|---|---|
| 0 | −0.4 | Open water | deep teal `#3f7fa0` day | floes, one whale loop, icebreaker at the causeway landing | icebreaker, sunset-whale |
| 1 | 0.4 | Harbour shelf | packed snow over dark planks | stilted red houses, plank docks, rowboats, lamps | fishing village (bottom third) |
| 2 | 1.0 | Town core | snow, painted timber | winding main road, painted gabled houses in pairs, plaza with lit tree, bunting, benches, frozen fountain | fishing village (centre) |
| 3 | 1.6 | Lake basin | frozen lake `#cfe6f5` | skating ring, ice-fishing huts, waterfall from band 5, bridge across the outflow | iso-terrace-spiral (lake) |
| 4 | 2.4 | Pine ridge | snow over tundra green | pine stands in threes, boulders, a stair route with flags | iso-terrace-spiral, fishing village (left) |
| 5 | 3.2 | Glacier terraces | stepped ice, crystal spires | 0.5 m ice risers, crystal cluster on each step, resident gathering rings | penguin-isle plates |
| 6 | 4.2 | Summit | pale stone, snow lip | landmark plaza (s1 → s3), research camp (tent, crates, sled) | sunset-camp, iso-terrace-spiral (top) |
| — | 6–8 | Mountain ring | `#dfe9f3` / `#a7b7c6` | 3–5 `mountain-cone`, back half only; open to the sea on the camera side | iso-terrace-spiral (backdrop) |

Rules that make it one place rather than seven sets:

- One route (the "spiral") climbs every band: causeway → harbour → town main road → lake bridge → ridge stairs → glacier steps → summit. It is the same main-road ribbon throughout; only the riser style changes (planks, packed snow, ice steps).
- Water is continuous: sea → harbour → lake outflow → waterfall → lake. Same tint family, one `wet` band rule.
- Painted timber only in bands 1–2; ice blocks only in bands 3 and 5; stone only at the summit. Materials tell height.
- Warm accent (`#e88a8a` coral or `#f2a86f` peach) appears exactly once per band: a red house, the plaza tree lights, a fishing hut, a flag, a tent.
- Fog horizon at 1.3 d in the sky colour; the mountain ring and the sea both dissolve into it so the world has no visible edge.

Scale: this needs roughly `r_b ≈ 60–80 m` with 4–5 m of vertical relief, about twice the bible's footprint. The planet radius formula in bible §3 scales with `r_b`, so N = 12 courses gives R ≈ 145–190 m instead of 86 m. That is acceptable; the globe is a summary and its markers stay at the fixed marker spec.

## 4. Growth per region: three encodings to decide

Each region has one topic; topic progress `d` is quantised to five bands (0, 25, 50, 75, 100 %) per `docs/design/catalog/growth-and-catastrophe.md`. The whole-course landmark at the summit uses s1/s2/s3 from the course fraction as before.

| | A. Terrain rises | B. Settlement fills | C. Thaw |
|---|---|---|---|
| What changes | Region gains one terrace tier per band (0 → 4 tiers); the route gains its stairs; the waterfall appears at band 3 | Buildings, lamps, fences, and residents fill fixed slots; terrain never moves | Bare ice → snow → pines → warm houses → lights; colour temperature tracks progress |
| Reads at overview | Yes, silhouette changes | Only at 50 %+ | Yes, but by colour |
| Reads at 48 px marker | Yes (tier count) | No | Partly |
| Bible compliance | §1.5 yes | §1.5 yes | Violates "never palette" |
| Risk | Empty regions at 0 % look like floes (acceptable: they are floes) | Early course looks finished-but-empty | Generic "spring comes" trope |

**Recommendation: A + B, with A as the primary signal.** Region elevation = band (terrace pops in 400 ms with `landmark-build-{n}`), buildings on that region's road = demonstrated concepts, residents = finished psets. C is rejected as a rule but its one good idea is kept: the warm accent object in each band appears at 25 % (the region's "first light").

Catastrophe (missed deadline, broken streak): the region's ice plate **cracks** in the `lowpoly-icebreaker` pattern; dark seams open, the outer third of the plate drifts 2 m out as a floe, lamps go out, residents `sad`. Recovery: seams re-freeze white, the floe slides back, `recover-chime`. The terrace count is never reduced in data; the crack is purely visual.

## 5. Ambient layers (always on, never progress-driven)

- Clouds: 3–6 low-poly cloud clusters at h = 12–16 m drifting 0.3 m/s, casting no shadow, fading in the fog band.
- Snowfall: optional per-biome toggle (ice on by default at night only), 1.5 px sprites in the pixel pass.
- Water life: one whale on a 90 s loop around the island; two gulls on figure-eights above the harbour.
- Day/night: bible §6; ice adds aurora bands `#8fd0e8` / `#c9a2e6` at night and the lighthouse sweep. Dusk uses the sunset-camp gradient for the 1.2 s transition only.
- Residents: walk the spiral route, pause at pads, gather in rings on the glacier terraces, `sleep` on benches at night.

## 6. Camera stations to test

1. **Arrival** (from the globe dive): pitch 34°, FOV 26°, the whole island at 70 % width, fog horizon in the top quarter, summit landmark on the upper-right third.
2. **Kingdom overview** (default): pitch 38–40°, free azimuth, dolly 0.6–1.6 ×.
3. **Region snap**: click a region → pitch 36°, distance frames the region at 55 % width, keeps azimuth; ←/→ cycles regions in spiral order.
4. **Resident**: pitch 18°, distance 6 m, target the creature's eye line.
5. **Dive** (globe → arrival): 700 ms cubic in the biome tangent frame, marker cross-fades out at 40–60 %, clouds pass the camera at 30–50 % to hide the LOD swap (the Odyssey trick).

## 7. World-building panel (`prototypes/biome-lab/`)

Built 2026-09-20. `npm run dev` in `prototypes/biome-lab/` → `http://localhost:5181`. A dedicated prototype where the layout above is authored and the camera is tuned, separate from the golden and globe scenes the primary chat owns.

Tuned values from the first pass (supersede §3 where they differ): `islandRadius 56`, region ring radius 33–38 m, region size 18 m, plateau targets 2.6 / 5.2 / 8.0 / 11.0 / 14.5 / 18.0 m, snowfield 1.2 m in 1 m shelves, riser quantisation 2 m, steep faces (normal.y < 0.82) coloured ice `#7fb3d3` under snow tops, fog 1.15 d – 2.4 d riding the camera.

- Location: `prototypes/biome-lab/` (own Vite app, shares nothing with `world-lab/src/golden/`).
- Left panel: region list (band, topic, material, progress scrubber per region), landmark stage, ambient toggles (clouds, snowfall, night, catastrophe), seed.
- Canvas: DS pixel pass identical to the golden scene profile (`pixelSize 4`, normal/depth edges), the stitched island from §3 built from primitives and the existing ice GLBs, one route ribbon, fog horizon.
- Camera bar: station presets from §6, live pitch/FOV/dolly sliders, a "dive" button that plays the globe-to-arrival flight against a placeholder globe.
- Output: `biome-layout.json` (bands, regions, slots, camera stations) so the layout becomes the reusable grammar for the other fifteen families, plus fixed screenshots at overview, 48 px, and region snap for review.
- Acceptance: all seven bands visible at arrival; every building on the route; ≥ 3 empty regions wider than 4 m; the 0 % and 100 % states are distinguishable at 48 px; horizon in frame at every station.

## 8. Decisions (Philote, 2026-09-20)

1. Growth encoding: **A + B**. Terrain tiers per 25 % band; buildings = demonstrated concepts; residents = finished psets.
2. Scale: **expansive**. `r_b ≈ 60–80 m`, 4–5 m relief; planet radius follows.
3. Panel location: **`prototypes/biome-lab/`**, its own Vite app.
4. Catastrophe: **blizzard → fall apart → crack**. Gather = blizzard rolls in (2 s, weather family); bang = the residents comically fall apart (constant across every biome, this is the joke); ruin = ice-crack seams and the outer plate drifting off, lamps out; recovery = seams refreeze white and the plate slides back. "Snow dries up" rejected: bare ground breaks the biome's 48 px identity.
5. Open: region-to-topic order. Designer pick: course order from the harbour up, summit = last topic.
