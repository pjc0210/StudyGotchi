# Biome sheet: frontier-town (roster `wildwest`)

Status: draft, step 3 (three directions) 2026-09-20. Not approved. Ledger: `../refs/frontier-town/LEDGER.md`. Directions: `frontier-town-directions.md`. Nearest roster neighbours for the distinctness gate: `egyptian-desert` (sand family) and `volcanic` (warm rock family).

## Synthesis of batch 1

### Take / leave

| file | take | leave |
|---|---|---|
| `lowpoly-plank-stable-porch-saddles.jpg` | Covered porch colonnade (6 square posts, knee braces) as a building type for the depot and ranch house, not for Main Street; sun-fan gable window as the one decorative motif allowed on false fronts; hitching rail with 2 saddles; plank boardwalk deck | Everything-one-brown; plinth; branding |
| `iso-saloon-sheriff-telegraph-saguaro.png` | Two-storey saloon with a balcony and a blank sign band (no lettering); sheriff star as a 0.6 m accent badge; telegraph pole line (3 wires, 0.3 m sag per 12 m span) as a linear motif that crosses the basin; 2-arm saguaro; water trough; loose wagon wheel; dusty pink-beige ground as the shadow tint | Realistic horse; text; photoreal grain; square base |
| `lowpoly-false-front-town-water-towers.jpg` | Siding palette teal `#5f8f8a` / sage `#8fa07a` / brown `#6b4a3a`; stilted water tower as the town vertical (one, not three); shed awnings on false fronts; hay bales; steeple at the town edge; dust haze eating the horizon | Grid density; no negative space; hard pixel crunch |
| `toy-saloon-cream-sand-crates.jpg` | Fidelity target (4 colours per object, toy scale, soft grain); oxblood roof `#7a3a30`; external timber stair; fences, barrels, crates as 75 % clutter; flat-faceted cream boulders along the arroyo | Isolated framing; near-white ground for the whole biome (collides with `ice-town`) |
| `iso-mesa-settlement-windmill-cornfield.jpg` | Mesa cliff wall as the skyline element that grows; sand-over-red-rock two-tone with a visible strata cross-section; lattice-tower wind pump; crop rows as a cluster anchor; water tanks; long hard shadows | Asphalt and lane lines; sci-fi machinery; full-saturation orange ground; top-down density |

### The stitched world

One broad dry basin, not an island: ochre sand `#d9b07a` continues south/front beneath the fixed camera and beyond the map crop, where foreground fog prevents any terrain edge from appearing. There is no front canyon, coastline or cliff. The north/back horizon alone rises into a layered red-rock canyon/mesa skyline (`#a0522d` near faces, `#6f3d2d` far silhouettes, `#c2925a` strata and `#d9b07a` caps). Its east and west wings taper in both height and opacity into side fog; they do not wrap behind the camera.

Negative space is the 9 m pale-gravel arroyo, one 22 x 16 m waterhole, a 50 x 22 m central open preserve and measured 26-40 m gaps between the main work districts. Local wagon ruts connect districts and stop. The fixed railway forms the hard east boundary of the settlement and continues through the south crop. Six large non-circular, multi-purpose districts share the flat basin:

| district | where | anchor readable at 48 px | population axis | Ochre Railhead accent |
|---|---|---|---|---|
| Main town | centre-left, west of railway | 12 m four-stilt water tower and 36 m boardwalk spine | sheriff shell -> saloon/storefronts -> hotel, 12 buildings and street clutter | saloon roof oxblood `#7a3a30` |
| Grand railway station | north-centre, west face of tracks | double track, 38 m platform and water crane | depot -> freight shed -> signal tower, caboose and operations pad | signal/caboose mustard `#d9a441` |
| Outskirts reserve | entire east side beyond tracks | telegraph diagonal, abandoned tank and four saguaros | sparse habitat cells, scrub, rocks and burrows; never a settlement | one cactus bloom `#d9765c` |
| Broad ranch | southwest at waterhole | 9 m wind pump, waterhole and first corral | ranch house/barn -> three corrals -> two active animal runs | hay gold `#e8c96a` |
| Mine works | northwest at mesa foot | adit, 10 m headframe and ore spur | boiler/sheds -> carts/tailings -> worker camp and assay shack | ore-cart copper `#b8703f` |
| Archaeology dig | south-centre, separate from town/ranch | exposed foundation, trench and survey tripod | foundations/trenches -> tents/scaffold -> half-buried settlement reveal | canvas cream `#efe0bd` |

The fixed 20 x 16 m lookout rise at [118,65] sits inside the sparse reserve without becoming a seventh district. It grows survey cairn -> 9 m lookout -> 14 m frontier watch fort. Future A and Future B remain blank.

### Plan map

`../maps/frontier-town-plan-v4.svg` (render: `frontier-town-plan-v4.png`) supersedes v1-v3 while preserving v3's district polygons, rail boundary, gap measurements, content and lookout rise. It uses 1 SVG unit = 1 m, x east, and z south/front. The visible map crop is 400 x 320 m; the playable basin is 320 x 260 m, while foreground land continues beyond the south crop. The non-circular polygons are placement envelopes, not raised pads or isolated kit islands.

| district | nominal center [x, z] | envelope (m) | center jitter [x, z] (m) | yaw |
|---|---:|---:|---:|---:|
| `main-town` | [-40, 4] | 113 x 72 | +/-8, +/-6 | +/-12 deg |
| `railway-station` | [18, -65] | 66 x 66 | +/-4, +/-5 | +/-5 deg |
| `outskirts-reserve` | [114, 1] | 88 x 253 | +/-7, +/-10 | +/-18 deg |
| `broad-ranch` | [-108, 94] | 87 x 69 | +/-8, +/-6 | +/-15 deg |
| `mine-works` | [-109, -91] | 86 x 67 | +/-6, +/-5 | +/-12 deg |
| `archaeology-dig` | [0, 98] | 72 x 58 | +/-6, +/-5 | +/-14 deg |
| landmark lookout rise | [118, 65] | 20 x 16 | fixed stage footprint | 0 |
| `future-a` | [-27, -108] | 58 x 41 | fixed blank | 0 |
| `future-b` | [-131, -10] | 44 x 70 | fixed blank | 0 |

The main town is the large civic and commercial district: water tower, sheriff's office, saloon, hotel and storefronts, boardwalks, service alleys, wagons, troughs, and tumbleweeds. The railway runs north-south through the fixed x = 52...66 m corridor and forms the hard eastern district boundary. Its west-side station district holds a 38 x 7 m platform/canopy, 20 x 12 m depot, 16 x 10 m freight shed, water crane, signal tower, and a clear 24 x 22 m operations pad; v4 omits the roundhouse to keep the station legible and preserve expansion room. East of the tracks, the large sparse outskirts reserve holds saguaros, prickly pear, scrub, rocks, protected burrow buffers, telegraph poles, and an abandoned water tank.

The ranch reserves a broad pasture, three corrals, a waterhole and wind pump, plus two unobstructed animal runs of at least 24 x 18 m. The mine combines the adit/headframe, ore spur, boiler and sheds, tailings, and worker camp while leaving room for later mine subareas. The separate archaeology district is a frontier settlement dig with exposed foundations, trenches, scaffold, canvas tents, and half-buried structures; it must not use Egyptian motifs. A fixed 20 x 16 m lookout rise at [118, 65] inside the reserve carries the course landmark stages without becoming a new district. `future-a` and `future-b` remain empty in v4.

Fixed terrain and alignment do not jitter: north/back mesa rows and fog wings, continuous foreground ground, rail corridor, 9 m dry arroyo, 22 x 16 m ranch waterhole, lookout rise, camera stations, and future envelopes. The mine-to-town gap is 30 m, town-to-ranch 26 m, town-to-dig 40 m, ranch-to-dig 35 m, and the central open preserve is 50 x 22 m. Local wagon roads stop at districts; there is no ring road.

**Horizon and camera rule:** the canyon/mesa skyline occupies the north/back only. At 0 percent, the central near/far rows are 60/80 m and the fogged wing minimums 30/42 m; at 100 percent they reach 74/100 m with one 118 m back spire, while the wings remain tapered and never wrap south. Side fog closes the background at the yaw limits. Foreground fog hides the south map crop over continuous land.

The primary camera is fixed south/front looking north/back with pitch 34-40 deg, vertical FOV 26 deg and yaw clamped to -35...+35 deg. Default ground position is `C = [0,135]` with 220 m look span; yaw 0 targets `T = [0,-85]`. Max dolly is `C = [0,155]` with 240 m look span and the same yaw-0 target. At default, yaw +/-35 targets `[+/-126.2,-45.2]`; at max dolly it targets `[+/-137.7,-41.6]`. Validate yaw -35, 0 and +35 at both camera stations and pitch 34/40. Yaw 0 crosses the central skyline at y = 47-56 m; the yaw limits cross the wing field at y = 20-29 m, below its 30 m minimum.

Seeded placement is art-directed inside each polygon: rejection-sample the listed center jitter while preserving the stated gaps, then apply the listed district yaw and building yaw offsets of +/-6 deg. Vary building scale from 0.82-1.18, keep spacing uneven, and mix motifs across subareas. If a sampled layout violates a protected gap, reduce jitter before shrinking the gap. Topics map several-to-one into these multi-purpose districts; fixed north skyline, foreground continuation/fog, rail alignment, camera stations, lookout rise, and blank future envelopes never move.

### Motif distribution (no kit islands)

Each reference contributes small ideas to different regions rather than one region copying one image. The porch colonnade from the stable goes to the depot and ranch house, not every Main Street facade. The saloon diorama contributes the two-storey balcony, sheriff badge, trough and telegraph line; the line crosses the reserve and terminates at the station. The dense false-front reference sets the town's 100 percent population ceiling and colour mix, but not its density outside the town envelope. The toy saloon contributes the external stair, sparse fence/crate language and cream boulders along the arroyo. The mesa reference contributes layered canyon caps, the ranch wind pump and water tanks, not asphalt or industrial machinery. Archaeology uses neutral canvas, timber scaffold and frontier settlement foundations rather than motifs from any desert reference.

### Seed rules

- Rejection-sample district centres inside the plan-v4 envelopes using each row's x/z jitter and yaw; buildings inherit district yaw plus +/-6 deg and scale 0.82-1.18.
- Preserve the measured 26-40 m broad gaps after jitter. Reduce jitter before shrinking a protected gap.
- Exactly one stable anchor identifies each district with buildings hidden: town water tower, station platform/crane, reserve telegraph/saguaros, ranch wind pump, mine headframe and dig foundation/trench.
- Prop scatter uses a 1.2 m exclusion radius, uneven spacing and mixed scale; nothing is placed on a grid.
- At least 55 percent of the reserve remains prop-free. Both future envelopes remain empty.
- North skyline plan/heights, side/foreground fog, rail, arroyo/waterhole, fixed camera stations and lookout rise never jitter.

## What batch 1 contributes

Building language (false fronts, porch colonnade, balcony saloon, external stair), a siding palette that is not sand-coloured, the four clutter props (barrel, crate, hay bale, wagon wheel), district anchors (water tower, rail crane, wind pump, headframe, telegraph line and dig foundation), the north/back canyon-mesa skyline with fogged wings, and a fidelity target for how few colours each object carries.

## Missing references

1. Mesa or butte skyline from ground level, low-poly, with strata visible (batch 1 only has it top-down).
2. Rail depot: low-poly steam locomotive or caboose, platform, water crane.
3. Mine: timber headframe or adit at a cliff foot with ore-cart rails.
4. Ranch: corral ring with a barn and a wind pump at ground level.
5. Frontier archaeology: timber scaffold, canvas tents, exposed settlement foundations and trenches.
6. Dry arroyo or creek bed with a plank bridge and waterhole vegetation.
7. Night: lantern-lit main street, rail platform and lookout tower under stars.
8. Distance shot: a small town in a very large empty desert, with north mesas and open foreground.
9. Small props: covered wagon, stagecoach, tumbleweed, barrel cactus, prickly pear and cattle skull.
10. Landmark: survey cairn to lookout tower to small frontier watch fort on a lone rise.

## Decisions

- 2026-09-20, Philote: Alpine removed from scope entirely.
- 2026-09-20, Philote: every biome is seed-randomised but art-directed (positions, rotations, uneven spacing, negative space, mixed scales, motifs sampled across references); no wholesale recreation of one image, no repeated kit islands.
- 2026-09-20, Philote: a labelled plan map (size, sections, locations) must be shown and approved before any biome layout is generated.
- 2026-09-20, Philote: Frontier camera is fixed south/front looking north/back, pitch 34-40 deg and yaw +/-35 deg; canyon/mesa occupies the north horizon only, with fogged wings and no south/front canyon.
