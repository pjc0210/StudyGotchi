# Biome sheet: nordic-volcanic-highlands

Status: art-direction plan v4, 2026-09-20. Map: [`../maps/nordic-volcanic-highlands-plan-v4.svg`](../maps/nordic-volcanic-highlands-plan-v4.svg). Synthesis only; no implementation or GLB brief.

## Mood

A cold, inhabited fjord cut through steep charcoal highlands: broad water and mossy breathing room lead the eye, painted timber and turf roofs prove Nordic settlement, and geothermal aqua plus small, quarantined lava seams reveal the volcanic substrate. It must never read as the shipped generic Volcanic world with a village added.

## Reference synthesis

| reference | take | leave |
|---|---|---|
| `01-volcanic-canyon.jpg` | Deep black canyon slit, offset ledges, narrow bridge tension | Red-everywhere lighting, crystal kit, whole scene |
| `02-village-facing-volcano.jpg` | Tiny settlement against a huge distant volcanic shoulder; water separates scales | Bright tropical grass, central hero cone, sparse generic huts |
| `03-volcanic-archipelago.jpg` | Unequal islets and boat-only separation | Lava ocean, red atmosphere, copied island chain |
| `04-modular-lava-landscape.jpg` | Dark crust / hot seam boundary and varied rock scale | Modular repetition, full-field lava, pale fantasy rock |
| `05-volcanic-settlement.jpg` | Buildings nested into highland folds; forge warmth | Repeated kit, continuous lava coast, windmill silhouette |
| `06-volcano-shape-kit.png` | Broad shoulders, asymmetric caldera notches, second silhouette row | Cone catalogue, skull/fantasy props, one-to-one shapes |
| `07-volcanic-flora.jpg` | Aqua water against umber basalt and sparse pioneer plants | Yellow slime flora, narrow corridor composition |
| `08-volcanic-outpost.jpg` | Geothermal utility as a readable industrial anchor | Grid city, neon outline, tropical palms, repeated towers |
| `09-norway-fjord-village.jpg` | Painted timber ribbon held small beneath steep walls | Exact village, photographic palette ordering |
| `10-gudvangen-fjord-valley.jpg` | Fjord as the largest negative space and atmospheric depth instrument | Real valley trace, continuous forest carpet |
| `11-undredal-fjord-village.jpg` | Uneven shoreline density, docks, pasture gaps, red/ochre/cream accents | Church copy, exact settlement plan, white-house dominance |
| `12-southern-norway-village.jpg` | Turf-roof/red-barn massing and long low building proportions | Suburban spacing, saturated blue photo colour, copied barn |

The motifs are deliberately cross-woven: the quay takes Norwegian density but the volcanic canyon's bridges; the geothermal district takes outpost utility but Norwegian turf/paint; the canyon takes forge warmth but Gudvangen-scale walls; the lava islets take archipelago separation but no buildings. No district corresponds to one reference.

## Landmass and negative space

The authored world is `328 × 284 m`, with `(0,0)` at the overview target, `+x` east and `+z` toward the south/front camera. The fjord is a `41–49 m` wide S-curve from `(−12,148)` beneath the camera crop through `(−35,59)`, `(3,4)`, `(18,−74)` to `(25,−145)` at the north/back skyline. It connects to the `127 × 98 m` archipelago basin and remains the primary negative space, not a lava river. Mossy highland ground `#68765b` remains fixed.

There is no circular rim and no south/front skyline. The volcano/fjord highland skyline occupies only the north/back: a charcoal near row `#2e3440`, cooler rear row `#55616a`, and east/west wings that descend and dissolve into side fog. The south/front fjord and ground continue beneath the camera and crop into foreground fog without exposing a coastline or terrain edge.

## Palette

| role | hex | use |
|---|---|---|
| ground | `#68765b` | muted highland turf |
| cliff / pedestal side | `#2e3440` | steep fjord walls and north/back highlands |
| basalt top | `#4b4a52` | canyon, islets, headland |
| road core / edge | `#8a7f6d` / `#544f49` | local lanes and ridge track |
| wet shore | `#526a68` | narrow waterline only |
| fjord / deep water | `#315b70` / `#203f52` | largest colour field |
| geothermal | `#7cc8be` | pools and pipe highlights, never lava |
| lava / hot edge | `#e05a32` / `#ffb347` | archipelago and forge seams only |
| painted timber | `#a64b3c`, `#d08a3c`, `#e8dfc9` | red, ochre, cream |
| turf roof | `#556b46` | longhouses and sheds |
| night window | `#ffe9a8` | fixed |
| fog / snow trace | `#d4d8d5` / `#c7d4d6` | atmosphere and sparse summit trace |

## Districts and coordinates

Districts are large, land-shaped polygons sized for 100% population. Their solid polygon is the maximum populated footprint; the dashed map envelope is the legal seeded-centre range.

| district | centre and polygon vertices `(x,z)` m | 48 px anchor | population axis |
|---|---|---|---|
| Fjord village + quay | centre `(−84,31)`; `[(-105,14),(-78,8),(-59,17),(-61,42),(-78,53),(-102,44),(-113,27)]` | T-quay plus ochre boathouse, `19 m` span | stilt quay → painted houses → fish racks, market awnings, second dock |
| Basalt canyon + mine/forge | centre `(−124,−64)`; `[(-151,-77),(-124,-85),(-96,-74),(-95,-58),(-109,-46),(-139,-48),(-156,-61)]` | `16 m` gantry crossing a black canyon slit | adit and forge → ore yard → hoist, carts, sheds, lamps |
| Highland hamlet + pasture | centre `(−27,−49)`; `[(-51,-69),(-24,-76),(1,-65),(5,-45),(-5,-28),(-29,-25),(-50,-37),(-58,-53)]` | crossed turf-roof longhouses plus `18 m` dry-stone fence | 2 halls → red/cream sheds → pasture walls, smokehouse, hay yard |
| Geothermal farms + outpost | centre `(76,−14)`; `[(47,-42),(77,-48),(104,-35),(109,-9),(94,16),(65,22),(43,8),(36,-19)]` | `15 m` steam tripod plus 3 aqua pools | collector → turf sheds and plots → pipes, drying racks, survey hut |
| Lava archipelago | centre `(67,92)`; three unequal islets within `[(33,63),(64,58),(98,70),(109,94),(95,118),(60,125),(27,110),(18,83)]` | `13 m` natural lava arch over 3 black islets | cooled stepping stones → warning beacons → sampling shelter; boat-only |
| Course landmark | fixed headland centre `(133,−90)`, polygon `[(113,-108),(136,-115),(154,-99),(151,-77),(135,-65),(117,-70),(107,-88)]` | lit vertical inside a low ring | s1 cairn → s2 basalt ring observatory → s3 aurora beacon |

Conservative post-jitter district-edge clearances are canyon–hamlet `20.336 m`, hamlet–geothermal `20.184 m`, geothermal–lava `20.014 m`, geothermal–headland `27.175 m`, and `35.350–195.482 m` for every other pair. The measured minimum is `20.014 m`, satisfying the locked `≥20 m` runtime rule. Protected open preserves are P1 `30 × 18 m` centred `(−2,−97)`, P2 `28 × 26 m` centred `(−13,55)`, and P3 `34 × 32 m` centred `(127,9)`. They never accept buildings, props, or paths.

## Routes, water movement, and crossings

- Highland track: `3.8 m` core / `5.2 m` edge, from `(−124,−61)` through `(−30,−48)`, `(32,−28)`, `(76,−18)`, and `(102,−18)` to `(126,−72)`. It bends between districts; it is not a district ring.
- Local lanes: `3.2 m` wide, 1–3 per populated district, ending inside the district footprint.
- B1 basalt span: `17 m`, centred `(-35.5,-58)`. B2 quay footbridge: `16 m`, centred `(-21,9)`. B3 headland span: `14 m`, centred `(87,-51)`.
- Boat L1: south fog `(−13,133)` → quay `(−72,31)`. L2: quay → archipelago `(67,92)`. L3: archipelago → north-fjord point `(25,−5)`. Each keeps an `8 m` clear corridor.
- The lava archipelago has no road bridge. Fjord traffic is sparse: 1 quay boat, 1 cargo skiff, and at most 1 moving boat at overview.

## Seed rules

Use `hash(courseId, "nordic-volcanic-highlands", districtId)` as the stable district seed. Sample centres inside the dashed envelopes with radii `7 / 8 / 9 / 10 / 6 m` for districts 1–5, then rejection-sample until every conservative post-jitter edge gap is `≥20 m`, all preserves remain clear, and boat lanes keep `8 m`.

Nominal yaws and legal offsets are `−18°±22°`, `+12°±18°`, `−6°±28°`, `+17°±20°`, and `+31°±14°`. The landmark remains fixed at `−35°`. Randomize fixed building slots, yaw, colour ordering, and clutter density; never randomize ground, fjord, bridges, skyline feet, preserves, or the landmark. Each district uses one `11–16 m` anchor, 2–3 medium `6–9 m` masses, and smaller `3–5 m` props with uneven `3–11 m` spacing. Reject mirrored layouts and repeated kits.

Population bands are fixed-ground: 0% anchor only; 25% first occupied structure and accent; 50% half the slots plus fences; 75% all primary slots plus clutter and lamps; 100% one district-specific extra. Topics map several-to-one when there are more than 5 topics.

## Volcano skyline versus landmark

The volcano is environmental skyline, never the course landmark and never a central cone. It grows only along the north/back horizon: 0% = 3 broad `8 m` shoulders; 25% = 5 shoulders at `11 m` with one steam notch; 50% = 7 peaks at `15 m` forming a shallow asymmetric caldera; 75% = 9 peaks at `18 m` plus a `12 m` rear row; 100% = 11 peaks at `22 m`, rear row complete, with glow on at most `8%` of the caldera arc. Side wings taper into east/west fog; only this skyline elevation changes.

The course landmark grows independently on the east headland: the low s1 cairn footprint persists through s2/s3, the ring and mast are added without widening the headland, and only the s3 lens emits `#ffe9a8`. This prevents the generic Volcanic read of “crater cone equals landmark.”

## Camera and silhouette gates

- Camera is fixed to the south/front and looks north/back along the fjord: target `(0,0)`, pitch `34–40°`, FOV `26°`, yaw limited to `−35° / 0° / +35°`, dolly `0.6–1.6×`.
- Validate all three yaw stations at default and maximum dolly. At `−35°`, the west wing must taper into fog while the north skyline fills the horizon; at `0°`, the full caldera row sits behind the fjord; at `+35°`, the east wing must taper into fog while the north skyline remains continuous.
- Every station must crop/fog the south foreground with fjord water continuing under the camera; no south skyline, coastline, terrain edge, or circular enclosure may enter frame.
- At 48 px with props hidden, the overview must read as a blue fjord leading from an open foreground crop to a charcoal north skyline, not a circular island. With props shown, red quay timber, aqua geothermal pools, and the orange arch remain three separate colour notes.
- Each district remains identifiable with buildings hidden by its anchor listed above.
- Distinct from shipped `volcanic`: water is the largest field, lava is quarantined to district 5/canyon seams, P1 is a broad caldera row rather than a crater cone, and settlement uses turf/painted timber.
- Distinct from `alpine`: no cable or twin grey spike; the skyline is broad charcoal volcanic shoulders and geothermal steam.
- Distinct from `harbor-town`: no ship, crane, warehouse row, or lighthouse marker; the quay is subordinate to fjord walls and the geothermal/basalt anchors.
- Closest protected silhouette is a generic volcano pedestal. Ours uses a fjord-notched dark pedestal, broad off-centre shoulder row, steam tripod, turf hall, and lava arch; never the cone + orange rim + forge-house set.

## Level-1 marker direction

Use 1–3 stacked basalt/turf discs with a fjord notch cut through the front-right negative space. P1 `8 m`: broad asymmetric caldera shoulder, no cone. P2 `6 m`: steam tripod with aqua pool. P3 `4.8 m`: crossed turf longhouses. P4 `4 m`: black lava arch with one orange seam. The saturated accent belongs only to P4; windows use fixed `#ffe9a8` at night.

## Missing references

Before production asset briefs, collect: (1) a top-down low-poly Nordic fjord settlement with broad empty water; (2) turf-roof geothermal agriculture without sci-fi machinery; (3) a dark basalt fjord/canyon under neutral daylight, not red lava light; (4) a natural lava arch at small-game scale; and (5) three non-lighthouse Nordic wayfinding/observatory landmarks shown as s1/s2/s3. These gaps do not block the plan map, but they do block final prop silhouettes and landmark asset approval.
