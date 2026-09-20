# Growth & Catastrophe factory (`tools/growth-factory/`)

Procedural "toybox low-poly" **growth heroes** (4 stages per biome family, seed to huge), **construction
states** (city tower, medieval keep) and the family-agnostic **catastrophe kit** (crater, scorch, comic
boom, debris, storm cloud + lightning, rubble, recovery sprout). Blender 5.2 LTS headless, deterministic
(seeded jitter only, no randomness). Outputs live in `assets/growth/`.

## Regenerate

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/growth-factory/generate_growth.py
```

Options after `--`: `--families forest,moon` `--only boom` `--no-render` `--no-export` `--no-kit`
`--no-growth` `--no-construction` `--cell 320` `--samples 16`. Partial runs write `manifest.partial.json`
instead of `manifest.json`. Full run: ~20 s (72 GLBs, 112 renders, 3 sheets).

The script imports `Builder`, `Stage`, `compose_sheet`, the shared motifs and `validate_glbs` from
`tools/landmark-factory/` read-only (same headless EEVEE rig, flat materials, numpy sheet tiling).

## Outputs (`assets/growth/`)

| Path | What |
|---|---|
| `<family>/<family>-g0..g3.glb` | growth hero, 4 stages, 9 families (forest, city, ice, sand, meadow, ocean, volcanic, moon, medieval) |
| `city/city-build-1.glb`, `city-build-2.glb`, `medieval/medieval-build-*.glb` | construction states (scaffold + crane / half-built frame) |
| `catastrophe/*.glb` | kit: `crater-s/m/l`, `scorch`, `boom-1/2/3`, `debris-1/2/3`, `storm-cloud`, `lightning-bolt`, `rubble-pile`, `recovery-sprout` |
| `catastrophe/tinted/crater-m-<family>.glb`, `scorch-<family>.glb` | family-palette tints of the two ground decals |
| `manifest.json` | family, kind (`growth`/`construction`/`catastrophe`), stage, name, file, triangles, height, footprint, colours, `motif_of`, tags |
| `growth-contact-sheet.png` | one row per family, g0..g3 (+ build states) at a **shared camera scale** with the family's 1.8 m stage-3 landmark rendered as a grey ghost beside each stage |
| `growth-contact-sheet-closeup.png` | same rows, each asset framed individually (silhouette review) |
| `catastrophe-contact-sheet.png` | the 14 neutral kit pieces |
| `renders/` | per-asset cells |

Conventions: glTF 2.0 binary, +Y up, front +Z, base on y = 0, origin at the base centre, metres, flat
`baseColorFactor` materials (roughness 0.6), no textures / extensions / animation, one connected
silhouette per file. Palette from `.fleet/org.md` plus moon (ground `#cfd3dc`, accent `#7d86a3`) and
medieval (ground `#a7c17e`, accent `#6b4a3a`). Assets with a `window` slot list it under `night` for the
emissive swap. Every g1..g3 embeds a shrunken copy of the previous stage (`motif_of`).

Budgets / heights: g0 < 300 tris @ ~0.4 m, g1 < 700 @ ~1.2 m, g2 < 1200 @ ~2.6 m, g3 < 2500 @ ~4.5 m
(2.5x a stage-3 landmark), construction < 2500, kit piece < 300 @ 0.05..1.5 m.

## Ledger meaning

| Asset | Trigger in the study ledger |
|---|---|
| `g0` seed | topic exists, 0-25 % of its skills demonstrated (sapling, icy mound, single flower, foundation slab, stone ring, tide rock, steam vent, rover, camp tent) |
| `g1` | 25-50 % demonstrated (young tree, peak, flower cluster, two floors + crane, step pyramid, sea stack, cinder cone, habitat pod, palisade) |
| `g2` | 50-75 % demonstrated (tree with roots, twin peaks, flower carpet, five floors, pyramid, stack + lighthouse, cone with lava rim, dome cluster, stone keep) |
| `g3` huge | 75-100 % demonstrated; the mountain / tree / tower is the biggest thing on the tile (colossal tree, massive mountain, giant sunflower, 8-floor tower with spire, great pyramid + obelisk, tall stack + lighthouse + birds, big volcano with lava rivers, great observatory, castle with four towers) |
| `build-1`, `build-2` | shown while new evidence is being ingested for a city / medieval topic and the next g-stage is not yet reached (scaffold + crane, then half-built frame); swap to the g-stage when the band is crossed |
| `boom-1` → `boom-2` → `boom-3` | negative graded evidence on the topic (bad exam / assignment feedback): play the three frames at the topic's landmark, ~0.3 s each, `boom-2` is the big readable frame |
| `crater-s/m/l` | left where the boom happened; size follows how far the demonstrated fraction dropped (one band = `-s`, two = `-m`, more = `-l`); tinted variant matches the biome ground |
| `scorch` | decal under a downgraded landmark / hero (stage went down one step) |
| `debris-1/2/3`, `rubble-pile` | scatter after a boom; rubble replaces a landmark that lost two or more stages |
| `storm-cloud` + `lightning-bolt` | topic has overdue or repeatedly failed work; cloud hovers over the hero, bolt strikes on a new negative grade (separate pieces so the bolt can be animated) |
| `recovery-sprout` | first positive evidence after a catastrophe: the sprout with the white bandage grows on the crater until the next g-band is reached, then the crater is removed |

## QA

```bash
python3 tools/qa/check_glb.py assets/growth --kind terrain --exclude "*catastrophe*"   # heroes + construction
python3 tools/qa/check_glb.py assets/growth/catastrophe --kind prop                       # kit
/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/qa/silhouette_test.py -- \
  --in assets/growth --set growth --family folder --cols 8 --manifest assets/growth/manifest.json
```

Status (2026-09-19): silhouettes 72/72 pass; kit 32/32 pass; heroes 31/40 pass. The 9 `*-g3` files fail
only the `terrain` height band (0.02-3.00 m) because they are 4.5 m by design; the gate needs a `growth`
kind (height up to 5 m, tris 2500) or a manifest override from the QA Inspector.
