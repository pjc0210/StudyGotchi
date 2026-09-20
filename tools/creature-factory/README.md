# Creature factory (v2.3)

Procedural "toybox low-poly" creatures for StudyGotchi, built headless in Blender 5.2 LTS from primitives
(low-segment UV spheres, capsules, ico spheres, cones, cylinders, bevelled cubes, a hand-rolled torus),
flat-shaded, joined into one mesh per creature and exported as textureless GLBs.

v2.3 (catalogue iteration): `assets/biomes/catalog.json` is the single source of palettes. At import the
script reads every family's `palette.ground`, `palette.creature[]` (body tones, re-checked with the full
contrast rule), `palette.ink`, `palette.accent` / `accent_2` (recorded, not used for bodies) and
`creature_archetype_weights`; `BIOMES`, `GROUND`, `PALETTES`, `FAMILY_STATUS` and `ARCHETYPE_WEIGHTS` are
derived from it and the hardcoded biome dicts are gone. `secondary` and `dark` are not in the catalogue yet:
the seven shipped families keep their v2 constants (`_FAMILY_SECONDARY`, `_FAMILY_DARK`) so their output is
unchanged, planned families use pale creams and the catalogue ink. Generation now covers all 16 families:
shipped 7 as before (archetype x family x seeds 1,2 + the 12 legacy flat extras, ids unchanged) plus the 9
planned families (archetype x family x seeds 1,2 + `--family-extra 2` per family, archetype drawn by the
family's catalogue weights from `random.Random("<family>|extras|<master-seed>")`) = 222 creatures. Manifest
`version: 2.3` adds `family` (== `biome`), `family_status`, `catalog_ref` per creature, a top-level `catalog`
block (path, version, statuses, archetype weights) and `count_by_family`; a fourth sheet
`contact-sheet-new-families.png` shows only the planned families. Legacy ids whose body tone moved because the
catalogue palette has 4 tones instead of 5 (v2.2 -> v2.3): blob-ice-1, bean-meadow-1, bean-volcanic-1,
bird-volcanic-1, biped-meadow-1, sprite-city-1, sprite-sand-1, sprite-ocean-1, flat-volcanic-1, blob-city-2,
blob-meadow-2, blob-volcanic-2, bird-meadow-2, biped-ocean-2, flat-ocean-2, sprite-sand-4031 (16 of 96).

v2.2 (art-direction iteration, same 96 ids and base rolls as v2.1):

- **Contrast rule.** Body colours come from a per-biome *creature* palette (charter creature accents plus one
  dark and one pale tone), never from the biome ground family. Every entry is asserted at import against the
  org.md ground hex: luminance contrast ratio >= 1.4 and (hue distance >= 25 deg or HSL lightness difference
  >= 0.18); the runtime roll re-checks and re-rolls (seeded) if ever needed. `contrast_vs_ground` is recorded
  per creature (ratio, hue, lightness diff, pass, rerolls). Result: every biome's minimum >= 1.47 (was 1.00).
- **One hero feature.** Exactly one of hat / scarf / crest (tuft, horn, antenna) / backpack / bow / cap per
  creature plus at most one body pattern (`normalize_hero`, applied after the rolls from a separate seeded
  stream; sprites keep only the cap, flats never carry a crest, birds never an antenna, the blob hat is capped
  at x1.15). Ears, tails, beaks and fins are anatomy and stay.
- **Accent rotation.** The hero accent rotates through the charter creature accents (peach, coral, olive,
  lilac, mint) from a seeded start until it reads against the body (same rule as above); when the body is
  pastel too, the rotation continues through deeper shades of the same five hues (`ACCENT_SHADES`).
  `accent_contrast_vs_body` records the base tone, the rotation steps and the ratio.
- `head_scale` clamped to 1.15-1.5 (biped 1.35-1.5, flat 1.2-1.5); the raw roll stays in `head_scale_roll`
  and birds keep their merged-head kiwi look via `head_merged`. Dark bodies (luminance < 0.2) get `big` eyes.
- Bean whiskers removed (the RNG draw is kept so the remaining bean rolls are unchanged).
- Third sheet `contact-sheet-on-ground.png`: each creature on a 2 cm pad of its biome ground colour, sub-label
  = biome + contrast ratio; cells in `renders/<id>-ground.png` (`render_on_ground` in the manifest).

v2.1 (QA-gate iteration, same 96 ids and feature rolls as v2): every appendage is now physically connected in
silhouette. Connectors (antenna stems, bird legs, tail roots, sprout / flower stems, whiskers) are at least
`MIN_CONNECTOR` = 0.045 m thick and sink `MIN_OVERLAP` = 0.02 m into their parent (antenna balls sit on the
stem, bird legs are tapered cones fused into the body with thicker foot slabs, bead tails start inside the
body); the `flat` archetype was reposed as a seal sitting up (chest and head raised, short splayed wedge
flippers ending in ground pads, wedge tail fin with its wide base sunk into the tail, thick neck) so its
footprint depth is <= 1.05 x height; blob arms protrude a little more so no dome exceeds fill 0.75; the origin
is kept within 18 % of the footprint of the bbox centre. Gate: `bash tools/qa/run_all.sh` ->
`creatures-generated` 96/96 on `check_glb.py --kind creature` and 96/96 on the silhouette test.

## Regenerate everything

```bash
# from the repo root; never touches a running Blender GUI (separate headless process)
/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/creature-factory/generate_creatures.py
```

Default run: 6 archetypes x 16 catalogue families x seeds `1,2` (192) + 12 legacy extras over the 7 shipped
families + 2 weighted extras per planned family (18) = 222 creatures, ~70 s total with renders (~9 s export
only).
The run first deletes stale `*.glb` and `renders/*.png` in the output folder (pass `--no-clean` to keep them) so
`manifest.json` is the single truth. Contact sheets and `v1-contact-sheet.png` (the pre-v2 reference) are kept.
The process exits non-zero if any GLB fails validation (see below). Outputs (all under `assets/creatures/generated/`):

| Path | What |
| --- | --- |
| `<archetype>-<biome>-<seed>.glb` | one creature, glTF binary, materials only (no textures) |
| `manifest.json` | `version: 2.2`, `conventions` (incl. `min_connector_m`, `min_overlap_m`, `silhouette`, `contrast`, `hero`, `head_scale`), `archetypes`, `biomes`, `personalities`, `palettes`, `creature_accents`, `ground` and `creatures[]` with `id, archetype, biome, seed, personality, features, triangles, colors, contrast_vs_ground, accent_contrast_vs_body, file, height, footprint, normalize_scale, eyes, bytes, checks, render, render_on_ground` |
| `renders/<id>.png` | 256x256 3/4-view cell render (EEVEE, cream backdrop), id + personality under the creature |
| `renders/<id>-ground.png` | the same view on a pad of the biome ground colour (sub-label: biome + contrast ratio) |
| `contact-sheet.png` | all cells tiled 8 wide in generation order (seed 1 families, seed 2 families, extras) |
| `contact-sheet-by-archetype.png` | the same cells grouped by archetype, each family starting on its own row |
| `contact-sheet-on-ground.png` | the on-ground cells in generation order, for judging body / ground contrast (ground = the family's catalogue colour) |
| `contact-sheet-new-families.png` | only the planned families (space, lab, medieval, jungle, wildwest, cave, graveyard, factory, park) |
| `v1-contact-sheet.png` | frozen v1 (48 creatures) sheet for before/after comparison |

Contact sheet for any folder of GLBs (used for the CC0 mini-models; also a re-import smoke test). Models
are scaled to a 1.2 m display height, grounded and centred before framing; native sizes are printed:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/creature-factory/render_gallery.py -- \
  --in assets/creatures/cc0 --out assets/creatures/cc0/contact-sheet.png
```

## Options (`generate_creatures.py -- ...`)

| Flag | Default | Meaning |
| --- | --- | --- |
| `--out DIR` | `assets/creatures/generated` | output folder (relative to repo root or absolute) |
| `--archetypes a,b` | `blob,bean,bird,biped,sprite,flat` | subset of archetypes |
| `--biomes a,b` | all 16 catalogue families | subset of families (catalogue ids; `family` == `biome`) |
| `--seeds 1,2` | `1,2` | every archetype x family x seed is generated |
| `--extra N` | `12` | legacy extras drawn flat over the *shipped* families (keeps the v1/v2 extra ids) |
| `--family-extra N` | `2` | extras per *planned* family, archetype drawn by the catalogue's `creature_archetype_weights` |
| `--master-seed N` | `2026` | RNG seed for both kinds of extra picks |
| `--only STR` | | substring filter on the creature id (debugging; implies `--no-clean`) |
| `--no-clean` | | keep stale GLBs / cell renders from earlier runs |
| `--no-render` | | skip cell renders and the contact sheets (export only) |
| `--no-export` | | skip GLB export and validation (render only) |
| `--cell PX` | `256` | render / contact-sheet cell size |
| `--cols N` | `8` | contact-sheet columns |
| `--samples N` | `16` | EEVEE render samples (falls back to Cycles CPU if EEVEE cannot start) |

Everything is deterministic: a creature is fully defined by `(archetype, biome, seed)`. Features and colours
come from `random.Random("archetype|biome|seed")` (the draw order for blob / bird / biped is unchanged from v1,
so those ids kept their v1 look) and the personality from `random.Random("archetype|biome|seed|personality")`.
Ids are stable across machines and runs.

## Conventions baked into every GLB (the R3F code relies on these)

- glTF +Y up, feet on the ground plane `y = 0`, origin at the feet centre (contact-point centroid, clamped to
  within 18 % of the footprint of the bounding-box centre).
- One connected silhouette at 96 px and 48 px in the 3/4 view (connectors >= 0.045 m thick, overlapping their
  parent by >= 0.02 m), silhouette fill 0.25 - 0.75 (`tools/qa/silhouette_test.py`).
- Face / front toward **+Z** (built toward -Y in Blender; the exporter maps Blender -Y to glTF +Z). Shy
  creatures are turned 15 deg, so their face is at +Z rotated 15 deg about Y; pupils are always at z > 0.
- Overall height clamped into **0.70 - 0.90 m** (`normalize_scale` in the manifest records the factor).
- **< 1500 triangles**, in practice 382 - 1482; 24 - 90 KB per file; `POSITION` + `NORMAL` only, u16 indices.
- 4 - 5 primitives per mesh, one per material: `<id>-body`, `-secondary`, `-accent`, `-dark`, `-white`.
  Materials are flat `Principled BSDF` (baseColorFactor, roughness 0.6, metallic 0, single-sided,
  no extensions) so `useGLTF` gives plain `MeshStandardMaterial`s; recolouring is `material.color.set(...)`.
- Flat shading (split normals per face); the visible facets are the look.

### Validation (`checks` in the manifest)

After export every GLB is re-read with the standard library only (`struct` + `json`, no glTF package needed
inside Blender): header magic / version / length, JSON + BIN chunk layout, no `extensionsUsed` /
`extensionsRequired`, no textures, identity node transform, TRIANGLES primitives with flat `baseColorFactor`
materials, `min y == 0`, height inside 0.70 - 0.90, triangle budget, and the pupil centroids (tracked while
building, exported as `eyes` in glTF coordinates) in front of the origin. `checks.ok` is per creature; the run
prints a summary and exits 1 if anything fails. `npx -y @gltf-transform/cli inspect <glb>` is a good second
opinion on samples.

## Design knobs

### Archetypes

| Archetype | Silhouette | Notes |
| --- | --- | --- |
| `blob` | Ditto-like dome with nub arms | face on the body; unchanged from v1 except palette |
| `bean` | horizontal capsule quadruped | v2 rebuild: body raised 0.12 m on four short visible cylinder legs (optional secondary paws), distinct sphere head 1.15 - 1.5 x body radius at the front, flat facet ears (discs or thin cones), 3-sphere or leaf tail, saddle / spine spots (whiskers removed in v2.2) |
| `bird` | round kiwi body, cone beak, 2 stick legs with flat feet, tiny wings | unchanged from v1 except palette |
| `biped` | big round head on a small round body, 2 stub arms, 2 stub feet | v2: head +13 %, feet 30 % wider and further apart (Rumble-toy read) |
| `sprite` | short round body sitting on the ground, tiny arms, no legs | v2 new. Hero is the `cap`: `mushroom` (flat accent cap with white spots), `cactus` (taller body, two side pads, flower on top), `sprout` (stem + two leaf ellipsoids), `flower` (petal crown tilted to the camera). Kirby world-select pedestal feel |
| `flat` | tapered capsule spine sloping from a raised chest to the tail on the ground (seal sitting up), big rounded head on a thick neck at +Z | v2 new, reposed in v2.1 for ocean / ice / coast sub-regions. `fin`: `fish` (vertical wedge fan) or `seal` (two horizontal wedge flippers), base sunk into the tail; short splayed wedge front flippers with ground pads; optional `dorsal` wedge; the fin is the usual hero (accent colour when it is) |

### Feature slots (rolled per seed, recorded in `features`)

`ear` none/round/pointy/long, `tail` none/nub/long/leaf, `crest` none/tuft/horn/antenna(+ball), `eyes`
dot/big(with white)/half-closed, `mouth` none/line/beak, `accessory` none/scarf(torus)/hat(cone)/backpack(cube)/
bow, `pattern` none/belly patch/spots, `body_squash` 0.85 - 1.15, `head_scale` 0.85 - 1.30. One slot per
creature is the `hero` (never `none`, scaled x1.35) so each creature has a single exaggerated identifying
feature; birds can roll `beak` as the hero (`beak_len`), sprites almost always `cap`, flats mostly `fin`.
Archetype extras: `whiskers`, `feet_secondary` (bean paws / biped feet / flat flippers), `wing_secondary`,
`cap`, `fin`, `dorsal`.

### Personalities (`personality`, v2)

One of `sleepy`, `bold`, `curious`, `grumpy`, `shy`, drawn from its own RNG stream. It biases the eye style
(80 % of the time) and always biases the pose, applied after the build:

| Personality | Eyes | Pose |
| --- | --- | --- |
| `sleepy` | half-closed | head nodded 9 deg forward, whole body leaning 5 deg sideways (shear, feet stay planted) |
| `bold` | big | chin up 10 deg, body leaning 4 deg back so the chest sticks out |
| `curious` | as rolled | head tilted 10 deg |
| `grumpy` | dot + two dark brow facets, line mouth | head 4 deg down |
| `shy` | dot | whole creature turned 15 deg away from the camera side, the ear on that side drooped |

Head parts are built inside `Builder.group("head")` and rotate about the head centre (the body centre for
blob / sprite / merged-head birds) so nothing detaches. Leans are shears about the ground plane.

### Palettes

Read from `assets/biomes/catalog.json` (`build_palettes`): per family the `ground` hex, the `body` creature
tones (`palette.creature[].hex`, names and the catalogue's stored `contrast_vs_ground`; every tone is
re-checked with the full rule at import and would be skipped by the runtime re-roll if it failed), the
family `ink`, `accent` and `accent_2` (recorded in the manifest for consumers), the `secondary` patch / ear /
paw tones (v2 constants for the shipped seven, pale creams for planned families) and `dark` for eyes / legs /
brows (v2 biome-tinted constants for the shipped seven, the catalogue ink for planned families). The hero
accent is global: it rotates through `CREATURE_ACCENTS` (peach #F2A86F, coral #E88A8A, olive #B9C96F, lilac
#C9A2E6, mint #8FC9D8) and their deeper shades until it reads against the body. Eye whites are shared.
Adding a family = adding it to the catalogue; the factory picks it up on the next run.

### Adding a feature

Write a small `add_*` builder that places primitives with `Builder.sphere/capsule/cone/cyl/cube/torus`
(Blender coords, front = -Y, up = +Z; `frame_z` / `frame_x` give deterministic rolls for flat parts) and call
it from the archetype builders inside the `head` group if it should follow head poses; add the slot to
`SLOT_OPTIONS` so it is rolled and recorded in the manifest. Append new RNG draws at the *end* of an archetype
branch in `roll_features` so existing ids keep their look.

## Render stage

3/4 front view (camera azimuth 34 deg to the creature's right, 22 deg elevation, 50 mm), soft 3-point area
lights (key / fill / rim, narrowed spread), pale cream cyclorama (`#FBF3E4`) so there is no horizon seam,
`Standard` view transform to keep the flat pastels true, EEVEE 16 samples (~0.15 s per cell on an M-series
GPU). The id label and the smaller personality sub-label are text objects parented to the camera. Sheets are
tiled with numpy + `bpy.data.images` (Blender's Python has no PIL); `None` cells pad the grouped sheet.
