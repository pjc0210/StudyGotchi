# Coastal Ruins biome sandbox

Isolated procedural prototype derived from `prototypes/biome-lab/`. Everything in the scene is
React Three Fiber primitive geometry; it uses no GLB models and no repository asset symlink.

```bash
npm install
npm run dev      # http://localhost:5193
npm run lint
npm test
npm run build
```

## Direction and source interpretation

The sandbox uses the available designer pick, **Direction A — Salt-White Working Coast**, from:

- `docs/design/world/biomes/coastal-ruins-directions.md`
- `docs/design/world/biomes/coastal-ruins.md`
- `docs/design/world/maps/coastal-ruins-plan-v2.svg`
- `docs/design/world/refs/biome-library/coastal-ruins/LEDGER.md`
- `docs/design/world/globe-markers.md`

It keeps the v2 fixed coastline, five catchments, three water routes, open-water preserves,
headland channel, palette, reference motif distribution, Archive-Beacon stages, and globe-marker
order. Reference use is compositional: D1 owns the stair/vine grammar, D2 and D4 own dry/drowned
ruin fragments, D3 owns ochre terrace rhythm, D5 owns shutters and one violet awning, and the
whole coast owns faceted limestone, wet bands, and broad sea.

The available image files were not present beside the ledger, so the implementation uses the
ledger's explicit take/leave notes and the v2 map rather than copying unavailable imagery.

## Camera correction

The local biome camera is a **front-facing diorama**, not free orbit:

- camera stays south/front and looks north/back;
- pitch is limited to `34–40°`;
- yaw is limited to `−35–+35°`;
- district stations retarget inside that same front hemisphere;
- the limestone escarpment and fixed second row exist only at north/back;
- islet stacks taper into side fog at east/west only;
- south/front is open sea extending underneath the camera, with no front world edge.

The visual QA matrix is yaw `−35 / 0 / +35` at dolly `1.00× / 1.55×`. The old eight-azimuth
free-orbit interpretation is intentionally removed.

## Procedural contract

- **Fixed:** coast, terrain heights, shallows, drowned cove, headland, 12 m channel, catchments,
  protected open water, three boat routes, skyline foot, fog, and camera hemisphere.
- **Seeded:** district content centre inside its ellipse, local yaw, slot details, props, residents,
  and the ambient boat route. Seeds 1, 7, and 99 are regression fixtures.
- **Growth:** each district is a `0 / 25 / 50 / 75 / 100` population system. Ground never rises.
  Only the north/back skyline changes: `3/4/6/8/9` shoulders at `8/10/13/16/18 m`, row-two
  visibility at 75%, and four asymmetric 22 m slit masses at 100%.
- **Landmark:** s1 archive plinth and broken lintels; s2 open three-bay archive; s3 open map room
  and asymmetric two-prong shielded beacon. It is neither lighthouse nor church.
- **Marker:** limestone stacked pedestal with foam-cut notches; P1 escarpment comb, P2 broken ring,
  P3 L-quay, P4 cobalt cistern; no sign or world-space text.
- **Presentation:** fixed 2 px DS pass, day/night, sparse amber lights, scaled creatures,
  dust-squall/quake/ruin/recovery catastrophe, timed working skiff event, camera stations, JSON
  export, and PNG export.

## Key files

- `src/layout/biome-layout.ts` — fixed plan, districts, seeds, population, skyline, marker/export
- `src/layout/terrain.ts` — land/water fields, routes, seeded slots/props, side-only stacks
- `src/layout/biome-layout.test.ts` — deterministic, clearance, corridor, diorama, growth/camera tests
- `src/scene/Terrain.tsx` — limestone mesh, shallows, foam, north escarpment, east/west stacks
- `src/scene/Structures.tsx` — five 48 px anchors, buildings, local routes, population props
- `src/scene/Landmark.tsx` — Archive-Beacon s1/s2/s3
- `src/scene/Ambient.tsx` — clouds, stars, and timed skiff/wake event
- `src/camera/CameraRig.tsx` — constrained front-diorama controls and stations
- `src/ui/Panel.tsx` — population, seed, night/event/marker, camera, catastrophe, export

## Screenshot query controls

Visual fixtures can be reproduced with query parameters:

`p`, `seed`, `station`, `district`, `az`, `dolly`, `night`, `clouds`, `boat`, `marker`, `pixel`,
and `cat`. Example:

```text
http://localhost:5193/?p=100&station=overview&seed=7&az=35&dolly=1.55&clouds=0
```

Reviewed captures live in `screenshots/`; `screenshots/manifest.md` describes the acceptance set.
