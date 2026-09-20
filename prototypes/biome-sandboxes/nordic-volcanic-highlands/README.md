# Nordic Volcanic Highlands sandbox

Isolated procedural prototype copied from `prototypes/biome-lab` on 2026-09-20. Everything in the world is generated from Three.js primitives; no reference image, GLB, or shared source is shipped.

## Chosen direction

Direction A, **Fjord First / Ashen Homesteads**, was the strongest documented direction and is implemented here. It best satisfies the identity gates: the S-fjord is the largest field, Nordic timber and turf sit beneath a continuous charcoal horizon, geothermal aqua is secondary, and orange lava is geographically isolated to the boat-only archipelago plus a narrow canyon seam.

Inputs consulted:

- `docs/design/world/maps/nordic-volcanic-highlands-plan-v2.svg`
- `docs/design/world/biomes/nordic-volcanic-highlands.md`
- `docs/design/world/biomes/nordic-volcanic-highlands-directions.md`
- `docs/design/world/refs/biome-library/nordic-volcanic-highlands/LEDGER.md` (all 12 references and explicit exclusions)

## Run

```sh
npm ci
npm run dev
```

The panel exposes all five population bands, seeds 1/7/99, six front-facing horizon audits, camera stations, 2 px rendering, night/aurora, ambient boat/geyser events, catastrophe/recovery, screenshots, and layout JSON export.

The local biome is a front-facing diorama, not a free-orbit arena. The camera stays south/front and looks north/back along the fjord at 34–40° pitch with yaw clamped to ±35°. The volcanic skyline occupies only the north/back; east/west highland wings taper into fog, while the south/front remains open and the fjord/terrain continue beneath the camera without a visible edge. Horizon QA uses left/centre/right (`−35° / 0° / +35°`) at default and `1.55×` max dolly.

Useful deterministic capture URLs:

```text
/?seed=1
/?seed=7&azimuth=35&dolly=1.55
/?seed=99&night=1&aurora=1
/?progress=0&station=landmark
/?progress=0.5&station=landmark
/?progress=1&station=landmark&night=1
/?catastrophe=geothermal-farms
```

## Verification

```sh
npx tsc -b
npx oxlint
npx vitest run
npm run build
```

The reviewed capture suite is in `screenshots/`. It includes:

- complete day and aurora-night overviews;
- left/centre/right horizon audits at default and `1.55×` max dolly;
- all five district stations;
- cairn, ring, and night-beacon landmark stages;
- seeds 1, 7, and 99;
- a geothermal catastrophe state;
- `actual-reference-comparison-board.png` and a full contact sheet.
