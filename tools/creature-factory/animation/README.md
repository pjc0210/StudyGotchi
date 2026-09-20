# Creature animation (Animator territory)

Skeleton-free node animation for every generated creature. Each `assets/creatures/animated/<id>.glb` carries the
original mesh plus five baked glTF animations that only move object transforms; three.js `AnimationMixer` plays them
as-is. Tomodachi Life spirit: whole-body poses, squash and stretch, no anticipation, few authored keys.

## Run

```bash
# 1. snapshot the artisan's output (the Animator never reads assets/creatures/generated/ directly)
mkdir -p assets/creatures/animated/_input_snapshot
cp assets/creatures/generated/*.glb assets/creatures/generated/manifest.json assets/creatures/animated/_input_snapshot/

# 2. animate everything, write manifest, render motion strips + walk videos
/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/creature-factory/animate_creatures.py

# options: --only <substring> --no-motion --no-export --fps 30 --motion-ids a,b --video-ids a,b --cell 200 --samples 16
```

Outputs: `assets/creatures/animated/<id>.glb`, `assets/creatures/animated/manifest.json` (id, source, clips with
durations, node names, `eyes_separated`, triangles, bytes, per-file `verified` flag read back from the GLB header),
`assets/creatures/animated/motion/<id>-walk.png`, `<id>-happy.png` (8 evenly spaced frames, rendered from a re-import
of the exported GLB), `<id>-walk.mp4` (2 s, 30 fps, H.264).

Independent check: `npx -y @gltf-transform/cli inspect assets/creatures/animated/<id>.glb`.

Re-running while the world prototype live-loads `assets/creatures/animated/*.glb`: build into a sibling folder with
`--out assets/creatures/animated/.build`, verify, then move each GLB into place with an atomic rename
(`os.replace`), rewrite the manifest's `file` paths and rename it last, move `motion/`, delete the build folder.
No file is ever missing and `manifest.json` is valid at every moment (this is how v2.1 was swapped in).

## Node hierarchy

```
Root   empty at the origin, feet level. NEVER animated: the runtime moves/rotates Root (or gltf.scene).
└─ Body   whole mesh, origin = ground contact centre, so scale squashes toward the feet
   └─ Eyes   dark/white eye primitives, origin = eye centre (blink = Y scale on this node only)
```

Eyes are isolated from the `-dark`/`-white` primitives. Primary locator: the generator manifest's per-creature `eyes`
positions (v2+, glTF coords) — small roundish islands within 7 cm of a hint and within 3.5 cm of its height are taken
(pupils + white sclera together; eyebrows ~6.5 cm above the eye are left on the Body so they do not blink), which
also handles "shy" faces yawed 15° off +Z and works on very dark and very pale bodies (materials are chosen by the
`-dark`/`-white` name suffix, never by colour). Current set (animation_version 4): 222 creatures across 16 families,
222/222 Eyes from hints; 128 have pupils only (2 islands), 94 have sclera + pupils (4 islands). Fallback (no hints): front upper off-centre left/right pair heuristic. The output
manifest records `eye_source` (`manifest` / `heuristic` / `none`); with `none` the Eyes node is omitted and only
blinks/eyelids are lost. Currently 96/96 have Eyes, all from manifest hints.

## Archetype profiles

| profile | archetypes | differences from the default clips |
|---|---|---|
| `default` | blob, bean, bird, biped, sprite | as in the table below |
| `flat` | flat (horizontal seal/fish body, head at +Z) | squash & stretch go along the long axis: hop squash (y 0.88, x 1.04, z 1.07), hop stretch (y 1.03, x 0.95, z 1.10), jump stretch (y 1.08, x 0.90, z 1.18), landing (y 0.74, x 1.12, z 1.22); pitch × 0.4 so the far-forward nose never digs into the ground; `sleep` roll 10° |

## Clip spec (30 fps, times in seconds)

| clip | duration | loop | what moves |
|---|---|---|---|
| `idle` | 2.0 | yes | Body breathe scale y 1.00→1.03→1.00 (x/z inverse 0.985); sway roll ±2° (sine-like); one blink at 1.4 s (Eyes scale y 1→0.1→1 over ~0.13 s) |
| `walk` | 0.8 | yes | two hops per loop: Body y 0→0.18→0 (parabolic: QUAD ease-out up, ease-in down); squash on ground (y 0.90, x/z 1.05), stretch in the air (y 1.08, x/z 0.96); pitch +6° forward at apex; roll +4° on hop 1, −4° on hop 2 |
| `happy` | 1.2 | no | per-archetype variant (table below); every variant starts and ends exactly at rest, Eyes wide (1.2) mid-clip |
| `sad` | 1.5 | yes | Body droop scale y 0.94 (x/z 1.03) with a slow sigh to 0.92; pitch +8°→+10°→+8° (head down); roll ±1.5° sway; Eyes half-closed (scale y 0.5) |
| `sleep` | 3.0 | yes | Body lying tilt roll 12° with a small lift (half the sink of the low side); slow breathe 0.98→1.03→0.98; Eyes closed (scale y 0.08) |

### `happy` variants (animation_version 3; same name and 1.2 s everywhere, so the runtime state machine is unchanged)

| archetype | variant (`happy_variant` in the manifest) | motion |
|---|---|---|
| biped | `jump_spin` | jump y 0→0.35→0 (lands 0.8 s), 360° yaw spin 0.1–0.77 s, take-off stretch 1.18, landing squash y 0.72 / x-z 1.22, rebound 1.10 |
| blob | `double_bounce` | bounce 0.22 then 0.14 m, squash y 0.78 between them, roll wobble +20° / −20° / +5° → 0 |
| bean | `pounce` | crouch (y 0.84, 0.13 s), leap 0.25 m high and 0.28 m forward (+Z) with nose up −10°, land splayed (y 0.82, x 1.18) nose down +5°, hop back to the start |
| bird | `flap_hop` | two quick 0.16 m hops (0.4 s each), body rolls +30° then −30°, squash on both landings |
| sprite | `cap_pop` | body pops tall (y 1.25 → 0.95 → 1.15 → …), yaw wiggle ±8° decaying, 0.07 m hop |
| flat | `belly_wiggle` | roll +12 / −12 / +10 / −8 / +4 → 0 (never inverts), pitch +4° tail-fin slaps, long-axis breathing 1.06/0.96, small lifts keep the pads within 2.5 cm of the ground |

Semantics used above (glTF frame, the runtime's frame): y = up, +Z = face. Pitch positive = nod forward (face
down). Roll = tilt about the face axis. Every clip keys location, rotation and scale of Body and of Eyes, even when
constant, so each clip fully defines the pose and cross-fades never inherit a stale channel.

## Runtime use (three.js / R3F)

```ts
const { scene, animations } = useGLTF(url);              // or GLTFLoader
const mixer = new THREE.AnimationMixer(scene);
const clip = (name: string) => THREE.AnimationClip.findByName(animations, name);
const actions = Object.fromEntries(["idle", "walk", "happy", "sad", "sleep"].map(n => [n, mixer.clipAction(clip(n))]));
actions.happy.setLoop(THREE.LoopOnce, 1); actions.happy.clampWhenFinished = true;

actions.idle.play();                                     // default
// moving:   actions.idle.crossFadeTo(actions.walk.reset().play(), 0.15)
// stopped:  actions.walk.crossFadeTo(actions.idle.reset().play(), 0.15)
// evidence: actions.happy.reset().play(); on mixer 'finished' -> crossFade back to idle/walk
// mood:     sad / sleep loop like idle
mixer.update(delta);                                     // every frame
```

`walk` does not translate the creature; move Root (the loaded scene) yourself at roughly 0.6–0.9 m/s so each 0.4 s hop
covers 0.25–0.35 m. Rotate Root to face the travel direction (+Z is the face).

## Export pitfalls (for the runtime engineer)

* Clip names are exactly `idle walk happy sad sleep`; the file stores them alphabetically, so look them up by name,
  never by index. `manifest.json` carries `animation_version` (3 = per-archetype `happy`, 4 = 16-family set),
  and `family`, `happy_variant`, `profile`, `eye_source` per creature.
* When re-importing an animated GLB into Blender, the importer places every strip at frames 1..N+1 (a one-frame
  offset); sample clips via the strip range, not from frame 0. `motion.py` does this already.
* `happy` for beans translates Body up to 0.28 m along +Z and back; it ends at the origin, but do not start a
  Root translation mid-clip if the creature is next to a wall.
* Samples are LINEAR at 30 fps (Blender bakes Bezier/QUAD easing; `export_force_sampling=True`). Constant channels are
  collapsed to two keys. Durations: 2.0 / 0.8 / 1.2 / 1.5 / 3.0 s; loops start and end on the same pose.
* "Shy" creatures have their face (and eyes) turned 15° off +Z by design; clips do not compensate, so keep facing the
  travel direction with Root and accept the head-turn as character.
* Node names `Root`, `Body`, `Eyes`; mesh names `<id>` and `<id>-eyes`. Do not animate `Root` in the clips and do not
  put your own transforms on `Body`/`Eyes` (the clips overwrite them).
* `happy` leaves Body yaw at 360° (identity quaternion). No loop flag exists in glTF; set `LoopOnce` yourself.
* No skins, morph targets, textures or extensions; materials are the generator's flat `baseColorFactor` colours, the
  `-dark` material is shared by the Body and Eyes meshes.
* The Blender glTF importer sets imported objects to QUATERNION rotation mode; the rig switches Body back to XYZ
  Euler before keying (Euler keys are silently ignored otherwise). Keep this if you edit `rig.py`.
* Blender 5.2's macOS build has no FFMPEG output format; `motion.py` renders a PNG sequence and encodes it with the
  system `ffmpeg` when present, otherwise the video step is skipped and reported.
