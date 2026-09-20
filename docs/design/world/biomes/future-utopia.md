# Biome sheet: future-utopia (Futuristic Utopia)

Status: draft, 2026-09-20, awaiting Philote's picks. Evolves catalog `lab` + `city`. Data `../layouts/future-utopia.layout.json`, plan `../layouts/future-utopia.map.svg`, provenance `../refs/biome-library/futuristic-utopia/LEDGER.md`.

## Mood

A clean civic city on white tile terraces over a clear lagoon, glass pods on one loop, gardens under glass, every edge lit cyan; mistake it for `refs/biome-library/futuristic-utopia/02-water-city-plan.jpg` with the spires of `04-cloud-city-skyline.jpg` behind.

## Palette

| role | hex | note |
|---|---|---|
| ground (tile) | `#e3f2ec` | catalog `lab` ground |
| ground alt (plaza paving) | `#c7dfd6` | catalog `lab` ground_alt |
| lawn | `#a9d9a4` | Commons, forum rows, island shelves; the lab has no lawn |
| cliff / cross-section | `#c7dfd6` + strip `#3fd1c9` | flush glass riser 1.9 m, 0.3 m cyan strip at the lip (marker row) |
| water | `#6fcbe0`, deep `#4fa9c8`, shallows `#a8e4ec` | lagoon |
| canal / pools | `#5fbfd6` | |
| path core / edge | `#f4fbf8` / `#c7dfd6` | |
| transit rail / underside | `#ffffff` / `#3fd1c9` | glass monorail 6 m up |
| glass | `#c7dfd6` | domes, hall lens, arches |
| window | `#ffe9a8` | warm, fixed; the lab's cold `#9ff2ff` is banned |
| structure white / mint / slate | `#ffffff` / `#dfe9e6` / `#7d93b8` | 2-3 flat colours per object |
| accent | `#3fd1c9` | strips, spire bands, lamps |
| warm accent | `#ff9e6e` | pod noses, canopies, mast beacon |
| blossom | `#f2a0c0` | forum and island trees |
| ink | `#2f3a44` | |

## Landmass

One landmass runs from the front shore back into a **civic tower skyline** at z <= -72 and off the west edge into fog (no back coast). The east is lagoon, with the **Skyport Headland** and a small **landmark headland** projecting into it. A 7 m **canal** cuts from the front shore to a round basin. Where districts meet water, three glass shelves step 0.6 m down (ref 02). The **Arboretum Isle** (r 20 m, lobed) sits alone in the front-east lagoon, reached only by the transit loop. Ground is flat (+-0.3 m); coastlines drop 1.9 m as glass risers.

**Skyline.** Spires, not mountains: the pitch says "civic towers", P1 is a spire, a mountain reads as Alpine or Ice. White needles with cyan bands in three rows (z -78 / -88 / -96) behind the forum and in the back lagoon (ref 04), paler per row into fog `#eef7f4`. By course fraction: 0 % 3 towers, 14 m; 25 % 5 / 24 m, 1 band lit; 50 % 7 / 34 m, 2 rows; 75 % 9 / 44 m, 3 bands; 100 % 11 + 7 + 5 towers, 56 m.

## Districts

Metres, x east, z south. All gaps >= 20 m (minimum 20.5 m, checked). Houses 4.5-6 m, civic blocks 9-11 m, creatures 1.8 m.

| id | shape, fitted to | features inside | anchor (48 px, buildings hidden) | population 0/25/50/75/100 | warm accent at 25 % |
|---|---|---|---|---|---|
| `waterfront` Waterfront Terraces | 9-gon along the front shore, 60 x 41 m, terraces stepping into the lagoon | hub station with 14 m glass arch, ring pool r 6, promenade, 2 house rows, hover lamps | glass arch over the loop + ring pool | 0 / 4 / 8 / 13 / 16 terrace houses (100 %: 2nd arch platform, 12 promenade lamps) | first pod docked, nose `#ff9e6e` |
| `canal` Canal Quarter | strip 30 m wide, 67 m long along the canal to its basin | canal, 3 glass footbridges (9 m arcs), quay paths both banks, canal-bridge station, market canopies, lamps | the canal + 3 white bridge arcs | 0 / 4 / 9 / 14 / 18 canal houses (100 %: 6 canopies, 2 punts, string lights) | 3 sail canopies `#ff9e6e` |
| `forum` Forum Heights | 8-gon 84 x 26 m along the skyline foot | civic hall lens dome 28 x 18 x 9 m, ring of 8 hover lamps, forum axis, loop terminus, civic blocks, 12 canopies | hall lens + lamp ring | 0 / 3 / 7 / 11 / 14 civic blocks (100 %: council ring, 6 banner masts, hall lit) | 2 blossom trees `#f2a0c0` at the hall door |
| `skyport` Skyport Headland | 9-gon 38 x 42 m on the east headland | mooring mast 18 m, 3 H-pads r 5, skyport station, apron paths, houses inland, terraces at the tip | mast + 3 pad discs | 0 / 2 / 5 / 8 / 10 terrace houses (100 %: airship 16 m moored, 2 pods on pads) | mast beacon `#ff9e6e` |
| `arboretum` Arboretum Isle (solitary) | 7-gon 34 x 33 m on the lobed island | garden dome r 9 x 12 m over canopy `#8fc48a`, station, boardwalk ring, greenhouse pods, orchard | the dome | 0 / 1 / 3 / 5 / 6 pods; trees 0 / 6 / 12 / 18 / 24 (100 %: dome lit, 4 benches, punt) | 6 blossom trees ringing the dome |

Density: 64 buildings at 100 % (Ice: 41); the forum's 14 blocks on 84 x 26 m match ref 06's plateau. The Commons lawn is deliberately empty ground.

## Landmark: Spire of Accord

Own tile plinth (r 7.5 m, 1.5 m, glass riser) on the landmark headland at (58, 32).

- **s1 Unity Pavilion, 6 m:** 6 slim white posts, 8 m glass lens roof with a cyan edge strip, one blossom tree inside.
- **s2 Spire of Accord, 22 m:** a white needle from the roof centre, 2 cyan bands, glass lift capsule.
- **s3 observation lens, 36 m:** 3 bands, flat glass deck r 5 m at 28 m, crown pulsing cyan every 4 s at night.

Persists: pavilion and tree. Grows: height, bands, deck. Lights: bands `#3fd1c9`, windows `#ffe9a8`, crown. No halo ring (the lab's `growth_hero`).

## Globe marker

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|
| `future-utopia` | glass `#c7dfd6` / tile `#e3f2ec` / light strip `#3fd1c9` | flush glass edge with a 0.3 m cyan strip, emissive at night | civic spire `#ffffff`, 3 cyan bands | transit arch with a monorail loop segment, glass `#c7dfd6`, one pod (nose `#ff9e6e`) | garden dome, glass over `#8fc48a` canopy | terrace-house pair `#ffffff` + `#7d93b8`, windows `#ffe9a8` (**proposed**, replaces the hover lamp: Q4) | light strip and spire bands `#3fd1c9` | a needle spire over a pale mint disc with a cyan rim line |

No signpost. At 48 px, props hidden: mint disc, hairline cyan rim; shown: needle over arch and green dome.

## Ambient layers (always on)

- **Clouds:** 4 flat cumulus at 60-90 m drifting east 0.4 m/s; 3-6 more for the crossfade.
- **Weather:** clear; a 90 s sun-shower every 8-12 min wets the tile (`#d8ecea`), one flat rainbow arc over the lagoon.
- **Transit pods:** 4 white pods, apricot noses, 6 m/s clockwise, 4 s dwell at 5 stations, two glass water crossings; cabin light `#ffe9a8` at night.
- **Lagoon manta:** hidden 90 %; every 60-120 s a 6 s glide on a 10 m arc at (12, 86), wing tip up, dive; one in four leaps; never within 15 m of a district or during a catastrophe.
- **Night:** sky `#0f1c2e`, tile `L-28`; strips, rail undersides, spire bands and lamps emissive `#3fd1c9` x 1.6, windows `#ffe9a8` x 1.6; the skyline becomes bands of light in fog; the crown pulses; no magenta.

## Catastrophe skin

Flavour **grey-out and glass frost**: sky drops to `#8fa3ad`, every strip flickers 3 times and dies, pods coast to a stop. Residents fall apart. Ruin: glass frosts to `#e7f0f2`, strips dark, ring pool drained, 4 hover lamps tilt 20 degrees, canopies drop. Recovery: strips relight forum -> skyport -> canal -> waterfront -> island at 0.3 s each, frost clears in 2 s, pods resume.

## Creature roster

Against tile `#e3f2ec` (catalog `lab` contrasts): plum `#7a4b6e` (5.94), navy `#3b5f7a` (5.86), coral `#e88a8a` (2.16, lawn and plaza only); mint and lilac banned here.

## Risks and neighbours

1. **Reads as the Lab** (same tile and cyan). Rule: no flask, ring-on-post, pipe, hologram, server rack or magenta; warm windows; lawns and trees (the Lab is tile-only, cold-lit).
2. **Reads as Regular City.** Rule: no mauve `#d9c3d6` / `#b98bb0`, gables, coral awnings or cobble; every roof is flat, a lens or a dome; every edge carries a cyan strip.
3. **Reads as Heavy Industry** via the skyport mast. Rule: no crane, chimney, gantry, piston, pipe or orange `#e8a13a`; the only machines are white pods and one airship.

Vs pale `ice-town`: mint not white, cyan rim not snow lobes, needle not cone. Closest protected silhouette: the Kirby pedestal grammar (structural only); ours has a glass rim and a plain three-band needle.

## Decisions

- <date>: (none yet)

## Questions for Philote

1. Skyline: **civic spire rows (pick)** or spires on a low green ridge (ref 01)?
2. Landmark s3 top: **flat observation lens deck (pick)** or a floating halo ring (the lab's `growth_hero`)?
3. Skyport Headland: **keep mast + pads + airship (pick)** or a Lagoon Baths district (terraced pools) if aircraft feel industrial?
4. Marker P4: **terrace-house pair (pick)** or the draft table's hover lamp (lab neon-ring collision at 48 px)?
5. Warm accent: **apricot `#ff9e6e` on pods, canopies and mast (pick)** or blossom `#f2a0c0` everywhere?
