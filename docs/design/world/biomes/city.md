# Biome sheet: city (18.06 Linear Algebra)

Status: draft, 2026-09-19.

## Mood

A pastel harbour island: winding cobble streets of gabled houses, string lights between lamps, a square with fountain and tree, docks on a blue bay; the snowy fishing village with snow swapped for lilac stone.

## References

- `../refs/snowy-fishing-village.jpg`: the whole level-2 target (houses on winding roads, square, string lights, docks on piles).
- `../refs/isometric-research-station-set.png`: clock tower and library as chunky icons.
- `prototypes/world-lab/screenshots/p2-level1.png`: kill the mauve monotone.

## Palette

| role | hex | note |
|---|---|---|
| ground (charter) | `#d9c3d6` | |
| accent (charter) | `#b98bb0` | roofs |
| base | `#b7a58f` | pedestal side, risers, plaza rim |
| road core / edge | `#c7b1c4` / `#dcc9d9` | `L−8` / `L+2`; cobble decals `L−5` |
| plaza pad | `#e9dbe6` | |
| walls | `#e6f2fb` | per art review |
| roof rotation | `#b98bb0` 50 %, `#e88a8a` 30 %, `#8fc9d8` 20 % | building index mod 10: 0–4 mauve, 5–7 coral, 8–9 mint |
| wet | `#e4d3e1` | |
| water | `#6fa9cf` | bay and harbour |
| park grass | `#c3d8b8` | |
| night window | `#ffe9a8` | |

Terrain-kind tints from `galaxy.ts` stand; `industrial` gets `L−4` so chimneys sit on the darkest ground.

## Terrain kinds

| kind | profile | recognised by | recipe → asset | roads |
|---|---|---|---|---|
| downtown | flat | 2–3 storey towers, 0.3 m gaps | tower → `small-house` ×1.6 height | jitter 0.15 |
| suburb | flat | houses with hedges, roof rotation | house → `city-small-house`, roundTree → `planter-tree` | jitter 0.25 |
| park | flat | grass tint, trees in 3s, benches | flower → meadow clumps | yes |
| harbour | slope | docks on piles, 2 boats; lighthouse at `d = 1` | dock → `ice-dock-plank` ×3 | ends in dock |
| plaza | flat | pillar ring on pad tint | pillar → `basalt-column` in stone | yes |
| industrial | flat | chimneys with `smoke-puff-cluster` | chimney → `small-house` + 0.8 m stack | yes |
| hills | hills | 0.5 m terraces, one house per tier | house, roundTree | ramps |
| bay | water | boats, foam row | boat | no |

Cobble decals on downtown, suburb, industrial; grass tufts on park.

## Landmark family

s1 kiosk (`0 < d < 0.5`), s2 clock tower (`d ≥ 0.5`), s3 library (`d = 1`). Hub plaza = `city-plaza-slab-with-fountain` (2.7 m) replacing the pad, landmark on its north edge, `planter-tree` ×4 at corners, `bench` ×4 facing in, 4 lamps linked by string lights. Artisan requests (review, city 3/5): walls `#e6f2fb`, clock face 0.25 → 0.4 of tower width, s3 columns 8 → 4 at 2× radius.

## Prop roster

| prop | per topic | parent | scale | notes |
|---|---|---|---|---|
| `city-small-house` | 6–12 | road | 0.9–1.15 | roof rotation |
| `city-lamp-post` | ≤ 8 | road, plaza | 1.0 | every 6 m on main roads |
| `city-bench` | 2–4 | plaza, park path | 1.0 | faces the road |
| `city-planter-tree` | 4–8 | plaza, cluster | 0.8–1.1 | |
| `city-hedge` | 4–10 | road (garden side) | 1.0 | behind every 2nd house |
| `city-fountain` | 1 | hub plaza | 1.0 | |
| `ice-dock-plank` | 3–4 | shore | 1.0 | harbour |
| `meadow-fence-segment` (wood → `#e6f2fb`) | ≤ 20 | road, dock | 1.0 | white rails at docks, water-side roads |

New props: string-light segment (7 bulbs, sag 0.3 m, length 4–8 m), row-house 1.2 × 0.6 m with two doors, 1.0 m boat (shared).

## Roads and plaza style

Winding cobble, main 1.2 m, minor 0.8 m, jitter 0.25 (most winding biome). Houses alternate sides, 0.5 m gaps. String lights on all main roads between lamps ≤ 8 m apart and around the hub square. Harbour road ends on a 3-plank dock with white rails, boats 1.5 m off the end. Night-mode showcase: demonstrated windows and every string bulb emissive.

## Level-1 marker

Pedestal side `#b7a58f`, cap `#d9c3d6`. Props in priority (at `PROP_SCALE_L1`): clock tower s2 (8 m), house trio with three roof colours (5.4 m), planter tree pair (4.6 m), fountain (3.5 m). Plank frame in ink.

## Night

The showcase biome. Ground `L−22`, `H` +6° toward blue; cobble core `#4a4060`. String bulbs and lamps emissive 2.2; windows of demonstrated houses emissive 1.6 with a per-building 0–0.4 s flicker-on when night begins; clock face emissive 1.2. Fountain water `#5a7fb0`. Boats carry one bulb each.

## Creature roster

- `blob-city-2` (hero, lilac horn-blob): best contrast on mauve.
- `bean-city-1` (hero, lilac scarf-bean): proven walk; plaza regular.
- `flat-city-1` (`#e88bb0`): the one flat that reads; swims in the bay.
- `sprite-city-2` (`#f3a5c4`, cap): park only (contrast 1.16 on ground).
- `biped-city-1` (`#e88bb0`, horn): road-only for the same reason.
- Skip `bird-city-2` (antenna disallowed by review).

## Open questions for Philote

C1–C8 are taken live per `../03-city-session.md`. Remaining:

1. Downtown towers: stacked house meshes, or a new 3-storey prop? (pick: new prop)
2. Bay boats: static, or one circling at 0.3 m/s? (pick: circling, later)
3. Night flicker-on per building, or all at once? (pick: flicker)
