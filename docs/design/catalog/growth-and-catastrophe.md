# Growth and catastrophe choreography

Generic across families; every family only supplies data (`growth_hero`, `catastrophe`,
`palette.night` in `assets/biomes/catalog.json`). Times are wall-clock seconds; heights are
metres before `PROP_SCALE`.

## Progress bands

Course progress (0-100 %) is quantised into five bands; crossing a boundary triggers a
growth beat, so the world visibly *jumps* forward.

| Band | Terrain relief x | Hero height | Flowers / trees per cell | Lights lit | Landmark stage |
|---|---|---|---|---|---|
| 0 % | 0.6 | `height_m_by_band.0` (~0.6) | 25 % of decor density | none | sprout (s1) |
| 25 % | 0.8 | `.25` (~1.5) | 50 % | lamps only | s1 |
| 50 % | 1.0 | `.50` (~3.0) | 75 % | lamps + 1/3 windows | s2 |
| 75 % | 1.15 | `.75` (~4.5) | 100 % | lamps + all windows | s2 |
| 100 % | 1.3 | `.100` (~6.0) | 125 % (overflow into paths) | all + hero glow + orbiting extras | s3 |

Relief multiplier scales `hills`, `mountain` and `terrace` heights; `flat` and
`recessed_water` are untouched so water levels stay put. `extras_by_band` names what pops in
at each band (ropes, lanterns, birds, satellites).

## Timing

- **Pop-in** (decor, props, landmark stage swap): scale 0 -> 1.12 -> 1.0 in 0.4 s (back-out
  overshoot), staggered 40 ms per item, nearest to the camera first; play `sprout-appear` for
  decor, `landmark-build-{1,2,3}` for stages.
- **Hero growth**: height eases from the old band to the new over 1.2 s (ease-in-out cubic),
  with a 4 % x/z squash at the start and 3 % overshoot at the end; `progress-level-up` plays
  when it settles. Extras pop in after the hero settles.
- **Relief change**: terrain vertex heights lerp over the same 1.2 s (no overshoot).
- Growth beats queue; never run two in parallel on one course.

## Catastrophe sequence

Triggered by game logic (missed deadline, broken streak). Always comic, never punishing.

1. **Gather (2.0 s).** A cloud puff (family `effect_family` picks the sprite set: weather =
   grey cloud, geological = shaking ground + dust, mechanical = flicker + sparks, cosmic = sky
   streak, spooky = fog roll) forms over the course centre; ambience ducks 6 dB; creatures look
   up (`idle` with head tilt).
2. **Bang (0.5 s).** Comic explosion: a flat star-burst sprite (ink outline, family accent
   fill) scales 0 -> 1 in 0.15 s, then three smoke puffs (pale ico clusters) expand and fade
   over 0.5 s; `explode-comic`. The stage-2 landmark scales to 0 during the star-burst frame.
3. **Ruin state.** `catastrophe.ruin` pops in with the 0.4 s overshoot on the stage-2 footprint.
   Creatures play `sad` and drift towards the ruin; lamps go out; the growth hero drops one
   band visually (not in data). `creature-sad` once, then quiet.
4. **Recovery** (when the student acts: submits, checks in). Scaffolding (family: log frame,
   steel poles, timber, repair drones) pops in around the ruin for 3.0 s while parts fly back
   one per 0.3 s; `landmark-build-2` knocks in rhythm; then the stage-2 landmark pops back at the
   *previous* stage with overshoot, `recover-chime`, creatures play `happy`, hero returns to its
   band. Total recovery ~4 s.

## The scale rule

Disasters are shown at **topic snap** zoom (the camera framing one topic sub-region). At that
zoom the choreography must be big or it is wasted:

- **Creature height >= 6 % of viewport height** at topic snap (a 0.8 m creature on a 1080 px
  viewport is >= 65 px). If the snap does not achieve this, scale creatures up (per-course
  `creatureScale`) rather than zooming the camera further in.
- **Explosion star-burst >= 20 % of viewport height** (>= 216 px on 1080), cloud puff >= 15 %,
  ruin >= 12 %. Sprites are sized in screen space, not world space, so they hold on any planet.
- **Hero at 100 % >= 30 % of viewport height** at the course (patch) zoom.
- Nothing in the sequence may be smaller than 48 px on screen; drop it rather than shrink it.

## Day and night

Night is driven by the page colour scheme: `prefers-color-scheme: dark` (or the app's theme
toggle) = night, otherwise day. No clock. Transition crossfades over 1.5 s.

| | Day | Night |
|---|---|---|
| Sky | `#f3e4ee` (charter) | `palette.night.sky` |
| Fog | sky tinted 20 % towards ground | `palette.night.fog`, density x1.4 (x `fog_density_mul` if set) |
| Ground | `palette.ground` | lightness + `ground_lightness_offset` (-0.08 .. -0.3) |
| Lamps | off | emissive `palette.night.lamp`, intensity 1.6 (bloom threshold 1) |
| Windows | `palette.window` flat | emissive `palette.night.window`, intensity 1.4, per-window 0.2 s stagger |
| Stars | none | instanced points, count = 800 x `star_density` |
| Moon | none | flat disc + crescent shadow if `moon` true; `moon_big` doubles it |
| Key light | warm, intensity 2 | cool `#8fa8d8`, intensity 0.8; hemisphere sky = night.sky |

Per-family extras live in `palette.night` and are read as-is: `fireflies` (forest, meadow,
jungle), `neon_signs` (city), `aurora` (ice), `water_emissive` + `lighthouse_beam` (ocean),
`lava_emissive` + `ember_sprites` (volcanic), `earthrise` + `dome_emissive` with no moon
(space), `neon_rings` + `floor_grid_emissive` (lab), `torch_flicker` (medieval, jungle),
`crystal_emissive` with no stars or moon (cave), `fog_density_mul` 2 + `ghost_sprites` +
`moon_big` (graveyard), `chimney_glow` + `warning_light_blink_hz` (factory),
`string_lights` + `fountain_emissive` (park), `campfire_glow` (wildwest).
