# 05 — Agent Skills and MCP Servers for Game Art and Game Dev

Scouting report for equipping coding agents (Cursor / Claude Code / Codex) on StudyGotchi (Next.js + React Three Fiber, cute Tamagotchi/Tomodachi-Life creatures). Data gathered 2026-09-19 from the [skills.sh](https://skills.sh/) leaderboard, `npx skills find <query>` CLI searches, and GitHub. Install counts are skills.sh numbers; stars/pushed dates are GitHub. Nothing was installed.

Trust scale: **official** (vendor or Anthropic/Vercel/OpenAI), **well-known** (>500 stars or >5K installs, active), **unknown** (small, single-author, or stale).

## 1. What is already installed locally

Skill roots scanned: `~/.cursor/skills`, `~/.claude/skills`, `~/.codex/skills`, `~/.agents/skills`.

| Area | Installed skills | Coverage |
|---|---|---|
| Blender (bpy) | `blender-animation`, `blender-cameras`, `blender-lighting`, `blender-materials`, `blender-pro-workflow`, `blender-rendering` (in `~/.agents/skills`) | Look-dev, lighting, camera, keyframe animation. **No modeling, rigging, UV, or glTF export skill.** |
| Video / motion | `hyperframes-*` (7 skills), `media-use`, `produce` | Video composition, GSAP-style motion rules, BGM/SFX sourcing for HyperFrames only |
| UI design | `frontend-design`, `dev-gallery` | Web UI aesthetics; not game or character art |
| Pets / sprites | `hatch-pet` (Codex only) | 8x11 spritesheet workflow, 9 animation rows, 16 look directions. Close cousin to what StudyGotchi needs, but Codex-pet-specific |
| Process / other | `tdd`, `grill-me`, `to-prd`, `to-issues`, `postmortem`, `find-skills`, `swiftui-pro`, `wandb-*`, `academic-paper`, `nessie` | Engineering hygiene; unrelated to game art |

**Gaps:** no Three.js / R3F skill at all; no game-feel/juice, procedural-gen, or game-audio skill; no pixel-art or sprite-sheet skill usable from Cursor/Claude; no character-design or kawaii art-direction skill; no Blender modeling/rigging/export skill; no GDD skill. The Blender set is half a pipeline (light/shoot/render) with the front half (model/rig/export) missing.

## 2. Skills found via skills.sh and `npx skills find`

### Three.js / React Three Fiber

| Skill | Source | Installs / stars | What it adds | Trust |
|---|---|---|---|---|
| `threejs-fundamentals`, `-animation`, `-shaders`, `-materials`, `-loaders`, `-lighting`, `-postprocessing`, `-interaction` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | 8.5K–14.9K each; 3,340 stars; pushed 2026-07 | The dominant Three.js reference set: scene setup, GLTF loading, skinned-mesh animation mixer, GLSL shaders, post-fx | well-known |
| `r3f-fundamentals`, `-animation`, `-interaction`, `-physics`, `-loaders`, `-shaders`, `-postprocessing` | [EnzeD/r3f-skills](https://github.com/EnzeD/r3f-skills) | 1.3K–2.7K each; 116 stars; pushed 2026-08 | R3F-specific: Canvas, typed JSX, hooks, drei, rapier physics, resource ownership | well-known (installs), small repo |
| `r3f-best-practices` | [emalorenzo/three-agent-skills](https://github.com/emalorenzo/three-agent-skills) | 1.2K; 51 stars; pushed 2026-01 | Poimandres ecosystem idioms, perf review | unknown |
| `threejs-game-director` (+ `-gameplay-systems`, `-game-ui-designer`, `-3d-generator`, `-debug-profiler`, `-qa-release`) | [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | 2.0K–2.5K each; 2,093 stars | Router for building/finishing browser games; optional AI 3D/image/audio asset gen | well-known |
| `threejs-procedural-*` (vfx, creatures, vegetation) | [scottstts/Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills) | ~50 each; 812 stars | Advanced procedural graphics, TSL/WebGPU | well-known repo, low installs |
| `develop-web-game` | [openai/skills](https://github.com/openai/skills) | 1.1K; 27K stars | Codex dev/test loop for HTML/JS games (Playwright screenshots) | official (OpenAI) |

### Game feel, design, procedural, audio

| Skill | Source | Installs / stars | What it adds | Trust |
|---|---|---|---|---|
| `game-feel` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | 4.4K; 1,058 stars; 73 skills | Juice: screen shake, hit-stop, squash & stretch, eased tweens, layered feedback | well-known |
| `procedural-gen` | same | 3.2K | Seeded RNG, Perlin/Simplex, grid/room generation | well-known |
| `audio-design` | same | 3.3K | Bus/mixer architecture, ducking, adaptive layered music, SFX variation | well-known |
| `create-game-assets` | same | 2.3K | Style bibles, sprite/tileset/UI art planning, normalize + validate pipeline | well-known |
| `game-ui-ux`, `camera-systems`, `shader-programming`, `router` | same | 3.0K–4.4K | Engine-agnostic systems knowledge | well-known |
| `game-designer` | [dylantarre/animation-principles](https://github.com/dylantarre/animation-principles) | 894; 84 stars; pushed 2025-12 | Disney 12 principles applied to game feel | unknown (stale) |
| `game-design-document` | [ityes22/game-design-document](https://github.com/ityes22/game-design-document) | 975; 7 stars | 40–80 page GDD as .docx/.pdf | unknown |
| `game-design-core`, `game-ui-design`, `game-audio` | [omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity) | 199–3.2K; 153 stars; pushed 2026-01 | Game-design and audio theory | unknown (stale) |
| `rfxgen` | [akillness/jeo-skills](https://skills.sh/akillness/jeo-skills/rfxgen) | 52 | Retro SFX (coin, jump, hit) via raysan5/rfxgen; the only real chiptune-SFX skill found | unknown |
| `music` | [elevenlabs/skills](https://github.com/elevenlabs/skills) | 7.1K; 454 stars; pushed 2026-09 | ElevenLabs music generation | official (ElevenLabs) |

No credible **chiptune composition** skill exists (`chiptune-composer` 5 installs, `famistudio-compose` 1). rfxgen + ElevenLabs music are the practical substitutes.

### Pixel art, sprites, 2D animation

| Skill | Source | Installs / stars | What it adds | Trust |
|---|---|---|---|---|
| `pixel-art-sprites` | [omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity) | 2.2K | Pixel-art theory, sprite animation, limited palettes | unknown |
| `pixel-art-studio` | [Gamezxz/pixel-art-studio](https://github.com/Gamezxz/pixel-art-studio) | 14 installs; 54 stars; pushed 2026-07 | Pillow drawing engine: frames x layers, hue-shifted ramps, dithering, spritesheet + Aseprite JSON export, self-critique loop | unknown but well-built |
| `spritecook-generate-sprites`, `-animate-assets`, `-workflow-essentials` | [SpriteCook/skills](https://github.com/SpriteCook/skills) | 800–960; 36 stars; pushed 2026-08 | AI pixel-art generation via SpriteCook service (paid) | unknown, vendor-tied |
| `godot-asset-generator` | [jwynia/agent-skills](https://github.com/jwynia/agent-skills) | 976; 159 stars | AI image gen (DALL-E/Replicate/fal) -> game-ready sprites; Godot-flavored but pipeline is portable | unknown |
| `review-animations`, `animation-vocabulary`, `improve-animations` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | 125K–167K; 38.8K stars | UI motion critique and vocabulary (easing, duration, choreography) | well-known |

### Blender, 3D modeling, rigging

| Skill | Source | Installs / stars | What it adds | Trust |
|---|---|---|---|---|
| `blender-modeling`, `blender-uv-texturing`, `blender-export`, `reference-to-3d`, `text-to-blender` | [RobLe3/cc-blender-skill](https://github.com/RobLe3/cc-blender-skill) | 450–960 each; 63 stars; pushed 2026-05 | Fills the missing front half of the local Blender set; validated on Blender 5.x via Blender MCP | unknown (small but validated) |
| `rigging`, `procedural-modeling`, `pixel-art-style`, `blender-modeler` | [arjun988/blender-skills](https://github.com/arjun988/blender-skills) | 96–161 each; 203 stars; pushed 2026-07 | 94 specialist skills; `rigging` covers armatures, IK/FK, weight painting, facial rigs, drivers | unknown |
| `blender-mcp` | [vladmdgolam/agent-skills](https://github.com/vladmdgolam/agent-skills) | 1.9K; 8 stars; pushed 2026-09 | Companion for the Blender MCP: scene inspection, GLTF export, material/animation extraction | unknown |
| `blender-web-pipeline` | [freshtechbro/claudedesignskills](https://github.com/freshtechbro/claudedesignskills) | 2.7K; 915 stars; pushed 2025-11 | Blender -> glTF -> Three.js hand-off | well-known (stale) |
| 12 bpy skills + Cursor `.mdc` rules | [TMHSDigital/Blender-Developer-Tools](https://github.com/TMHSDigital/Blender-Developer-Tools) | 12 stars; pushed 2026-09 | Blender 5.1 API correctness: bmesh, slotted actions, anti-pattern rules | unknown |

### Character design and kawaii art direction

| Skill | Source | Installs / stars | What it adds | Trust |
|---|---|---|---|---|
| `character-design` | [fal-ai-community/skills](https://github.com/fal-ai-community/skills) | 326; 243 stars | Reference sheets, expression sheets, outfit variants with consistent identity via fal genmedia | well-known (fal community) |
| `character-design` | [omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity) | 336 | Readability at every scale, silhouette, emotional resonance (theory only) | unknown |

"Kawaii" and "concept art" queries returned nothing substantive (top hits were unrelated slide tools). This is a genuine gap; docs `01`/`02` will need to carry the art-direction knowledge, ideally packaged as a project skill.

Godot/Phaser hits (`gamedev-skills@godot-*`, `thedivergentai/GD-Agentic-Skills` 731 stars, `phaserjs/phaser@*` official, `pixijs/pixijs-skills` official) are reference-only unless a 2D minigame layer is added.

## 3. Curated GitHub collections

| Repo | Stars | Pushed | Notes |
|---|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) | 177K | 2026-09 | Official; `frontend-design` already installed. No game-art skills. |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 31K | 2026-08 | React/Next best practices; no 3D or game content. |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 75K | 2026-09 | Curated index; game section points at gamedev-skills and threejs-game-skills. |
| [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) | 25K | 2026-05 | 49 agents + 72 skills; heavy, Unity/Unreal-leaning. Cherry-pick `design-review`. |
| [ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp) | 29K | 2026-09 | Already configured locally (`user-blender`); includes Poly Haven, Sketchfab, Hyper3D, Hunyuan3D tools. |

## 4. MCP servers for visual research and asset creation

| Need | Server | Stars / status | Exposes |
|---|---|---|---|
| Pinterest | [Martin-Code202/pinterest-mcp](https://github.com/Martin-Code202/pinterest-mcp) | 0 stars; pushed 2026-07 | `pinterest_search` (image/gif/video), `get_pin`, `board_pins`, `related_pins`, `download`; no auth |
| Dribbble/Behance/Pinterest | [YonasValentin/design-inspiration-mcp-server](https://github.com/YonasValentin/design-inspiration-mcp-server) | 15 stars; 2026-03 | `design_search_images/references/styles` via Serper API (key required), `design_extract_tokens` |
| ArtStation | none found | — | Only scrapers exist; use web search or Pinterest instead |
| Figma | [Official remote](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) `https://mcp.figma.com/mcp` | official, actively maintained | Read layouts, write to canvas; Cursor: `/add-plugin figma` |
| Aseprite | [diivi/aseprite-mcp](https://github.com/diivi/aseprite-mcp) | 573 stars; 2026-07 | 104 tools: drawing, layers, animation, palettes, dithering, onion-skin renders, frame diff, sheet export, raw Lua |
| Aseprite (headless alt) | [MalloyTheDev/aseprite-mcp](https://github.com/MalloyTheDev/aseprite-mcp) | 10 stars; 2026-09 | 108 tools via `aseprite -b`; per-tag sheets, Godot SpriteFrames export |
| Godot / Unity | [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp) (5.7K), [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp) (14.3K) | active | Editor bridges. Not our stack |
| Rive | [Official editor MCP](https://rive.app/docs/editor/ai/mcp) `http://127.0.0.1:9791/mcp`; [ODU33104/rive-mcp](https://github.com/ODU33104/rive-mcp) | official (Early Access app) / 13 stars, 2026-09 | Official: state machines, view models. rive-mcp: build/edit/render `.riv` without the editor, motion presets |
| Sketchfab | [AliRezaBeigy/sketchfab-mcp-server](https://github.com/AliRezaBeigy/sketchfab-mcp-server) | 2 stars; 2026-06 | Search, details, download glTF/GLB/USDZ (API token). **Already covered** by local `user-blender` MCP's Sketchfab tools |
| Poly Haven | [RN0000/polyhaven-mcp](https://github.com/RN0000/polyhaven-mcp) | 0 stars; 2026-07 | Search HDRIs/textures/models, file URLs. **Already covered** by `user-blender` MCP; note Poly Haven API is non-commercial without licence |
| Image gen (fal) | [Official hosted](https://fal.ai/docs/documentation/setting-up/mcp) `https://mcp.fal.ai/mcp` | official (launched 2026-03) | `search_models`, `run_model`, `submit_job`, `upload_file`, `recommend_model`; 1,000+ image/video/3D/audio models |
| Image gen (Replicate) | [Official hosted](https://replicate.com/docs/reference/mcp) `https://mcp.replicate.com/sse` or `npx -y replicate-mcp` | official | Full Replicate HTTP API |
| Voice / SFX / music | [elevenlabs/elevenlabs-mcp](https://github.com/elevenlabs/elevenlabs-mcp) | 1,539 stars; 2026-08 | TTS, sound effects, music, voice design | official |
| SFX library | [Shiv33ndu/freesound-mcp-server](https://github.com/Shiv33ndu/freesound-mcp-server) | 0 stars; stale 2025-11 | `search_sounds` with previews, licence metadata (Freesound API key) |

## 5. Recommended installs, ranked by value

Commands use the skills CLI; `-g` installs globally for all agents, `-y` skips prompts. Nothing below has been run.

1. **Three.js core** (well-known, 3.3K stars): `npx skills add cloudai-x/threejs-skills@threejs-fundamentals -g -y` plus `@threejs-animation`, `@threejs-loaders`, `@threejs-materials`, `@threejs-shaders`. Biggest gap; zero local coverage of the render stack.
2. **R3F layer** (well-known installs, small repo): `npx skills add enzed/r3f-skills@r3f-fundamentals -g -y` plus `@r3f-animation`, `@r3f-interaction`, `@r3f-loaders`, `@r3f-physics`. Read SKILL.md before trusting; 116 stars.
3. **Game feel + systems** (well-known): `npx skills add gamedev-skills/awesome-gamedev-agent-skills@game-feel -g -y` plus `@procedural-gen`, `@audio-design`, `@create-game-assets`, `@game-ui-ux`.
4. **Blender front half** (unknown, validated on Blender 5.x): `npx skills add roble3/cc-blender-skill@blender-modeling -g -y` plus `@blender-uv-texturing`, `@blender-export`; and `npx skills add arjun988/blender-skills@rigging -g -y`. Completes the model -> rig -> light -> render -> glTF chain with the already-installed `blender-*` set.
5. **Aseprite MCP** (well-known, 573 stars): [diivi/aseprite-mcp](https://github.com/diivi/aseprite-mcp) for sprite sheets, idle/blink/eat cycles, palette-locked pixel art with visual feedback. Requires Aseprite installed.
6. **fal MCP** (official, hosted): add `https://mcp.fal.ai/mcp` with a `FAL_KEY`; pair with `npx skills add fal-ai-community/skills@character-design -g -y` for consistent reference/expression sheets.
7. **ElevenLabs** (official): [elevenlabs-mcp](https://github.com/elevenlabs/elevenlabs-mcp) + `npx skills add elevenlabs/skills@music -g -y` for creature vocalizations and jingles; `npx skills add akillness/jeo-skills@rfxgen -g -y` (unknown, 52 installs) for retro SFX.
8. **Motion critique** (well-known, 38.8K stars): `npx skills add emilkowalski/skills@review-animations -g -y` plus `@animation-vocabulary` for UI-side juice review.
9. **Game director + GDD** (optional): `npx skills add majidmanzarpour/threejs-game-skills@threejs-game-director -g -y`; `npx skills add ityes22/game-design-document@game-design-document -g -y` (unknown, 7 stars, review first).
10. **Visual research MCP** (unknown, 0–15 stars, review source first): Martin-Code202/pinterest-mcp for Tomodachi/Tamagotchi reference boards; design-inspiration-mcp-server needs a Serper key.

Skip: Poly Haven and Sketchfab MCPs (already exposed by the local Blender MCP), Godot/Unity MCPs (wrong stack), runcomfy bundles (vendor-locked), stale `omer-metin/skills-for-antigravity` unless its theory skills are copied into a project-local skill.

**Biggest unfilled gap after installs:** kawaii/creature art direction and chiptune composition have no credible skills. Plan to author a project-local `studygotchi-art-direction` skill from docs 01–02 and use ElevenLabs/rfxgen for audio.

## Sources

- skills.sh leaderboard: https://skills.sh/
- CLI: `npx -y skills find <query>` (24 queries, 2026-09-19)
- GitHub repos linked inline; stars/pushed dates via `gh api repos/<owner>/<repo>`
- fal MCP: https://fal.ai/docs/documentation/setting-up/mcp
- Replicate MCP: https://replicate.com/docs/reference/mcp
- Figma MCP: https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/
- Rive MCP: https://rive.app/docs/editor/ai/mcp
- Blender MCP: https://github.com/ahujasid/blender-mcp
