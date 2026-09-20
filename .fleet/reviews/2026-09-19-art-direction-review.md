# Art direction review, 2026-09-19 (wave 2)

Reviewed 21:16 EDT: creatures manifest 21:10:43, animated manifest 21:13:09, landmarks manifest/sheets 21:09:23, world-lab screenshots 21:03–21:16, cc0 sheet 20:29. References: Pokémon Rumble, Ditto, Animal Crossing felt toys, Kirby W3 pedestal, Penguin Isle. Contrast figures are WCAG ratios of manifest body colour vs charter ground.

## Verdicts

**Creatures (generated, 96).** The archetype system works: blob, biped and sprite land in Rumble/Ditto territory with proper facet character and dot eyes. Three systemic problems. `head_scale` ranges 0.86–1.30 while the contract says 1:1 to 2:1; anything below 1.1 (bean-forest-1, sprite-meadow-1, flat-ice-1, biped-forest-2) reads as an adult animal, not a toy. Bodies are painted the biome ground colour: volcanic median contrast 1.14 (bean-volcanic-1 and biped-volcanic-9480 are #C9A08F on #c9a08f), meadow 1.20, sand four ids at 1.02–1.09, city pink-on-mauve 1.16; at 48 px on their own ground they vanish. Accessory overload (hat + scarf + antenna + backpack on flat-ocean-1, bird-volcanic-1) breaks "one exaggerated feature", and the bean whisker primitive renders as black rods through the face (bean-ocean-2, bean-forest-1, bean-sand-1). Charm is real on about a third of the set.

**Animation.** Competent squash-and-stretch on a two-node rig; nothing broken, nothing yet with personality. Walk reads as locomotion for bean, biped and bird; blob and sprite hop (fine, that is Ditto); flat flops like a beached fish. Happy is one recipe (jump + 360° spin peaking at 0.34–0.51 s) on every archetype, so a sleepy sprite celebrates exactly like a bold biped. flat-city-1 happy goes inverted at 0.51 s and reads as a fall.

**Landmarks and props (63).** Best set in the fleet for silhouette and stage progression; ice is reference-grade. Weaknesses: city is a mauve monotone, the two s3 glass domes (sand, meadow) borrow ocean blue, meadow-s1 signpost and volcanic-s1 campfire vanish below 96 px, four flat-disc props and two dead trees are noise.

**World.** The swap-mode ice diorama is the only screenshot a Kirby/Penguin Isle player would recognise. Planet level 1 is a dark-brown speckled hemisphere (reads as mud); `tmp-planet.png` has landmarks hanging off the sphere. Continuous level 2 shows curvature and fog that fight the toybox read, and `glb-landmarks.png` places twelve identical lighthouses in one biome.

## Hero roster (10)

| id | why | personality line |
|---|---|---|
| blob-forest-1 | Ditto with a party hat; cleanest 48 px read | "Was not invited. Wore the hat anyway." |
| blob-city-2 | lilac horn-blob, 680 tris, good contrast on mauve | "Has opinions about the clock tower." |
| bird-ice-1 | the low-poly kiwi realised; 574 tris; waddle sells | "Refuses to acknowledge the glacier." |
| bird-volcanic-6266 | only dark-value creature; owl tuft reads at distance | "Judging the lava. Found it adequate." |
| biped-sand-1 | best Rumble biped; ears + horn hero (recolour required, see cut list) | "Too warm to stand up straight." |
| biped-meadow-2 | lilac on green, big head, hat + leaf tail; high contrast | "Believes the windmill is following it." |
| sprite-ocean-2 | acorn in a straw hat; instant charm; only sprite with `big` eyes | "Waiting for a boat that isn't coming." |
| sprite-volcanic-8142 | coral with a halo; strongest sprite silhouette (FO 0.68) | "Is not a saint. Has not corrected anyone." |
| bean-ocean-2 | blue pig-bean with antenna and scarf; whisker-free | "Receiving a signal. Won't say what." |
| bean-city-1 | lilac scarf-bean, mouthless; walk already proven in motion strip | "Has never once been on time." |

Alternates: sprite-forest-1 (flower acorn; eyes lost on brown), blob-ice-8333 (hat too tall), biped-volcanic-2 (hat + antenna = two heroes), bean-meadow-9218 (needs recolour), flat-ocean-2 (the only flat that reads).

## Cut list

- Same-as-ground bodies, never on screen without recolour: bean-volcanic-1, biped-volcanic-9480 (contrast 1.00); blob-meadow-1422, blob-meadow-2, sprite-meadow-2, blob-sand-2, biped-sand-1 (1.02); bean-sand-2, bird-sand-1, bean-forest-1, biped-forest-1, bird-forest-1 (1.07–1.09).
- Flat family except flat-city-1 and flat-ocean-2: fin is a yellow wedge through the body, silhouettes FO 0.36–0.51 (weakest on the grid), head_scale 0.86 on half the ids.
- blob-sand-1: head 0.94, scarf only, no mouth, no face read.
- Bean whisker primitive on every id that has it (bean-forest-1, bean-sand-1, bean-ocean-2 nose rod).
- All cc0 fillers from the hero layer: every file fails the GLB gate (textures), the `animal-*` set is cube-headed Minecraft language, and Bunny, Frog, Hedgehog, Shibainu, Chick are realistic or rigged. Seal, Rat, Duck, Marmot may survive as distant fillers after flat recolour.
- Props: the four zero-height discs (ice-frozen-lake, sand-cracked-earth, ocean-wave-crest, volcanic-lava-puddle) and both dead trees (read as glitches at 48 px).
- Landmarks: meadow-landmark-s1 and volcanic-landmark-s1 in current geometry.

## Scored notes: creature archetypes

- **blob 4/5.** Clamp `head_scale` 0.94–1.29 → 1.15–1.35. Eyes 8% lower on the head (blob-forest-1, blob-ice-8333 sit too high). Hat `hero_scale` 1.35 → 1.15 when `accessory=hat` on blob; the cone is taller than the head.
- **bean 3/5.** Remove `whiskers`; if kept, length ×0.4, colour = body `dark` tint not black. `head_scale` min 0.90 → 1.15. Body 10% higher off the ground so legs read as legs.
- **bird 4/5.** Beak length ×0.8 on `hero=beak` and `crest=tuft` ids (bird-ocean-1, bird-forest-1). Feet width ×1.3, colour black → ink #3a2f45. Disallow `crest=antenna` on bird (bird-city-2 doubles its own height).
- **biped 4/5.** `head_scale` → 1.35–1.5. Arms length ×0.8, radius ×1.4 (toothpicks on biped-ocean-1). `ear=long` height cap 0.8 × head height (biped-sand-1 ears exceed the head).
- **sprite 4/5.** Flower/leaf cap `hero_scale` 1.35 → 1.2 (sprite-forest-1 cap wider than body). Eye radius ×1.3 when body luminance < 0.4 (brown/maroon sprites lose their eyes). `body_squash` cap 1.10.
- **flat 2/5.** Fin: move to −Z trailing, scale ×0.7, colour = `secondary` not accent yellow. `head_scale` min 1.2. No `crest` on flat (one hero only).

## Scored notes: landmark families

- **ice 5/5.** Snow-cap thickness 0.05 → 0.08 m (Kirby pedestal read). Lighthouse bands 2 → 3. Nothing else.
- **forest 4/5.** s2 trunk radius 0.08 → 0.14 m. Canopy icosphere subdivision 2 → 1 for chunkier facets. Ladder rails ×2 thickness.
- **ocean 4/5.** s1 buoy scale ×1.3. Dock planks 5 → 3 wider. s3 rock base: lower by 30%, round the columns (they read volcanic).
- **city 3/5.** Walls → pale #e6f2fb, keep roofs #b98bb0 (break the monotone). Clock face diameter 0.25 → 0.4 of tower width. s3 columns 8 → 4 at 2× radius.
- **sand 3/5.** s3 glass blue → olive #b9c96f or amber #d2a95e. Planter trees ×1.3. s1 tent door triangle → ink.
- **volcanic 3/5.** s1: logs 3 → 4 at 2× radius, ember accent #ffa41c disc ×2. s2 roof #8a4a3f → ink #3a2f45 (roof matches ground). s3 fine.
- **meadow 2/5.** s1 post width ×3 plus a boulder base (currently a 0.1 m stick). s2 blade width 0.05 → 0.12 m. s3 dome blue → #bfe0a0 with white ribs.
- **props 3/5.** Cut discs and dead trees (above); the rest is good, flower clumps best of all.

## Animation notes (motion strips, 8 frames each)

Walk at 48 px: bean-city-1 yes (alternating legs, bob, pitch); biped-sand-1 yes (hop-lean); bird-ice-1 yes, best of the set (waddle, visible foot alternation); blob-forest-1 and sprite-forest-1 read as hop, acceptable for legless bodies; flat-city-1 no, long-axis roll reads as a fish out of water. Happy: legible on bean, biped and bird because the back view at 0.34–0.51 s confirms the spin; blob happy is idle plus a hat tilt; flat-city-1 goes inverted at 0.51 s, fin down, uncanny. Requests: per-archetype happy (blob: double squash, no spin; sprite: cap flip; bird: y-scale flap pulses at 6 Hz); drop spin from flat; Eyes lag Body by a frame on flat-city-1 happy frame 4, check the Eyes keys.

## Palette check

Sheets sample as pastel mint, lilac, lemon, peach and pink, on the charter accent family. Off-charter: party-hat orange #F27D1C and yellow #FFC11F/#F8CC30 sit on roughly 40% of ids and become the de facto palette; cap to one accent per creature and rotate through peach/coral/olive. Ground/creature contrast too low in volcanic (median 1.14), meadow (1.20), sand (four ids ≤1.09) and city for pink bodies (1.16). Ice and ocean are fine. Landmarks: city monotone, sand and meadow s3 domes leak ocean blue, volcanic forge roof matches its ground.

## World

Best match: `p2-swap-level2-ice.png` (GLB twin `glb-swap-level2-ice.png`): floating pedestal, pine cluster, mountain, lighthouse, one biome per level, the Kirby W3 model. Two fixes: (1) Camera pitch ~52° → ~38°, FOV 35 → 28, raise the landmark mound amplitude so the island shows two tiers like the W3 pedestal, and replace the chocolate-brown cliff with cream/pale-stone steps (#e6f2fb top, #b7a58f base). (2) Kill the eleven white pill labels: one 3D signpost per topic (repurpose the meadow signpost), text on hover/select only, and cluster props into 3–5 dense groups with empty snow between (the Penguin Isle rhythm) instead of uniform sprinkling.
