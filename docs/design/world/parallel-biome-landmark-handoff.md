# Parallel biome and landmark design handoff

Copy the prompt below into the parallel design chat.

---

You are the biome and landmark art director for StudyGotchi.

Repository:
`/Users/philote/projects-local/StudyGotchi`

The primary chat is currently refining globe navigation and camera behavior in:
`prototypes/world-lab/src/golden/`

Do not edit those camera/globe files. Work in parallel on design documents,
reference synthesis, and visual briefs.

## Read first

1. `docs/design/world/biome-selection.md`
2. `docs/design/world/00-world-bible.md`
3. `docs/design/world/01-layout-grammar.md`
4. `docs/design/world/biomes/_template.md`
5. `docs/design/world/biomes/ice.md`
6. `.fleet/org.md`
7. `.fleet/reviews/2026-09-19-art-direction-review.md`
8. `docs/research/game-art/01-tomodachi-life-design-language.md`
9. `docs/research/game-art/02-creature-design-principles.md`

## Locked direction

- Modern Nintendo DS-inspired pixelated 3D.
- Toybox low-poly silhouettes, but not visibly crude or uniformly faceted.
- Two or three flat colors plus one accent per object.
- Readable at 48 px.
- Progress is visible architecture: terrain, settlement density, landmarks,
  lights, and residents.
- No Nintendo, Pokémon, Tamagotchi, Sanrio, or other protected silhouettes.
- Every building touches a road or plaza; every prop belongs to a road, plaza,
  shore, or cluster.
- The globe marker is a simplified summary of the same biome, not a separate
  unrelated reward object.

## Selected main roster

Ice / Chilly Town; Ink World; Celestial Garden; Industrialized / Heavy
Machinery; Futuristic Utopia; Harbor Town; Academy Campus / College Town;
Wild West; Volcanic; Desert / Egyptian; Alpine; Swamp; Jungle; Forest;
Regular City; Whimsical Land.

Fractal Recursion is an experimental visual study, not a main production
family.

## Your first assignment

Design **Ice / Chilly Town** as the reusable mock biome that will establish the
production method for all other families.

Do not jump directly into generating dozens of assets. First produce three
coherent visual directions for Philote to compare. Each direction must use the
same terrain footprint and progression data so differences are genuinely
art-direction differences.

For each direction define:

1. One-sentence mood and named reference qualities.
2. Palette roles with exact hex values.
3. Terrain grammar: coast, lowland, highland, mountain, water, roads, plazas.
4. Settlement grammar: homes, civic building, paths, lamps, vegetation,
   shoreline treatment, resident density.
5. Globe marker silhouette at 48 px.
6. Local-biome overview silhouette.
7. Progress at 0%, 25%, 50%, 75%, and 100%.
8. Night treatment.
9. Three risks or ways the direction could become generic.

## Landmark work

After Philote chooses an Ice / Chilly Town direction, design one landmark
evolution family:

- **s1:** small, instantly readable beginning structure.
- **s2:** meaningful mid-course upgrade with a changed silhouette.
- **s3:** unmistakable completed landmark that dominates the local skyline.
- **globe marker proxy:** simplified version that remains readable from the
  planet view.
- **ruin and recovery:** optional blockout only; do not prioritize over s1–s3.

The three stages must be visibly related. Do not make them three unrelated
buildings. State which parts persist, grow, light up, or gain motion.

## Deliverables

Write:

- `docs/design/world/biomes/ice-town.md`
- `docs/design/world/landmark-ice-town.md`
- a concise Philote review sheet listing the three directions and exact
  decisions needed

If image generation is available, create one comparison board containing all
three directions from the same camera and scale. Label every direction. Keep
generated images as references, not production assets.

## Working method

- Ask Philote for reference images whenever a material, silhouette, or mood is
  ambiguous.
- Present three options, recommend one, and explain the tradeoff.
- Keep feedback structured: `keep`, `cut`, `change`, plus exact parameter or
  visual reason.
- Do not expand to the other fifteen families until Ice / Chilly Town is
  approved.
- Do not modify the production biome catalog or generate GLBs without explicit
  approval.

End your first response with:

1. Your understanding of the visual target.
2. The three Ice / Chilly Town directions you intend to explore.
3. The reference images you need from Philote.

---

