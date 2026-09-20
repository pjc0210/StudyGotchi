# Coastal Ruins: factory step 3 art directions

Status: review draft, camera model corrected 2026-09-20. All three directions use `../maps/coastal-ruins-plan-v3.svg`, the same fixed terrain, district coordinates, progression bands, south camera, and landmark geometry. This document authorizes no implementation, layout JSON, GLB, or protected silhouette.

## Hard audit of plan v1

| audit target | evidence | v1 finding | current resolution |
|---|---|---|---|
| `01-ilios-architecture.jpg` | white/cyan lanes, civic stair, magenta canopy | All useful cues were concentrated in D1, increasing source-copy pressure. | D1 keeps only stair/lane/vine grammar; no signs, lamp family, or facade arrangement. |
| `02-greek-island-village.jpg` | stepped white/ochre/blue massing | Slope rhythm was described but not visibly assigned outside D1. | Ochre block rhythm moves to D3; domes, crosses, and pyramid mound remain excluded. |
| `03-atlantis-ruins.jpg` | broken columns, ring fragments, water depth | D4 ring was under 5 px wide and low-contrast in the 48 px overview. | D2 owns the 41 m dry comb; D4 ring is 28 m with a dark 3.2 m broken stroke. |
| `04-low-poly-greek-house.jpg` | shutters, slit band, violet awning, damaged parapet | House cues were folded into D1 with the street reference. | Shutters and violet awnings move to D5 workshops; no repeated one-house kit. |
| `05-low-poly-island.jpg` | faceted cliff, channel, foam, sea negative space | Coast grammar was used honestly, but sparse side stacks did not match the fixed camera. | Cliff/channel remain global; north-connected side cliff/islet wings taper toward the camera and disappear in fog. |
| synthesis | 5 districts, fixed ground, separate headland, sea negative space | Concept held, but several drawn catchments had less than 20 m between edges. | V3 preserves the corrected five nearest conservative clearances of 21.7–28.9 m; all other pairs are wider. |
| camera-safe horizon | south camera, yaw `−35°/0°/+35°`, default/max dolly | V1 assumed free orbit; v2 incorrectly added south/front horizon stacks under the camera. | V3 has a north-only escarpment, tapered side wings, and open foreground sea continuing beyond camera and crop. |
| 48 px anchors | six distinct silhouettes | D1, D2, D3, D5, and L held; D4 could disappear into shallows. | D4 is enlarged/darkened; the six reads are zigzag, comb, crescents, ring, L, isolated block. |
| motif distribution | several references across different regions | Reference 01/02/04 cues overloaded D1. | 01→D1, 02→D3, 03→D2+D4, 04→D5, 05→whole coast. |

## Shared footprint and progression

Coordinates are metres, `+x` east and `+z` south. Fixed catchments: D1 `(-26,-55) 54 × 48`; D2 `(-112,-24) 46 × 44`; D3 `(+72,-58) 52 × 44`; D4 `(-12,+38) 54 × 48`; D5 `(+86,+30) 50 × 44`; landmark `(+104,+96) 38 × 34`, across a 12 m channel. Mainland is fixed at `h = 2.4 m`; D1/D3 subpads are fixed at `2.4 / 3.2 / 4.0 m`; landmark ground is fixed at `h = 2.0 m`.

Population is identical in A/B/C:

| district | 0% | 25% | 50% | 75% | 100% |
|---|---|---|---|---|---|
| D1 Cliff Village | stair anchor | 2 homes + accent | 5 homes + 4 props | 8 homes + 6 lamps | 10 homes + 12 props + residents |
| D2 Archaeology Ridge | column comb | 1 shelter + accent | 2 shelters + 4 tables | 3 shelters + 8 crates + 4 lamps | 4 shelters + 12 finds + residents |
| D3 Dry Terraces | 3 wall crescents | kiln + cistern | 2 sheds + 4 olive groups | 3 sheds + 8 olive groups + 4 lamps | 4 sheds + 12 olive groups + residents |
| D4 Drowned Forum | broken ring | mosaic pier + accent | 2 shore shelters + 4 buoys | 3 shelters + 8 buoys + 4 lamps | 4 shelters + 12 survey props + residents |
| D5 Working Quay | L-quay | 2 sheds + accent | 4 sheds + 4 stalls | 6 sheds + 8 stalls + 6 lamps | 8 sheds + 12 quay props + residents |

Skyline is also shared: 0% `3 shoulders / 8 m`; 25% `4 / 10 m`; 50% `6 / 13 m`; 75% `8 / 16 m + row 2 visible`; 100% `9 / 18 m + four asymmetric 22 m slit masses`. Ground height never responds to progress. Camera is fixed south/front looking north/back, pitch `34–40°`, FOV `27°`, yaw `−35°/0°/+35°`, default dolly radius `86 m`, maximum radius `133 m`. Camera-relative fog begins at `210 m` and is opaque at `310 m`; foreground sea continues south below the camera and render crop.

### Shared camera framing acceptance

Each cell is checked at pitch `34°` and `40°` for 12 captures total. The foreground must contain only open sea, atmospheric fog, and the render crop; no south stack, front cliff, circular horizon ring, or visible sea-plane edge is allowed.

| camera yaw | default dolly `r = 86 m` | max dolly `r = 133 m` |
|---|---|---|
| `−35°` | north escarpment fills back; west wing overlaps its left end; east wing is fog-soft | west wing tapers out before the side crop; no hard west cut; north row remains behind D1/D2 |
| `0°` | central escarpment spans behind D1/D3; second row is visible through haze | row 2 dissolves into fog; skyline still covers the back width; foreground remains uncapped sea |
| `+35°` | north escarpment fills back; east wing overlaps its right end; west wing is fog-soft | east wing tapers out before the side crop; no hard east cut; north row remains behind D3/D5 |

---

## Direction A — Salt-White Working Coast (designer pick)

### Mood

A bright, inhabited limestone coast where cobalt utility paint, one magenta vine, and muted archaeology keep the white village from becoming a postcard or temple park.

### Exact palette

| role | hex | assignment |
|---|---|---|
| ground | `#e8dfc6` | dry limestone cap |
| primary accent | `#5279a5` | shutters, cistern, one boat stripe |
| secondary accent | `#c64b92` | D1 vine canopy only |
| base / cliff / pedestal side | `#b98762` | faceted limestone cross-section |
| ruin stone | `#9d9078` | columns and broken ring |
| road core / edge | `#f5efdc` / `#c7b894` | local lanes and stair kerbs |
| wet | `#63bec6` | shallows and foam band |
| water | `#2f7f99` | cove and open sea |
| night window | `#ffe9a8` | fixed emissive |

### Terrain and horizon

Keep the v3 warm cliff face, cream cap, cyan shallows, north-only limestone comb, fixed grey-green row 2, and west/east cliff-islet wings that taper south into fog. Foreground is open sea only, with no south stacks or front horizon object. At 100%, four slit masses are white `#f5efdc` against the `#b7a981` escarpment; none is a tower, dome, or peak. Foam-cut limestone is the marker rim treatment.

### Districts

| district | anchor | shared population read | accent |
|---|---|---|---|
| D1 | 36 m zigzag civic stair | 0 stair → 10 white/cyan homes | one vine canopy `#c64b92` |
| D2 | 41 m six-tooth column comb | 0 comb → 4 canvas shelters | one survey tarp `#5279a5` |
| D3 | three 38/34/30 m retaining crescents | 0 crescents → 4 sheds + 12 olive groups | cistern `#5279a5` |
| D4 | 28 m dark broken ring | 0 ring → 4 shore shelters + 12 survey props | mosaic strip `#5279a5` |
| D5 | 32 m L-quay | 0 quay → 8 shuttered sheds + 12 quay props | one violet awning `#5e466f` |

### Landmark s1 / s2 / s3

| stage | persists | grows | lights |
|---|---|---|---|
| s1 `<33%` | 8 × 6 m archive plinth; 2 offset broken lintels; no roof symbol | height `4.5 m`; one map table | 2 floor lamps `#ffe9a8 × 1.6` |
| s2 `33–66%` | plinth, lintels, map table | 3-bay open archive arcade; height `8 m`; one cobalt wind vane | 3 recessed archive windows + 4 floor lamps |
| s3 `≥67%` | all s2 geometry | asymmetric 2-prong beacon mast; open map room; height `12 m` | 5 windows + one shielded amber beacon; no rotating lighthouse sweep |

### Globe-marker roster row

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|
| `coastal-ruins-A` | `#b98762` / `#e8dfc6` / `#63bec6` | 6 foam-cut notches, no scallop | horizontal escarpment comb `#b7a981` | broken ring `#9d9078` | L-quay `#766f5d` | cobalt cistern `#5279a5` | P4 cistern | low stone comb over a cream disc with one blue dot |

### Night deviations

Ground shifts to `#676e72`, cliff to `#6f554a`, wet to `#397f8b`, and water to `#173f58`. Only windows, 18 district lamps maximum, the s3 shielded beacon, and the D1 vine-court string of 8 bulbs emit `#ffe9a8 × 1.6`; ruins and sea never emit.

### Seed rules

Use v3 envelopes and district yaws exactly. Sample one cobalt object in each district, but permit magenta only in D1 and violet only in D5. Choose 2 of 4 house parapets as damaged at 50%, 4 of 10 at 100%; never repeat the same parapet profile consecutively. Keep at least 35% of every catchment empty and all fixed inter-district gaps at least 21 m.

### 48 px tests

Props hidden: cream asymmetrical coast, rose cliff stripe, teal cove bite, horizontal comb. Props shown: D1 zigzag, D2 comb, D3 crescents, D4 dark ring, D5 L, and landmark block remain at least 3 px apart. Marker P1 alone reads as a horizontal ruin ridge, not a mountain or building.

### Nearest-biome distinction

Against `harbor-town`, A uses warm limestone side `#b98762`, cream top `#e8dfc6`, and a horizontal escarpment P1 rather than blue-grey quay, cobble top, and ship. Against `egyptian-desert`, A uses teal sea over at least 34% of the overview, no sand strata, and no pyramid/obelisk category.

### Protected-silhouette note

Closest source-specific read is the white/cyan street in `01-ilios-architecture.jpg`; A changes it to a top-down 36 m zigzag within one of five districts, removes signs and lamp language, and separates the landmark from all church, dome, and lighthouse forms.

### Exactly three risks

1. White plaster may merge with ground; retain `#9d9078` shadow bands under every 4.5–6 m mass.
2. D1 may still dominate the source read; cap magenta at one 9 × 5 m canopy and cyan facades at 2 of 10 homes.
3. Cream/rose could drift toward desert; preserve the `#63bec6` wet band at 6–18 m width around at least 70% of visible coast.

---

## Direction B — Tide-Glass Excavation

### Mood

A cooler marine field station where sea-glass shallows and oxidized survey gear make the drowned history primary while the village stays practical and sparse.

### Exact palette

| role | hex | assignment |
|---|---|---|
| ground | `#dfe5dc` | cool limestone cap |
| primary accent | `#2f9fa3` | survey gear and cistern |
| secondary accent | `#d86f5f` | one coral-red buoy or awning per populated district |
| base / cliff / pedestal side | `#8fa7a2` | mineral-grey sea cliff |
| ruin stone | `#879b93` | patinated columns and ring |
| road core / edge | `#eef2e9` / `#a9b7ad` | lanes and kerbs |
| wet | `#72c9c5` | broad sea-glass shallows |
| water | `#255f78` | deep sea |
| night window | `#ffe9a8` | fixed emissive |

### Terrain and horizon

The v3 terrain remains fixed, but the cliff reads mineral-grey and the wet band expands visually through colour, not geometry. Escarpment row 1 is `#91a9a3`, row 2 `#728c89`, and fog `#d7e7e3`; west/east wings taper toward the south camera while the foreground remains open sea. Four s3 slit masses use oxidized caps `#2f9fa3`; no blue dome or golden ruin appears.

### Districts

| district | anchor | shared population read | accent |
|---|---|---|---|
| D1 | 36 m stair with teal kerb | 0 stair → 10 cool-white homes | one coral shade sail `#d86f5f` |
| D2 | 41 m patinated column comb | 0 comb → 4 field shelters | instrument cases `#2f9fa3` |
| D3 | three mineral-grey crescents | 0 crescents → 4 sheds + 12 olive groups | cistern `#2f9fa3` |
| D4 | 28 m high-contrast patina ring | 0 ring → 4 shore shelters + 12 survey props | one coral buoy `#d86f5f` |
| D5 | 32 m dark L-quay | 0 quay → 8 pale sheds + 12 quay props | one coral awning `#d86f5f` |

### Landmark s1 / s2 / s3

| stage | persists | grows | lights |
|---|---|---|---|
| s1 `<33%` | mineral plinth, 2 broken lintels | height `4.5 m`; tide gauge | 2 floor lamps |
| s2 `33–66%` | plinth, lintels, gauge | 3-bay open archive; height `8 m`; teal vane | 3 windows + 4 floor lamps |
| s3 `≥67%` | all s2 geometry | offset 2-prong weather mast; open chart room; height `12 m` | 5 windows + one shielded coral status lamp |

### Globe-marker roster row

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|---|
| `coastal-ruins-B` | `#8fa7a2` / `#dfe5dc` / `#72c9c5` | 6 square tide-cut notches | patinated escarpment comb `#91a9a3` | broken ring `#879b93` | L-quay `#536a75` | sea-glass cistern `#2f9fa3` | P4 cistern | grey-green comb over a pale disc with one teal dot |

### Night deviations

Ground shifts to `#56686a`, cliff to `#435b5d`, wet to `#2f7777`, water to `#14394f`. Windows and 18 lamps use `#ffe9a8 × 1.6`; four survey instruments use non-blooming `#72c9c5 × 0.8`; the coral status lamp uses `#d86f5f × 1.0`. Submerged ruins remain dark.

### Seed rules

Use v3 geometry unchanged. Distribute exactly 5 coral objects at 100%: D1 shade, D2 case latch, D3 kiln door, D4 buoy, D5 awning. Patina coverage samples `20–40%` per ruin object, never on every face. D4 receives 2–4 visible seagrass groups; all other districts receive 0–1. Preserve 35% empty catchment and 21 m minimum fixed gaps.

### 48 px tests

Props hidden: pale grey-green cap, broad cyan bite, darker horizontal comb. Props shown: the patinated D4 ring must remain darker than wet by at least `L-18`; coral dots appear in five separated districts and never merge. Marker P1 is a comb, not a wave, ship, or glass spire.

### Nearest-biome distinction

Against `harbor-town`, B has no ship/crane/warehouse P1 and uses a ruin ring plus field-station clutter; its top is pale mineral `#dfe5dc`, not cobble `#a3aeb8`. Against `future-utopia`, B's sea-glass is non-emissive, irregular, weathered, and paired with broken stone rather than white civic spires and transit arches.

### Protected-silhouette note

Closest risk is the saturated underwater-temple source. B removes gold, domes, intact colonnades, fish mascots, and arcade depth framing; its ring is broken, top-down, muted, and only one district in a working coast.

### Exactly three risks

1. Cool palette may collide with `future-utopia`; keep all teal surfaces matte and limit straight luminous bands to zero.
2. Expanded wet colour may visually shrink land; retain the exact v3 coastline and keep wet tint inside the fixed 6–18 m band.
3. Coral distribution may look game-token-like; each coral object must have a different category and stay under 3 m.

---

## Direction C — Saffron Survey Dusk

### Mood

A warm late-day excavation coast where blue utility paint cuts through saffron dust, but sea, work yards, and broken stone prevent a romantic resort or desert-temple reading.

### Exact palette

| role | hex | assignment |
|---|---|---|
| ground | `#ead7b7` | pale sun-warmed limestone |
| primary accent | `#355c9a` | ultramarine shutters, cistern, boat stripe |
| secondary accent | `#d88a3d` | kiln, survey flags, one wall face |
| base / cliff / pedestal side | `#a96f58` | muted rose cliff |
| ruin stone | `#a18b70` | weathered columns and ring |
| road core / edge | `#f3e6cb` / `#c4a77a` | lanes and stair kerbs |
| wet | `#5eb7b4` | turquoise shallows |
| water | `#285f7d` | deep blue sea |
| night window | `#ffe9a8` | fixed emissive |

### Terrain and horizon

Keep the exact v3 coastline and heights. Row 1 uses dusty limestone `#b89a73`, row 2 uses desaturated mauve `#887b79`, and the side wings taper south into fog above open foreground sea. Four s3 slit masses use pale cap `#f3e6cb`. The saffron role stays below 12% of land pixels and never forms a pyramid, dome, or full orange district.

### Districts

| district | anchor | shared population read | accent |
|---|---|---|---|
| D1 | 36 m cream stair with blue kerb | 0 stair → 10 cream homes | vine canopy `#a74374` |
| D2 | 41 m umber column comb | 0 comb → 4 tan shelters | survey flags `#d88a3d` |
| D3 | three rose crescents | 0 crescents → 4 sheds + 12 olive groups | kiln `#d88a3d`; cistern `#355c9a` |
| D4 | 28 m umber broken ring | 0 ring → 4 shore shelters + 12 survey props | mosaic `#355c9a` |
| D5 | 32 m dark L-quay | 0 quay → 8 cream sheds + 12 quay props | awning `#355c9a` |

### Landmark s1 / s2 / s3

| stage | persists | grows | lights |
|---|---|---|---|
| s1 `<33%` | rose-stone plinth, 2 broken lintels | height `4.5 m`; blue map table | 2 floor lamps |
| s2 `33–66%` | plinth, lintels, table | 3-bay cream archive; height `8 m`; saffron vane | 3 windows + 4 floor lamps |
| s3 `≥67%` | all s2 geometry | asymmetric 2-prong mast; open chart room; height `12 m` | 5 windows + shielded ultramarine-framed amber beacon |

### Globe-marker roster row

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|---|
| `coastal-ruins-C` | `#a96f58` / `#ead7b7` / `#5eb7b4` | 6 angular foam-cut notches | dusty escarpment comb `#b89a73` | broken ring `#a18b70` | L-quay `#6f5849` | ultramarine cistern `#355c9a` | P4 cistern | low warm comb over a pale cap with one dark-blue dot |

### Night deviations

Ground shifts to `#665d61`, cliff to `#60464a`, wet to `#347a7b`, water to `#173b55`. Windows and 18 lamps use `#ffe9a8 × 1.6`; the kiln cools to non-emissive `#7a4d3b`; 6 survey flags retain blue silhouettes but never glow. No sunset-orange emissive is allowed.

### Seed rules

Use v3 geometry unchanged. Saffron appears on exactly 1 object in D2 and 2 objects in D3, and nowhere else. Ultramarine appears once per district, with no adjacent blue masses larger than 6 m. Sample 3–5 ochre wall faces among all 26 maximum buildings, never a contiguous row. Preserve 35% empty catchment and 21 m minimum fixed gaps.

### 48 px tests

Props hidden: warm cream cap, rose cliff stripe, turquoise cove, mauve-backed horizontal comb. Props shown: the five blue accents are separated; D3's three crescents remain horizontal and cannot form a stepped triangle. Marker P1 reads as a low comb, while the blue P4 dot prevents a sand-disc read.

### Nearest-biome distinction

Against `egyptian-desert`, C keeps at least 34% water in overview, uses rose cliff rather than yellow strata, and owns no pyramid, obelisk, palm, pylon, or oasis. Against `wildwest`, C has no mesa cap, saguaro, rail, or brown timber field; its P1 is a continuous coastal comb over turquoise wet notches.

### Protected-silhouette note

Closest concern is the framed Greek-island village and generic Santorini church stack. C removes every cross, dome, bell opening, triangular settlement mound, and white-on-orange church hierarchy; warm colour is fragmented across work yards rather than composed as one postcard hill.

### Exactly three risks

1. Warm palette may collide with `egyptian-desert`; enforce the 34% water floor and 12% saffron ceiling in overview review.
2. D3 may reform the source poster's stepped mound; keep all three crescents open at both ends and cap structures at 4.
3. Dusk mood may make night too orange; all emissive remains fixed `#ffe9a8`, with no orange bloom or glowing ruin stone.

## Review sheet (11 lines)

1. **Designer pick: A Salt-White Working Coast**; keep, change to B, or change to C?
2. Keep v3 fixed footprint and its verified `21.7 m` minimum conservative district gap?
3. Keep the south camera, yaw `−35°/0°/+35°`, and `86/133 m` dolly tests?
4. Keep the non-lighthouse Archive-Beacon landmark geometry for s1/s2/s3?
5. Keep skyline progression `3/4/6/8/9` shoulders and `8/10/13/16/18 m` heights?
6. Keep four asymmetric `22 m` slit masses only at 100%?
7. Keep marker order P1 comb, P2 ring, P3 L-quay, P4 cistern?
8. For A, keep cobalt `#5279a5` primary and one magenta `#c64b92` vine canopy?
9. Keep D3 as the only district carrying the reference's ochre block rhythm?
10. Keep D4 ring at `28 m` with dark `3.2 m` stroke for 48 px survival?
11. Keep night limited to windows, district lamps, and one shielded landmark beacon?
