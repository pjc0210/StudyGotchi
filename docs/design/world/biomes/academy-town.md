# Biome sheet: academy-town (Academy Campus / College Town)

Status: draft map v1 for Philote, 2026-09-20. Companion files: `../layouts/academy-town.layout.json` (machine-readable), `../layouts/academy-town.map.svg` (plan), `../refs/biome-library/mit-college-town/LEDGER.md` (references). Coordinates in metres, `x` east, `z` south toward the camera, settled ground at `y = 0` and it never rises. Obeys the nine Ice / Chilly Town lab rules and the Review 2 decisions.

## Mood

A green campus town on a river: a wide lawn court runs from the water up to a squat domed hall, a hundred-metre arcade lane streams with students behind it, brick dorms and a chapel line the river road, and a square with a transit portal buzzes at the east end; it should be mistaken for `04-killian-court.jpg` seen from the river.

## References

Structure only (court to river, long corridor, square with transit entrance, chapel, one sculptural building, dorm street on the river); every form is original toybox low-poly and nothing in the world carries a name or logo. Take / leave per image is in the ledger.

## Palette

| role | hex | note |
|---|---|---|
| ground / lawn (charter) | `#9fcf7a` | dominant top colour; ≥ 45 % of the land stays lawn at 100 % |
| paving | `#d8d0bf` | lane, square, axis, plinth; `L` 8 below limestone so they separate at 48 px |
| cliff / river wall (pedestal side) | `#a85a4a` | brick embankment wall, 1.8 m, coping `#d9d2c4` 0.4 m |
| river water | `#4f7fa6` | night `#243a5a` |
| road / road edge | `#8d8a92` / `#c9c2b4` | river road 5 m, straight, jitter ≤ 0.05 |
| limestone | `#ebe4d3` | halls, dome, arcade, boathouse |
| brick / brick dark | `#a85a4a` / `#7a3f36` | dorms, chapel, cafe, museum, townhouses, towers |
| glass | `#7fa9c4` | transit portal and the museum gable only |
| verdigris | `#6fa89a` | dome caps, chapel spire, tower caps |
| tree | `#4f8a4a` | round pollarded canopies, 4 m |
| night window | `#ffe9a8` | fixed |
| accent | `#f2b233` | marigold: pennants, sails, sign band, awning, chairs, posters |

## Landmass, water, skyline

One landmass fills the frame north of a brick-walled river bank running from `(−100, 46)` to `(100, 40)`, bulging to `z = 55` at the centre. The river (48 m to the front fog) is the defining negative space; the camera arrives over it from the south. The back third (`z < −76`) is the **hall skyline**: a row of flat-roofed limestone lecture halls at the foot, a brick bell tower at `(−32, −80)`, and a back row of brick towers and small pale domes in fog from `z = −88`. Only the skyline grows, by course fraction:

| band | front halls | hall height | bell tower | towers | small domes (5 m) | back row |
|---|---|---|---|---|---|---|
| 0 % | 4 | 8 m | 10 m | 0 | 0 | no |
| 25 % | 6 | 9 m | 14 m | 1 × 14 m | 0 | no |
| 50 % | 8 | 10 m | 18 m | 2 × 18 m | 1 | no |
| 75 % | 10 | 11 m | 22 m | 3 × 22 m | 2 | yes |
| 100 % | 12 | 12 m | 26 m, clock lit | 4 × 26 m | 3 | yes |

The second, solitary island (`(64, 82)`, r 13, 21 m off the east bank) carries the river observatory; a sailboat route, no bridge.

## Districts

Four large multi-purpose districts and one solitary island; every pair is ≥ 20 m apart (measured: 22.0–118 m). Population = buildings per band; the anchor exists at 0 %.

| id | shape, fitted to | features | anchor at 48 px (buildings hidden) | 0 / 25 / 50 / 75 / 100 % | accent object at 25 % |
|---|---|---|---|---|---|
| `dorm-row` | strip 52 × 28 m along the west river bank, `(−98, 36) → (−48, 40)` | 2 wave dorms, 2 grid dorms, 2 block dorms (brick, 9 m, flat roofs); chapel (12-facet brick drum r 4 m, moat, 3-rod spire 14 m, one bell); boathouse 10 × 6 m with a 14 m dock and 3 sailboats; river road with 6 trees; river walk, lamps every 8 m | dock comb tooth into the water + the lamp line along the bank + the spire | 0 / 2 / 4 / 6 / 8 | boathouse doors and the first sail |
| `great-court` | polygon 48 × 54 m, the flat lawn between the river road and the plinth | west and east arms of 3 limestone lecture halls 12 × 14 × 9 m with 6-column colonnades; lawn 28 × 54 m; 4 m axis path river → plinth; 2 rows of 8 trees; 8 bench pairs; 6 geese | green rectangle with a pale stripe up the middle and two dotted tree lines | 0 / 2 / 4 / 6 / 6 | banner between the first hall's columns |
| `long-corridor` | strip 100 × 24 m, `z = −57`, the flat band in front of the skyline foot | one 4 m lane walkable end to end; south arcade of 25 columns every 4 m; 12 attached halls 10 × 12 × 8 m (6 north limestone, 6 south brick / limestone alternating); 8 poster boards; 4 clock posts; 15 m link to the plinth | a long pale line with a row of column dots along one side | 0 / 3 / 6 / 10 / 12 | first poster board + a coral banner across the lane |
| `station-square` | polygon 50 × 74 m on the east shoulder, `x 46–96`, `z −44…30` | transit portal 6 × 4 × 4.5 m (steel, glass, marigold band, stair down); paved square 30 × 26 m with a 12-facet fountain; cafe with awning and 8 chairs; museum 14 × 10 × 8 m with a glass gable; 3 townhouses 6 × 8 × 5.5 m; market of 8 stalls; the studio (three leaning brick-and-limestone blocks 8 × 8 × 12 m) | pale square with a dot and a small comb of canopies | 0 / 2 / 4 / 6 / 7 (stalls 0 / 2 / 4 / 6 / 8) | portal sign band and the cafe awning |
| `river-island` (solitary) | polygon r ≈ 13 m in the river, `(64, 82)` | river observatory (brick drum r 5 m, white faceted dome to 10 m, slit); boathouse shed 8 × 5 × 4 m; 10 m dock with 3 sailboats; flagpole 8 m | green blob in the water with a white dot and a stick | 0 / 1 / 2 / 3 / 3 | flagpole pennant |

36 buildings at 100 %, ≈ 50 % footprint coverage inside the built districts, matching the basemap's main group. Station cameras: pitch 28–34°, `fitWidth` 0.8, strips framed along their length; creature scale 1.7 keeps a 1.8 m student ≥ 6 % of the viewport.

## Landmark: s1 → s2 → s3

On its own 12-facet limestone plinth (`(0, −28)`, r 12 m, 0.6 m, fixed) at the head of the Great Court, steps south onto the axis, a 15 m link north to the corridor.

| stage | form | persists | grows | lights up |
|---|---|---|---|---|
| s1 Lectern | plinth, a lectern, a bell on a 4 m post with a marigold pennant, 2 benches | plinth, bell post | — | one lamp on the post |
| s2 Reading Hall | limestone hall 14 × 10 × 9 m, 4 fat columns, low pediment, the bell post becomes a roof cupola | plinth as steps, bell in the cupola | width 6 → 14 m, height 4 → 9 m | 6 windows, cupola lamp |
| s3 Dome Hall | hall widens to 6 columns and 20 × 14 m; squat 12-facet drum with a low faceted dome to 16 m, verdigris lantern, pennant; bell rings on the hour | steps, columns, cupola → lantern | width 14 → 20 m, height 9 → 16 m | windows, oculus, pennant spotlight |

IP: six columns not ten, squat faceted drum, low dome with lantern and pennant, no inscription band. Not a copy.

## Globe marker

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|
| `academy-town` | brick `#a85a4a` / lawn `#9fcf7a` / coping `#d9d2c4` | stone coping course over brick, 12 engaged buttresses | skyline bell tower: brick shaft, limestone cupola, verdigris cap, marigold pennant | dome hall (s3), limestone, 6 columns, faceted dome | wave dorm block, brick, one bend, 6 windows | transit portal, steel and glass, marigold band, one round tree beside it | pennant `#f2b233` on P1 | brick disc with a green top; one thin tower with a white cap and a low pale dome beside it |

No signpost; the course code lives in the HTML card. Night: dorm windows, portal glass, oculus and cupola emissive `#ffe9a8` × 1.6.

## Ambient (always on)

8 students streaming the corridor lane at 0.9 m/s, 4 crossing the lawn, 4 sitting in the square; 4 marigold-sailed boats on a seeded river loop plus 1 rowing shell every 90 s; 6 geese; chapel bell every 90 s, a 3-note landmark peal on the hour from s2. Night per bible §6: windows light dorms first, then corridor, square, court; river-walk lamps every 8 m; the portal glows.

## Catastrophe skin

Sequence fixed across biomes. Weather: **paper storm**, torn posters and exam sheets swirl in from the skyline, sky to `#c9c4bd`. Fall apart: students flop onto the lawn, backpacks spill, sailboats turtle, geese scatter. Ruin: **exam-week blackout**, every window dark except one flickering lamp per district, poster boards bare, stalls collapsed, pennants drooping, papers carpeting the lawn. Recovery: lights return dorm by dorm, papers sweep into bins, stalls re-pitch, pennants re-hoist, the bell rings.

## Creature roster

Three accents that contrast with lawn `#9fcf7a`: coral `#e88a8a`, lilac `#c9a2e6`, peach `#f2a86f`. Avoid mint `#8fc9d8` (reads as glass) and olive `#b9c96f` (vanishes on lawn). Students carry a 0.4 m backpack in the biome accent.

## Risks

1. **Reads as Regular City.** Townhouses, a square and a transit stop are city furniture. Mitigation: the rule below, and lawn stays ≥ 45 % of the land.
2. **Real-campus recognisability.** Dome + court + river is a known postcard. Mitigation: six columns, squat faceted drum, brick wall, pennant, no inscription, a studio of leaning blocks without metal cladding, no text anywhere.
3. **Three near-whites merge at 48 px.** Mitigation: paving is `L` 8 below limestone, coping appears only as a wall line, every hall carries a brick or verdigris element.

## Nearest roster neighbours

| neighbour | exact distinguishing rule |
|---|---|
| `city` (Regular City) | City is winding cobble (jitter 0.25), mauve ground `#d9c3d6`, gabled roofs in rotation, string lights, a bay. Academy Town: **every roof is flat, every street is straight (jitter ≤ 0.05), the ground is lawn `#9fcf7a`, lamps only (no string lights), and the water is a river with a brick wall**. P1 is a brick bell tower with a white cupola over a green top, not a boxy tower block over mauve. |
| `future-utopia` | Utopia is white `#ffffff` and mint glass `#c7dfd6` with cyan `#3fd1c9` light strips, spires and a monorail. Academy Town: **no cyan anywhere, no white spire, no emissive strips; glass appears on exactly two objects (portal, museum gable) and never exceeds 15 % of a facade; walls are brick or warm limestone**. |

## Decisions

- 2026-__-__, Philote: (none yet)

## Open questions for Philote

1. Accent: **A. marigold `#f2b233`** or B. school-blue `#2f5fd0` (provisional marker row)? Pick **A**: warm against green and brick; blue fights the river.
2. Landmark line: **A. lectern → reading hall → dome hall** or B. bell post → clock tower → dome hall? Pick **A**: the bell tower already lives in the skyline.
3. Solitary island: **A. river observatory with a dock** or B. research boathouse with slipway, no dome? Pick **A**: a white dot in the water reads at 48 px.
4. Corridor: **A. open arcade lane** or B. glass-roofed enclosed corridor? Pick **A**: glass stays on two objects and the residents stay visible.
5. River: **A. across the front, camera arriving over the water at the dome** or B. along the east edge, lawn at the front? Pick **A**: the campus-on-a-river composition.
