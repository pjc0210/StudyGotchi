# Biome synthesis: coastal-ruins

Status: map synthesis v3 with Salt-White Working Coast selected for review, 2026-09-20. This remains art direction only: no implementation, layout JSON, or GLB generation. Coordinates use metres: `+x` east, `+z` toward the fixed south/front camera; `(0,0)` is the map centre.

## Mood and stitched world

A sun-bleached working coast has grown around older ruins: white-and-cobalt homes climb a fixed limestone shoulder, archaeologists occupy a dry colonnade ridge, boats work an asymmetric cove, and a broken forum continues beneath turquoise water. It is not a circular island or a Greek theme-park kit. The 278 × 246 m plan crop is a north-connected limestone mainland cut by coves and a 12 m landmark channel; open sea continues south below the camera and crop. Five large land-shaped districts each hold 2–4 subareas, so topics map several-to-one. A north/back limestone escarpment is the only growing terrain silhouette; side cliff/islet wings taper toward the south camera and dissolve into fog. Settlement ground, coast, district catchments, and landmark headland never change height.

## Reference take / leave

| reference | take | leave |
|---|---|---|
| `01-ilios-architecture.jpg` | Stepped civic lane, white/cyan massing, magenta vine canopy, mixed roof rhythm. | Named game location, exact street/facades, signage, lamps, protected silhouette. |
| `02-greek-island-village.jpg` | Slope-climbing blocks, offset stairs, white/ochre/blue depth, mixed skyline scale. | Crosses/churches, framed composition, orange-dominant pyramid mound. |
| `03-atlantis-ruins.jpg` | Drowned columns, broken ring/dome fragments, depth layers, marine growth. | UI, mascots, coins, gold temple forms, fully underwater world. |
| `04-low-poly-greek-house.jpg` | Low-poly plaster, cobalt slit band, timber shutters, awning, damaged parapet. | Floating square base, repeated intact house kit, literal asset copy. |
| `05-low-poly-island.jpg` | Faceted cliffs, narrow channel, foam edge, detached rock, sea negative space. | Twin-peak hero, red volcanic palette, empty-island composition. |

Provenance and direct source links are preserved in `../refs/biome-library/coastal-ruins/LEDGER.md`.

## Palette

| role | hex | use |
|---|---|---|
| ground | `#e8dfc6` | dry limestone cap and fixed district pads |
| accent | `#5279a5` | cobalt shutters, cistern tile, one object per subarea |
| secondary accent | `#c64b92` | vine bloom only; never a building field |
| base / cliff / pedestal side | `#b98762` | warm limestone cross-section |
| road core / edge | `#f5efdc` / `#c7b894` | 3–4 m local stone lanes and stair kerbs |
| ruin stone | `#9d9078` | weathered blocks, column shafts, and the high-contrast drowned ring |
| wet / shallows | `#63bec6` | 6–18 m coastal band and submerged paths |
| water | `#2f7f99` | open sea and deep cove |
| night window | `#ffe9a8` | fixed; windows and quay lamps only |

## Fixed terrain and district coordinates

Mainland ground is fixed at `h = 2.4 m`, with coast faces dropping to sea level `h = 0 m`. Village and dry-terrace subareas use fixed pads at `2.4 / 3.2 / 4.0 m`; these heights never respond to progress. The landmark headland is fixed at `h = 2.0 m`, centre `(+104,+96)`, size `38 × 34 m`, separated by a 12 m channel and reached only by skiff. Coastline, shallows, skyline foot, second silhouette row, tapered side wings, and headland are never randomized.

| district | nominal centre | fixed catchment | centre envelope | yaw | 48 px anchor | multi-purpose subareas |
|---|---:|---:|---:|---:|---|---|
| 1 Cliff Village Terraces | `(−26,−55)` | `54 × 48 m` | `8 × 6 m` ellipse | `±16°` | 36 m zigzag stair spine | homes; civic stair; vine court; small bath |
| 2 Archaeology Ridge | `(−112,−24)` | `46 × 44 m` | `7 × 6 m` ellipse | `±18°` | 41 m six-tooth column comb | survey yard; cistern; cataloguing shelter; dry colonnade |
| 3 Dry Terraces | `(+72,−58)` | `52 × 44 m` | `8 × 5 m` ellipse | `±14°` | 38/34/30 m crescent walls | olive garden; lime kiln; blue cistern court; stone yard |
| 4 Drowned Forum Cove | `(−12,+38)` | `54 × 48 m` | `7 × 6 m` ellipse | `±18°` | 28 m dark broken ring | mosaic quay; submerged steps; ruin field; glass-bottom stop |
| 5 Working Quay & Cove Town | `(+86,+30)` | `50 × 44 m` | `8 × 6 m` ellipse | `±16°` | 32 m L-shaped quay | market; shuttered repair sheds; workshops; boat ramp |

The five nearest conservative bounding-circle clearances are `21.8 / 21.8 / 23.5 / 27.9 / 28.9 m`; every other pair is wider. Four protected open areas are fixed at `(−68,+29) 30 × 24 m`, `(+27,−7) 28 × 22 m`, `(−36,+98) 34 × 24 m`, and `(+38,+89) 28 × 22 m`.

## Movement and topic assignment

There is no global spiral. Each district gets 1–3 local routes: 4 m stone lanes in districts 1, 3, and 5; a 3 m survey path in district 2; and 3 m partially submerged steps in district 4. Three seeded boat routes connect the quay to the landmark headland, the drowned-forum loop, and the outer coast; no bridge closes the sea channel. Assign topics to 2–4 fixed pads inside a district, balancing topic count across districts; never split a district into one circular island per topic.

## Seed-randomized art direction

1. Sample each anchor and its local population-slot centroid once inside the labelled ellipse and sample yaw inside its range; fixed catchment polygons, nominal district centres, and terrain heights do not move.
2. Rejection-sample if catchments overlap, any reserved open width falls below 20 m, or a route crosses the landmark channel.
3. Keep uneven spacing. Do not normalize districts onto a ring or grid.
4. Each district has one 8–12 m anchor; supporting masses mix 3–7 m heights and 4.5–6 m houses. At least 35% of each catchment remains unbuilt at 100% population.
5. For each seed, distribute motifs from at least 3 references across at least 3 districts. No district may reproduce one reference's complete composition.
6. Population uses fixed slots: 0% anchor; 25% first occupied subarea and accent; 50% half the masses; 75% all primary masses and lamps; 100% secondary clutter and residents. Ground never rises.

## Skyline growth and camera-safe horizon

The north/back limestone escarpment grows by course fraction: `0% = 3 shoulders / 8 m`; `25% = 4 / 10 m`; `50% = 6 / 13 m`; `75% = 8 / 16 m plus visible row 2`; `100% = 9 / 18 m plus four 22 m watch-slits`. Row 1 occupies `z = −83..−106 m`; the fixed second row occupies `z = −108..−124 m` at 7–10 m and gains opacity, not height, at 75%. West/east cliff-islet wings connect to the row and taper south to low fragments that disappear in side fog. There is no southern skyline, front cliff, circular enclosure, or stack belt under the camera.

Camera is fixed south/front looking north/back: target `(0,0)`, FOV `27°`, pitch `34–40°`, yaw `−35°/0°/+35°`, default dolly radius `86 m`, maximum radius `133 m`. Camera-relative fog begins at `210 m` and is opaque at `310 m`. Foreground sea extends south below the camera and render crop, so no front world edge enters frame.

| yaw | default dolly `r = 86 m` | max dolly `r = 133 m` |
|---|---|---|
| `−35°` | north row closes the back; west wing overlaps its left end | west wing tapers into fog before the side crop; no hard west cut |
| `0°` | central escarpment spans behind D1/D3; row 2 remains visible | row 2 dissolves into fog; foreground remains uncapped open sea |
| `+35°` | north row closes the back; east wing overlaps its right end | east wing tapers into fog before the side crop; no hard east cut |

Acceptance: test all six yaw/dolly combinations at pitch `34°` and `40°` for 12 captures. Every capture shows a continuous back skyline, fog-soft side termination, and only sea/fog/crop in the foreground.

## 48 px silhouette checks

- Props hidden: warm limestone cap with an asymmetric turquoise cove bite, broad dark sea, and a low comb escarpment; it must not read as a round pedestal.
- Anchors shown: district 1 reads as a stair zigzag, 2 as a broken column comb, 3 as triple crescents, 4 as a broken ring, 5 as an L-quay, and the landmark as one isolated block across a water slit.
- At 0% versus 100%, only the back comb changes from 3 low shoulders to 9 mixed shoulders and 4 slits. District ground outlines remain identical.
- Closest protected/game-specific risks are the source game's white-blue street and generic Atlantis temple. Ours differs through a top-down asymmetric mainland, working/archaeological land uses, non-gold ruins, no church/dome hero, no UI motifs, and no copied street or temple silhouette.

## Nearest-biome distinctness

| nearest biome | coastal-ruins difference |
|---|---|
| `harbor-town` | Side is warm limestone `#b98762`, not wet blue-grey quay `#7f8f9c`; top is cream `#e8dfc6`, not cobble `#a3aeb8`; P1 category is a limestone escarpment/ruin comb, not a tall ship. Boats support the plan but do not own the skyline. |
| `egyptian-desert` | Side is muted rose limestone `#b98762`, not sand strata `#d2a95e`; top is pale mineral cream beside teal water, not continuous sand `#efd9a2`; P1 is a horizontal coastal escarpment, never a pyramid or obelisk. |

## Level-1 summary — Salt-White Working Coast

Selected for review: limestone side `#b98762`, cap `#e8dfc6`, foam-cut rim `#63bec6`; P1 escarpment comb, P2 broken ring, P3 L-quay, P4 cobalt cistern. The saturated object is the cistern `#5279a5`. This remains art direction and creates no implementation commitment.

## Missing references

1. A true top-down or oblique plan of a working white-stone cove with archaeological circulation.
2. A fogged limestone escarpment and tapered side-wing reference photographed from a fixed south viewpoint at yaw `−35°/0°/+35°`.
3. A low-poly drowned ruin field using muted stone rather than gold fantasy architecture.
4. A standalone headland archive/beacon that is neither a lighthouse nor a church.
5. Night treatment for white plaster, wet stone, submerged ruins, and sparse quay lamps.
