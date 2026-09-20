# 03 — Asset and Rig Ledger

Scouted 2026-09-19 for StudyGotchi (Next.js + React Three Fiber). Licenses were read on the linked source pages on that date; anything not verifiable is marked as such. "Shared rig" means one animation set can drive every character in the pack without retargeting.

## 1. Low-poly cute character packs (3D, rigged/animated)

| Name | URL | License | Format | Rigged | Animations | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Kenney Cube Pets 2.0 | https://kenney.nl/assets/cube-pets | CC0 | FBX, OBJ, GLB | Yes | Walk, run and more (16 pets; v2.0 "added animals & animations") | Released 2026. Closest thing to a Tamagotchi look in this list. Shared rig not confirmed; check bone names after download. |
| Kenney Blocky Characters 2.0 | https://kenney.nl/assets/blocky-characters | CC0 | FBX, OBJ, GLB + 18 PNG skins | Yes, new rig | 27 clips | One model, 18 texture skins, so texture swap is free customization. Remade June 2025. |
| Kenney Animated Characters 1/2/3 (+ Protagonists, Survivors, Retro) | https://kenney.nl/assets/category:3D | CC0 | FBX (glTF for some) | Yes | Idle, Jump (pose), Running only | Thin animation set; FBX-only packs are awkward in three.js. Prefer Blocky or KayKit. |
| KayKit Adventurers (free tier) | https://kaylousberg.itch.io/kaykit-adventurers | CC0 | FBX, glTF | Yes (`Rig_Medium`) | ~75 clips embedded: Idle, Walking_A/B/C, Running_A/B, Jump_*, Sit_*, Cheer, Wave, Interact, PickUp, Throw, Hit_*, Death | 5 characters + 25 accessories. Shared rig across all "new style" KayKit characters. ~1k tris each, one 1024 gradient atlas. |
| KayKit Character Animations | https://kaylousberg.itch.io/kaykit-character-animations | CC0 | FBX, glTF | n/a | 161 humanoid clips (general, movement, melee, ranged, emotes, tools) | Split per `Rig_Medium` / `Rig_Large`. Drives every KayKit character. |
| KayKit Mystery Monthly Series 4–6 | https://kaylousberg.itch.io/kaykit-character-pack-mystery-monthly-series-5 | CC0 | FBX, glTF, .blend | Yes, same rig | Same as Adventurers | $19.99 per series of 14 chars (Plant Warrior, Toy Soldier, Avian Swordsman, Farmers…). Only paid item worth considering. |
| Quaternius Ultimate Animated Animal Pack | https://quaternius.com/packs/ultimateanimatedanimals.html | CC0 (stated "free for personal and commercial"; CC0 on OGA/itch mirrors) | FBX, OBJ, glTF, .blend | Yes | 12+ per animal (Idle, Walk, Run, Jump, Attack, Death, Gallop, Kick…) | 12 animals. Per-species rigs; not shared. |
| Quaternius LowPoly Animated Animals / Farm Animals | https://quaternius.itch.io/lowpoly-animated-animals | CC0 | FBX, OBJ, .blend (glTF on poly.pizza) | Yes | Idle, Walk, Run, Jump, Death | 6–7 animals (pug, cow, sheep…). Used in the official three.js fundamentals tutorial. |
| Quaternius Ultimate Animated Character Pack | https://quaternius.com/packs/ultimatedanimatedcharacter.html | CC0 | FBX, OBJ, .blend (no glTF) | Yes | Idle, Run, Shoot_OneHanded, SwordSlash, etc. per character | 52 chunky humanoids. FBX needs Blender → GLB conversion. |
| Quaternius Universal Animation Library 1 & 2 | https://quaternius.itch.io/universal-animation-library | CC0 | FBX, GLB, .blend | n/a | 120+ / 130+ clips; 8-dir locomotion, sit, emotes, root-motion variants | Universal humanoid rig; "compatible with Mixamo". Pairs with Universal Base Characters. v2.0 June 2026. |
| Gobkit Free Animal Pack | https://gobkit.itch.io/gobkit-free-animal-pack | CC0 | GLB | Yes, shared skeleton | idle / attack / dead / walk baked into one 24 fps track (subclip frames 0-29/30-59/60-89/90-119) | 10 animals (Corgi, Duck, Red Panda, Platypus, Bat…). Unlit atlas, three.js snippet in README. Published Aug 2026. |
| Cozy Animals 3D (Gamideo) | https://dragofive.itch.io/cozy-animals-3d | CC0 | GLB | Yes (Meshy auto-rig, bones `Bone_001…`) | idle, walk, gesture, swimIdle, swim, fly | 18 animals. Meshy-AI generated meshes; procedurally baked clips. Flag as AI-generated if that matters for judging. |
| Poly Pizza | https://poly.pizza | CC0 or CC-BY per model | GLB, FBX | Varies | Varies | Aggregates Quaternius/Kenney/KayKit/Google Poly. Check `Licence` on each model; CC-BY needs credit line. Has a search API. |
| Sketchfab (downloadable, CC filter) | e.g. https://sketchfab.com/3d-models/cute-human-creature-game-character-animated-54ddf463f3014e1d89fca79923e8583c | CC-BY 4.0 (this model) | glTF/GLB auto-converted | Yes | idle, walk, run, attack, jump, death | 4.5k tris. Also "Mushroom NPC" (CC-BY, 316 tris). Per-model licenses; always read the License field. |
| Mixamo | https://www.mixamo.com | Adobe terms: free, embed-only, no raw file redistribution, no ML training | FBX | Auto-rig (humanoid only) | Thousands | Cannot rig animals/quadrupeds. Convert FBX → GLB in Blender. |
| Synty POLYGON Kids | https://syntystore.com/products/polygon-kids-pack | Paid EULA, perpetual, 5 seats | FBX, Unity/Unreal | Yes (Mecanim) | None included | $149.99. Not recommended for a weekend. |

## 2. Modular / parametric avatar systems

| Name | URL | License | Format | Rigged | Animations | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Ready Player Me | https://readyplayer.me | Discontinued | GLB | — | — | Netflix acquired RPM (Dec 2025); creator, iframe, API and hosted avatars shut down 31 Jan 2026. Do not plan on it. |
| VRM + `@pixiv/three-vrm` 3.5.5 | https://github.com/pixiv/three-vrm | MIT (library) | .vrm (glTF) | Yes, humanoid | Retarget from VRMA/Mixamo | 18 preset blend-shape expressions (happy, angry, blink, aa/ih/ou…), spring bones, MToon toon shader. WebGPU-compatible. Anime look, humans only. |
| VRoid Studio | https://vroid.com/en/studio/guidelines | Preset meshes usable commercially; sample models vary (Sendagaya Shino is CC0; AvatarSample A–Z is a custom permissive license) | .vrm 0.0/1.0 | Yes | — | Free desktop creator with runtime part swap not exposed; export per variant. Building a VRoid-style generator app needs a pixiv license. |
| Avaturn | https://docs.avaturn.me/docs/integration/web/threejs/ | Free for non-commercial via developer program; Pro $800/mo | GLB, FBX | Yes, ARKit blendshapes | Retarget | Iframe SDK returns a GLB to three.js. Realistic humans, not cute. |
| Union Avatars | https://unionavatars.com | Unverifiable | GLB, VRM | — | — | Site returned HTTP 500 on 2026-09-19; third-party reports say services are offline. Skip. |
| FFL.js (Mii renderer) | https://github.com/ariankordi/FFL.js | AGPL-3.0 (code) | three.js meshes | Yes (head only) | Expressions | Requires Nintendo's `FFLResHigh.dat`/`AFLResHigh_2_3.dat` resource file, which is proprietary and obtained from a Wii U or Miitomo dump. Legal problem, not just license friction. |
| Quaternius Universal Base Characters + Modular Character Outfits | https://quaternius.itch.io/universal-base-characters · https://quaternius.itch.io/modular-character-outfits-fantasy | CC0 | FBX, glTF, .blend (source) | Yes, humanoid | Universal Animation Library | 6 bodies, 20 hairstyles, 62 outfit parts on the same skeleton: true runtime part swap by toggling meshes. ~13k tris avg. |
| KayKit accessories | https://kaylousberg.itch.io/kaykit-adventurers | CC0 | glTF | Attach to hand/head bones | Shared clips | 25+ weapons/props; swap via bone parenting. Alt texture sets in EXTRA tier. |
| Kenney Blocky Characters | see §1 | CC0 | GLB + PNG | Yes | 27 clips | Customize by swapping the skin texture; trivial to implement. |
| Mixamo auto-rig | see §1 | Adobe terms | FBX | Humanoid only | Yes | Use when you sculpt your own biped. |

Morph targets: only VRM guarantees blend shapes; Kenney/KayKit/Quaternius packs are bone-only, so emotion must be shown with textures, props, or bone poses.

## 3. 2D sprite systems

| Name | URL | License | Format | Rigged | Animations | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Universal LPC Spritesheet Generator | https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator | Code GPL-3.0; art per-asset CC-BY-SA 3.0 and/or GPL 3.0 (some OGA-BY/CC0) | PNG sheets | Layered parts | Walk, cast, thrust, slash, shoot, hurt (+ more) | Full part swap and palette variants. Must ship `CREDITS.csv` rows for every layer used; CC-BY-SA is copyleft on derivatives. Human-only bases. |
| Kenney Animal Pack Remastered | https://kenney.nl/assets/animal-pack-remastered | CC0 | PNG (240 files) | No | Static | Flat cute animals for UI/icons. |
| MintoSoft Monsters Pack / Cute Slime Monsters | https://mintotsukino.itch.io/mintosoftmonsterspack · https://eddex.itch.io/cute-2d-slime-monsters | CC-BY / CC-BY 4.0 | PNG | No | Static | 101 pixel creatures / 24 slimes. |
| LPC Cute Monster / Animated Rat and Bat | https://lpc.opengameart.org/content/cute-monster-sprite-sheet · https://lpc.opengameart.org/content/animated-rat-and-bat | CC-BY 3.0 | PNG | No | idle, jump / idle, walk, attack, death | Small but animated. |
| Rive | https://rive.app/pricing | Runtimes MIT; editor Free tier cannot export .riv for runtime, Cadet $9/mo can | .riv | Yes, state machines | Author in editor | `@rive-app/react-canvas` 4.29.5. Great for a 2D pet face, but someone needs a paid seat to export. |
| Spine | https://esotericsoftware.com/spine-editor-license | Runtimes require a paid Spine Editor license at integration time | JSON/skel | Yes | Author in editor | Skip unless someone already owns Spine. |
| DragonBones | https://github.com/dragonbones/dragonbonesjs | MIT (runtime; `pixi-dragonbones-runtime` 8.x) | JSON | Yes | Author in editor | Editor is legacy; team recommends LoongBones. |
| Lottie | https://github.com/airbnb/lottie-web · https://github.com/LottieFiles/dotlottie-web | MIT | JSON/.lottie | Vector layers | Author in After Effects | Animation files carry their own licenses. |

## 4. three.js / R3F animation tooling (versions checked 2026-09-19)

| Name | URL | License | Version | Notes |
| --- | --- | --- | --- | --- |
| three.js | https://github.com/mrdoob/three.js/releases | MIT | r186 (`three@0.186.0`, 8 Sep 2026) | Includes `GLTFLoader`, `AnimationMixer`, `SkeletonUtils`. |
| `SkeletonUtils.retargetClip` | https://threejs.org/docs/pages/module-SkeletonUtils.html | MIT | in r186 | Options: `hip`, `names` or `getBoneName`, `scale`, `hipInfluence`, `preserveHipPosition`, `localOffsets`, `useFirstFramePosition`, `trim`. Official example retargets Mixamo → other rigs; apply the mixer to the SkinnedMesh, not an ancestor. |
| `@react-three/fiber` | https://r3f.docs.pmnd.rs | MIT | v9 (React 19) | v10 is alpha. |
| `@react-three/drei` | https://www.npmjs.com/package/@react-three/drei | MIT | 10.7.8 (Aug 2026); 11.0.0-alpha.6 targets three 0.185 + R3F 10 | `useGLTF`, `useAnimations` (returns `actions`, `mixer`, `names`), `Clone` for instancing one GLB many times, `KeyboardControls`. |
| `ecctrl` | https://github.com/pmndrs/ecctrl | MIT | 2.0.1 (17 Aug 2026) | Physics character controller on `@react-three/rapier` ≥2.2; needs React ≥19.2, three ≥0.184, R3F ≥9.4. Has animation-state controller and touch joystick. Overkill for NPC wandering; fine for a player-driven pet. |
| `@pixiv/three-vrm` | see §2 | MIT | 3.5.5 (Jul 2026) | Needs three ≥ r167 for the WebGPU MToon material. |
| Theatre.js | https://github.com/theatre-js/theatre | core Apache-2.0, studio AGPL-3.0 | 0.7.2 (May 2024) | Effectively unmaintained; development moved private. Use only if you want a keyframe editor for cutscenes. |

## 5. Props and environment (matching cute low-poly style)

| Name | URL | License | Format | Notes |
| --- | --- | --- | --- | --- |
| Kenney Nature Kit | https://kenney.nl/assets/nature-kit | CC0 | FBX, OBJ, GLB | Trees, rocks, paths, fences; same flat-shaded look as Cube Pets. |
| Kenney Furniture Kit | https://kenney.nl/assets/furniture-kit | CC0 | FBX, OBJ, GLB | Desks, beds, lamps for a "study room" scene. |
| Kenney City Kit (Suburban / Roads / Commercial / Industrial), Mini Forest, Mini Dungeon | https://kenney.nl/assets/category:3D | CC0 | FBX, OBJ, GLB | Modular tiles; Mini kits are the cutest scale. |
| KayKit Forest Nature Pack (free tier) | https://kaylousberg.itch.io/kaykit-forest | CC0 | FBX, glTF, OBJ | 100+ models; single gradient atlas matches KayKit characters. |
| KayKit Dungeon Pack / City Builder Bits / Furniture Bits | https://kaylousberg.itch.io/kaykit-dungeon-remastered · https://kaylousberg.itch.io/city-builder-bits | CC0 | FBX, glTF, OBJ | 200+ dungeon pieces; 32+ city pieces. |
| Quaternius Stylized Nature MegaKit | https://quaternius.itch.io/stylized-nature-megakit | CC0 | FBX, OBJ, glTF | 116 Ghibli-ish trees/plants/rocks; swappable leaf textures. |
| Poly Haven HDRIs | https://polyhaven.com/license | CC0 | .hdr/.exr | Use with drei `<Environment files=…>`; 1k or 2k is enough for lighting. |

## Recommended shortlist (download first)

1. **Kenney Cube Pets 2.0** (CC0, GLB) — the creature roster. 16 animated pets in one coherent style, zero conversion work.
2. **KayKit Adventurers + KayKit Character Animations** (CC0, glTF) — humans/NPCs with 161 clips on one shared `Rig_Medium`, so one `useAnimations` state machine drives every character; accessories attach to bones for customization.
3. **Gobkit Free Animal Pack** (CC0, GLB) — 10 extra animals on a shared skeleton with idle/walk already baked; corgi and red panda fill gaps in Cube Pets.
4. **Kenney Nature Kit + Furniture Kit + Poly Haven HDRI** (CC0) — dress the world and light it in an hour.
5. **Quaternius Universal Base Characters + Modular Outfits + Universal Animation Library** (CC0) — only if the demo needs a "make your own human" screen; 62 parts on one humanoid rig gives real runtime part swapping.

Fallback for a 2D pet face or HUD companion: Kenney 2D packs (CC0). Avoid LPC unless someone is willing to ship the credits file and accept CC-BY-SA.

## Licensing risks

- **Mii / FFL.js**: the renderer is AGPL-3.0 (viral on a web app) and it cannot work without Nintendo's proprietary Mii resource file extracted from console/Miitomo dumps. Also trademark exposure. Do not use, do not imitate the Mii look closely.
- **Mixamo**: free and fine for embedding in the game, but you may not redistribute the FBX/animation files (including committing them to a public repo as-is) and may not use them for ML training. Humanoid-only, so useless for the animals.
- **Ready Player Me / Union Avatars**: gone. Any tutorial recommending them is stale.
- **Rive**: runtimes are MIT, but exporting a `.riv` that runs in your app requires at least the $9/mo Cadet editor seat; the free tier is for learning only.
- **Spine**: runtime use legally requires a paid editor license at integration time.
- **LPC sprites**: CC-BY-SA 3.0 / GPL 3.0 on the art means derivative sprite sheets must be shared alike and every contributing artist credited (the generator's `CREDITS.csv`).
- **Poly Pizza / Sketchfab**: mixed CC0 and CC-BY per model. Keep a `CREDITS.md` and copy each CC-BY attribution line at download time.
- **AI-generated packs** (Cozy Animals 3D via Meshy): CC0 as declared, but copyright in AI output is unsettled and some hackathons require disclosure.
- **Quaternius older packs**: quaternius.com only says "free for personal and commercial"; the CC0 declaration lives on the OGA/itch/Patreon mirrors. Cite those if asked.
