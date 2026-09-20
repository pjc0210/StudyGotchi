# Biome layouts

One `<biome>.layout.json` per biome family, all on the same schema (`layout.schema.json`, JSON Schema 2020-12, `version: 2`). The generic renderer in `prototypes/biome-lab/` loads any of these files and builds the 3D map from it; the biome sheet in `../biomes/<biome>.md` stays the human-readable design, this file is the machine-readable one. Every property in the schema carries a `description`, so open the schema when a field is unclear.

Files here:

| file | what |
|---|---|
| `layout.schema.json` | the contract; read its `description` strings as documentation |
| `validate.mjs` | schema + design-rule checker, Node >= 18, no dependencies |
| `<biome>.layout.json` | one per biome, `version: 2` |
| `<biome>.map.svg` | the designer's plan drawing, same coordinates (not validated) |

## Adding a new biome layout

1. Copy the closest existing file to `<biome-id>.layout.json` (`biome` must equal the file stem and the sheet name under `../biomes/`).
2. Fill it from the biome sheet. Metres everywhere, `x` east, `z` south toward the camera, settled ground at `y = 0`. Hex colours lowercase 6-digit. Bands are the string keys `"0" "25" "50" "75" "100"`. Anything family-specific that the generic renderer does not need goes in the nearest `extras` object, never in a new top-level field.
3. Run `node validate.mjs` (or `node validate.mjs <biome-id>.layout.json`; add `--verbose` to see every measured clearance). Fix every printed line; the script exits non-zero until the file passes.
4. Keep the `.map.svg` and the sheet in step with the JSON; the JSON is the source of truth for coordinates.

The validator enforces the schema plus these design rules (fix plan Review 2, factory handoff Lessons):

- every district shape is a strip or a polygon with >= 5 distinct vertices (no circles; collinear points may be added to keep a rectangle);
- every pair of districts is >= 20 m apart (strips expanded by `width / 2`, polygon-to-polygon distance as in `biome-layout.ts`);
- every district has an `anchor` and a non-decreasing `population` (and non-decreasing `props` tables);
- skyline `growth[band].height` is non-decreasing by band;
- `soloIsland` is >= 15 m from every non-solitary district; the landmark plinth is >= 15 m from every district;
- every `material` names a `palette` role; every colour anywhere is a valid lowercase 6-digit hex;
- `biome` matches the file name; marker slots are unique.

## Field glossary

| field | type | meaning |
|---|---|---|
| `version` | `2` | schema version |
| `biome`, `name` | slug, string | file stem / sheet id; display name |
| `status`, `notes[]` | string(s) | designer notes; not read by the renderer |
| `palette` | role -> hex | every colour in the biome by role name; `material` fields refer to these roles |
| `scale.creatureHeight`, `.creatureScale` | m, factor | resident base height (1.8) and the per-biome scale that keeps it >= 6 % of the viewport |
| `scale.houseHeight`, `.hallHeight` | [min, max] m | ordinary house and large-hall heights |
| `scale.minDistrictGap`, `.minCreatureViewportFraction`, `.pixelCellPx` | number | the rules the biome was designed to (20 m, 0.06, 2 px); other named heights allowed |
| `world.extent` | m | terrain half-extent (`worldExtent` in the lab); 100 = the 200 x 200 m frame |
| `world.frameRadius` | m | radius the overview / arrival stations frame |
| `world.seaLevel`, `.groundHeight`, `.relief` | m | water surface, settled ground, rolling relief amplitude; ground never changes with progress |
| `land.outline` | polygon or open-back lobes | land footprint; `openEdges` names frame sides that are not coasts (`back`, `west`, `east`, `front`) |
| `land.skyline.kind` | slug | `mountain-range`, `gantry-wall`, `spire-rows`, `hall-skyline`, `cream-peaks`, or a new kind |
| `land.skyline.arc` | polyline | the skyline spine west to east (z = arcZ + arcCurve x^2 sampled every 20 m) |
| `land.skyline.range` | {arcZ, arcCurve, footDepth, footRise, footWander?} | parametric form mirroring the lab's `range` |
| `land.skyline.footZ`, `.fogStartZ`, `.fogOpaqueZ` | m | where districts stop, where fog starts, where nothing is drawn |
| `land.skyline.rows` | [z...] | element rows front to back |
| `land.skyline.growth[band]` | {count, height, rows?, ...} | front-row element count and tallest height per band (the only elevation that grows); family breakdown beside them |
| `land.coastCliff` | {height, color, material?, band?, description?} | the riser at every land edge over water; `band` is a coping course (`lip`) or piling band (`waterline`) |
| `land.extras` | object | family-specific land features (slag shore, open lawns, river details) |
| `water[]` | {id, kind, geometry, color, ...} | `kind` in sea / lake / river / canal / basin / lagoon; `geometry.kind` in polygon / polyline+width / disc / complement (everything outside the land) |
| `soloIsland` | object or null | the second, solitary island: `center`, `radius` and/or `polygon`, `feature`, `population`, `district` (the solitary district's id), `offshoreGap`, `access` |
| `transit[]` | {id, kind, polyline, width, elevation, ...} | monorail / rail / road / path / causeway / pipe / conveyor lines; `closed` for loops; `stations[]`; `appearsAtBand` |
| `districts[].id`, `.name`, `.band` | slug, string, int | id, panel name, topic slot (1 = arrival district) |
| `districts[].solitary` | bool | true for the district on `soloIsland` |
| `districts[].shape` | {kind: polygon, vertices} or {kind: strip, centreline, width} | the region, as in the lab's `DistrictShape` |
| `districts[].fittedTo` | string | the land feature the shape follows |
| `districts[].material` | palette role | ground / dominant material |
| `districts[].anchor` | {id, description, position, footprint, silhouette48?} | the one thing present at 0 % that identifies the district at 48 px; `footprint` is [w, d] m or null |
| `districts[].features[]` | strings | everything inside at 100 %, with counts and metres |
| `districts[].building`, `.buildingHeight` | slug, [min, max] | the counted building kind and its height |
| `districts[].population[band]` | int | buildings per band (0 % anchor only ... 100 % extras) |
| `districts[].populationNotes[band]` | string | what each band adds, in words |
| `districts[].props.<name>[band]` | int | named prop counts that scale with the buildings |
| `districts[].extras100[]` | strings | the 100 % extras beyond the building count |
| `districts[].accent` | {object, hex} | the one warm accent, shown from 25 % |
| `districts[].camera` | {pitchDeg, azimuthDeg, fitWidth} | district-station framing |
| `districts[].laneYaw`, `.stationAzimuth` | rad, deg | lane direction (from +z toward +x); station azimuth (same convention) |
| `landmark.position` | [x, z] | landmark centre |
| `landmark.plinth` | {radius or polygon, height, facets?, material?, color?, causeway?, steps?} | the fixed base; never grows |
| `landmark.stages.s1/s2/s3` | {name, height, footprint?, description?, persists[], grows[], lights[], motion[]?} | the three built stages |
| `landmark.motif`, `.ruin`, `.ipNote` | string / object | catalog motif; ruin + recovery; how it differs from its real-world echo |
| `marker.side`, `.top`, `.lip`, `.rim` | hex, hex, hex, string | pedestal colours and rim treatment |
| `marker.props[]` | {slot P1..P4, id, height, color, colours[], accent, direction?, description} | signature props in fixed slot order |
| `marker.accent`, `.signpost`, `.silhouette48`, `.night` | {object, hex}, false, string, string/object | the marker's one accent; never a signpost |
| `ambient` | object | always-on layers (residents, boats, smoke, creature events, night order); family renderer only |
| `catastrophe` | {weather, fallApart, ruin, recovery} | family skin of the fixed sequence |
| `creatureRoster` | {accents[], avoid[]} | creature accent colours and colours to avoid |

## Normalisation log (v1 designer drafts -> v2, 2026-09-20)

Design intent was carried over field by field; where a designer used a different name it was renamed, where data was missing it was derived from the matching `../biomes/<id>.md` sheet or the `.map.svg` plan (derivations are called out under Gaps). The v1 drafts were never committed, so the tables below (and each file's `notes`) are the record of what changed.

### academy-town

| v1 | v2 |
|---|---|
| `worldExtent`, `frameRadius`, `seaLevel`, `groundHeight`, `relief` (top level) | `world.extent`, `.frameRadius`, `.seaLevel`, `.groundHeight`, `.relief` |
| `districtGapMinimum` | `scale.minDistrictGap` |
| `land.islandRadius` | dropped (equal to `world.extent`) |
| `land.shape`, `land.riverBank` | `land.outline.description`; `land.outline.vertices` = frame back corners + bank reversed, `openEdges: [back, west, east]`; bank also kept in `land.extras.river.bank` |
| `land.riverWall {material, coping, height, copingThickness}` | `land.coastCliff {height, color, material, band {at: lip, height, color}}` |
| `land.riverRoad`, `land.riverWalk` | `transit[river-road]` (road), `transit[river-walk]` (path; polyline = bank offset 2 m inland), `land.extras.riverWalk` |
| `land.water[].polygon`, `.material` | `water[].geometry {kind: polygon, vertices}`, `.material` + `.color` / `.nightColor` |
| `land.river.width`, `.farBank` / `.sailboatLoop`, `.rowingShell` | `land.extras.river` / `ambient.sailboatLoop`, `ambient.rowingShellRoute` |
| `land.skyline.arc {arcZ, arcCurve, footDepth, footRise}` | `land.skyline.range` (+ `arc` sampled as a polyline) |
| `land.skyline.growthByBand` | `land.skyline.growth` with `count` (= halls), `height` (= tallest of hall / tower / bell tower), `rows`; breakdown kept |
| `land.skyline.bellTower`, `.hallFootprint`, `.hallSpacing`, `.domeDiameter`, `.materials` | `land.skyline.extras.*` |
| `land.soloIsland {wall, offshoreGap}` | `soloIsland {material, offshoreGap, district, population}` |
| `land.miniIsland`, `land.headland` | dropped (duplicates of `soloIsland` and `landmark.plinth`) |
| `districts[].anchor` (string), `.anchor48px` | `anchor.description`, `anchor.silhouette48`; new `anchor.id`, `.position`, `.footprint` |
| `districts[].buildingHeight` (number) | `[h, h]` |
| `districts[].accent`, `.accentObject` | `accent {hex, object}` |
| `districts[].populationNotes["100"]` | also split into `extras100[]` (notes kept) |
| `landmark.court` | `landmark.plinth` (+ `facets: 12`, `material`, `color`) |
| `landmark.stages[]` (array, `id`, `lightsUp`) | `landmark.stages {s1, s2, s3}`, `lights`; `persists` / `grows` as arrays |
| `marker.pedestal.{side,top,lip}`, `.rimTreatment`, `.props[].prop`, `.accentObject`, `.silhouette48px` | `marker.{side,top,lip}`, `.rim`, `.props[].description` (+ `id`, `color` = first colour), `.accent {object, hex}`, `.silhouette48` |
| geometry | **three edits** so the landmark plinth (kept at `(0, -28)` r 12) clears 15 m: Great Court north edge `z -14 -> -1` (rectangle now carries collinear midpoints for the >= 5-vertex rule); Long Corridor centreline `z -57 -> -67` (width 24 kept); skyline foot `z -76 -> -80` (`range.footDepth 10 -> 6`). Recorded in the file's `notes`; the axis and the 15 m link are listed as `transit` paths. |

### heavy-industry

| v1 | v2 |
|---|---|
| `notes` (string) | `notes[]` |
| `palette.nightGroundLightnessOffset` | `ambient.night.groundLightnessOffset` (palette is colours only) |
| `ground.{seaLevel, groundHeight, relief}` | `world.*` |
| `ground.quayWallHeight`, `.pilingBandHeight` | `land.coastCliff.height`, `.band {at: waterline}` |
| `land.worldExtent`, `.frameRadius` / `.islandRadius` | `world.extent`, `.frameRadius` / dropped |
| `land.outline` (array) | `land.outline {kind: polygon, vertices, openEdges: [back]}` |
| `land.skyline.arc {..., footWander, footZ}` | `land.skyline.range` (+ `footWander`), `.footZ`, sampled `arc` |
| `land.skyline.chimneyRowZ`, `.coolingTowerRowZ` / `.gantryPitchX`, `.gantryFirstX` | `land.skyline.rows` `[-76, -86, -94]` / `land.skyline.extras` |
| `land.skyline.growth[band]` | + `count` (= gantries), `height` (= tallest of gantry / chimney / cooling tower), `rows` |
| `land.slagShore` | `land.extras.slagShore` |
| `land.water[].colour`, `.region` | `water[].color`, `.description` |
| `water harbour` `kind: basin` | `kind: sea`, `geometry {kind: complement}` |
| `water canal` `.polygon`, `.width`, `.turningBasin`, `.liftBridge` | `geometry {kind: polygon}`, `extras.{width, turningBasin, liftBridge}` |
| `water cooling-basin` `kind: pond`, `.center`, `.radius` | `kind: basin`, `geometry {kind: disc}` |
| `land.rail[] {gauge, points}` | `transit[rail-*] {kind: rail, width, polyline}` |
| `land.pipes[] {diameter, colour, points}` | `transit[pipe-*] {kind: pipe, width, color, polyline}` |
| `land.conveyors[] {beltSpeed}` | `transit[conveyor-*] {kind: conveyor, extras.beltSpeed}` |
| `land.roads[] {coreWidth, edgeWidth, points, crosses}` | `transit[quay-road] {kind: road, width, edgeWidth, polyline, description}` |
| `land.soloIsland.outline`, `.offshoreDistanceM` | `soloIsland.polygon`, `.offshoreGap` |
| `districts[].shape.type` + `.points` | dropped `type`; `vertices` |
| `districts[].anchor` (string), `.anchorPosition` | `anchor.description`, `anchor.position`; new `anchor.id`, `.footprint` |
| `districts[].populationDetail` | `populationNotes`; counts from the sheet tables into `props.*`; `extras100[]` |
| `districts[].hallHeight` (works-town) | `extras.hallHeight` |
| `landmark.slab {polygon, causeway, height, side}` | `landmark.plinth {polygon, causeway, height, color}` |
| `landmark.stages[]` | `landmark.stages {s1, s2, s3}` |
| `ambient.events[].route: rail.spine` | `transit.rail-spine` |
| `creatures` | `creatureRoster` |
| `scale.minDistrictGapM` | `scale.minDistrictGap` |
| marker | as academy-town |

### future-utopia

| v1 | v2 |
|---|---|
| `land.{worldExtent, frameRadius, seaLevel, groundHeight, relief}` / `.islandRadius` | `world.*` / dropped |
| `land.mainland {kind, vertices, note}` | `land.outline {kind: polygon, vertices, openEdges: [back, west], description}` |
| `land.cliff {dropM, material, lightStripHeightM, lightStripHex, note}` | `land.coastCliff {height, color (= palette.glass), material, band {at: lip, emissive: true}, description}` |
| `land.skyline.kind: civic-tower-skyline`, `.note` | `kind: spire-rows`, `description` |
| `land.skyline.arc {arcZ, arcCurve, footDepth, rows}` | `range`, sampled `arc`, `rows`; `footZ -72`, `fogStartZ -74`, `fogOpaqueZ -100` derived from the mainland back edge and the map's fog band |
| `land.skyline.growthByBand {towers, tallestM, rows, bandsLit}` | `growth {count, height, rows, towers, bandsLit}` |
| `land.skyline.spire` | `land.skyline.extras.spire` (+ `towersAt100ByRow [11, 7, 5]` from the sheet) |
| `land.lawns` | `land.extras.lawns` |
| `water lagoon` `kind: sea`, `.hex`, deep / shallows in the note | `kind: lagoon`, `color`, `deepColor`, `shallowsColor`, `geometry {kind: complement}` |
| `water canal` `kind: channel`, `.centreline`, `.width`, `.basin` | `kind: canal`, `geometry {kind: polyline}`; basin split out as `water[canal-basin] {kind: basin, geometry: disc}` |
| `water ring-pool` `kind: pool`, `.center`, `.radius`, `.innerRadius` | `kind: basin`, `geometry {kind: disc, innerRadius}` |
| `land.transit[civic-loop] {kind: monorail-loop, heightM, railHex, undersideHex, route, pylonEveryM, waterCrossings, pods}` | `transit[civic-loop] {kind: monorail, closed: true, elevation, color, edgeColor, polyline, stations, extras.{pylonEveryM, pylonHex, waterCrossings, pods}}` |
| `land.creatureEvent` | `ambient.creatureEvent` |
| `land.soloIsland.outline`, `.shape` | `soloIsland.polygon`, `.description`; new `id`, `district`, `population`, `material`, `offshoreGap` (measured), `access` |
| `districts[].anchor` (string) | `anchor.description`; new `anchor.id`, `.position`, `.footprint`; `fittedTo` from the sheet |
| `districts[].buildingHeightM` | `buildingHeight` |
| `districts[].extrasAt100` (string) | `extras100[]` |
| `districts[].treesByBand` | `props.trees` |
| `districts[].material: tile` | kept; `palette.tile` (= `ground` `#e3f2ec`, the sheet's "ground (tile)") added so the role resolves |
| `landmark.plinth.heightM`, `.note` / `stages[].heightM`, `.brief`, `.lightsUp` | `height`, `description` / `height`, `description`, `lights` (arrays) |
| `marker.props[].heightM`, `.note` | `height`; note merged into `description` |
| `scale.civicBlockHeight`, `.minDistrictGapM` | `scale.hallHeight`, `.minDistrictGap` |
| (absent) `ambient`, `catastrophe`, `creatureRoster` | filled from the sheet's Ambient layers, Catastrophe skin and Creature roster sections |

## Gaps

Values that could not be taken from the draft JSON or the sheet, or that were derived and should be confirmed by the designer.

| file | field | state |
|---|---|---|
| `future-utopia` | `transit[civic-loop].width` | **null**: the monorail beam width is not specified anywhere (sheet or draft) |
| `future-utopia` | `soloIsland.offshoreGap` | measured 17.6 m island-to-mainland; the fix plan asks for 25-35 m of clear water |
| `future-utopia` | `land.skyline.footZ / fogStartZ / fogOpaqueZ`, `rows` | derived from the mainland back edge (z = -72) and the map's fog band (z < -74); not stated by the designer |
| `future-utopia` | `status`, marker P4, skyline / landmark / skyport picks | provisional until Philote answers the sheet's Questions 1-5 |
| `heavy-industry` | `catastrophe.fallApart` | absent: the sheet only says the sequence is fixed |
| `heavy-industry` | `soloIsland.access` | "jetty with a moored skiff; no bridge" inferred from the 75 % population note |
| `heavy-industry` | `districts[].anchor.footprint` | derived from the anchor shapes drawn in `heavy-industry.map.svg` (crane 16 x 10, furnace 10 x 10, tower + sawtooth 27 x 10, tank trio 18 x 26, beam + mast 17 x 9) |
| `academy-town` | `districts[].anchor.position`, `.footprint` | derived from `academy-town.map.svg` (5 px = 1 m) and the feature dimensions; not stated by the designer |
| `academy-town` | `land.skyline.rows` `[-80, -88]` | derived from the skyline foot and fog start ("the back row sits in fog") |
| `academy-town` | Great Court, Long Corridor, skyline foot geometry | moved as described above to satisfy the 15 m landmark-clearance rule; the designer should confirm or propose a different resolution (e.g. a smaller plinth or a relocated landmark) |
| all | `land.skyline.growth[band].height` | defined as the tallest element per band; if the renderer wants the primary element's height instead, read the family breakdown beside it |
| `candy-world` | whole file | `candy-world.layout.json` did not exist when this pass ran; when it lands, normalise it to this schema and run `node validate.mjs` |
