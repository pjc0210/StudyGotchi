# Medieval Meadow Kingdom sandbox

Fully isolated procedural prototype copied from the current `biome-lab` toolchain and converted
from the medieval meadow map, synthesis, reference ledger, and globe-marker direction. Everything
in the world is built from Three.js primitives.

```bash
npm ci
npm run dev      # http://localhost:5181
npm test
npm run lint
npm run build
```

## Contract

- Five seeded districts: Forest Hamlet + Timber Common, River Village + Mill, Bridge Market +
  Guild Court, Farm + Village Common, and Crown Headland + Castle Court.
- Seeds `1`, `7`, and `99` vary district translation/yaw and primitive scatter. River, tributary,
  bridges B1–B3, roads, and the four open preserves remain fixed.
- The castle site deliberately overlaps Castle Court. It is represented by one site and rendered
  once as the sole landmark. The separate Green Crown Commons owns only the north/back skyline;
  wooded hill wings fade east/west, with no circular or south/front enclosure.
- The kingdom is a front-facing diorama: camera south/front looking north/back, pitch `34–40°`,
  yaw clamped to `±35°`, and district snaps retarget without moving behind the world. Meadow and
  river continue beneath the camera so the foreground is cropped/fogged instead of exposing an edge.
- `39%` open meadow/water, authored growth bands, castle `stake/s1/s2/s3`, fixed `2 px` pass,
  creature viewport scale, day/night, ambient motes/clouds/birds, catastrophe/recovery, camera
  stations, JSON export, and screenshot export are exposed in the panel.

## Integration notes

- Pure contract and deterministic generation: `src/layout/biome-layout.ts`.
- Terrain sampling, slots, trees, ambient scatter, and creature seats: `src/layout/terrain.ts`.
- The app regenerates the kingdom with `generateKingdom(seed)`; consumers should persist the seed
  and district progress map, not generated meshes.
- `buildLayoutExport()` emits schema version `4`, including the fixed network, one landmark site,
  generated district polygons, growth state, Green Crown profile, and camera state.
- Visual acceptance lives in `screenshots/`: growth/seed/night frames plus left/centre/right
  (`−35/0/+35°`) at default and maximum dolly.
- No GLBs or shared repo assets are required. The copied `public/assets` symlink was intentionally
  removed so this sandbox remains self-contained.
