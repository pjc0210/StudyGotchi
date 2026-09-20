# StudyGotchi Asset Superfactory: fleet charter

Date: 2026-09-19. Producer: the coordinating agent in Cursor. The producer never
hand-makes assets; it routes work, enforces territories, reviews contact sheets, and
runs the human gate with Philote. Repo memory is the shared state: every worker writes
its outputs and a README/ledger into its own territory, and nothing else.

## Aesthetic contract (all workers)

Toybox Low-Poly. Chunky faceted low-poly geometry (facets are a feature), blob bodies
with dot eyes, big heads (1:1 to 2:1 head:body), stubby limbs, one exaggerated
identifying feature per object, 2–3 flat colours plus one accent, no outlines in 3D,
soft 3-step toon shading at runtime, readable at 48 px. References: Pokémon Rumble toys,
Ditto, low-poly kiwi and mouse, Kirby world-select pedestals, Penguin Isle, isometric
landmark icons. Full research in `docs/research/game-art/`, briefs in
`docs/plans/claude-design-briefs.md`.

Palette (ground / accent): forest #8fc48a / #4f8a4a; city #d9c3d6 / #b98bb0;
ice #e6f2fb / #a9cfe8; sand #efd9a2 / #d2a95e; meadow #bfe0a0 / #8fbf6a;
ocean #9fd3e0 / #4f8fb0; volcanic #c9a08f / #8a4a3f. Sky #f3e4ee. Ink #3a2f45.
Creature accents: peach #f2a86f, coral #e88a8a, mint #8fc9d8, olive #b9c96f, lilac #c9a2e6.

## Technical contract (all GLB outputs)

glTF 2.0 binary, +Y up, +Z is the front/face, base or feet on y = 0, origin at the
base centre, metres. Flat `baseColorFactor` materials (roughness ~0.6), no textures
unless the README declares them and ships them beside the file, no glTF extensions,
no Draco. Triangle budgets: creature < 1500; landmark stage 1 < 400, stage 2 < 900,
stage 3 < 1600; prop < 300. Animation clips are named `idle`, `walk`, `happy`, `sad`,
`sleep` when present. Every GLB passes `tools/qa/check_glb.py` before it is "done".

Blender: `/Applications/Blender.app/Contents/MacOS/Blender -b --python <script> -- <args>`
(5.2 LTS, headless only; the GUI session is Philote's). Contact sheets via
`tools/creature-factory/render_gallery.py` or the same EEVEE setup. No PIL in Blender;
use numpy + `bpy.data.images` for tiling.

## Provenance rule

Any downloaded or generated-from-service asset gets its ledger row (source URL, licence,
licence URL, date, file) written BEFORE the download starts, so a dead worker still
leaves provenance. CC0 and CC-BY only; CC-BY attribution text goes in the ledger.
Generated assets record their generator, seed, and parameters in a manifest.

## Territories (disjoint file ownership)

| Role | Owns | Reads |
|---|---|---|
| Creature Artisan | `tools/creature-factory/generate_creatures.py`, `assets/creatures/generated/` | research docs, references |
| Animator | `tools/creature-factory/animate_creatures.py`, `assets/creatures/animated/` | `assets/creatures/generated/*.glb` (read-only snapshot) |
| Landmark Artisan | `tools/landmark-factory/`, `assets/landmarks/` | briefs (Brief 4), research 06 |
| Sound Artisan | `tools/sound-factory/`, `assets/audio/` | research 07 |
| QA Inspector | `tools/qa/`, `assets/QA.md` | every `assets/**` GLB |
| Asset Scout | `assets/creatures/cc0/`, `assets/props/cc0/` + ledgers | web |
| World Engineer | `prototypes/world-lab/` (later `frontend/app/world`, `frontend/components/world`) | assets, integration spec |
| Art Director (reviewer) | `.fleet/reviews/` | contact sheets, references |
| Auditor | `.fleet/audit/` | ledgers, manifests, QA report |

Nobody touches `frontend/` or `backend/` (teammates' territory) without the producer
routing it, and nobody commits. Territories can be re-assigned only by the producer.

## Loop

1. Wave 1 (parallel): Creature Artisan v2, Animator, Landmark Artisan, Sound Artisan,
   QA Inspector build tools + first outputs + contact/motion/audio sheets.
2. Gate: producer reads sheets, runs QA, shows Philote; Philote picks by id.
3. Wave 2: Art Director reviews sheets against references and writes scored notes with
   concrete parameter changes; artisans iterate on the notes (one iteration = one seed
   family, never a redraw of everything); Auditor checks ledgers and conventions.
4. Integration: World Engineer loads approved ids into the prototype, then into the
   Next.js world once `origin/main` conventions are agreed.
5. Repeat 2–4 until the roster (6–10 creatures, 5 biomes × 3 landmark stages, 25
   sounds) is approved, then freeze and hand off.

Known failure mode from earlier fleets: scouts dying on connection errors without
ledgers. Hence the provenance rule above. Second known failure: a worker "finishing" by
producing text instead of files; every task here names its output paths and a
regenerate command, and the QA Inspector checks that the files exist.

## Model tiers (recommendation for when this fleet is run by hand)

Oversight, art direction, reviews: the strongest reasoning model available. Artisans
and engineers: a strong coding model. Scouts: a fast model with web access. One-line
fixes: the fastest cheap model. Reviewers should run on a different model than the
artisan they review. Inside this Cursor session, workers inherit the parent model
unless Philote asks otherwise.
