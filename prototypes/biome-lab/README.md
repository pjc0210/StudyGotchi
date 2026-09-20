# biome-lab

World-building panel for one course biome ("one course, one kingdom"). Owned by the biome and
landmark art-direction chat; it shares nothing with `world-lab/src/golden/` so both chats can work
in parallel. Spec: `docs/design/world/biome-world-structure.md`, revised by
`docs/design/world/biome-lab-fix-plan.md` (pass 2: this build).

```bash
npm install
npm run dev      # http://localhost:5181
npm test         # layout rules (vitest)
npm run build
```

## What it does

- **Layout as data.** `src/layout/biome-layout.ts` defines the Ice / Chilly Town kingdom: one
  landmass whose back third runs into a mountain range, a glacier shelf to the west, harbour water
  and an offshore mini island to the south-east, a frozen lake with open-water patches fed by a
  stream, a rock outcrop with an ice cave. Six **clusters** (harbour, town, lake, lumber camp,
  glacier camp, research station) sit on flat ground and are recognisable by their anchors; the
  landmark stands on a headland ice rock at the harbour mouth. `src/layout/terrain.ts` turns this
  into a single soft heightfield (±0.6 m, cliffs only at coasts and the mountain foot), fixed
  building slots, seeded prop placements with the band they appear at, local paths, resident
  loops, and floes. All pure and deterministic by seed.
- **Growth = population.** A cluster's ground never changes. 0 % anchor only; 25 % first buildings
  and the warm accent; 50 % half the buildings, fences, lamps; 75 % all buildings, clutter, string
  lights; 100 % extras (watchtower and windmill, second dock and boat, helicopter, doubled tents).
  The **mountain range** is the only elevation that grows: peak count and height follow the course
  fraction, with a fogged second row from 50 %. Landmark igloo → observatory → lighthouse from the
  course fraction; residents = finished psets, distributed to clusters by progress.
- **Ambient layers** (never progress): clouds, snowfall, day/night with aurora and stars, and a
  **whale event**: hidden most of the time, surfacing every 45–90 s (seeded) on an arc off the
  harbour with rise → blow → glide → dive; one in four is a breach with a splash ring.
- **Catastrophe**: blizzard → residents fall apart → ruin. Ruin hides the cluster's lights, knocks
  over a subset of its props, and opens crack seams; `recover` sets it back.
- **Camera stations**: arrival, overview, cluster, resident, plus a dive that flies in from a
  globe-height pose. Live pitch, azimuth, dolly, and FOV sliders; click a cluster to snap.
- **Adaptive DS pixel pass**: cell size 4 at resident, 3 at cluster, 2 at overview and arrival
  (interpolated by camera distance to the ground), edge strengths scaled with the cell so far
  stations stay smooth. Toggleable.
- **Export**: `biome-layout.json` (v2: clusters with population, mountain profile, landmark) and a
  canvas screenshot.

## Where to look

| file | purpose |
|---|---|
| `src/layout/biome-layout.ts` | cluster definitions, palette, population bands, mountain profile, whale schedule |
| `src/layout/terrain.ts` | heightfield, slots, prop recipes, local paths, resident seats, floes |
| `src/layout/biome-layout.test.ts` | acceptance rules from the fix plan |
| `src/scene/Terrain.tsx` | terrain mesh with slope colouring, water, floes, ice arch and ice cave |
| `src/scene/Props.tsx` | the primitive prop and building library (shared `Surf` toon material) |
| `src/scene/Structures.tsx` | clusters: anchors, buildings, props with knock-over, local paths and docks |
| `src/scene/Ambient.tsx` | clouds, snowfall, whale event, aurora, stars |
| `src/render/PixelComposer.tsx` | adaptive pixel pass |
| `src/camera/stations.ts` | station table and fit-to-width maths |
| `src/ui/Panel.tsx` | the builder panel |

Buildings and props are primitives on purpose; approved GLBs from `assets/landmarks/ice/` slot in
later without changing the layout (the `public/assets` symlink already points at the repo assets).
