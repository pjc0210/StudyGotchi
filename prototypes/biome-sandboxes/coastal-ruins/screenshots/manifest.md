# Coastal Ruins visual QA

Captured at 1440 × 900 with the fixed 2 px pass. Reproduce with
`node scripts/capture-screenshots.mjs` while the Vite server and a CDP-enabled Chrome target are
running. Query controls and the headless launch flags are documented in the root README and script.

## Acceptance captures

- `overview-000.png` — anchors only; fixed coast, routes, preserves, headland, and three low
  north/back skyline shoulders remain.
- `overview-100.png` — all population, 9 × 18 m north/back shoulders, row two, four slit masses,
  separate headland, broad open front sea.
- `arrival-100.png` — south/front arrival station.
- `district-*-100.png` — all five districts at 100%:
  - D1 stair/vine/white-cobalt terrace village
  - D2 six-tooth archaeology comb and survey shelters
  - D3 three open crescents, ochre yards, olives, kiln, cobalt cistern
  - D4 broken drowned ring, submerged route, survey shelters and buoys
  - D5 inhabited L-quay, shuttered workshops, violet awnings, stalls and skiffs
- `landmark-s1.png`, `landmark-s2.png`, `landmark-s3.png`, `landmark-s3-night.png` — persistent
  plinth/lintels through open archive and asymmetric two-prong shielded beacon.
- `yaw-{m35,000,p35}-dolly-{100,155}.png` — the six corrected diorama closure views. Every camera
  remains south/front. North/back escarpment closes the horizon; east/west stacks taper into fog;
  front remains open sea with no visible front edge.
- `seed-{001,007,099}.png` — fixed coast/hydrology/routes/preserves with bounded district-content
  shifts and yaw changes.
- `catastrophe-archaeology.png` — ruin state with knocked props, fallen residents, extinguished
  district lights and radial cracks; terrain remains fixed.
- `ambient-boat.png` — timed working skiff and wake event on a fixed sea route.
- `globe-marker-s3-night.png` — three-tier limestone marker: horizontal P1 comb, broken-ring P2,
  L-quay P3, cobalt-cistern P4; no sign or world-space text.
- `reference-comparison.png` — rendered Direction A beside the copied v2 plan overlay.

## Inspection notes

- Population changes settlement occupancy and north/back skyline only; coast and terrace pads do
  not move between `overview-000.png` and `overview-100.png`.
- The five district anchors remain separate and readable in overview, while district stations show
  the multi-purpose subareas and procedural primitive construction.
- Seeds 1/7/99 keep the same coastline, cove, shallows, L-quay route, protected water, landmark
  channel, skyline foot, and camera.
- Max-dolly yaw captures do not orbit behind the biome and show no escarpment or stack beneath the
  south/front camera.
- Night keeps water and ruins dark; sparse amber windows, quay lamps, and the shielded s3 beacon
  carry the light.
