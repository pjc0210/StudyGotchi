# Game art research: synthesis and open decisions

Date: 2026-09-19. Seven research scouts wrote docs 01–07 in this folder. This page reconciles them and lists the decisions the team still has to make. Every factual claim below is sourced in the numbered doc named in brackets.

## What the scouts agree on

- **Parametric beats a sprite library.** A Mii is ~40 small integers (type index + scale/aspect/rotate/X/Y per feature); recognisability comes from placement, not from unique art. Our creature "genome" should be a small JSON that drives a shared body, and new creatures should be data, not assets. [01, 04]
- **Few bodies, many axes.** The cheapest perceived variety comes from, in order: palette on masked regions, a shared face/expression set, 6–10 base species, one anchored accessory slot, a pattern overlay, size by growth stage. Part swaps (ears, tails, horns) are the most expensive axis unless the rig is shared. [02, 04]
- **One shared rig per body type** so one animation library (idle, walk, happy, sleep, eat, sad) drives every creature forever. Every asset pack worth using (KayKit, Gobkit, Quaternius) already works this way. [03, 04]
- **Bold held poses, no anticipation frames, flat toon shading, no ink outlines.** That is literally how Tomodachi Life's animators describe their style, and it is the cheapest style to hit. [01, 06]
- **Colour-coded bubbles over homes are the whole ambient HUD.** No text needed to show state (away / asleep / needs something / sad / dreaming). [01]
- **Personality is a 4×4 grid that picks one of 4 animation sets plus a palette.** Charm comes from recontextualising one rig with props (the ~30 dream sequences), not from new animation. [01]
- **Evolution should produce lovable oddballs, not punishments.** Kuchipatchi (the "bad care" branch) became a co-mascot. Encode stats Chao-style: subject → parts, consistency/streak → palette and material, stage → scale and head ratio. [02]
- **Stack versions (verified on npm 2026-09-19):** three 0.186.0, @react-three/fiber 9.7.0 (v10 still alpha), drei 10.7.8, @react-three/postprocessing 3.1.1, three-vrm 3.5.5, yuka 0.7.8, gltfjsx 6.5.3, @gltf-transform/cli 4.5.0. Stay on WebGL; WebGPU is still experimental and the post-processing libs are WebGL-only. [03, 06]
- **Voice:** Animalese-style letter blips (per-species base pitch, mood modulates pitch/tempo) over cloud TTS. SFX: ZzFX/jsfxr presets as JSON that agents can author en masse; ElevenLabs SFX/Music or Stable Audio for organic stingers and loops; Kenney CC0 + Freesound CC0 as fallback. Audio must start inside a user gesture. [07]

## Where the scouts disagree (the team must pick)

| Question | Doc 02 (creature design) | Doc 04 (pipeline) | Doc 06 (world) |
|---|---|---|---|
| Creature medium for the hackathon | Flat vector 2D stickers (best small-size readability, cheapest recolours, most consistent AI output) | Parametric 3D base bodies on a shared rig; first walking creature takes 1–2 days | Rigged CC0 GLBs (Kenney Cube Pets 2.0) so a walking creature exists in an hour |
| Where AI generation belongs | Concept sheets and stickers | Concepts, palettes, decals; never geometry | Not on the critical path |

The resolution depends entirely on the time horizon: an 18-hour demo cannot afford doc 04's day-one sculpt, and a project meant to live past the weekend should not build on placeholder cubes it will throw away. This is the first grilling question.

## Verified 2026 tool facts that kill or rescue options

- **Dead:** Ready Player Me (shut 31 Jan 2026), Union Avatars, Luma Genie (Jan 2026). Theatre.js and howler.js are stale. [03, 07]
- **Mii route is an IP problem, not a licence nuisance:** FFL.js is AGPL and needs Nintendo's proprietary `FFLResHigh.dat`. Do not go there. [03]
- **Image→3D:** Rodin Gen-2/2.5 has clean quads but no rigging and API only on a $96–120/mo plan. Hunyuan3D 3.x is hosted-only with a 10-credit character/animal auto-rig. TRELLIS.2 is MIT but textured export depends on non-commercial nvdiffrast. **Tripo is the only API that rigs quadrupeds and birds** ($0.25 rig, $0.10/clip, `spec: mixamo` for bipeds). Meshy rigs quadrupeds for $0.05 but only gives a walk. UniRig weights still unreleased. [04]
- **Mixamo:** alive, free, humanoid only, no API, no redistribution of raw FBX. [03, 04]
- **Draco cannot compress morph targets;** use quantize + sparse + meshopt. [04]
- **Per-instance skinned instancing is WebGPU-only;** 50 skinned draw calls on WebGL is fine on a laptop. [06]
- **Rigify control layers do not export to glTF;** export DEF bones with baked actions or hand-build a 20–30 bone deform skeleton. [04]

## Recommended world (doc 06, unopposed)

Floating **island diorama themed as a tiny campus** (quad, library, one dorm-hut per course). Pitched orbit camera via drei `CameraControls` with clamped polar angle and dolly. Growth = props pop onto free lots. Nintendo itself moved Tomodachi Life from the apartment block to an explorable island in the 2026 Switch game. Tiny planet stays a stretch goal (same props re-projected with `lookAt(normal)`); apartment cross-section reads as a menu.

Look: `MeshToonMaterial` + 3-step `gradientMap` (NearestFilter), warm directional + hemisphere fill, `ContactShadows frames={1}`, pastel sky and fog, selective `Bloom` + `Vignette`, `Outline` only on hover.

## Skills and MCPs to add before the asset fleet runs (doc 05)

Local gaps: zero Three.js/R3F skills; Blender skills stop at lighting/rendering (no modelling, rigging, glTF export). Ranked installs: `cloudai-x/threejs-skills` (fundamentals, animation, loaders, shaders), `enzed/r3f-skills`, `gamedev-skills/awesome-gamedev-agent-skills` (game-feel, procedural-gen, audio-design, create-game-assets), `roble3/cc-blender-skill` (modeling, uv-texturing, export) + `arjun988/blender-skills@rigging`, `diivi/aseprite-mcp`, fal MCP + `fal-ai-community/skills@character-design`, ElevenLabs MCP, `emilkowalski/skills@review-animations`. No credible kawaii art-direction or chiptune skill exists anywhere; that knowledge should become a project-local skill written from docs 01–02.

## Asset shortlist, all CC0 (doc 03)

Kenney Cube Pets 2.0 (16–25 animated pets, GLB), KayKit Adventurers + Character Animations (161 clips on one `Rig_Medium`, 25+ bone-attached accessories), Gobkit Free Animal Pack (10 animals, shared skeleton), Kenney Nature Kit + Furniture Kit + Poly Haven HDRI, Quaternius Universal Base Characters + Modular Outfits + Universal Animation Library (6 bodies, 20 hairstyles, 62 outfit parts, 120+ clips).

## Open decisions for the grilling session

1. Time horizon: demo tomorrow only, or a product that outlives the weekend?
2. Creature medium: 2D stickers, CC0 GLBs, own parametric 3D bodies, or a staged path through them?
3. What a creature *is* in the fiction: one per concept (hundreds), one per course (a cast of 4–6), or one companion whose world grows?
4. What drives appearance: player choice, learning evidence, or both, and on which axes?
5. Humans in the cast: yes via KayKit/Quaternius, no, or later?
6. Art direction: soft matte toy 3D, flat vector sticker, clay?
7. Harness budget: paid APIs (Tripo, Scenario, ElevenLabs) and whether Blender runs on this Mac during the build.
8. Sound scope for the demo: blips + a few ZzFX presets, or full palette with music?
