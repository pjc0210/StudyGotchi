# World Visualization: Shape, Look, Creatures, Life, Budget

Research scout notes for StudyGotchi (Next.js + React Three Fiber). Question: what shape should the one-world-per-student be, how do we get the Tomodachi Life / Animal Crossing softness in a browser, and how do we show 20-50 creatures without melting a laptop, all inside an 18-hour build. Tags: **[S]** = sourced fact (see Sources), **[I]** = inference/judgement. Versions checked against npm on 2026-09-19.

## 0. TL;DR recommendation

Build a **single floating island diorama** (roughly 30x30 world units, one hero hill, a beach rim), viewed from a **pitched-down orbit camera with hard limits** (`CameraControls`, polar angle clamped to ~25-60 degrees, azimuth free, dolly 12-35 units). Creatures are **rigged low-poly GLBs** (Kenney Cube Pets, CC0, already animated) driven by `useAnimations`, wandering on a flat navmesh-free plane with yuka `WanderBehavior`. Look: `MeshToonMaterial` + 3-step gradient map, one warm directional light + hemisphere fill, `ContactShadows`, `Sky`-gradient background, light `Bloom` + `Vignette`. Growth = new props/buildings pop onto the island with a spring scale-in. Visitors get the same scene, read-only, with the same camera. **[I]**

## 1. World shapes

| Shape | Reference games | Camera / navigation | Creatures visible at once | How growth shows | Visitor exploration | R3F difficulty (18h) |
|---|---|---|---|---|---|---|
| **Tiny planet (sphere)** | Super Mario Galaxy, Grow Home, Messenger (Abeto) and its open-source clone `Glowin/messager` **[S]** | Orbit around sphere centre; or third-person on-surface walking with `up = surfaceNormal` every frame **[S]** | Only the facing hemisphere (~40-50%); the rest is hidden | Props snap to surface normals; planet radius can grow | Spin the globe; delightful but half the world is always behind | **Medium-hard.** Placement math (quaternion from normal), wander on a sphere (yuka is XZ-only **[S]**), shadows on curved ground, pole lock-ups. Charming, but eats hours **[I]** |
| **Island diorama (flat, floating)** | Tomodachi Life: Living the Dream (island grid, houses anywhere, up to 70 Miis) **[S]**; AC Pocket Camp; Tiny Glade; Townscaper; Gourdlets | Orbit/tilt with clamped polar angle; optional click-to-focus on a building (`CameraControls.fitToBox`) **[S]** | All of them; the whole world fits in one frame | New buildings/trees/paths appear on free lots; island rim can expand as tiles | Rotate + zoom; everything is one screen away | **Easy.** Flat XZ plane = trivial wander, `ContactShadows`, grid placement. Best value **[I]** |
| **Apartment cross-section** | Tomodachi Life (DS/3DS apartment block, windows as UI) **[S]**; Tiny Tower; Fallout Shelter | Fixed front-on orthographic camera, vertical scroll | Everyone, one per window, but tiny | New floors stack upward; very legible "leveling up" | Scroll floors, tap a window to zoom into a room | **Easy** (mostly 2D layout) but looks like a menu, not a world; weakest 3D payoff **[I]** |
| **Room-by-room** | Tamagotchi, Neko Atsume, Unpacking | Fixed shoebox stage per room, cut between rooms | 1-6 per room | New furniture/rooms unlock | Page through rooms | **Easy**, intimate, but hides the "many creatures" hook and the "look at my whole world" screenshot **[I]** |
| **Grid campus** | Minami Lane (street), Dorfromantik (hex tiles), Two Point Campus | Isometric-ish orbit or fixed 45 degree | All | New tiles/buildings on a grid, one per course | Pan across tiles | **Easy-medium**; a campus is a good *theme* for the island diorama rather than a distinct shape **[I]** |

Notes:
- Nintendo itself moved Tomodachi Life from the apartment block to an explorable island in 2026, explicitly because more processing power allowed Miis to roam **[S]**. Island is the modern reference.
- Tiny Glade's appeal is a snug patch of land plus a great camera/photo mode **[S]**; Townscaper is "a few clicks, gorgeous results" **[S]**. Both argue for a small, dense, screenshot-able diorama over a big map.
- Recommendation: **island diorama, themed as a tiny campus** (a quad, a library, dorm-huts per course). Keep "tiny planet" as a stretch goal: if the flat island is done by hour 10, the same props can be re-projected onto a sphere with `Object3D.lookAt(normal)`.

## 2. The "Nintendo cozy look" in three.js

Rendering recipe (all WebGL, R3F v9 stable, no WebGPU needed):

- **Stack:** `three` 0.186.0 (r186), `@react-three/fiber` 9.7.0, `@react-three/drei` 10.7.8, `@react-three/postprocessing` 3.1.1 (peer `postprocessing` ^6.36, we get 6.39.5), `three-custom-shader-material` 6.4.0, `@react-spring/three` 10.1.2, `maath` 0.10.8, `yuka` 0.7.8, `next` 16.3.5 **[S]** (npm view). Peer deps line up: drei 10 wants fiber ^9 and three >=0.159; postprocessing wrapper wants fiber >=9.7.0 **[S]**.
- **Do not** use fiber v10 alpha / drei v11 alpha for a hackathon. They exist (10.0.0-alpha.5, 11.0.0-alpha.7, both Sept 2026) and bring WebGPU + TSL hooks, but drei 11 requires fiber 10 and is ESM-only, and APIs are still moving (`state.gl` became `state.renderer`) **[S]**.
- **Toon shading:** `MeshToonMaterial` with a `gradientMap` `DataTexture` (3-5 grey steps, `RedFormat`, `minFilter = magFilter = NearestFilter`, `colorSpace = NoColorSpace`) **[S]**. Pastel base colours, one `directionalLight` (warm, intensity ~2) + `hemisphereLight` (sky pastel blue / ground pastel pink) for fill. This is the exact recipe in `Glowin/messager` (toon + outline, all primitives) **[S]**.
- **Outlines (optional):** three's `OutlineEffect` addon does inverted-hull outlines; call `effect.render(scene, camera)` instead of `renderer.render` **[S]**. Simpler: skip ink outlines (2026 Tomodachi has none; it separates shapes with flat colour + rim light) and use `<Outline selection={[ref]}>` from `@react-three/postprocessing` only on the hovered creature **[S]**.
- **Custom cel shader:** `three-custom-shader-material` injects GLSL into `MeshStandardMaterial`/`MeshToonMaterial`; Faraz Shaikh's "Toon Shader" demo replicates Blender's Color Ramp **[S]**. Only if MeshToon banding looks wrong.
- **Soft shadows:** `<ContactShadows frames={1}>` for static props; `<AccumulativeShadows temporal>` + `<RandomizedLight>` for baked-looking ground AO at zero cost after accumulation **[S]**; `<SoftShadows>` (PCSS) if real shadow maps are wanted **[S]**. For moving creatures use a blob quad with a radial `alphaMap` **[I]**.
- **Sky & fog:** drei `<Sky>` or an inverted gradient sphere; `scene.fog` in the horizon pastel hides the island edge **[I]**.
- **Post:** `<EffectComposer><Bloom luminanceThreshold={1} mipmapBlur intensity={0.4}/><Vignette offset={0.2} darkness={0.5}/></EffectComposer>`; bloom is selective by lifting emissive above 1 with `toneMapped={false}` **[S]**. `<N8AO quality="performance" halfRes>` only if budget allows **[S]**.
- **Geometry:** rounded low-poly (`RoundedBox`, bevelled exports), `flatShading` terrain, vertex colours over textures. `hellokaton/cozy-isle` builds an AC-style island from flat-shaded primitives with no asset files **[S]**.
- **Camera:** drei `<CameraControls makeDefault minDistance maxDistance minPolarAngle maxPolarAngle>` (camera-controls v3) with `fitToBox`/`setLookAt` for click-to-focus **[S]**.
- **Examples to crib from:** Wawa Sensei "Coastal World Aesthetics" (starter + final code) and the "Cute Café", "Medieval Town", "Particles" lessons **[S]**; `IamSebastianDev/Calm-before-the-Grow` (React Jam island, R3F + zustand) **[S]**; `rknm-cell/peters-world` (floating-island editor) **[S]**; `Plattnericus/HUB` (Next.js static export, Draco+WebP island, GPU-tier 2D fallback) **[S]**.

## 3. Creature presentation

| Option | Charm | Cost | R3F notes |
|---|---|---|---|
| **(a) Rigged GLB, skeletal anim** | Highest; reads as a "real" pet, turns in 3D, casts shadows | ~1 draw call per creature per material; skinning on CPU-side bone matrices, fine to ~50 on a laptop **[I]** | `useGLTF` + `useAnimations`; `SkeletonUtils.clone` per instance; stagger `action.time` so they don't sync. Kenney **Cube Pets 2.0** (CC0, 16+9 animals, walk/run/idle, glTF) **[S]** and Quaternius animated animals (CC0 glTF) **[S]** are drop-in. |
| **(b) 2D sprite billboards (Paper Mario / HD-2D)** | High, hand-drawn feel; needs 4-8 facing angles or accepts always-facing | Cheapest: 1 quad each, one atlas | drei `<SpriteAnimator textureImageURL numberOfFrames fps loop asSprite>` or `useSpriteLoader` sharing one sheet across many sprites **[S]**; `alphaTest` avoids sorting bugs. Art cost is the bottleneck: we have no 2D animator on the team. |
| **(c) 2.5D sprite + drop shadow** | Same as (b) plus grounding | Same as (b) + one blob quad | Same; the blob shadow trick from section 2. |

Recommendation: **(a)** with CC0 animated packs. It is the only option where "hatch, evolve, grow" can be shown by swapping/scaling models and where clicking a creature can trigger a jump/spin animation for free. Fall back to (c) only for a "swarm" of tiny background critters (butterflies, birds) via `<Instances>` **[I]**.

## 4. Ambient life on the cheap

- **Wander:** yuka `Vehicle` + `WanderBehavior(radius, distance, jitter)` gives an XZ random walk; sync via `setRenderComponent` with `matrixAutoUpdate=false` **[S]**; `ArriveBehavior` sends a creature home when clicked. Even simpler: new random point every 3-6 s, `maath/easing.damp3`, blend idle/walk by speed **[I]**.
- **Idle:** drei `<Float>` for eggs/icons; a sine bob in `useFrame` for creatures.
- **Speech bubbles / status:** drei `<Html transform sprite distanceFactor occlude="raycast">` for HTML bubbles **[S]**; Tomodachi-style colour-coded icons beat text (see `01-tomodachi-life-design-language.md`); `<Billboard>` + texture for zero-DOM icons when there are many.
- **Reactions:** `onClick` -> play "jump" clip once, `<Sparkles>` for 1 s, spring-scale via `@react-spring/three` **[I]**.
- **Day/night:** interpolate light colour/intensity, hemisphere colours and fog by local time; window emissive > 1 at night so bloom lights them **[I]**.
- **Weather:** `<Sparkles>` (fireflies), `<Cloud>`, or an `<Instances>` field for petals/snow (Wawa's snow lesson) **[S]**.
- **Physics:** not needed; `@react-three/rapier` 2.2.0 exists but costs tuning time **[I]**.

## 5. Performance budget (20-50 creatures, laptop Chrome)

- Target < 300 draw calls, < 500k tris, 60 fps at dpr 1-1.5. Cube Pets are a few hundred tris each; the risk is **draw calls and DOM**, not geometry **[I]**.
- Static props: drei `<Instances>` per prop type; `InstancedMesh` for one geometry, `BatchedMesh` for many **[S]**.
- Skinned meshes: each animated creature is its own `SkinnedMesh` in WebGL; per-instance-pose instancing (`InstancedSkinnedMesh`) is **WebGPU-only** as of r185 **[S]**. 50 skinned draw calls is fine.
- Assets: `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp` or `npx gltfjsx model.glb --transform` (gltfjsx 6.5.3, gltf-transform CLI 4.5.0); `useGLTF` enables Draco + Meshopt by default **[S]**.
- R3F knobs: `<Canvas dpr={[1, 1.5]} performance={{min: 0.5}}>`, `performance.regress()` from `CameraControls` `onControl`, `<AdaptiveDpr>`, `<PerformanceMonitor>` to drop post on weak GPUs **[S]**. `frameloop="demand"` does not fit because creatures move every frame.
- `<Html>` bubbles: cap at ~5 visible; each is a DOM node and blending-occlusion has z-order limits **[S]**.
- WebGPU: `WebGPURenderer` (r186) falls back to WebGL2 and Safari 26 / Firefox 141+ support it, but three still labels it experimental and `@react-three/postprocessing` / CSM are WebGL-only **[S]**. Stay on `WebGLRenderer`.

## 6. Visual references

1. https://sketchfab.com/3d-models/low-poly-stylized-game-environment-cozy-island-cb7b6ab5df354730a9159852280fb002 - 2.8k-vertex cozy island, 1k texture; proof a whole island fits in a mobile budget.
2. https://sketchfab.com/3d-models/tiny-stylized-planet-fantasy-3d-world-8b86542721424085ab1f6090a1d5606b - dense tiny planet; shows how props read on a sphere (and how much is hidden).
3. https://sketchfab.com/3d-models/little-planet-bc7f80a6b3fe412688513c473c53171a - 6.8k-tri low-poly planet; the minimal version of the sphere idea.
4. https://sketchfab.com/3d-models/desert-tiny-world-a444b3c27d5b4574bc98bb229bccd26f - 3.4k-tri floating platform diorama, the "one hero prop per tile" density we want.
5. https://fabianokunst.artstation.com/projects/aYbabq - Little Low Poly City; pastel rooftops, flat shading, rounded blocks.
6. https://www.behance.net/gallery/219420039/Dreamy-Streets-3D-Scene - pastel storybook town, soft lighting; palette target.
7. https://www.behance.net/gallery/249485459/Tiny-Street-Stories-3D-Visualization - sunset neighbourhood with a cat on a flower bed; the "creature watching the world" mood.
8. https://www.blendkit.com/asset-gallery-detail/e855c232-d4af-4c55-9a90-5e88da951b91/ - floating island with glowing cabin windows; night-mode/bloom reference.
9. https://dribbble.com/shots/3365009--Tutorial-3d-Isometric-Game-Tiles-Low-Poly-style-Blender - low-poly isometric tiles with a published pastel palette (#9CD6E5, #ACCD6C, #E3F5F1).
10. https://store.steampowered.com/app/2013730/Gourdlets/ - island town for cute residents, day/night, idle-window mode; closest gameplay cousin.
11. https://store.steampowered.com/app/2678990/Minami_Lane/ - single street diorama, cats and tanukis wandering; "campus lane" alternative.
12. https://www.rockpapershotgun.com/tiny-glade-review - Tiny Glade screenshots; camera pitch, muted greens, soft shadows.
13. https://kenney.nl/assets/cube-pets - the creature pack itself; cubic pets, walk/run animations, CC0.
14. https://wawasensei.dev/tuto/coastal-world-aesthetics-react-three-fiber - live R3F demo of gradient-textured low-poly coast; achievable-in-browser reference.
15. https://calm-before-the-bloom.vercel.app - playable R3F island tile game (10-day jam); scope reality check.

## 7. Three candidate art directions

**A. "Pastel Campus Isle" (recommended).** One floating island shaped like a rounded quad with a central fountain, a library, and one dorm-hut per enrolled course; creatures are Cube Pets recoloured per course. Flat-shaded terrain in mint/sand/lilac, warm 3-step toon lighting, no ink outlines, soft contact shadows, pastel sky gradient and horizon fog, faint bloom on windows at night. Growth: each completed unit plants a tree or adds a floor to that course's hut with a spring pop; hatching is an egg `<Float>`ing then cracking into a pet. Tech: `MeshToonMaterial` + `gradientMap`, `CameraControls` (polar 0.45-1.05 rad, dolly 12-35), `ContactShadows frames={1}` for props + blob quads under pets, `Instances` for trees, `useAnimations` per pet, yuka wander, `Bloom` + `Vignette`. **Risk: low.**

**B. "Storybook Tiny Planet".** A 6-unit-radius icosphere with continents of flat-shaded grass and a sea band; buildings and pets stand on surface normals; camera orbits the centre with `minPolarAngle/maxPolarAngle` free so you can spin it like a snow globe. Same toon palette as A but with a starry gradient backdrop and the planet casting a soft rim glow. Growth: the planet literally gains radius per level (re-place props with `lookAt(normal)`), new continents fade in. Tech: same materials; custom placement helper `placeOnSphere(pos, normal)`; wander implemented as slerp between random surface points (yuka is XZ-only); `AccumulativeShadows` is unusable on a sphere so rely on vertex AO baked in Blender or none. **Risk: medium** (placement math, half the world hidden, more testing).

**C. "HD-2D Paper Campus".** A flat island built from simple 3D blocks, but every creature and sign is a hand-drawn sprite on a billboard with a blob shadow (Octopath / Paper Mario). Slightly desaturated colours, `DepthOfField` tilt-shift, film grain, warm vignette. Growth: new 2D signboards and sprite props. Tech: drei `SpriteAnimator`/`useSpriteLoader` sharing atlases, `<Billboard>`, `alphaTest` sprites, `DepthOfField` + `Noise` + `Vignette` from `@react-three/postprocessing`. Cheapest to render, but it needs frame-by-frame sprite art for every creature stage (walk + idle x N species), which the team does not have; AI-generated sheets are inconsistent between frames. **Risk: medium on art, low on code.**

## Sources

- three.js r185 release notes: https://github.com/mrdoob/three.js/releases/tag/r185 ; npm `three` 0.186.0 (`npm view three version`, 2026-09-19)
- R3F v10 alpha announcement: https://github.com/pmndrs/react-three-fiber/releases/tag/v10.0.0-alpha.1 ; npm dist-tags (latest 9.7.0, alpha 10.0.0-alpha.5)
- drei v10 -> v11 migration: https://github.com/pmndrs/drei/blob/v11-working/devDocs/MIGRATION_V10_TO_V11.md ; drei releases https://github.com/pmndrs/drei/releases
- react-postprocessing: https://react-postprocessing.docs.pmnd.rs/introduction , /effects/outline , /effects/bloom , /effects/n8ao
- MeshToonMaterial docs: https://threejs.org/docs/pages/MeshToonMaterial.html ; OutlineEffect: https://threejs.org/docs/pages/OutlineEffect.html ; toon example https://threejs.org/examples/webgl_materials_toon.html
- WebGPU toon path (MeshToonNodeMaterial + toonOutlinePass): https://threejs.org/docs/pages/ToonOutlinePassNode.html ; WebGPURenderer manual https://threejs.org/manual/en/webgpurenderer
- Instanced skinning (WebGPU only): https://github.com/mrdoob/three.js/pull/33644 ; InstancedMesh vs BatchedMesh https://discourse.threejs.org/t/how-to-choose-between-instancedmesh-and-batchedmesh/81221 ; BatchedMesh from GPU instances https://github.com/mrdoob/three.js/pull/31944
- drei docs: ContactShadows https://drei.docs.pmnd.rs/staging/contact-shadows ; AccumulativeShadows https://drei.docs.pmnd.rs/staging/accumulative-shadows ; RandomizedLight https://drei.docs.pmnd.rs/staging/randomized-light ; SpriteAnimator https://drei.docs.pmnd.rs/misc/sprite-animator ; useSpriteLoader https://drei.docs.pmnd.rs/loaders/use-sprite-loader ; CameraControls https://drei.docs.pmnd.rs/controls/camera-controls ; Html https://drei.docs.pmnd.rs/misc/html ; useGLTF https://drei.docs.pmnd.rs/loaders/gltf-use-gltf
- camera-controls v3 API: https://yomotsu.github.io/camera-controls/classes/CameraControls
- R3F scaling performance: https://r3f.docs.pmnd.rs/advanced/scaling-performance
- yuka: https://mugen87.github.io/yuka/ ; WanderBehavior https://mugen87.github.io/yuka/docs/WanderBehavior.html
- three-custom-shader-material: https://github.com/farazzshaikh/three-customshadermaterial ; Faraz demos https://farazzshaikh.com/demos/
- glTF Transform: https://gltf-transform.dev/ ; gltfjsx https://github.com/pmndrs/gltfjsx
- Tomodachi Life: Living the Dream (island, 70 Miis, houses anywhere): https://tomodachi.fandom.com/wiki/Tomodachi_Life:_Living_the_Dream ; layout planner https://tomodachilife.moonmistvalley.com/en/tomolayout/
- Tiny Glade review: https://www.rockpapershotgun.com/tiny-glade-review ; Townscaper/Tiny Glade/Summerhouse trend: https://www.polygon.com/impressions/452276/tiny-glade-summerhouse-scene-building-games-trend-cozy/
- Open-source cozy R3F/three scenes: https://github.com/Glowin/messager ; https://github.com/iamsebastiandev/calm-before-the-grow ; https://github.com/rknm-cell/peters-world ; https://github.com/Plattnericus/HUB ; https://github.com/hellokaton/cozy-isle
- Wawa Sensei: https://wawasensei.dev/tuto/coastal-world-aesthetics-react-three-fiber ; https://wawasensei.dev/courses/react-three-fiber/lessons/particles ; https://wawasensei.dev/projects
- Assets: Kenney Cube Pets https://kenney.nl/assets/cube-pets (v2.0, 2026-03-26, CC0) ; Quaternius animals https://quaternius.com/packs/ultimateanimatedanimals.html ; https://poly.pizza/bundle/Farm-Animal-Pack-1kUvRTPLzT
- Cozy game references: https://store.steampowered.com/app/2013730/Gourdlets/ ; https://store.steampowered.com/app/2678990/Minami_Lane/
