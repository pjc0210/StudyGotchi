# Frontier Town biome sandbox

Independent Vite + React Three Fiber prototype copied from `prototypes/biome-lab` on 2026-09-20 and converted in place. It uses procedural primitives only; there are no GLBs.

## Art direction

The sandbox follows `frontier-town-plan-v4.svg` and the **Ochre Railhead** direction: a fixed south/front approach into a large working basin divided by the railway. The only canyon geometry is the north/back mesa skyline; tapered east/west wings dissolve into fog, while foreground land continues beneath and behind the camera with no front cliff, circular rim, coast, or visible world edge.

The art pass uses observed working-place references rather than a generic western kit: Bodie false fronts, the Grand Canyon depot, an Arizona cattle corral, the Anselmo headframe, a gridded archaeology excavation, and the Pinacate desert reserve. Open `?board=1` for the actual-reference side-by-side board.

The control panel borrows the functional language of a territorial survey dispatch: slab-serif headings, stamped status, narrow utility labels, oxblood ink, and ledger-paper texture. World colours come directly from the biome sheet and reference ledger.

## Included

- Exact 400 × 320 m world and 320 × 260 m playable basin
- Fixed south/front camera, 34–40° pitch, ±35° yaw, and 26° overview FOV
- North-only 60–74 m near and 80–100 m far mesa rows with fogged side wings
- Fixed x=52…66 m rail corridor, dry arroyo, and 22 × 16 m ranch waterhole
- Seeded district transforms for seeds 1, 7, and 99
- Dense Main Town, grand depot/rail works, broad livestock ranch, twin-sheave mine headframe, gridded excavation, and populated desert reserve
- Population bands at 0/25/50/75/100%, day/night, catastrophe/recovery, landmark stages
- Fixed 2 px pixel pass, camera stations, creature scale readout, JSON export, screenshot action
- URL parameters and panel-free `capture=1` mode for deterministic QA captures

## Run

```sh
npm install
npm run dev
```

Useful query parameters: `progress`, `seed`, `station`, `focus`, `night`, `yaw`, `pitch`, `dolly`, `catastrophe`, `pixel`, `train`, `wildlife`, `capture`, and `board`.

## Verification

```sh
npx tsc -b
npx oxlint
npx vitest run
npx vite build
```

Tests cover monotonic growth, seeded determinism and variation, 20 m gaps, protected corridors and preserves, exact v4 left/centre/right default and max-dolly poses, the full yaw × dolly × 34/40° pitch acceptance matrix, north-only skyline closure, creature viewport scale, and exported plan geometry.
