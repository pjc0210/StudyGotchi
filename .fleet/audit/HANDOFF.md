# StudyGotchi assets: handoff orientation (2026-09-19)

One page for the three teammates. Details: `.fleet/org.md` (charter and contracts),
`.fleet/audit/2026-09-19-audit.md` (findings), `assets/QA.md` (gate report),
`.fleet/reviews/2026-09-19-art-direction-review.md` (art notes and hero picks).

## What exists where

| Path | What | Count | Owner tool |
|---|---|---|---|
| `assets/creatures/generated/` | static Toybox Low-Poly creatures, 6 archetypes × 16 biome families, flat colours, +Z front, feet on y=0 | 222 GLB, `manifest.json` v2.3, contact sheets, `renders/` | `tools/creature-factory/generate_creatures.py` |
| `assets/creatures/animated/` | the same 222 with clips `idle` 2.0 s, `walk` 0.8 s, `happy` 1.2 s (once), `sad` 1.5 s, `sleep` 3.0 s; nodes `Root` (static, move this) / `Body` / `Eyes` | 222 GLB, `manifest.json` (`animation_version` 4), `motion/` strips | `tools/creature-factory/animate_creatures.py` |
| `assets/landmarks/<family>/` | per-family landmark stages s1/s2(b,c)/s3, ruin, scaffold, `props/`, `terrain/`, `shared/` pedestals, hero g0–g3 | 278 GLB, `manifest.json` v4 | `tools/landmark-factory/generate_landmarks.py` |
| `assets/growth/<family>/` | growth heroes g0–g3 (0.4→4.5 m), construction states, `catastrophe/` kit | 72 GLB, `manifest.json` v1 | `tools/growth-factory/generate_growth.py` |
| `assets/biomes/catalog.json` | single source of truth for the 16 families (7 shipped: forest, city, ice, sand, meadow, ocean, volcanic; 9 planned), palettes, terrain kinds | schema + `validate_catalog.py` | edit by hand, run `--fix` |
| `assets/audio/sfx/`, `voices/` | 29 ZzFX sound effects; 5 creature "voices" (29 letter blips each + demo sentences) | 179 WAV, two manifests | `tools/sound-factory/` |
| `assets/audio/music/` | audition library, **not wired**, 34 CC0/CC-BY tracks (+1 CC-BY-SA, see audit 1.6), `CREDITS.md` has the attribution text | 152 MB | manual, `catalog.json` |
| `assets/creatures/cc0/` | third-party CC0 reference creatures (Gobkit, Kenney, Quaternius) with `LEDGER.md`; fail the GLB gate by design (textures), never ship as heroes | 52 GLB | Asset Scout |
| `assets/creatures/tripo/`, `tripo-cleaned/` | Tripo AI-generated set, see IP position below | 1 panel + 96 GLB | `tripo_intake.py`; cleaned set built off-repo |
| `assets/creatures/original/souls/` | 4 first-party "soul ball" characters | 4 GLB | `make_soul_balls.py` |
| `assets/QA.md`, `tools/qa/out/` | gate report and raw JSON | | `tools/qa/run_all.sh` |
| `prototypes/world-lab/` | the world prototype (Vite + React Three Fiber) | | World Engineer |
| `docs/research/`, `docs/plans/` | art research, design briefs, `2026-09-19-world-integration-spec.md` | | |

Technical contract for every GLB: glTF 2.0 binary, +Y up, +Z front, base on y=0, origin at base
centre, metres, flat `baseColorFactor` materials (roughness 0.6), no textures (except declared),
no extensions, no Draco, triangle budgets creature < 1500 / landmark s1 < 400, s2 < 900,
s3 < 1600 / prop < 300.

## How to regenerate each set (from the repo root; headless Blender 5.2 at the stated path)

```bash
B=/Applications/Blender.app/Contents/MacOS/Blender
$B -b --python tools/creature-factory/generate_creatures.py      # -> assets/creatures/generated (~min)
$B -b --python tools/creature-factory/animate_creatures.py       # -> assets/creatures/animated
$B -b --python tools/landmark-factory/generate_landmarks.py      # -> assets/landmarks
$B -b --python tools/growth-factory/generate_growth.py           # -> assets/growth  (-- --families forest,moon)
cd tools/sound-factory && npm install && npm run all             # -> assets/audio/sfx + voices
python3 assets/biomes/validate_catalog.py --fix                  # recompute derived catalogue fields
```

Generators are deterministic (seeded) and **overwrite the whole set**; iterate on one seed
family via the `--` options in each README rather than regenerating everything. Options and
parameter tables are in `tools/*/README.md` (note some README counts are stale: 96/84 → 222/278).

## How the QA gate works

`bash tools/qa/run_all.sh` (≈20 s; `SKIP_SILHOUETTES=1` skips the Blender silhouette pass) runs
`check_glb.py` on every set (contract rules above, manifest-aware kinds and clip checks),
`check_audio.py` on every WAV (format, duration, peak ≤ −1 dBFS), `silhouette_test.py`
(fill and distinctness at 96/48 px), then `write_report.py` → `assets/QA.md`. A GLB is "done" only
when it passes. Third-party (`cc0`) files are reported, never block. Run a single file with
`python3 tools/qa/check_glb.py <file> --kind creature` (add `--manifest assets/landmarks/manifest.json`
for `shared/` pedestals, `--allow-textures` for tripo-cleaned). Current report: 22:26 EDT,
all first-party sets 100 % pass.

## The world prototype

`prototypes/world-lab/` is a Vite + React 19 + three 0.186 / @react-three/fiber spike that
answers "planet or island?" and now hosts the primary **Planet 2-zoom** mode: level 1 is a map
(one Kirby-style pedestal marker per course on a belt around a planet, scroll-to-orbit), level 2
dives onto the course's biome on the planet surface (roads, plazas, landmark stages by progress,
terrain pieces, creatures from the animated set). `public/assets` is a symlink to `../../assets`,
so GLBs load from `/assets/...` directly.

```bash
cd prototypes/world-lab && npm install && npm run dev   # http://localhost:5173
```

Useful URLs: `?mode=planet2&course=6.1210&enter=1`, `?scroll=stops|continuous`, `?zoom=swap`
(rejected flat-diorama variant), `?pack=tripo` (loads the reference-only Tripo set, see below).
Roster per biome: `src/data/roster.ts`; ids come from `assets/creatures/animated/manifest.json`.
The README's "Deferred" list is the open work. Integration into the Next.js `frontend/` follows
`docs/plans/2026-09-19-world-integration-spec.md` once `origin/main` conventions are agreed.

## Decided vs still open

Decided: Toybox Low-Poly aesthetic and palette (`.fleet/org.md`); the GLB technical contract;
five named clips on a `Root`/`Body` two-node rig; biome catalogue as single source of truth with
7 shipped families; planet map + on-planet biome level 2 (flat diorama rejected); provenance rule
(ledger row before download, CC0/CC-BY only); music library is audition-only.

Open: the final hero roster (art director proposed 10 in the review; not yet confirmed by
Philote after the v2.3/v4 regenerations); whether `tripo-mouse` ships (audit 1.4); `looping-bossa`
CC-BY-SA exception (1.6); growth `moon` ↔ catalogue `space` alias (2.1); the two locally modified
research files (3.1); root `.gitignore` + Git LFS before the first asset commit (3.2, recommended:
LFS for `assets/**/*.{glb,png,mp3,ogg,wav,mp4}`); adding tripo-cleaned and souls to the QA gate;
the 9 planned families' landmarks/growth beyond heroes; night mode, bridges, signposts, creature
road-walking in the prototype. Nothing under `assets/`, `tools/`, `prototypes/`, `.fleet/` is
committed yet; the working branch is `be/fast-ingest`, not `main`.

## IP position on the Tripo assets

- `assets/creatures/tripo/pokemon-like-3d-model.glb` (60 MB) is a Tripo output that turned out to
  be a panel of 48 recognisable **Pokémon**. Tripo's paid-user terms (§5.2.2) give us the file,
  not Nintendo/Creatures/Game Freak's character rights. It is **reference and pipeline-test only;
  nothing derived from it ships.** Recorded in `assets/creatures/tripo/LEDGER.md` and README.
- `assets/creatures/tripo-cleaned/` (47 separated creatures + 1 mouse, textured and toon variants,
  full clip set, pass the gate with `--allow-textures`) inherits that designation: its own
  ledger says no new rights determination was made. In the prototype the 47 load **only** behind
  `?pack=tripo` (`src/data/tripo-assets.ts`); no roster file lists them by id. Keep them out of
  `frontend/`.
- `tripo-mouse` comes from a separate, original Tripo prompt ("cute cartoon mouse"), is not
  Pokémon-derived, and is currently a hero in city and meadow. It needs an explicit go/no-go and a
  ledger row before anyone treats it as shippable.
- Using Tripo again is fine with original prompts (never a named IP); the intake README estimates
  it does not save time over the in-house generator except for silhouettes the generator cannot make.
