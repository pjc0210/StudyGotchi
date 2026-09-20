# Landmark factory

> Iteration 4 (2026-09-19): the generator reads `assets/biomes/catalog.json` for every family (16: the
> shipped seven plus space, lab, medieval, jungle, wildwest, cave, graveyard, factory, park): palettes,
> landmark names/heights/files/`motif_carried`, prop ids and budgets, terrain piece, ruin id. Manifest
> `version: 4` adds `family`, `kind` in {landmark, prop, terrain, ruin, scaffold, hero, shared}, `variant`,
> `catalog_ref`, `catalog_diffs`. New outputs per family: `<id>-ruin.glb` (< 600 tris), `<id>-scaffold.glb`
> (< 400 tris), and for lab/jungle/wildwest/cave/graveyard/factory/park `hero/<id>-g0..g3.glb` (0.45/1.2/2.6/
> 4.5 m, 300/600/1200/2500 tris, same convention as `tools/growth-factory`, which ships the other heroes).
> Shared marker parts live in `assets/landmarks/shared/` (12-facet cake tiers r 16/11.5/7.5 m, cream side +
> cap for runtime tinting; signpost ≤ 2 m; rowboat, dock, peak, pillar, tower block). Extra sheets:
> `ruins-and-heroes-contact-sheet.png`, `shared-contact-sheet.png`. Gate (iteration 4.1): 278/278 GLB,
> 278/278 silhouettes, status 0. Props whose triangle count exceeds the catalogue's per-prop `tri_budget`
> (but stay under the 300 contract) carry `over_catalog_budget: true` for the catalogue owner. Builders still live in this file
> (`families/<id>.py` split not done yet). Catalogue diffs found: the seven shipped families' `water` swatch
> (catalogue values applied). Known open items are listed in the gate report (`assets/QA.md`).

Procedural "toybox low-poly" landmarks and terrain props for the StudyGotchi world. One deterministic
Blender script builds, for each of the 7 biomes, a 3-stage landmark family (sprout → small building →
grand landmark) plus 6 filler props, exports flat-colour GLBs, validates them with a stdlib parser and
renders two contact sheets. No randomness outside seeded rngs: the same script always produces the same
bytes-equivalent geometry.

## Regenerate

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/landmark-factory/generate_landmarks.py
```

Headless only (Blender 5.2 LTS); it never touches a running GUI session. Full run (84 GLBs, 119 renders,
4 sheets) takes about 25 s on an M-series laptop. Options go after `--`:

| option | effect |
|---|---|
| `--no-render` | GLBs + manifest only (0.7 s) |
| `--no-export` | renders only |
| `--biomes ice,city` / `--only lighthouse` | subset; the manifest is then written as `manifest.partial.json` |
| `--no-props` / `--no-landmarks` | subset by kind |
| `--cell 256 --samples 16` | contact sheet cell size (px) / EEVEE samples |

Validate the shipped files without Blender (pure stdlib):

```bash
python3 tools/landmark-factory/validate_glbs.py assets/landmarks
```

Optional external check: `npx -y @gltf-transform/cli inspect assets/landmarks/ice/ice-landmark-s3.glb`.

Status 2026-09-19 (iteration 3): `bash tools/qa/run_all.sh` → landmarks set 84/84 GLB gate (manifest-aware),
84/84 silhouettes (1 component, fill 0.25–0.75), 0 samey. Landmarks 56–1042 triangles (s1 56–178, s2 a/b/c
202–580, s3 514–1042), props 30–292, terrain 78–924; heights s1 0.60–0.62 m (footprint radius ≥ 0.36),
s2 0.98–1.07, s3 1.80–1.86, terrain 1.61–2.10 m. gltf-transform agrees with the stdlib parser on the
samples checked.

Note for the QA Inspector: `check_glb.py` has no `terrain` kind yet, so `assets/landmarks/*/terrain/*.glb`
is inferred as `landmark-s3` (1600 tris, 1.40–2.20 m). The terrain pieces are sized to pass that band
today; the intended terrain budget is < 1600 triangles and ≤ 3.0 m. Nothing in `tools/qa/` reads the
`decor` tag yet either; every decor prop currently passes the fill check on its own.

## Outputs (`assets/landmarks/`)

- `<biome>/<biome>-landmark-s1.glb`, `-s2.glb` (variant a), `-s2b.glb`, `-s2c.glb`, `-s3.glb` (35 files);
  the three stage-2 variants share the biome's s1 motif and palette but differ in silhouette, so the
  runtime can pick one by seed (`variant: "a"|"b"|"c"` in the manifest, `null` on stages 1 and 3)
- `<biome>/props/<name>.glb` (42 files, 6 per biome)
- `<biome>/terrain/<name>.glb` (7 files, one sub-region-scale piece per biome, 1.5–2.2 m)
- `manifest.json` (version 3): per asset `id, biome, kind (landmark|prop|terrain), stage, variant, name, file,
  triangles, budget, height, footprint_radius, footprint [w, d], colours {role: hex}, material_slots,
  tags, night, validation, render`, plus palette, brief and conventions.
  - `tags`: `decor` on ground decor (discs, rocks: the silhouette fill/distinctness check may be skipped),
    `terrain` on terrain pieces.
  - `night.window_material`: the exact material slot name (`<id>-window`, colour #ffe9a8) the runtime
    should switch to emissive after dark; `null` when the asset has no window facets. No separate night files.
- `contact-sheet.png`: landmarks, one biome per row, `s1 · s2a · s2b · s2c · s3` **at a shared camera
  distance** so the growth reads; id under each cell
- `contact-sheet-closeup.png`: the same 35 landmarks, each framed individually (silhouette review)
- `props-contact-sheet.png`: one biome per row, 6 props per row (framed individually)
- `terrain-contact-sheet.png`: the 7 terrain pieces
- `renders/<id>.png` (+ `<id>-closeup.png` for landmarks): the individual cells

Every cell stands on a flat disc in the biome's ground colour (Kirby-pedestal style) so white snow and
pale smoke read against the cream backdrop. The rig is the creature stage (same camera lens, cyclorama,
three area lights) scaled with the camera distance, but at half the light gain and a dimmer world so the
cream ground renders at ~0.95 instead of clipping to white; the light *size* is deliberately not scaled
because EEVEE area lights get brighter with size.

## Conventions (fleet technical contract)

glTF 2.0 binary, +Y up, metres. Base on y = 0, origin at the centre of the contact footprint (so a great
tree pivots on its trunk, not its canopy). Front / doors / entrances face **+Z** (the script builds toward
Blender -Y; the exporter maps -Y → +Z). Flat `baseColorFactor` materials only (Principled BSDF, roughness
0.6), one material slot per colour role, named `<id>-<role>`, no textures, no glTF extensions, no
animation. Triangle budgets: stage 1 < 400, stage 2 < 900, stage 3 < 1600, prop < 300.

The material role `window` (#ffe9a8) appears on every stage 2 and stage 3 landmark and on the lamp post /
buoy lights: swap that material's colour or emissive at runtime to fake night lighting.

## Landmark brief (heights ≈ 0.55–0.62 / 1.0 / 1.8 m)

Every stage carries a shrunken copy of the previous stage as a motif so an upgrade reads as growth
(the igloo sits beside the observatory, the observatory annex sits under the lighthouse, ...). Stage 1 is
deliberately chunky (footprint radius ≥ 0.35 m, one bold silhouette: fat signpost with a big arrow board
on a stone base, stump with a wide sprout crown, tall flame facets in a heavy stone ring, ...) because
sprouts are the most common state on the map and must read at 48 px. Ground-level motifs in stages 2/3
touch the main body so each landmark is one connected silhouette.

| biome | stage 1 (sprout) | stage 2 a / b / c (small building) | stage 3 (grand landmark) |
|---|---|---|---|
| ice | igloo | observatory dome / ice tower with flag / snow chapel (+ igloo) | glacier lighthouse on an ice rock (+ observatory annex, igloo) |
| city | kiosk | clock tower / townhouse with awning / bell gazebo (+ kiosk) | library with portico, dome and a 1.8 m clock tower (+ clock face) |
| forest | stump with sprout | treehouse / mushroom cottage / hunter's lodge (+ stump) | great tree with door and treehouse on the trunk |
| sand | ridge tent | adobe hut / market stall / mini ziggurat (+ tent) | stepped pyramid greenhouse (+ adobe entrance, tent) |
| meadow | signpost | windmill / barn / bell tower (+ signpost) | greenhouse dome with porch (+ wind pump, signpost) |
| ocean | buoy | dock with hut / boathouse / net-drying rack (+ buoy) | lighthouse on rock (+ dock, keeper's hut, buoy) |
| volcanic | campfire ring | forge hut / obsidian shrine / steam vent house (+ campfire) | observatory on a basalt column (+ forge hut, campfire) |

Art-direction iteration 3: the city family uses cream walls (#fffaf3 / #f6ecd2), slate or ink roofs
(#6b5f7a / #3a2f45) and the city accent #b98bb0 only for trims, awnings, clock faces and doors (also
applied to the six city props). The two stage-3 greenhouses use frosted glass on their own palette:
sand #f7e9c4 with a #fff6df cap, meadow #d9f0dc with a #f2fbf3 cap. Also folded in from the review:
volcanic forge roof → ink (it matched the ground), clock faces 0.8 of the tower width, wider windmill
sails, four fat library columns.

## Props (6 per biome, < 300 tris each)

| biome | props |
|---|---|
| ice | pine-snow, ice-crystal-cluster, snow-boulder, frozen-lake-disc, dock-plank, ice-block-stack |
| forest | round-tree-small, round-tree-large, mushroom, log, fern-clump, rock |
| city | lamp-post, bench, small-house, fountain, planter-tree, hedge |
| sand | cactus-small, cactus-large, dune-rock, dead-tree, well, cracked-earth-tile |
| meadow | flower-clump-peach, flower-clump-coral, flower-clump-lilac, hay-bale, fence-segment, bush |
| ocean | rock-outcrop, seaweed-clump, buoy-small, wave-crest-tile, shell, starfish |
| volcanic | basalt-column, ember-rock, lava-puddle-disc, dead-tree, smoke-puff-cluster, geyser-vent |

Decor-tagged: rock, snow-boulder, rock-outcrop, dune-rock, ember-rock, frozen-lake-disc, lava-puddle-disc,
cracked-earth-tile, wave-crest-tile. Rocks carry an attached smaller lobe (a notch) and the discs a shard
or rock so their silhouettes still pass on their own.

## Terrain (one per biome, `kind: "terrain"`, 1.5–2.2 m, < 1600 tris)

| biome | piece |
|---|---|
| ice | mountain-cone (2.10 m, snow cap) |
| forest | hill-with-trees (three round trees and a rock on a faceted hill) |
| city | plaza-slab-with-fountain (octagonal slab, big fountain, planter trees, benches) |
| sand | dune (two dune lobes, large cactus, dead tree) |
| meadow | grassy-knoll (tree, fence, flower clump, stone) |
| ocean | sea-stack (grass-capped rock column in a foam ring) |
| volcanic | caldera-rim (crater with lava pool, lava streak, smoke column, basalt columns) |

## Palette

Biome ground / accent from the org charter (forest #8fc48a/#4f8a4a, city #d9c3d6/#b98bb0, ice
#e6f2fb/#a9cfe8, sand #efd9a2/#d2a95e, meadow #bfe0a0/#8fbf6a, ocean #9fd3e0/#4f8fb0, volcanic
#c9a08f/#8a4a3f) plus neutrals wood #9a7a55, stone #b7a58f, ink #3a2f45, window #ffe9a8, snow #ffffff,
water #7fb8d8. A few charter swatches are reused as extras where a biome needs them (coral #e88a8a for
buoy stripes and embers, peach #f2a86f / lilac #c9a2e6 for flowers, the forest green for pines and
cacti, the ice ground as smoke/pale, the sand ground as straw/pale wood). All colours are listed per
asset in the manifest.

## How it is built

`generate_landmarks.py` is self-contained (it only imports its sibling `validate_glbs.py`). A `Builder`
accumulates flat-shaded primitives into one bmesh: boxes, cones/cylinders with polygon phase, uv/ico
spheres (jittered, optionally flattened), bisected domes, a `lathe` for revolved profiles (towers, buoys,
wells, crystals), `loft` / `prism` / `extrude_xz` for tapered walls, gable roofs and arrow signs, and a
closed `ring` for rims and basins. `with B.at(offset, scale):` nests a motif inside a bigger stage.
`finalize()` grounds the mesh and centres it on its contact footprint; the exporter settings match the
creature factory. Renders use the same cream cyclorama / three-area-light EEVEE stage; sheets are tiled
with numpy + `bpy.data.images` (no PIL).
