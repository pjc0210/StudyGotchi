# StudyGotchi creature handoff

This package contains all 47 separated Tripo characters plus the edited mouse, in StudyGotchi's runtime format. The mouse uses the first eye edit requested by Philote and the enlarged nose. The Blender source projects remain in the previously delivered `pokemon-collection` folder and `mouse-face-refined.blend`.

## Use the textured version

Use `assets/creatures/tripo-cleaned/textured/*.glb`. Each file has:

- glTF 2.0 binary, +Y up, +Z facing forward, 0.8 m height, feet at y=0, centered base origin.
- Approximately 1,400 triangles, one nonmetallic material, roughness 0.6.
- One embedded 512 × 512 color texture. No sidecar texture downloads, compressed-mesh extensions, or Draco decoder required.
- A stationary `Root` node with an animated `Body` child.
- `idle` (2.0 s), `walk` (0.8 s), `happy` (1.2 s), `sad` (1.5 s), and `sleep` (3.0 s).

The animation curves reuse StudyGotchi's existing animator. These are whole-body animations, not skeletal limb animations. The painted eyes are not separately animated, so there is no blink or eyelid closure. `happy` is played once; all other clips loop. Move and rotate the outer scene/Root in the game, not Body. Crossfade over 0.15 seconds as the current component already does.

`textured-contact-sheet.png` identifies all 48 files. `assets/creatures/tripo-cleaned/index.json` maps each ID to its Blender source. Each variant also has a manifest with file paths, sizes, hashes, dimensions, and clip metadata.

## Cursor integration

The inspected checkout is `/Users/philote/projects-local/StudyGotchi`. Its currently implemented 3D world lives in `prototypes/world-lab`, not `frontend/src`.

1. The supplied `assets/creatures/tripo-cleaned/` directory belongs at the repository's `assets/creatures/tripo-cleaned/`. The prototype's existing `public/assets` link serves it at `/assets/creatures/tripo-cleaned/`.
2. Copy `integration/tripo-assets.ts` into `prototypes/world-lab/src/data/tripo-assets.ts`. This exports metadata, `isTripoId`, and `tripoCreatureUrl`. Biome `meadow`, personality `curious`, and archetype `bean` are explicitly provisional gameplay defaults, not finalized assignments.
3. In `src/data/roster.ts`, import these helpers. At the start of `creatureUrl`, return `tripoCreatureUrl(id)` when `isTripoId(id)`. At the start of `creatureMeta`, return `TRIPO_BY_ID[id]` for those IDs. Keep the existing fallbacks for generated creatures.
4. Add the selected Tripo IDs to the relevant biome arrays in `ROSTER` or `WATER_ROSTER`. This also adds them to `ROSTER_IDS`, which controls preloading. Merely copying GLBs or adding metadata does not make them spawn. Prefer a small active roster rather than preloading all 48.
5. Preserve the texture when the renderer replaces materials. Copy `integration/tripo-materials.ts` into `src/lib/tripo-materials.ts`. In `src/components/GlbCreature.tsx`, import `tripoToonMaterial`, `isTripoId`, and `toonGradient`. Replace the material mapping with:

```ts
const toon = mats.map((m) =>
  isTripoId(id)
    ? tripoToonMaterial(m, toonGradient())
    : toonMaterial(toHex(m)),
)
```

Add `id` to that scene-cloning `useMemo` dependency array, so it becomes `[gltf.scene, id]`. The supplied helper preserves the source color texture and uses the existing three-step lighting ramp. Its cache includes the texture UUID, preventing two characters with the same base color from sharing the wrong face texture.

6. The existing `useAnimations`, clip state machine, `LoopOnce` behavior, movement, and click handling can remain as they are. Validate one textured model and the mouse in the actual world before expanding the roster.

These integration changes are supplied as a handoff, not applied to the concurrently edited world component or active roster. No existing models or manifests are overwritten. The original repository intake's reference-only designation for the Pokémon-derived source remains unchanged; this package does not establish new rights or release approval.

## Flat-color alternative

`assets/creatures/tripo-cleaned/toon/` contains the same models and clips with five flat color materials and no textures. It works with the current material replacement code without step 5. Set the URL helper's variant to `toon` to select it.

This version is an approximation. Small eyes and markings can disappear when textures are reduced to triangle colors. Use `toon-contact-sheet.png` for comparison. The original project checker reports nine front-heuristic failures because it assumes the darkest material consists of the eyes, which is not true for these sampled palettes. The raw reports are included; those failures are not hidden or waived. The textured set is the recommended handoff and passes the declared-texture gate.

## Validation and scope

QA reports are in `qa/`. All recommended textured GLBs pass the project's creature budget, grounding, clip-name/duration, node, extension, and declared-texture checks. Both contact sheets were rendered by reimporting the exported GLBs in Blender. Additional animation checks examine the stored channels, ensure Root is stationary, and check loop endpoints.

The project checker does not infer eye-facing direction for textured models. Their +Z facing direction was checked visually in the rendered contact sheet, with an explicit rotation applied to the mouse. This is asset validation, not a claim that the active game roster has been integrated or tested in the browser.

Original AI-generated anatomy and painted imperfections remain. The runtime files are reduced-detail derivatives, not animation retopology or full artistic rebuilds. New separation offcuts found during preview were removed from creature 17's runtime derivative.
