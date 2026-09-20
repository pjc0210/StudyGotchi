# Character generation pipelines for StudyGotchi

Research date: 2026-09-19. Goal: pick an agent-driven pipeline that produces many style-consistent, customizable, animatable creatures for a Next.js + React Three Fiber world, with humans approving animation. All prices, licenses, and availability below were checked against live pages on the research date; where vendor pages conflict, both figures are given.

## Tool landscape (verified September 2026)

### Image → 3D generators

| Tool | Status / version | Access | Cost per model | Output license | Notes for cute stylized characters |
| --- | --- | --- | --- | --- | --- |
| Hyper3D Rodin | Gen-2 / Gen-2.5 live | Web; REST API only on Business plan ($96–120/mo) plus credits; also inside our Blender MCP | 0.5 credit base (Gen-2); ~$0.29/model reported for Gen-2.5; 30 s–4.5 min by tier | Commercial on paid tiers; "check account terms" | Quad mesh mode, T/A-pose option, up to 5 reference images, no rigging at all |
| Tencent Hunyuan3D | 2.1 open weights (Community License, excludes EU/UK/KR); 3.0/3.1/3.5 hosted only | Tencent Cloud intl API; 2.x in our Blender MCP | 25 credits Pro (~$0.38–0.50) or 15 credits Express; +10 for PBR; auto-rig 10 credits | Open 2.1: Tencent claims no rights in outputs. Hosted: Tencent Cloud terms | 3.0 API has `SubmitAutoRiggingJob` for "characters or animals" (T-pose FBX/OBJ) |
| Microsoft TRELLIS.2 | 4B model, Dec 2025 | Self-host (16–24 GB VRAM) or HF Space | GPU time only; ~3 s at 512³, ~60 s at 1536³ on H100 | MIT for model/code, but textured GLB export path depends on nvdiffrast (non-commercial NVIDIA license) | Best raw fidelity in 2026 benchmarks; dense irregular topology, not rig-ready |
| Tripo3D | v3.x, P1 latest; Turbo tiers | REST API, $0.01/credit | Image→3D 20–30 credits (H2/H3) or 40–50 (P1); quad +5; rig 25; retarget 10/animation | Paid users own outputs; no AI-training reuse | Rig model `v2.5-20260210` covers quadruped, hexapod, octopod, avian, serpentine, aquatic; `spec: "mixamo"` bone naming |
| Meshy | Meshy-6 / Meshy-7 | REST API on paid plans ($20/mo Pro, 1,000 credits) | Image→3D 20–35 credits; rig 5; animation 3 | Paid: private, full commercial. Free: CC BY 4.0 | Rigging: humanoid, quadruped, Smart Rig beta; quadrupeds currently get walk only; Mixamo bone names |
| Stability SF3D / SPAR3D | Available on Developer Platform | API ($0.01/credit) or self-host | Low; sub-second inference | Community License free under $1M revenue | Fast, lower fidelity; fine for blockouts |

Also checked: Luma Genie was sunset on 1 Jan 2026 (export only). Sloyd ($15/mo unlimited web generation; API public keys not yet enabled) and Kaedim (managed, $400/mo for 20 credits) are viable but poor fits for a hackathon iteration loop.

### Auto-rigging and animation

| Tool | Body plans | Mixamo-compatible skeleton? | Cost | Verdict |
| --- | --- | --- | --- | --- |
| Mixamo (Adobe) | Bipedal humanoids only; free with Adobe ID; web only, no API | Yes (it is the reference) | Free | Animation library source; cannot rig our animals |
| Tripo Auto Rig + Retarget | Biped (90+ presets) and non-humanoid creatures (16 universal presets) | Yes via `spec: "mixamo"` for bipeds; creature rigs use Tripo skeletons | $0.25 rig, $0.10/animation | Only API that rigs quadrupeds and birds today |
| Meshy Rigging + Animation | Humanoid, quadruped, Smart Rig beta | Yes (Mixamo naming) | $0.05 rig, $0.03/clip | Cheap; quadruped animation limited to walk; Smart Rig has no animation library yet |
| Anything World Animate Anything | Bipeds and many quadruped sub-categories | Own skeletons | ~5 credits ($0.20–0.42) per step | Web tool with manual rig tweak; category mismatch causes failures |
| Hunyuan3D auto-rigging (hosted) | "Characters or animals" | Not stated | 10 credits (~$0.15–0.20) | One concurrent job; T-pose input required |
| UniRig / SkinTokens (VAST + Tsinghua) | Any category; MIT | Skeleton tokens include Mixamo template type | Free, >8 GB GPU | Released checkpoint is Articulation-XL2.0 only; full Rig-XL weights still pending |
| Make-It-Animatable | Humanoids only; MIT | Yes (Mixamo-trained) | Free GPU | Sub-second, but no quadrupeds |
| Blender Rigify | Human, Basic Quadruped, Cat, Wolf, Horse, Shark metarigs | No, but DEF bones export cleanly | Free | Bendy/MCH bones do not export to glTF; bake deform bones only |
| Auto-Rig Pro (Blender) | Bipeds (Smart), custom | Remap presets for Mixamo | $50 one-time | Best in-Blender retargeter; bpy-scriptable |

Cascadeur (retargeting only on Pro, $396/yr) and RigNet (2020, superseded by UniRig) were checked and dropped. Mixamo's FAQ confirms its auto-rigger rejects animals, wings, tails, and extra appendages, and it has no API. The only way to have one animation library drive every creature is to put every creature on one skeleton family we own. Tripo and Meshy emit Mixamo bone names for bipeds, but their quadruped skeletons are proprietary and Meshy's quadruped library is a single walk cycle.

### Style-consistency tooling

Scenario (Flux 2, Z-Image, Qwen bases; 5–15 images; API), Layer.ai (Flux/Qwen LoRAs, 15–50 images) and Krea 2 LoRA training (beta, Max/Business plans) all offer style LoRAs in 2026 with the same advice: a small, consistent, captioned dataset beats a large mixed one, and outputs still need drift review. 3D AI Studio, Tripo's `generate_multiview_image`, and GPT Image 2 / Nano Banana Pro prompt guides all recommend generating a locked front/side/back orthographic turnaround from one approved reference and feeding all views to a multi-view image-to-3D endpoint.

## Runtime facts (three.js / Blender)

- Blender shape keys export as glTF morph targets on skinned meshes. Leave "Apply Modifiers" off (it drops shape keys; an Oct 2024 fix exempts Armature-only stacks), apply Mirror/Subdivision before creating shape keys, keep 4 influences per vertex.
- In three.js, `SkinnedMesh.morphTargetDictionary["ear_long"]` indexes `morphTargetInfluences`; set from JSON. Part swaps are `visible` flags on child meshes; palettes are `material.color` or a shader uniform reading a mask texture. GLTFLoader converts shape-key animations to clips automatically.
- VRM: `@pixiv/three-vrm` 3.5.x (July 2026) plus `vrm-mixamo-retarget` handles Mixamo FBX on humanoids only.
- Compression: Draco does not compress morph targets. Use `gltf-transform quantize`, `sparse`, `meshopt` (or `gltfpack -cc`), then Brotli; meshopt covers geometry, morph deltas, joints/weights, and animation.
- Crowd budget: each `SkinnedMesh` costs a mixer, bone upload, and draw call; a 2026 write-up measured ~13 ms JS per frame at 50 avatars before optimizing. Forum rule of thumb: under 100 draw calls and ~100k vertices. For 20–50 creatures: 1,500–4,000 triangles each, one material and atlas per body type, `SkeletonUtils.clone` for shared geometry, throttle far mixers, and adopt batched skinning (`InstancedBatchedSkinnedMesh` or WebGPU storage buffers) only if profiling demands it.

## Architecture comparison

| | A. Parametric (Mii-style) | B. AI image→3D→auto-rig | C. 2D sprite / billboard | D. Hybrid |
| --- | --- | --- | --- | --- |
| Time to first walking creature | 1–2 days (base mesh + Rigify quadruped + 3 clips) | 1–3 hours with Tripo (generate, rig, retarget walk/idle) | 2–4 hours with hatch-pet atlas + billboard shader | Same as A for the base, then hours per texture |
| Time per additional creature | Minutes: new JSON preset; hours if a new part mesh is needed | ~1.5 h of agent time and ~$0.60–1.00 in credits, plus a human pass | ~1 hour of image-gen plus QA; more if rows fail | Minutes (new texture/decals) |
| Consistency risk | Low: one style by construction | High: every mesh is a new roll; topology, proportions, and texture style drift; rigs differ per creature | Medium: image models drift across rows and directions; hatch-pet validation catches some | Low for shape, medium for AI textures |
| Runtime customization | Deep: morphs, parts, palettes, patterns, all live | Shallow: recolor only unless retopologized | Shallow: palette swaps via mask | Deep on shape, medium on surface |
| Animation cost | One clip set per body type, shared forever | Per creature: rig + N retargets, then QA; quadruped libraries are thin (Meshy: walk only) | 9 rows x 8 frames per creature, fixed camera angles | Same as A |
| Agent fit | High: bpy is deterministic and testable; human eyes only for silhouettes and walk cycles | Medium: API calls automate cleanly, but every result needs visual QA and rig failure rate is high on non-humanoids | High for generation, low for QA (grid inspection is tedious) | High |
| Browser cost | Lowest: shared geometry, few materials | Highest: unique dense meshes and textures per creature | Lowest GPU, but atlases are large | Low |

Notes on A: Wobbledogs (genes drive segmented bodies under a skinned mesh) and Spore are the precedents; players read variety from parameters, not unique sculpts. bpy can script the whole loop: import a base mesh, add shape keys by displacing vertex groups, generate parts with geometry nodes (`bpy.data.node_groups`), place a Rigify metarig, bind with automatic weights, export via `bpy.ops.export_scene.gltf`. Open examples (CLD2 limb generator, LAJFI superformula creatures, GNM head add-on) show agents already write this class of code. Main hazard: Rigify control layers do not export, so export DEF bones with baked actions or hand-build a 20–30 bone deform skeleton.

Notes on B: Rodin has the cleanest quad output in the Blender MCP but no rigging. Tripo is the only vendor with quadruped rigging behind an API, and its rigged GLB loads directly in three.js. Every result still needs remeshing to a 2–4k triangle budget, and each creature ships as unique geometry, so 50 on screen is the worst case for draw calls and memory.

Notes on C: hatch-pet already produces validated 8x11 atlases with 16 look directions, which maps onto a billboard with a direction-quantized frame picker. Fastest route to charm, but it locks the camera and blocks morph-style customization.

## Recommended harness: Parametric base + AI concept and surface pass (D, weighted toward A)

Ship 2–3 shared body types (quadruped, biped blob, bird-ish) with one deform skeleton each, expose ~12 morphs and ~8 swappable part slots per body, and let AI generate concepts, palettes, and decals rather than geometry. Use image-to-3D (Rodin via the Blender MCP, or Tripo) only as a sculpting reference or to propose new part meshes that a modeler agent retopologizes onto the shared rig.

### Pipeline and roles

1. Art director gate (human): approve a one-page style bible and a Scenario or Krea style LoRA trained on 10–15 images generated with GPT Image 2 or Nano Banana Pro. All later prompts reference it.
2. Concept artist agent (image model + LoRA): from a JSON creature brief, produce a front/side/back orthographic turnaround and a palette swatch. Tools: native image generation or Scenario API; optional Rodin multi-image preview for volume reference. Output: `concepts/<id>/turnaround.png`, `palette.json`.
3. Modeler agent (Blender MCP, bpy): load the base body, set morph values from the brief, select or generate part meshes with geometry nodes, bake a mask texture (base / pattern / accent channels), export GLB with shape keys and skinning, run `gltf-transform` quantize/sparse/meshopt, and produce viewport screenshots from four angles. When a brief needs a new part (horns, a fin), it can call Rodin or Tripo for a reference mesh and retopologize it to under 500 triangles.
4. Rig and animation agent (bpy): verify the part sits within the deform envelope, re-run automatic weights for new parts only, and render turntable and walk-cycle GIFs using the shared clip set (idle, walk, happy, sleep, eat, sad). Animation clips are authored once per body type by a human or imported from Tripo's 16 universal presets and retargeted with Auto-Rig Pro Remap.
5. QA reviewer agent (vision model): compare screenshots against the turnaround and the style bible, check triangle count, material count, morph-range sanity (no self-intersection at extremes), and glTF validation. Fails go back to step 3 with a diff note.
6. Human approval gate: review the QA sheet plus walk-cycle GIF; approve, request tweaks, or reject. Approved creatures get a `creature.json` committed alongside the shared GLB.
7. Runtime: React Three Fiber loads one GLB per body type, clones via `SkeletonUtils`, applies `creature.json` (morphs, parts, palette, pattern uniform), and shares one `AnimationMixer` clip set. New creatures are data, not assets.

### Why this over pure B

It gives a walking creature in a day, then scales to hundreds at near-zero marginal cost and near-zero consistency risk, fits the browser budget, and keeps the subagent fleet on deterministic, testable bpy work. Pure B is the right tool for a one-off hero prop, and it is a good fallback if the team cannot produce acceptable base meshes in the first day.

## Biggest risks

1. Base-mesh quality is the whole game: if the two or three hand-built bodies are not cute, nothing downstream fixes it. Budget the first day for a human to sculpt or curate them (Rodin image-to-3D of an approved concept, then manual retopology, is acceptable).
2. Rigify-to-glTF export pitfalls (bendy bones, MCH parents, "Reset Bones between actions") can silently distort walk cycles; validate every export in the actual R3F scene, not the Blender viewport.
3. Morph targets plus swappable parts multiply skinning edge cases (parts detaching at extreme sliders). Constrain slider ranges and have QA test the corners of the parameter space.

## Sources

- Hyper3D Rodin Gen-2 API spec: https://docs.hyper3d.ai/en/api-specification/rodin-gen2
- Hyper3D pricing: https://hyper3d.ai/pricing
- Hyper3D character use case (T/A pose, no rigging): https://hyper3d.ai/use-cases/character-design
- Meshy vs Rodin comparison (Rodin has no rigging, API on Business plan): https://www.meshy.ai/compare/meshy-vs-rodin
- Hunyuan3D-2.1 repo and license: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 and https://huggingface.co/tencent/Hunyuan3D-2.1/blob/main/LICENSE
- Tencent HY 3D Global billing (3.0/3.1 credits, auto rigging 10 credits): https://intl.cloud.tencent.com/document/product/1284/75281
- Tencent SubmitAutoRiggingJob: https://intl.cloud.tencent.com/document/product/1284/79641
- Hunyuan3D-Omni (pose control, not rigging): https://github.com/Tencent-Hunyuan/Hunyuan3D-Omni
- TRELLIS.2 repo and license notes: https://github.com/microsoft/trellis.2 ; nvdiffrast license issue: https://github.com/microsoft/TRELLIS.2/issues/22
- TRELLIS.2 production review (topology not rig-ready): https://trify3d.com/blog/trellis-2-vfx-production-review
- Tripo API pricing: https://developers.tripo3d.ai/en/pricing and https://platform.tripo3d.ai/docs/billing
- Tripo Auto Rig (creature rig types, mixamo spec): https://developers.tripo3d.ai/en/docs/animations-rig
- Tripo Animation presets: https://developers.tripo3d.ai/en/models/animation
- Tripo commercial use: https://www.tripo3d.ai/help/privacy-policy/can-i-use-models-commercially
- Meshy API pricing: https://docs.meshy.ai/en/api/pricing ; rigging API: https://docs.meshy.ai/en/api/rigging
- Meshy quadruped rigging and walk-only limitation: https://help.meshy.ai/en/articles/16231707-how-to-create-3d-animation-with-auto-rigging
- Meshy commercial rights: https://help.meshy.ai/en/articles/16102098-can-i-use-meshy-assets-commercially
- Stability SPAR3D license: https://huggingface.co/stabilityai/stable-point-aware-3d ; API pricing: https://platform.stability.ai/pricing
- Luma Genie sunset: https://apps.apple.com/de/app/luma-3d-capture/id1615849914
- Sloyd pricing and API: https://www.sloyd.ai/pricing , https://www.sloyd.ai/api/pricing , https://api-dashboard.sloyd.ai/documentation/
- Kaedim plans: https://www.kaedim3d.com/plans
- Mixamo FAQ (humanoid only): https://helpx.adobe.com/si/creative-cloud/faq/mixamo-faq.html
- Anything World Animate Anything docs: https://anything-world.gitbook.io/anything-world/quickstart/animate-anything-quickstart/faq
- UniRig repo (release status, SkinTokens successor): https://github.com/VAST-AI-Research/UniRig ; paper: https://arxiv.org/html/2504.12451
- Make-It-Animatable: https://github.com/jasongzy/Make-It-Animatable
- Auto-Rig Pro pricing and Remap: https://blendermarket.com/products/auto-rig-pro/faq , https://lucky3d.fr/auto-rig-pro/doc/remap_doc.html
- Cascadeur plans: https://cascadeur.com/plans
- Rigify metarigs: https://docs.blender.org/manual/nb/4.5/addons/rigging/rigify/basics.html ; Rigify glTF export issue: https://github.com/KhronosGroup/glTF-Blender-IO/issues/2141
- Blender glTF exporter manual (shape keys, skinning): https://docs.blender.org/manual/en/5.0/addons/import_export/scene_gltf2.html ; Armature-only apply fix: https://github.com/KhronosGroup/glTF-Blender-IO/pull/2324
- Blender-to-three.js export guide: https://github.com/funwithtriangles/blender-to-threejs-export-guide
- Meshopt vs Draco for morph targets: https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression , https://github.com/KhronosGroup/glTF/issues/1984
- three.js crowd performance: https://discourse.threejs.org/t/instancing-fbx-models/24494 , https://app.cinevva.com/blog/2026-05-08-open-world-browser-part-23-avatars-and-voice , https://gist.github.com/yelouafi/b8bebaba47d2557b53b5930b7bb289ba
- three-vrm and Mixamo retargeting: https://pixiv.github.io/three-vrm/docs/documents/migration-guide-1.0.html , https://github.com/saori-eth/vrm-mixamo-retargeter/
- Scripting geometry nodes with bpy: https://blog.cg-wire.com/blender-scripting-geometry-nodes-2/
- Procedural creature examples: https://github.com/Exaii2/blender-creature-limb-drawer , https://github.com/Jinkieyz/lajfi , https://github.com/derQwertzus/GNM-Head-Add-on-for-Blender
- Wobbledogs devlog and interview: https://forums.tigsource.com/index.php?topic=53994.0 , https://www.gamedeveloper.com/design/behind-the-ai-and-physics-of-i-wobbledogs-i-procedurally-goofy-wobbledogs
- Scenario style training: https://help.scenario.com/articles/8374017641-train-a-style-model ; Layer.ai LoRA: https://help.layer.ai/en/articles/14094114-how-to-train-a-custom-model-lora ; Krea 2 LoRA: https://www.krea.ai/blog/krea-2-lora-training
- Character turnaround generation: https://docs.3daistudio.com/image-studio/character-sheet , https://nanoprompts.org/gpt-image-2/prompt-handbook/character
- 2D skeletal AI pipelines: https://github.com/GenielabsOpenSource/spine-animation-ai , https://dl.acm.org/doi/10.1145/3746059.3747707 , https://github.com/ODU33104/rive-mcp
