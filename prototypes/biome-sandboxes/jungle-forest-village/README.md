# Jungle / Forest Village sandbox

An isolated procedural prototype copied from `prototypes/biome-lab` before adaptation. It uses
only React Three Fiber geometry primitives and the lab's fixed 2 px post-process.

```bash
npm install
npm run dev       # http://localhost:5194
npm test
npm run lint
npm run build
```

## Chosen direction

**Direction A — River-Canopy Commons** was the strongest reviewed direction and the recorded
designer pick. Its identity is high, inhabited, rope-connected canopy over bright turquoise
water: dark umbrella crowns, a white waterfall cut, broad civic glades, warm fruit-gold details,
and a separate Root-Crown Shrine. It avoids Forest's open round-canopy grassland and Swamp's low
olive boardwalk language.

Sources used:

- `docs/design/world/biomes/jungle-forest-village.md`
- `docs/design/world/biomes/jungle-forest-village-directions.md`
- `docs/design/world/maps/jungle-forest-village-plan-v2.svg`
- `docs/design/world/refs/biome-library/jungle-forest-village/LEDGER.md`

The docs reference folder currently contains only the ledger. Its five exact source-image URLs are
materialized inside this sandbox at `public/references/`; no docs files were changed. The runtime
comparison board pairs those real images with clean scene-only district captures in
`public/comparisons/`, plus the ledger's take/leave annotations.

## Locked systems

- Fixed 288 × 264 m field and ground at `y = 0`.
- Fixed 18 m waterfall, 9.5 m river in a 14 m wet band, 62 × 52 m lagoon, east outflow.
- Fixed Firefly, Orchid, and Sunbreak no-build clearings.
- Fixed 27 m and 18 m rope crossings.
- Fixed 34 × 42 m shrine headland at `(+102,+80)`.
- Front-facing diorama: the camera remains south/front looking north/back at 34–40° pitch and
  ±35° yaw. The dense two-row canopy skyline occupies only the north/back, with east/west wings
  tapering into fog. No circular or south/front canopy enclosure is generated.
- Ground, lagoon, and foreground jungle continue beneath the camera and disappear by crop/fog;
  the front terrain edge is never visible.
- Seed 1/7/99 changes only district centre jitter, yaw, and local synthesis. The fixed systems
  above do not move, and realised district build envelopes preserve at least 20 m gaps.

## Growth and events

- Five population bands control homes, deck spans, stalls, docks, archive bays, farm rows, lamps,
  clutter, and extras.
- Only the canopy skyline grows. The terrain is independent of progress.
- Root-Crown Shrine stages: stake → root tripod → civic shrine/deck → crown hall/lantern ring.
- Creatures are scaled to remain at least 6% of the viewport in district framing.
- Ambient seeded bird flyovers and lagoon water rings are events, not fixtures.
- Catastrophe is jungle-specific: monsoon → strike → strangler-bloom overgrowth → restore.

## Art-direction pass

- Great Canopy Village uses irregular multi-height trunk towers, inhabited platforms, ladders,
  rope/deck spans, hanging vines, warm windows, and foliage-framed silhouettes.
- Falls Terraces has three rock shelves, two visible fall drops, mist-market stalls, bank homes,
  and the fixed crossing bridge.
- Lagoon Quarter uses a lobed cove, varied stilt houses, branching boardwalks, fishing piers,
  canoes, nets, reeds, and irregular shoreline vegetation.
- Ruin Commons uses missing masonry, offset lintels, root buttresses, vines, buried paving, and
  an asymmetric market/archive edge.
- Riverworks places the mill wheel in a turquoise sluice, with a low bridge, irregular plots,
  mixed sheds, and bank reeds.
- Low terrain patches and vegetation clusters give the overview depth while all three authored
  clearings, hydrology, district gaps, and fixed anchors remain unchanged.

## Deterministic screenshot URLs

The app reads query parameters so QA captures can be recreated:

- `?progress=0|.25|.5|.75|1`
- `?station=arrival|overview|district|resident`
- `?district=canopy|falls|lagoon|ruins|riverworks`
- `?station=district&landmark=1` focuses the fixed shrine headland
- `?yaw=-35|0|35`
- `?dolly=1|1.55`
- `?seed=1|7|99`
- `?night=1`
- `?catastrophe=canopy`
- `?board=1`

The verified suite is stored in `screenshots/`.
