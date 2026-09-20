# Biome family catalogue

`assets/biomes/catalog.json` (schema: `assets/biomes/catalog.schema.json`) is the single
source of truth for every biome family in StudyGotchi. A *family* is everything a course
needs to look like a place: palette, terrain kinds, a level-1 pedestal marker, the
three-stage landmark set, props, one terrain-scale piece, the growth hero, the
catastrophe, creature archetype weights, subject affinities and ambient sound.

Today the same knowledge is hardcoded in three places; the catalogue replaces all three:

| Consumer | Hardcoded today | Reads from the catalogue |
|---|---|---|
| `tools/landmark-factory/generate_landmarks.py` | `BIOMES`, `PALETTE`, `BRIEF`, `S2_NAMES`, `LANDMARKS`, `PROPS`, `TERRAIN` | `families[].palette`, `landmarks`, `props`, `terrain_piece`, `catastrophe.ruin` |
| `tools/creature-factory/generate_creatures.py` | `BIOMES`, `GROUND`, `_RAW_PALETTES` | `families[].palette.ground`, `palette.creature[]`, `creature_archetype_weights` |
| `prototypes/world-lab/src/lib/galaxy.ts` + `world.ts` | `BiomeId`, `BIOMES`, `TERRAIN_KINDS`, `Recipe` | `families[].terrain_kinds`, `marker`, `growth_hero`, `catastrophe`, `palette` (+ `palette.night`) |

Validate after any edit:

```bash
python3 assets/biomes/validate_catalog.py          # schema (jsonschema if installed) + semantic checks
python3 assets/biomes/validate_catalog.py --fix    # recompute derived fields: contrast ratios, terrain tints
```

## Families

16 families, 7 shipped (assets exist under `assets/landmarks/<id>/`) and 9 planned, in
build priority order: `space`, `lab`, `medieval`, `jungle`, `wildwest`, `cave`,
`graveyard`, `factory`, `park`. The first five carry full-detail briefs; the last four
are complete but shorter. The shipped seven (`forest`, `city`, `ice`, `sand`, `meadow`,
`ocean`, `volcanic`) keep their asset ids and landmark file names exactly as in
`assets/landmarks/manifest.json`; the validator diffs them.

`ocean` has the alias `coast` (the id `galaxy.ts` uses today).

## How each consumer uses it

### Landmark factory

For each family, the factory generates:

- `landmarks.s1`, `s2a`, `s2b`, `s2c`, `s3` -> `assets/landmarks/<id>/<id>-landmark-{s1,s2,s2b,s2c,s3}.glb`,
  targets `height_m` (0.55-0.62 / 1.0 / 1.8), tri budgets 400 / 900 / 1600. `motif_carried`
  states the continuity rule: each stage contains a motif of the previous one (space: flag ->
  dome flag -> tower pennant). The build function per stage is still Python; the catalogue owns
  the *brief*, *name*, *height* and *file name*, so adding a family means adding one entry here
  plus one builder module `tools/landmark-factory/families/<id>.py` exposing `s1, s2a, s2b, s2c, s3,
  props, terrain, ruin`.
- `props[]` -> `assets/landmarks/<id>/props/<short>.glb`, budget `tri_budget` (<= 300), tags
  `decor` skip the silhouette gate. `runtime_recipe` names the `galaxy.ts` Recipe the prop
  replaces during migration.
- `terrain_piece` -> `assets/landmarks/<id>/terrain/<short>.glb`, height <= 3 m, budget 1600.
- `catastrophe.ruin` -> `assets/landmarks/<id>/<ruin id>.glb`, stage-2 footprint, budget 900.
- `palette`: `ground`, `accent`, `accent_2`, `road_*`, `water`, `window`, `ink` become the
  family's material slots (`<id>-<role>`); `window` stays the emissive slot for night.

### Creature factory

`palette.ground` replaces `GROUND[biome]`, `palette.creature[].hex` replaces
`_RAW_PALETTES[biome]["body"]`. Every entry is guaranteed >= 1.4 WCAG contrast against the
ground and the ratio is stored in `contrast_vs_ground`, so the import-time assertion becomes a
catalogue check. `creature_archetype_weights` drives the per-family archetype roll when a
course's creatures are generated (`plan()` should sample archetypes by these weights instead of
the flat product). Hero accents stay global (`CREATURE_ACCENTS`).

### Runtime (`galaxy.ts`)

- `terrain_kinds[]` replaces `TERRAIN_KINDS`. `profile` maps to the current `Profile` via
  `conventions.galaxy_profile_map` (`mountain` -> `peaks`, or `volcano` when `fill == "lava"`;
  `recessed_water` -> `water`, or `crater` when `fill == "none"`). `tint` is the ground tint,
  `alt` the secondary colour, `decor[].prop` + `density` the recipe list (look up the prop's
  `runtime_recipe` until the real GLB props are instanced). One kind has `role: water` and one
  `role: shore`; they go to the outermost topics as today.
- `marker` builds the level-1 pedestal (Kirby world-select style): three stacked discs in
  `tier_colours` (base, mid, cap), `signature_props` scattered on the top disc, the course code on
  a sign in `sign_text_style`, and the resident creature picked with a bias towards
  `creature_archetype_preference`.
- `growth_hero` places one object at the course centre and scales it by progress band (see
  `growth-and-catastrophe.md`).
- `catastrophe` selects the VFX set by `effect_family` and swaps the stage-2 landmark for
  `ruin` during the disaster.
- `palette.night` overrides sky, fog, ground lightness, lamp and window emissive, star density
  and moon when the page is in dark mode, plus per-family extras (aurora, lava glow, fireflies).

## Assigning a family to a new course

Courses arrive open-ended (each ingestion may add one). The rule:

1. **Score by `subject_affinity`.** Tokenise the course title, department and syllabus
   keywords; score each family by matches against its `subject_affinity` list (exact term 3,
   stem match 2, department-level synonym 1). Keep the top three.
2. **Adjacency constraint.** No two courses that are neighbours on the planet may share a
   family (`galaxy.ts` lays courses out as patches; neighbours = patches whose centres are
   within 1.6x the patch radius). Also prefer not to reuse a family the student already has at
   all while unused families remain. Drop candidates that violate this.
3. **LLM tie-break.** If the top two scores are within 1 point, or no family scores above 2,
   ask the model with the course title + one-paragraph description and the remaining candidate
   `mood` lines; it returns one `id` and a one-sentence reason stored on the course record.
   Fall back to the least-used family if the model is unavailable.
4. **Stability.** Once assigned, a course keeps its family forever (assets, screenshots and
   friends' memories depend on it); re-ingesting a course never re-rolls it.

Worked example: "8.286 The Early Universe" -> `space` (astrophysics, cosmology), unless the
neighbouring "8.03 Waves" already took `space`, in which case `ice` (physics/maths crossover)
via the tie-break.

## Migration note

1. Land the catalogue and validator (this change). Nothing consumes it yet.
2. `generate_landmarks.py`: read `catalog.json`; derive `BIOMES`, `PALETTE`, `BRIEF`, `S2_NAMES`
   from `families[]` and assert equality with the current constants for one release, then
   delete the constants. Builder functions move into `families/<id>.py` keyed by the
   catalogue's stage names.
3. `generate_creatures.py`: same dance for `BIOMES`, `GROUND`, `_RAW_PALETTES["body"]`
   (`secondary` and `dark` stay per-family constants until the catalogue grows those two
   fields; add them as `palette.creature_secondary[]`, `palette.creature_dark` when needed).
4. `world.ts` / `galaxy.ts`: generate `biomes.generated.ts` from the catalogue with a small
   script (`prototypes/world-lab/scripts/gen-biomes.mjs`) so the type `BiomeId` becomes a
   union of the catalogue ids; rename `coast` -> `ocean` using `aliases`. `TERRAIN_KINDS`
   becomes a lookup over `terrain_kinds`, with `profile` mapped through `galaxy_profile_map`.
5. Only after all three read the catalogue does anyone add a new family; `status: planned`
   families are visible to the runtime immediately (procedural fallbacks: pedestal + hero + the
   recipe props), and flip to `shipped` when their GLBs pass `tools/qa/check_glb.py`.
