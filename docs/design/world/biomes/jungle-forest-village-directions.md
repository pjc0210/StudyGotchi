# Jungle / Forest Village: factory step 3 directions

Status: review directions synchronized to plan v3, 2026-09-20. All 3 directions use the same authored footprint, seed envelopes, population bands, landmark stages, and directional camera limits. Art treatment changes; spatial and progression data do not.

## Hard audit and v3 disposition

| source / locked test | evidence in plan v3 | verdict |
| --- | --- | --- |
| `01-jungle-treehouse-village.jpg` | Great Canopy Village now shows 7 dwelling pods, 5 connected spans, 3 deck tiers, and 6 warm windows at the illustrated 75% band | pass after v2 |
| `02-low-poly-treehouse-pack.jpg` | 1 dominant Mother Tree, 3 mid trees, small pod scales, ladders/decks implied by the connected network; modules are rotated and uneven | pass |
| `03-fantasy-forest-village.jpg` | warm window dots and jewel-size accents survive; identical coloured kit islands and neon whole buildings are excluded | pass |
| `04-forest-village-concept.jpg` | `74 × 58 m` inhabited village reads as a network rather than 3 isolated decks; civic Mother Tree remains the dominant vertical | pass after v2 |
| `05-artstation-forest-village.jpg` | irregular districts, broad clearings, bridge/river logic, and a landmark headland; no closed floating-island edge or round plaza | pass |
| fixed hydrology / negative space | `9.5 m` river, `14 m` wet band, `62 × 52 m` lagoon, 3 clearings of `≥32 m` width | pass |
| Forest / Swamp separation | layered high canopy, waterfall, rope spans, ruins, and turquoise water; no round-tree woodland or low moss-boardwalk identity | pass |
| directional camera | dense rear skyline `z = −132 to −76 m`, side wings fade by `z = +30 m`, no front wall, foreground terrain to `z = +190 m`; checked at yaw `−35° / 0° / +35°` | pass after v3 |
| 48 px anchors | Mother Tree/deck ring, waterfall/bridge, stilt-hall bar, broken-gate U, and waterwheel ring are 5 different categories | pass |

Plan v2 fixed the under-described inhabited village. Plan v3 corrects only the camera-safe composition: rear canopy and side wings replace the circular horizon, while foreground lagoon terrain continues under the camera. Hydrology, districts, routes, clearings, village network, landmark, and progression remain fixed.

## Shared footprint and progression

- Field `288 × 264 m`; origin `(0,0)`; ground `y = 0 ±0.6 m`, fixed at every band.
- Hydrology: waterfall lip `(+22,−118)`, river core `9.5 m`, wet band `14 m`, lagoon `62 × 52 m`, east outflow.
- Clearings: Firefly `(−2,+8)`, `38 × 24 m`; Orchid `(−91,−70)`, `32 × 26 m`; Sunbreak `(+27,+52)`, `36 × 26 m`.
- Landmark: Root-Crown headland `(+102,+80)`, `34 × 42 m`, water on 3 sides, one boardwalk approach.
- Camera: south/front looking north/back; pitch `34–40°`, FOV `26°`, target `(0,0,0)`, yaw `−35° / 0° / +35°`, distance `138 m` default / `205 m` max.
- Skyline bands, north/back only: `0%` = 8 crowns `14–18 m` + ridge `10–12 m`; `25%` = +4 crowns `18–21 m`; `50%` = +5 crowns + decks to `16 m`; `75%` = ridge `18–22 m` + complete rear row; `100%` = 2 emergents `26 m` + ridge `22–24 m`.
- Camera-safe land: rear skyline `z = −132 to −76 m`, second row `z = −132 to −101 m`, side wings fade by `z = +30 m`; no south canopy; foreground ground continues to `z = +190 m` and fog-crops beneath camera.

| district | nominal centre / footprint | fixed 48 px anchor | population structures at 0 / 25 / 50 / 75 / 100% |
| --- | --- | --- | --- |
| Great Canopy Village | `(−53,−27)` / `74 × 58 m` | Mother Tree, `16 m`, 3 deck rings | dwelling pods `0 / 3 / 5 / 7 / 10`; canopy spans `0 / 1 / 3 / 5 / 7` |
| Falls Terraces | `(+24,−79)` / `66 × 52 m` | white fall `18 m` + rope bridge `27 m` | upper homes `0 / 2 / 4 / 6 / 8`; mist stalls `0 / 1 / 2 / 3 / 4` |
| Lagoon Quarter | `(+69,+2)` / `68 × 58 m` | stilt hall `18 × 9 m` | stilt homes `0 / 2 / 4 / 6 / 8`; dock fingers `1 / 1 / 2 / 3 / 4` |
| Ruin Commons | `(−76,+55)` / `64 × 54 m` | broken root gate `14 m` | market canopies `0 / 2 / 4 / 6 / 8`; archive bays `0 / 1 / 2 / 3 / 4` |
| Riverworks | `(+6,+66)` / `72 × 52 m` | waterwheel `12 m` | farm rows `0 / 2 / 4 / 6 / 8`; mill sheds `0 / 1 / 2 / 3 / 4` |

At `25%`, the first structure and district accent appear; `50%` adds fences and lamps; `75%` completes the main settlement and string lights; `100%` adds the listed final structures, clutter, and residents. Anchor, land, water, and roads never move.

The direction tables below are art overlays on this shared table: centres, footprints, anchor dimensions, and all 5 population counts remain exactly as specified above.

## Direction A — River-Canopy Commons — **designer pick**

**Mood.** A humid, generous river settlement where an unmistakably inhabited treehouse village opens onto bright water and clear civic glades.

### Palette

| role | hex |
| --- | --- |
| ground / alt ground | `#69a85f` / `#93bd62` |
| canopy / fogged second row | `#356f48` / `#234c3b` |
| accent master | `#f2b84f` |
| side / cliff | `#4f8a4a` |
| road core / edge | `#c69758` / `#6c4c37` |
| wet / water | `#2b797c` / `#55c4c2` |
| ruin stone | `#b7a58f` |
| night window | `#ffe9a8` |

**Land / canopy skyline.** Soft fixed ground keeps the 3 open clearings readable. Broad, asymmetrical umbrella crowns overlap in 2 rear depth rows with fading side wings; visible trunks, deck rings, the white waterfall, and open foreground prevent a Forest-like ball-tree read. Skyline growth follows the shared counts and heights.

| district | anchor treatment at 48 px | population treatment | accent |
| --- | --- | --- | --- |
| Great Canopy Village | dark trunk plus gold 3-ring deck cross | bark pods, open civic decks, kitchens, nursery | fruit-gold `#f2b84f` |
| Falls Terraces | white fall crossed by one dark rope line | mist homes, shrine steps, canvas stalls | coral flag `#ee8b5a` |
| Lagoon Quarter | long stilt-hall bar over turquoise oval | reed homes, fishing decks, ferry fingers | sail-gold `#e6b45a` |
| Ruin Commons | pale U-gate wrapped by dark roots | market awnings, archive bays, vine court | terracotta `#d97a58` |
| Riverworks | dark 8-spoke wheel against pale farm rows | mill sheds, dye racks, seedling beds | ochre `#e3a35e` |

**Landmark.** S1: `8 m` root tripod on an `8 × 8 m` ruin plinth; both persist. S2: a `14 m` civic shrine and `12 m` ring deck grow between the roots; 4 windows light `#ffe9a8`. S3: a `22 m` asymmetrical crown hall adds 3 canopy fins and a 12-lantern ring; windows and lanterns light, while the tripod silhouette remains visible.

**Globe marker.**

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `jungle-a` | `#4f8a4a` / `#69a85f` / `#4f8a4a` | hanging vine fringe `1.2 m`, fruit dots | umbrella canopy over white waterfall stripe | split-leaf palm | 4-block ruin stack | forked torch | fruit + flame `#f2b84f` | layered umbrella crown with one white water cut |

**Night deviations.** Ground shifts to `#294a38`, canopy to `#173529`, and water to `#1f6268`. Only windows, 1 lantern string per populated district, landmark lanterns, fruit fireflies, and torch flame emit; water gets a non-emissive moon strip.

## Direction B — Root-Ruin Sanctuary

**Mood.** A quieter, older village where giant roots have grown through civic ruins without turning the biome into a temple map.

### Palette

| role | hex |
| --- | --- |
| ground / alt ground | `#5d9854` / `#86ad61` |
| canopy / fogged second row | `#2f6842` / `#1f4436` |
| accent master | `#ffb15a` |
| side / cliff | `#3e7444` |
| road core / edge | `#b99c6b` / `#5f4938` |
| wet / water | `#246b70` / `#4ab9b5` |
| ruin stone | `#c1ad8e` |
| night window | `#ffe9a8` |

**Land / canopy skyline.** The same rear skyline uses darker root buttresses and 5 off-axis ruin spires below the canopy; side wings fade before the open foreground. No stepped mass exceeds one-third of its tree, so canopy remains P1 and never reads as a pyramid city.

| district | anchor treatment at 48 px | population treatment | accent |
| --- | --- | --- | --- |
| Great Canopy Village | forked root tower encircled by 3 broken galleries | root-wrapped homes, archive decks, communal ovens | amber cloth `#ffb15a` |
| Falls Terraces | white fall through a split stone lintel | hermit homes, moss stairs, mist gardens | copper `#d9824f` |
| Lagoon Quarter | stilt hall with one pale ruin pier | net houses, reed docks, ferry shrine | saffron `#e5ad55` |
| Ruin Commons | tallest broken U-gate, never stepped | archive bays, market screens, vine classrooms | clay `#cf7055` |
| Riverworks | wheel nested in a root arch | apothecary beds, dye basins, mill sheds | resin-gold `#dca34f` |

**Landmark.** S1: the shared `8 m` root tripod grips a split lintel on the `8 × 8 m` plinth; both persist. S2: a narrow `14 m` off-axis ruin spire and `12 m` gallery grow inside it; 3 slit windows light. S3: the spire reaches `22 m` through an asymmetrical canopy fork, gains 6 hanging lamps and no stepped cap; windows and lamps light `#ffe9a8`.

**Globe marker.**

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `jungle-b` | `#3e7444` / `#5d9854` / `#3e7444` | root-knuckle vine fringe, 8 amber fruit dots | forked canopy over waterfall stripe | root-wrapped palm | split U-gate stack | hanging brazier | fruit + brazier `#ffb15a` | forked crown, white cut, one pale U below |

**Night deviations.** Ground shifts to `#253d32`, canopy to `#142f26`, water to `#1b5559`. Window slits, braziers, 1 resin lamp per populated district, and landmark lamps emit; ruin stone never emits and receives only warm grazing light.

## Direction C — Jewel-Pod Festival Village

**Mood.** A lively canopy town uses small jewel-colour pods and festival cloth as accents while trunks, water, and open glades still dominate.

### Palette

| role | hex |
| --- | --- |
| ground / alt ground | `#72ad62` / `#9ac66d` |
| canopy / fogged second row | `#3d7b4c` / `#28513b` |
| accent master | `#f6c85f` |
| side / cliff | `#477f46` |
| road core / edge | `#d4a861` / `#76513a` |
| wet / water | `#2f7e7a` / `#63cbc2` |
| ruin stone | `#aa9b86` |
| night window | `#ffe9a8` |

**Land / canopy skyline.** The fixed field is brighter, with flatter rear canopy planes, fading side wings, open foreground, and 2–3 cloth facets per district. Pod colour covers at most 20% of any building and never changes shared skyline counts, heights, or open-space ratios.

| district | anchor treatment at 48 px | population treatment | accent |
| --- | --- | --- | --- |
| Great Canopy Village | 3-ring Mother Tree with one raspberry pod | mixed pod homes, festival deck, nursery ribbons | raspberry `#d96887` |
| Falls Terraces | white fall plus mango bridge pennants | round mist pods, shrine stalls, cloth spans | mango `#f0a84f` |
| Lagoon Quarter | long hall with one coral canopy strip | teal-neutral stilt pods, docks, fishing flags | coral `#e87a61` |
| Ruin Commons | pale gate with one amber market awning | low pod kiosks, archive screens, play court | amber `#e6b84f` |
| Riverworks | wheel with one rose dye rack | farm pods, dye awnings, mill sheds | rose `#c95f78` |

**Landmark.** S1: the shared `8 m` root tripod and plinth support one `6 m` woven pod; tripod and plinth persist. S2: twin offset pods and a `12 m` ring deck grow to `14 m`; 4 windows light. S3: an asymmetrical 3-lobe canopy reaches `22 m`, with 8 small cloth pennants and 10 lanterns; only windows and lanterns emit.

**Globe marker.**

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `jungle-c` | `#477f46` / `#72ad62` / `#477f46` | vine fringe with 8 mango fruit dots | faceted canopy over waterfall stripe | ribbon palm | ruin stack with one cloth facet | festival torch | fruit + cloth `#f6c85f` | faceted umbrella, white cut, one warm jewel |

**Night deviations.** Ground shifts to `#2c4a3a`, canopy to `#193526`, water to `#225f62`. Pod walls stay dark; only windows, 2 short festival strings per district at `75%+`, landmark lanterns, and torch emit. Coloured cloth remains non-emissive.

## Shared seed rules

1. Use the plan envelopes exactly: Village `±12 x / ±8 z, −18° ±12°`; Falls `±10 / ±7, +10° ±15°`; Lagoon `±9 / ±11, −8° ±18°`; Ruins `±12 / ±9, +16° ±20°`; Riverworks `±10 / ±8, −12° ±20°`.
2. Reject a seed if district bounds are under `20 m` apart, intersect a clearing, place an anchor over water, or leave under `55%` traversable open ground.
3. Keep each anchor within `3 m` of its sampled centre. Place 1 dominant `12–18 m`, 2–4 mids `7–11 m`, and 9–18 small props `1–4 m` with uneven Poisson spacing.
4. Mix at least 3 reference motif families per district. Recolour, mirror, and scale modules; no identical pod/treehouse appears twice within `20 m`.
5. Preserve the fixed river, lagoon, waterfall, route banks, headland, north skyline, side-wing fade, open foreground, and clearings. Direction changes materials and silhouettes, not placement data.

## 48 px, neighbour, and protected-silhouette checks

- Props hidden: all directions read as 2 rear canopy rows cut by one white fall, a turquoise lagoon, and open foreground; ground remains flatter and less exposed than Forest.
- Props shown: Village = ringed trunk, Falls = white stripe/crossbar, Lagoon = long bar/oval, Ruins = pale U, Riverworks = wheel. No two anchors share a category.
- Marker: P1 alone is an umbrella/forked canopy plus white waterfall stripe; the 3-tier vine-fringe pedestal remains readable without props.
- Forest separation: no large round crown, mushroom cap, open grass field, or log-and-fern P1. Jungle is vertically inhabited and water-cut.
- Swamp separation: no olive peat, low cypress/moss silhouette, lily/reed P1, or lantern-boardwalk emphasis. Jungle is bright, high, and rope-connected.
- Closest protected silhouette: the structural-reference palm island. Ours has no signpost or lone palm composition; P1 is an asymmetrical canopy/waterfall, with ruin stack and torch in fixed separate slots on a cliff-material pedestal.

## Risks — exactly 3

1. Village population could close the Firefly and Orchid breathing spaces; enforce `≥55%` open ground and the fixed no-build masks at every band.
2. Direction B could drift into a stepped temple or protected pyramid silhouette; forbid stepped caps and keep every ruin spire narrower and lower than its off-axis canopy fork.
3. Direction C could become repeated neon kit islands; cap jewel colour at 20% per building, keep cloth non-emissive, and reject duplicate modules within `20 m`.

## Review sheet

1. **KEEP / CUT / CHANGE — v3 directional camera model? Designer pick: KEEP.**
2. **Direction A / B / C? Designer pick: A, River-Canopy Commons.**
3. **Mother Tree deck rings: 3 or 4? Designer pick: 3.**
4. **100% village dwellings: 8 / 10 / 12? Designer pick: 10.**
5. **Water `#55c4c2` or darker `#4ab9b5`? Designer pick: `#55c4c2`.**
6. **Landmark: civic crown / ruin spire / festival pods? Designer pick: civic crown.**
7. **Keep marker order canopy / palm / ruins / torch? Designer pick: KEEP.**
8. **Night strings per populated district: 1 or 2? Designer pick: 1.**
9. **Approve exact seed envelopes and `20 m` minimum gap? Designer pick: APPROVE.**
