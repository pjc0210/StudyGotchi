# Biome sheet: heavy-industry (Industrialized / Heavy Machinery)

Status: draft map v1, 2026-09-20. Map [`../layouts/heavy-industry.map.svg`](../layouts/heavy-industry.map.svg), data [`../layouts/heavy-industry.layout.json`](../layouts/heavy-industry.layout.json), ledger [`../refs/biome-library/industrial-city/LEDGER.md`](../refs/biome-library/industrial-city/LEDGER.md). Evolves catalog `factory`. World 200 × 200 m, x east, z south, ground y = 0.

## Mood

A warm-grey works on a harbour where everything big is moving: gantries slide, presses thump, a train rolls to the quay, chimneys puff in rhythm; it should be mistaken for `01-isometric-factory.jpg` seen from a hill, in concrete instead of white plastic.

## Palette

| role | hex | note |
|---|---|---|
| ground | `#b9b4b0` | catalog `factory` ground, warm concrete, fixed |
| ground alt (yards) | `#a9a4a0` | district slabs, rail ballast |
| quay paving | `#d9d4cf` | dockyard apron, road core |
| cliff / cross-section | `#9f9a96` | quay wall, slab side; pedestal side |
| piling / steel band | `#6b5f7a` | 0.9 m band at the waterline; pedestal lip |
| slag | `#5a5560` | west shore terraces |
| water | `#6f9fb8` | harbour; canal `#5f8ea6` |
| rail / road edge | `#6b5f7a` | rails, kerbs |
| steel | `#6b5f7a` | frames, cranes, presses |
| rust | `#a8563a` | pipe ends, chute, tank bands |
| structure A cream | `#e6dfd3` | halls, chimney shafts |
| structure B navy | `#3b5f7a` | tanks, doors, containers |
| structure C brick | `#9b6357` | furnace hall, terraces |
| pipe blue | `#4f8fb0` | racks, valves (catalog `accent_2`) |
| warning accent | `#e8a13a` | crane cabs, warning lights, one chevron per district; the only saturated orange |
| molten | `#ff7a3a` | foundry slit only, emissive at night |
| smoke / steam | `#fffaf3` / `#ffffff` | |
| window | `#ffe9a8` | fixed, emissive × 1.6 at night |

Distinct from `city` (mauve `#b98bb0` / pink paving `#d9c3d6`) and `future-utopia` (mint glass `#c7dfd6` / tile `#e3f2ec` / cyan `#3fd1c9`): the only warm neutral grey with a plum-steel side and an orange accent.

## Landmass

One landmass fills the north two thirds and runs into the **gantry wall** at z ≤ −68, dissolving in fog; no back coast is ever seen. The south third is the **harbour basin** (z > 52). A **canal** 10 m wide cuts north at x 40–50 to a turning basin at (44, −24). The **west coast** (x < −88) is a **slag shore**: four dark terraces (`#5a5560`, 1.2 m risers) fed by the foundry chute. A **solitary island** at (72, 82), radius 13 m, sits 30 m off the quay. Ground is flat (±0.4 m); the only cliff is the 1.5 m quay wall.

**Skyline element: the gantry wall**, z −74 to −96: gantry cranes on an 18 m pitch, chimneys between, cooling towers behind. It is the industrial mountain range: a repeating tall silhouette that, unlike a range, moves. Only the wall changes height.

| band | gantries × height | chimneys × height | back row | moving parts |
|---|---|---|---|---|
| 0 % | 3 × 14 m | 2 × 12 m | none | 1 trolley, period 14 s |
| 25 % | 5 × 18 m | 4 × 16 m | none | trolleys on 3 gantries; 2 chimneys puff |
| 50 % | 7 × 22 m | 6 × 20 m | 2 cooling towers, 24 m | hooks rise and fall 6 m; pistons on 2 legs, 0.5 Hz |
| 75 % | 9 × 26 m | 8 × 26 m | 3 cooling towers, 30 m | conveyor bridge wall → foundry, belt 0.8 m/s |
| 100 % | 11 × 30 m | 10 × 32 m | 4 cooling towers, 36 m, plumes | all trolleys, hooks, pistons; warning lights on every beam end |

## Districts

Four large multi-purpose districts plus one solitary island; polygons in the JSON. Counts are buildings; props scale with them (`populationDetail`). Gaps: dockyard–works town 22.5 m, foundry–works town 23.2 m, works town–pipeworks 34.3 m, dockyard–island 28.4 m, landmark–dockyard 26.8 m.

| id | shape, fitted to | features inside | anchor at 48 px, buildings hidden | population 0 / 25 / 50 / 75 / 100 % | warm accent at 25 % |
|---|---|---|---|---|---|
| `dockyard` | polygon 80 × 34 m along the quay, south edge 6–10 m into the water | container quay, rail-mounted quay crane, warehouse row, 2 barge berths, lift bridge over the canal mouth, quay siding | quay crane: 16 m T on rails over the water, plus a 3-colour container stack | 0 / 3 / 6 / 10 / 12; containers 0 / 8 / 20 / 40 / 60; barges 0 / 1 / 1 / 2 / 3 | crane cab `#e8a13a` |
| `foundry` | polygon 36 × 44 m between the wall foot and the slag shore | blast furnace, casting shed, ladle crane, press row, chimney trio, slag chute, rail siding | blast furnace: 10 m drum, cone top, tilted chute pouring onto the terraces | 0 / 2 / 5 / 8 / 10; chimneys 0 / 2 / 4 / 6 / 8; presses 0 / 1 / 2 / 4 / 6 | molten slit `#ff7a3a` |
| `works-town` | strip, centreline 53 m, width 34 m, along the rail spine | assembly hall with sawtooth roof, conveyor between halls, brick terraces (residents' homes), canteen, water tower, halt | water tower on 4 legs (12 m) beside a 3-tooth sawtooth roof | 0 / 5 / 10 / 17 / 21 (halls 0 / 1 / 2 / 3 / 3 + houses 0 / 4 / 8 / 14 / 18); conveyor segments 0 / 4 / 8 / 14 / 20 | first lit windows `#ffe9a8` on the halt |
| `pipeworks` | polygon 36 × 60 m along the canal's east bank to the wall foot | tank farm (column, drum, sphere), elevated pipe rack, pump house, cooling basin, valve field, steam vents, pipe jetty | three tanks of three heights (18 / 10 / 8 m) tied by one straight rack | 0 / 2 / 4 / 7 / 9; valves 0 / 3 / 6 / 10 / 14; pipe segments 0 / 10 / 20 / 32 / 44 | one orange valve wheel |
| `pump-island` (solitary) | octagon 26 m, offshore | walking-beam pump, fuel tank, jetty and hut, warning-light mast, second pump at 100 % | walking beam: 9 m seesaw nodding at 0.25 Hz, plus the mast | 0 / 1 / 2 / 3 / 4 | mast light `#e8a13a` |

Topics map several-to-one past five. At 100 % the dockyard matches `01-isometric-factory.jpg`: 12 volumes, 60 containers, 4 vehicles, 20 residents on 2 700 m². Scale: creatures 1.8 m × 1.3, houses 4.5–6 m, halls 9–12 m, tanks 8–18 m; stations frame each district along its length (JSON `camera`), creature 6.3–7.2 % of viewport height.

## Landmark evolution

Own slab 26 × 22 m at (−77, 68) off the west quay, 4 m causeway. Continues the catalog `factory` gear motif.

| stage | height | persists | grows | lights | motion |
|---|---|---|---|---|---|
| s1 gear press | 6 m | slab, gear | press block `#9f9a96`, 3 m gear on its face | none | ram 0.8 m at 0.5 Hz |
| s2 press house | 12 m | slab, gear, press | brick house, 1 chimney, flywheel, conveyor in | 6 windows | flywheel 1 turn / 4 s; puff every 2.4 s |
| s3 great works | 20 m | all of s2 | 3 chimneys, gantry over the hall, roof tank, 6 m gable gear | windows, 4 warning lights, chimney glow | gantry trolley, conveyor into the door, stacked puffs |

## Globe marker

Per `globe-markers.md` §3: side `#9f9a96` / top `#b9b4b0` / lip `#6b5f7a`; riveted steel band, orange chevron `#e8a13a` every 30°. P1 8 m gantry crane, frame `#6b5f7a`, cab `#e8a13a`; P2 6 m chimney pair `#e6dfd3`, rust band, one puff; P3 4.8 m piston press `#9f9a96`, moving ram; P4 4 m pipe elbow run `#4f8fb0`, 3 elbows. Accent object: crane cab. No signpost. 48 px: a T-shaped gantry over a grey disc. Night: cab window and chimney tops emissive.

## Ambient layers (always on)

- Smoke: every chimney puffs `#fffaf3` every 2.4 s, offset per stack. Steam: pipeworks vents hiss every 6–9 s; cooling towers plume from 50 %.
- Motion: wall trolleys 14 s, quay-crane trolley 10 s, conveyors 0.8 m/s, presses 0.5 Hz, walking beam 0.25 Hz, lift bridge for barges. Warning lights blink 0.5 Hz, never in sync.
- Creature events: a freight train (engine + 5 wagons) rolls from the fog down the spine to the quay every 60–120 s, visible 30 s; a barge runs the canal every 90–150 s. Never during a catastrophe.
- Night: ground L −0.22, windows `#ffe9a8`, chimney tops `#e8a13a`, molten slit `#ff7a3a`, lamps `#ffb347`.

## Catastrophe skin

Fixed sequence, family skin: a **soot squall** rolls out of the wall; the **machine stall**: trolleys, presses and conveyors freeze mid-stroke, the train stops on the bridge, one boiler pops its lid (catalog `factory-ruin-lid-off`), a snapped cable sparks `#e8a13a` at 2 Hz, pipes burst steam. Recovery: forklift, lid back on, whistle, trolleys resume one by one.

## Creature roster note

Against `#b9b4b0`: navy `#3b5f7a` (contrast 3.29), plum `#7a4b6e` (3.34), mint `#8fc9d8` (cool hue on warm grey). Orange stays on machines.

## Risks and neighbours

1. Grey-on-grey mush at 48 px: one cream, one navy, one brick volume per district; orange only on moving parts.
2. Reads as `city` docks: no streets, no tower blocks, no awnings; every tall thing is a machine.
3. Motion budget: 30+ animated parts at 100 %; wall motion instanced, capped at the 2 px grain.

Distinguishing rules. **Regular City**: anything taller than 12 m here is a machine (crane, chimney, tank), never a facade with windows. **Future Utopia**: no glass, no cyan, no curves; matte concrete and orange light. **Old Factory**: `heavy-industry` always has a moving silhouette ≥ 20 m in frame and a harbour; the factory was a toy set where only smoke moved.

Closest protected silhouette: no Kirby pedestal is industrial; nearest read is a generic "chemical plant" level (blue tubes, purple chrome). Ours: warm concrete, plum steel, one orange accent.

## Decisions

- (none yet; record as `YYYY-MM-DD, Philote: keep / cut / change, reason`)

## Open questions for Philote

1. Skyline: **A** gantry wall with chimneys between (pick) or B a chimney-and-cooling-tower field with only 3 gantries?
2. Water: **A** harbour basin plus a canal with a lift bridge (pick) or B a river down the east side, no canal?
3. Solitary island: **A** walking-beam pump station (pick) or B an offshore loading platform on legs with a small crane?
4. Residents' homes: **A** brick terraces inside the works town (pick) or B no housing, residents live in the halls?
5. Landmark line: **A** keep the catalog gear line, gear press → press house → great works (pick) or B a new flywheel line, wheel → engine house → power hall?
