# Biome sheet: medieval-meadow-kingdom

Status: camera-corrected plan v3, 2026-09-20. Map/synthesis only; no GLB or implementation scope.

## Mood

An inhabited green kingdom seen between long meadow pauses: from a fixed south/front camera, a river leads north through timber hamlets, a working common, and one restrained market to a singular castle headland and the distant Green Crown.

## Reference synthesis: take / leave

| reference | take | leave |
|---|---|---|
| `01-medieval-forest-village.jpg` | Unequal timber-house groups, broad civic lanes, courtyard gardens, water-edge walls, mixed roof silhouettes. | Dense city coverage, repeated kits, canals on every edge, clock-tower repetition. |
| `02-castle-courtyard-ferris-wheel.jpg` | One generous courtyard, axial gate, hedge rooms, a small central water/sundial mark, limestone and dark roof contrast. | Ferris wheel, fairground, palace-scale mass, symmetry, exact courtyard plan. |
| `03-cartoon-land-and-trees.jpg` | Chunky turf-edge readability and unequal grouped tree silhouettes at icon scale only. | Protected world silhouettes, signs, circular pedestals, prop arrangements, mushrooms, pipes, pyramids, rainbow/star forms. |
| `04-castle-landform.jpg` | Castle fused to a broken ridge, recessed gate, stepped masonry, open forecourt, asymmetric side walls. | Cube-diorama edge, monochrome sand, flags/emblems, giant facade, exact architecture. |
| `05-meadow-river-village.jpg` | River as negative-space spine, one arched crossing, separated homes, flowers used as accents, footpaths and layered hills. | Postcard composition, flower carpet everywhere, identical lodges, exact house/bridge placement. |
| `06-low-poly-medieval-village.jpg` | Faceted water, mill wheel, low bridge, dock fragments, angular rocks, unequal trees, economical materials. | Generic dense fantasy town, full mountain-wall copy, uniform roofs, both banks filled. |
| `07-castle-water-trees.jpg` | Castle/ridge held to one side, thin water link, large open green, sparse outliers, stepped terrain. | Rectangular world edge, under-detailed field, grey monolith, literal voxel proportions. |

The motifs are deliberately cross-woven: the forest image contributes roofs to the river village, the courtyard image informs only the castle court, the river image sets negative space across the whole map, and the low-poly image contributes water/mill language to two districts. No image maps one-to-one onto a district.

## World footprint and coordinate contract

- Drawn area: `278 × 260 m`; map origin `(0,0)` is the centre, `+x` east, `+z` toward the default camera/south.
- Overview frame: `184 × 176 m` (`rx = 92 m`, `rz = 88 m`); districts occupy about `61 %`, open meadow/water about `39 %`.
- Settlement ground is fixed. District surfaces remain at their authored elevations and positions for every progress band.
- Green Crown skyline occupies only the north/back band `z = −130…−101`. East/west forest wings begin `30 m` deep at the back and taper to meadow by `z = +24 m`; a second north row sits behind the first.
- South/front `z = +24…+130` has no ridge or forest border. Meadow and river continue beneath the camera and disappear through crop plus fog, never a visible land edge.

## Palette

| role | hex | use |
|---|---|---|
| ground | `#9fcf75` | main meadow top |
| ground alt | `#b9dc83` | open preserves and turf lip |
| cliff / pedestal side | `#6f8055` | hill cuts and Green Crown side |
| forest | `#4f7d4a` | canopy mass |
| road core / edge | `#d8c49a` / `#a58d68` | `4.6 m` core inside `6.4 m` total ribbon |
| court / plaza | `#d9d2c4` | sparse cobble, never a city-wide surface |
| wet bank | `#6f9c66` | `5 m` band beyond river water |
| water | `#5faeb6` | river and courtyard basin |
| limestone | `#c7b98f` | headland and castle walls |
| timber | `#6b4a3a` | mill, barn, roof structure |
| common roof accent | `#d9765c` | limited coral roof family |
| night window | `#ffe9a8` | fixed emissive colour |

Objects use `2–3` flat colours plus one district accent. Accents are forest amber `#e8a13a`, river coral `#d9765c`, market ochre `#c96f45`, farm wheat `#e6c45a`, and castle rose `#b85c6b`.

## District polygons and anchors

The v3 SVG cubic paths are the geometry source of truth. Rounded solid-path bounds below are in metres; a seeded centre is rejection-sampled inside the listed envelope, and the polygon may translate/yaw only if it retains its area, non-circular outline, and `20 m` minimum gap.

| district | nominal centre | rounded solid bounds | jitter / yaw | multi-purpose contents | 48 px anchor |
|---|---:|---|---|---|---|
| Forest Hamlet + Timber Common | `(−82,−64)` | `x −105…−58, z −79…−49` (`47 × 30 m`) | `8 m / ±35°` | `3–6` homes, sawyard, stacked logs, coppice, gathering lawn | great oak `11 m` plus saw wheel `8 m` |
| River Village + Mill | `(−35,−10)` | `x −56…−17, z −27…+4` (`39 × 31 m`) | `7 m / ±30°` | `3–6` homes, mill, tiny landing, kitchen gardens, bridge approach | wheel `9 m` plus unequal roof pair |
| Bridge Market + Guild Court | `(+36,+20)` | `x +16…+56, z +6…+36` (`40 × 30 m`) | `6 m / ±25°` | two-span bridge, `3–7` canopies, guild hall, fountain, river steps | arched bridge `27 m` plus three canopy peaks |
| Farm + Village Common | `(−76,+54)` | `x −102…−50, z +33…+72` (`52 × 39 m`) | `10 m / ±40°` | crop strips, orchard, pasture common, L-barn, windmill, `1–3` cottages | windmill `13 m` plus L-barn |
| Crown Headland + Castle Court | `(+75,−67)` | `x +50…+98, z −89…−46` (`47 × 43 m`) | `4 m / ±18°` | raised headland, forecourt, gatehouse, two round towers, hedge rooms, kitchen orchard | gatehouse `18 m` plus round-tower pair |

The castle is the **sole landmark**, on a headland isolated by the river tributary and reached only by bridge B3. It is not also the skyline. The **Green Crown** north/back ridge is the skyline and contains no castle silhouette; east/west wings taper into fog and never wrap behind the camera.

## River, roads, and bridges

- River centreline runs through `(-22,-132) → (-29,-107) → (-16,-70) → (-10,-15) → (+10,+34) → (+17,+88) → (+31,+132)`, smoothed as one spline. Water width is `18 m`; wet-bank width is `28 m`.
- The headland tributary runs `(-13,-67) → (+9,-65) → (+34,-61) → (+50,-34)`, with `7 m` water inside a `13 m` wet band.
- Main road nodes: forest `(-82,-50) → river village (-34,-15) → market (+31,+17) → farm (-35,+48) → (-65,+66)`. Castle road: `(+31,+17) → (+56,-40) → (+75,-58)`. Mill spur: `(-34,-15) → (-18,-67)`. South footpath: `(-35,+48) → (+16,+81)`.
- B1 mill bridge: centre `(-9,-17.5)`, `20 × 5 m`, yaw `62°`.
- B2 market bridge: centre `(+13.5,+16)`, `27 × 6 m`, yaw `12°`.
- B3 castle causeway: centre `(+37,−62.5)`, `16 × 5 m`, yaw `42°`.

## Open preserves

No seeded placement, road furniture, or progress slot may enter P1 north meadow `44 × 30 m` centred `(-35,-81)`, P2 water meadow `42 × 34 m` centred `(+38,-14)`, P3 south common `46 × 36 m` centred `(+7,+76)`, or P4 east meadow `50 × 38 m` centred `(+79,+66)`. Flowers occur as `2–5` patches per preserve, each `1.5–3 m` wide; they never become a continuous carpet.

## Growth and skyline

District population uses fixed authored slots: anchor only at `0 %`; accent/work prop plus `1` occupied slot at `25 %`; `2–3` occupied slots at `50 %`; `4–5` at `75 %`; `6–7` at `100 %` where district capacity allows. Ground elevation, river, roads, bridges, preserve boundaries, and district polygons never move.

Only the north/back Green Crown changes the terrain silhouette: `0 %` has `8` back crowns at `5–7 m`; `25 %` has `12` at `7–9 m`; `50 %` joins the north ridge at `10 m`; `75 %` adds a north second row at `12–15 m`; `100 %` adds `3` back shoulders at `16 m` and one oak crown at `18 m`. Side wings remain short and tapered at every band. Castle stage work stays inside its fixed `18 m` gatehouse silhouette.

## Seed rules

1. Start from the five nominal centres; sample centre jitter and district yaw only within the table limits.
2. Reject a seed if district boundaries approach within `20 m`, buildings approach water within `4 m`, any anchor is hidden from the overview, or fewer than four preserves remain intact. V3’s sampled minimum is `28.8 m`.
3. Align houses to their local road with `±18°` per-building yaw; never align a district to the world grid.
4. Each district must contain at least three silhouette heights: low `1–2.5 m`, middle `4.5–6 m`, anchor `8–18 m`. Adjacent roofs may not share both height and yaw.
5. Preserve at least `39 %` open meadow/water in the overview. Do not fill unused space with generic houses, trees, or repeated kits.
6. Sample motifs independently across districts. No seed may reproduce the building count, arrangement, bridge position, and tree line of any one reference.

## Level-1 marker and 48 px gates

Marker pedestal: side `#6f8055`, top `#9fcf75`, lip `#b9dc83`, with an irregular turf fringe and `6` root knuckles. Props in fixed order are P1 Green Crown oak-ridge (`8 m`), P2 castle gatehouse pair (`6 m`), P3 mill wheel (`4.8 m`), P4 arched bridge (`4 m`). The front-right remains empty.

- Props hidden at `48 px`: an olive cliff side, bright meadow cap, chunky turf fringe, and blue river slash.
- Props shown at `48 px`: the oak-ridge mass is tallest; the paired gate opening, wheel circle, and bridge arc remain separate pixels.
- `jungle-forest-village` gate: its P1 is a canopy/waterfall and its top is deeper green; this biome must retain the blue river slash, limestone gate pair, and `39 %` meadow openness.
- `nordic-volcanic-highlands` gate: its P1 is a jagged grey peak/volcanic highland; this biome uses rounded green crowns, olive sides, no cable/lava, and a warm limestone gate.
- `mit-college-town` / academy gate: its side is brick and P1 is a single bell tower; this biome uses an olive land cut, paired gatehouse, timber mill wheel, and irregular rural roads.
- Closest protected silhouette is the round green world pedestal in `03-cartoon-land-and-trees.jpg`. Difference: the marker uses a faceted olive side, irregular turf fringe, river slash, paired gate, and no sign, flowers, mushrooms, or copied prop arrangement.

## Camera and horizon acceptance

Camera is fixed south/front looking north/back: pitch `34–40°`, FOV `26°`, target `(0,0)`, yaw `−35° / 0° / +35°`. Validate each yaw at default and maximum dolly (`6` renders). In all six, the north Green Crown plus tapered side wings must cover the rear horizon and the second row must cover first-row saddles. At the front, meadow and river must continue under the lens and disappear through crop/fog; no south ridge, front forest, circular crown, or land edge may enter frame.

## Missing references

1. A true top-down low-poly medieval meadow plan with broad empty fields.
2. One modest castle headland rendered at yaw `−35° / 0° / +35°`, each at default and maximum dolly.
3. A `48 px` or comparable icon test for a gatehouse, waterwheel, arched bridge, and turf lip.
4. A sparse medieval farm/common reference with windmill, orchard, pasture, and only `1–3` cottages.
5. A night meadow/river scene showing window emissive without turning the whole settlement orange.
