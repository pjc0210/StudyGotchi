# QA gate (`tools/qa/`)

Deterministic quality gate for every StudyGotchi asset, modelled on the technical contract in
`.fleet/org.md`. Every GLB must pass `check_glb.py` before it is "done"; `run_all.sh` runs every check
that has inputs and writes the fleet-facing report `assets/QA.md`. Nothing here modifies assets.

```bash
bash tools/qa/run_all.sh                       # everything (~20 s for 180 GLBs + 180 wavs, incl. Blender)
SKIP_SILHOUETTES=1 bash tools/qa/run_all.sh    # GLB + audio only, no Blender (~2 s)
```

Exit code 1 when any first-party GLB or wav fails. Outputs: `tools/qa/out/*.json` (machine),
`tools/qa/out/silhouettes-<set>.png` (grids), `assets/QA.md` (summary, worst offenders, blockers).

## Tools

### `check_glb.py` (Python 3, stdlib only)

Minimal glTF 2.0 parser: GLB header + JSON + BIN chunks (also `.gltf` with data: or side-car buffers),
accessors (all component types, strides, normalized, sparse), node TRS/matrix hierarchy, default
scene, skins (bind-pose linear blend skinning), animations, materials, extensions.

```bash
python3 tools/qa/check_glb.py assets/creatures/generated --kind creature
python3 tools/qa/check_glb.py assets/creatures/animated --kind creature --expect-clips idle,walk,happy,sad,sleep --exclude "*_input_snapshot*"
python3 tools/qa/check_glb.py "assets/creatures/cc0/**/*.glb" --third-party -v
python3 tools/qa/check_glb.py assets/landmarks --kind auto --json-out tools/qa/out/glb-landmarks.json
python3 tools/qa/check_glb.py some.glb --json          # JSON on stdout
```

| Check | Rule (FAIL unless noted) | Why |
|---|---|---|
| container | `glTF` magic, version 2, chunk lengths consistent, `asset.version` 2.x, accessors inside their buffers, indices inside `POSITION` | corrupt or truncated exports |
| triangles | per kind: creature < 1500, landmark-s1 < 400, landmark-s2 < 900, landmark-s3 < 1600, prop < 300 (org.md), terrain < 2500, growth < 2500, construction < 800, ruin < 600, scaffold < 400, hero < 2500, shared < 300 | runtime budget |
| manifest | `--manifest manifest.json`: kind from `kind`/`stage`/`variant` (`landmark` + stage 2 or variant `b` -> landmark-s2; `growth` keeps stage g0-g3; `catastrophe`/`decor` -> prop budget; `terrain`, `construction`, `ruin`, `scaffold`, `hero`, `shared` as named), `tags`, `family`/`biome`; a listed file missing on disk FAILs | workers cannot "finish" with text only |
| contrast | creatures: WCAG contrast of the GLB `<id>-body` material against the family ground from `--catalog assets/biomes/catalog.json` (`palette.ground`; `moon` -> `space`); < 1.4 FAILs (`--min-contrast`). The manifest's own `contrast_vs_ground` (number or `{ratio}`) is recorded and warned about if it differs by > 0.15; without a catalogue it is the fallback | Art Director contrast rule |
| animation contract | `--expect-clip-durations idle=2.0,walk=0.8,...` (+-`--clip-tol` 0.05 s), `--expect-nodes Root,Body`, `--static-nodes Root` (no channel may target it) | placement node stays still, clips are interchangeable |
| extensions | `extensionsUsed`/`extensionsRequired` must be empty (`--allow-ext a,b` to tolerate some); Draco / meshopt / basisu called out by name | R3F `useGLTF` gets plain meshes |
| textures | no `textures`/`images` and no `*Texture` material slots unless `--allow-textures`; external image URIs must exist beside the file | flat `baseColorFactor` materials, recolourable in code |
| materials | roughness outside 0.4-0.8, metallic > 0.05, missing `baseColorFactor`: WARN | contract says roughness ~0.6, non-metallic |
| min y | world-space bbox min y within +-0.005 m of 0 | feet/base on the ground plane |
| origin | bbox centre x and z within 25 % of the footprint of (0, 0) | origin at the base centre |
| height | creature 0.69-0.91 m (generator convention 0.70-0.90); landmark s1 0.30-0.70, s2 0.70-1.30, s3 1.40-2.20 (Brief 4: ~0.5 / 1.0 / 1.8 m); prop 0.01-1.50; terrain <= 3.0; growth (g0-g3) <= 5.0; construction <= 3.0; ruin <= 1.2; scaffold <= 1.3; hero <= 5.0; shared <= 3.0 (signpost <= 2.0 by name) | scale consistency in the world |
| front | creatures only: eye centroid z > 0. Eyes = vertices of the darkest flat material that are off the x axis (mirrored pair) and above the lowest quarter (legs). n/a (WARN) when no material is clearly darkest | +Z is the face |
| animations | clip names + durations; `--expect-clips` names must exist; names outside idle/walk/happy/sad/sleep: WARN; zero-length: WARN | animation contract |
| size | above the soft budget (creature 512 KB, landmarks 256/384/512 KB, prop 128 KB): WARN | download weight |
| units | largest extent > 50: WARN "probably not in metres" | third-party packs in cm |

World-space geometry applies the node hierarchy; skinned meshes are posed by their joints' rest TRS x
inverse bind matrices (what a viewer shows with no clip playing). Third-party files whose rest pose
differs from their bind pose therefore measure differently from Blender's forced bind pose; the
first-party pipeline (Blender export) has identical rest and bind poses and matches Blender to the mm.

`--kind auto` takes the budget from the manifest when `--manifest` is given and falls back to the path
(`creatures/`, `landmarks/` + `s1|s2|s3|stage1..3` in the file name, `props/`, `terrain/`). Paths containing a `cc0` folder are auto-tagged `third-party` (reported, never
fail; `--strict-third-party` to change that). Exit 1 when a first-party file fails.

### `silhouette_test.py` (Blender 5.2 headless)

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/qa/silhouette_test.py -- \
  --in assets/creatures/generated --set creatures-generated [--family archetype|biome|folder|all] [--cols 8]
```

Imports each GLB, clears imported animation (rest pose), hides the importer's bone-shape helper
objects, fits an orthographic 3/4 camera (azimuth 34 deg, elevation 22 deg, same angle as the contact
sheets, 4 % margin) to the evaluated bounding box and renders the alpha mask at 96 px and 48 px
(EEVEE, `film_transparent`, alpha > 0.5). Pixel work is numpy on `bpy.data.images` (no PIL).

| Metric | Rule | Meaning |
|---|---|---|
| `fill` | 0.25-0.75 of the silhouette's own bounding rectangle (aspect-neutral) | < 0.25 spindly, vanishes at 48 px; > 0.75 featureless block |
| `frame_fill` | reported only | share of the fitted square (penalises elongated shapes, so not thresholded) |
| `components` | exactly 1 at 96 px and at 48 px. A detached part counts when >= 2 % of the body at 96 px or >= 3 px at 48 px; smaller specks are WARN | floating antenna balls, stick-leg feet, whisker dashes |
| `distinctness` | mean per-pixel difference of the 48 px mask against every other member of the family; < 0.05 WARN "samey" | low = the family reads the same at icon size; the nearest sibling is named |

Family = archetype token of `<archetype>-<biome>-<seed>.glb` by default (`--family biome|folder|all`).
With `--manifest`, items tagged `decor` (ground rocks, lake discs) skip the fill and distinctness rules
(warn only) but must still be one connected component; they are marked `decor` in the grid cell.
Grid `tools/qa/out/silhouettes-<set>.png`: per cell the 96 px mask, the 48 px mask shown 2x, the id and
`f<fill> c<components96>/<components48> d<distinctness>`, green/red border. JSON beside it.

### `check_audio.py` (Python 3, stdlib `wave`)

```bash
python3 tools/qa/check_audio.py assets/audio [-v] [--kind sfx|voice|music|any] [--json-out tools/qa/out/audio-audio.json]
```

PCM 8/16/24/32-bit WAV only (float WAV fails as unreadable). Per file: duration, sample rate, channels,
bits, peak dBFS, RMS dBFS, silence share, leading/trailing silence, DC offset.

| Rule | FAIL / WARN |
|---|---|
| peak > -1 dBFS | FAIL (clipping risk) |
| peak <= -60 dBFS | FAIL, except pause tokens (`comma`, `period`, `question`, `pause`, `space`, `rest`, `silence`, `gap`) which WARN |
| duration outside the kind band: sfx 0.02-3 s, voice 0.05-10 s, music 1-600 s (kind inferred from the folder) | FAIL |
| channels not 1 or 2 | FAIL |
| sample rate not in 22050/24000/32000/44100/48000 | WARN |
| leading silence > 100 ms, DC offset > 2 %, peak < -12 dBFS | WARN |

### `run_all.sh` and `write_report.py`

`run_all.sh` discovers the sets (`assets/creatures/generated`, `assets/creatures/animated` minus
`_input_snapshot`, `assets/creatures/cc0`, `assets/landmarks`, `assets/growth`, `assets/props`,
`assets/audio`), passes each set's `manifest.json` and the biome catalogue when present, applies the
animation contract to the animated set (`EXPECT_CLIPS`, `CLIP_DURATIONS`), runs the gates that have
inputs, renders silhouettes for every GLB set and calls `write_report.py`, which
aggregates `tools/qa/out/*.json` into `assets/QA.md`: asset-set inventory (missing/empty folders are
blockers), per-set summary tables with triangle and height ranges, worst offenders with reasons, the
silhouette grids embedded, audio table, and the "Blockers for integration" list (every first-party
failure plus missing sets). Environment: `BLENDER`, `SKIP_SILHOUETTES=1`, `EXPECT_CLIPS`, `PYTHON`.

Mid-write detection: the script snapshots every set's manifest mtime and GLB count at start and again at
least 30 s later (after the gates). A set whose snapshot moved is **PENDING**: its numbers are kept as a
snapshot in `assets/QA.md`, its failures are not blockers and do not set the exit code, and
`tools/qa/out/run-meta.json` lists it. Re-run when the worker is done.

## Adding a rule

1. `check_glb.py`: compute the value inside `inspect()` and store it on `rec` (it lands in the JSON),
   then call `fail("reason")` for a contract break or `warn("...")` for a soft rule. Budgets live in
   `KINDS`; thresholds in the constants at the top (`MIN_Y_TOL`, `ORIGIN_FRAC`, `ROUGHNESS_BAND`).
   Add the column to `print_table()` if it should show in the terminal table.
2. `silhouette_test.py`: metrics are computed on the boolean masks in `main()` next to `tight_fill` /
   `components`; add a field to `rec`, append to `rec["reasons"]`, and extend the `metrics` string if
   it should appear in the grid cell.
3. `check_audio.py`: same pattern in `inspect()`; constants at the top.
4. `write_report.py`: new fields appear in the JSON automatically; add a column to the relevant table
   if the producer should see it in `assets/QA.md`.
5. Prove the rule bites: make a broken copy in `/tmp` (e.g. rotate a node 180 deg, add
   `extensionsUsed`) and check it fails; the negative cases used so far were a rotated, a lifted and a
   Draco-tagged `blob-city-1.glb`.

Conventions: stdlib only outside Blender; Blender scripts take their arguments after `--`; every tool
writes JSON with `tool`, `set`, `generated_at`, `summary`, `files[]` so `write_report.py` can stay dumb.
