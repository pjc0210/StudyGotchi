# Globe marker system

Status: draft for Philote, 2026-09-20. Owner: biome and landmark art direction. Refines `00-world-bible.md` §4.5 (sizes unchanged) and applies the locked decisions of 2026-09-20. Structural reference: `refs/kirby-world-pedestals-w1-w9.jpg` (nine stacked-disc pedestals, each in its world's ground material, 2–4 props). Nothing from that sheet is copied; only the grammar is borrowed, and its signposts are not (see Decisions).

## 1. Purpose

The marker is the biome's 48 px summary on the planet: the same palette, the same 2–4 signature props the student will see at ground level, and a pedestal cut from the biome's own ground. It is not a reward object and has no content of its own; anything on the marker must exist in the biome.

Transition globe → biome is the **occlusion crossfade** (bible §2, `biome-world-structure.md` §6.5): the 700 ms dive passes through 3–6 clouds at 30–50 % of the flight; the marker fades out and the biome fades in between 40 % and 60 %. The marker never morphs into the landscape. Rule: **default = no morph.** A family may morph only if every one of its markers can do it with the same rig (pedestal tiers → coastline cliffs, props → their full-size twins) and the factory has shown it at all three tiers; until then the crossfade is the only transition. This keeps the marker a free composition rather than a compressed map.

## 2. Marker grammar

All sizes at planet scale, metres. Marker frame: +Z toward the camera in the pose, +X to the viewer's right, origin at the pad centre.

**Pad.** Radius 18 m flattened cap in the charter ground tint, flat (h ≤ 0.5 m), shallows band around it; no other level-2 structure.

**Pedestal.** 1–3 stacked 12-facet discs, radii 16 / 11.5 / 7.5 m, each 2.8 m tall, facets aligned (facet 0 faces +Z). Three colour roles per family, in the table below:

- side = the biome's cliff or cross-section material (what a coastline shows when cut);
- top = the ground tint;
- lip = a cap ring 0.9 m thick overhanging 0.7 m, in the material's rim tint, with a **rim treatment** that tells the material at 48 px: rounded snow lobes, sand strata, grass tufts with root knuckles, basalt crust with ember cracks, cobble kerb, deckle paper edge, riveted steel, and so on. One treatment per family; it repeats on every tier.

**Props.** 2–4 signature props from the biome sheet at `PROP_SCALE_L1 = 3`, fixed priority order, heights 8 / 6 / 4.8 / 4 m (tallest, ×0.75, ×0.6, ×0.5). They stand on the highest tier present at radius `0.75 × r_top` (12 / 8.6 / 5.6 m) and ride up with a new tier during its 400 ms spring. Positions in the marker frame, as unit directions from the centre:

| slot | height | direction (x, z) | reads as |
|---|---|---|---|
| P1 tallest | 8 m | (−0.7, −0.7) | back-left, the skyline element |
| P2 medium | 6 m | (+1.0, −0.2) | right |
| P3 small | 4.8 m | (−0.7, +0.7) | front-left |
| P4 | 4 m | (+0.6, −0.8) | back-right, tucked behind P2 |

Each prop keeps its biome colours: 2–3 flat colours plus one accent. Only one object on the marker carries the family's saturated accent (the "accent object" column). No prop has a footprint wider than 5 m at L1 scale except P1 (≤ 7 m).

**Label.** The course code is rendered in the HTML course card and shown on hover/selection; nothing in the world carries text. The front-right of the top tier stays empty; it is the marker's negative space, not a slot for a fifth prop (props stay 2–4). This supersedes the signpost spec in bible §4.5 (post, plank, tilt, and cap-height rule) and retires the catalog `marker.sign_text_style` field.

**Creature.** Optional; the latest finished pset's arrival, `idle`, 4.5 m tall, at direction (−0.2, +1.0), radius 5 m on the top tier. Never taller than P3.

**Night.** Every `window` and lamp material on the marker goes emissive `#ffe9a8` × 1.6 (bible §6): house windows, lighthouse lamp, lantern posts, tower windows, crane cab, star-flower blooms, ember cracks (`#ff7a3a` instead). Pedestal and pad never emit.

## 3. Roster table

Hexes without a note are from `assets/biomes/catalog.json` or the charter; **(p)** marks a proposed, provisional hex. Props are listed P1 → P4 with heights at L1 scale.

| working id | pedestal side / top / lip | rim treatment | P1 8 m | P2 6 m | P3 4.8 m | P4 4 m | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|---|
| `ice-town` | cliff ice `#8fbfdc` / snow `#eef4f7` / white `#ffffff` | rounded snow lip, 12 lobes dripping 0.4 m over the edge | soft snow mountain-cone, rock `#c9bfd0` showing on one face | pine trio `#5f8f78`, snow caps | lighthouse `#f4e9d2`, 3 bands, red cap `#c8524a` | painted timber house pair `#c8524a` + `#5f9ea8`, snow roofs | lighthouse cap `#c8524a` | white cone over a blue cliff with one red dot |
| `ink-world` | stacked paper `#d9d2c4` (p) / paper `#f4efe6` (p) / ink band `#3a2f45` | deckle (torn) paper edge with one 0.4 m brush-stroke band | brush-stroke peak, ink `#3a2f45` fading to wash `#8c8698` (p) | paper pavilion, white walls, ink roof lines | ink-blot pine, 3 blots on one trunk | paper lantern post, unlit paper | seal-red stamp block `#c8323c` (p) on the pedestal side, 2 × 2 m | black brush peak on a white disc |
| `celestial-garden` | night soil `#4b4f8a` (p) / star-moss `#6b70b8` (p) / pale moss `#dfe3ff` (p) | pale rim with 12 star studs `#f8d24a` | armillary orbit ring on a post, 8 m diameter, `#dfe3ff` | giant star-flower, stem `#8fc9d8`, bloom `#f8d24a` | constellation gazebo, 6 posts joined by light lines | moon-pond basin, 4 m wide, 1.2 m high, water `#9fd3e0` | star-flower bloom `#f8d24a` (emissive at night) | tilted ring over an indigo disc |
| `heavy-industry` | concrete `#9f9a96` / concrete `#b9b4b0` / steel `#6b5f7a` | riveted steel edge band, orange chevron `#e8a13a` every 30° | gantry crane, frame `#6b5f7a`, cab `#e8a13a` | chimney-stack pair with one smoke puff `#fffaf3` | piston press block, `#9f9a96`, moving ram | pipe elbow run `#4f8fb0`, 3 elbows | crane cab `#e8a13a` | a T-shaped gantry over a grey disc |
| `future-utopia` | glass `#c7dfd6` / tile `#e3f2ec` / light strip `#3fd1c9` | flush glass edge with a 0.3 m cyan light strip (emissive at night) | civic spire, white `#ffffff`, 3 cyan bands | transit arch with a monorail loop, glass `#c7dfd6` | garden dome, glass over `#8fc48a` canopy | hover lamp on a stem, 2 rings | light strip and spire bands `#3fd1c9` | a needle spire over a pale mint disc |
| `harbor-town` | wet quay stone `#7f8f9c` (p) / cobble `#a3aeb8` (p) / kerb `#5f6f7c` (p) | cobble kerb with 6 mooring bollards `#3a2f45` and rope loops | tall ship, hull `#4a3c36`, sails `#f4e9d2`, mast 8 m | gabled warehouse row of 3, `#5f9ea8` / `#f4e9d2` / `#6d7f96` | harbour crane, timber `#786557` | buoy + bollard cluster, buoy `#f0b429` | sail stripe and buoy `#f0b429` (p) | a mast and sail over a blue-grey disc |
| `academy-town` | brick `#a85a4a` (p) / quad lawn `#9fcf7a` (p) / stone coping `#d9d2c4` (p) | stone coping course over brick, 12 engaged buttresses | bell tower, brick with white cupola `#f4efe6`, verdigris cap `#6fa89a` | library, 4 columns, pediment | lecture-hall and dorm row, brick, 6 windows | quad oak `#4f8a4a` with a bench | pennant `#2f4f8f` (p) on the tower | brick disc with a green top and a white cupola |
| `wildwest` | red rock `#a0522d` / flats `#d9b07a` / strata `#c2925a` | 3 sandstone strata bands, undercut 0.3 m | flat-top mesa butte `#a0522d`, cap `#d9b07a` | windpump `#8b5a3c`, 8-blade vane | saloon with false front `#c2925a`, swinging sign | saguaro pair `#4f8a4a` | saguaro `#4f8a4a` | a flat-top butte over an ochre disc |
| `volcanic` | basalt `#3a2f45` / rock `#c9a08f` / crust `#8a4a3f` | basalt crust with 6 ember cracks `#ff7a3a` (emissive at night) | crater cone `#8a4a3f`, rim glow `#ff7a3a` | basalt column cluster of 5 `#3a2f45` | forge house, ink roof `#3a2f45`, open door glow | ember rock + smoke puff | lava `#ff7a3a` in the crater and cracks | a dark cone with an orange rim |
| `egyptian-desert` | sand strata `#d2a95e` / sand `#efd9a2` / ripple `#e2b98a` | wind-ripple strata, 3 bands | stepped pyramid `#efd9a2`, steps `#d2a95e` | obelisk `#e2b98a`, hieroglyph band | oasis palm pair over a pool `#4fb0b8` | pylon gate `#b87a50` | oasis pool `#4fb0b8` | a pyramid over a sand disc |
| `alpine` | granite `#8d9299` (p) / alpine turf `#86b26e` (p) / ledge `#a9aeb5` (p) | split-granite ledge, turf tufts, snow dusting `#eef4f7` on 6 notches | jagged twin peak `#8d9299`, snow caps `#eef4f7` | cable pylon `#6d7f96` with a gondola `#d9622b` and a cable to P1 | chalet, wide low roof `#786557`, cream walls `#f4e9d2` | fir pair `#4f8a4a` | gondola `#d9622b` (p) | two grey spikes and one diagonal cable |
| `swamp` | peat `#4f5a3f` (p) / mud `#6f7f5a` (p) / reed `#a3a05f` (p) | reed tuft edge with root knuckles, duckweed patches `#8fa860` on top | bald cypress `#5a6e50`, hanging moss `#a3b080` | stilt hut on a boardwalk `#786557` | lantern post, paper `#f2c14e` | reed + lily clump, lily `#d66fa8` | lantern `#f2c14e` (p, emissive at night) | a tall dark trunk with drooping moss over an olive disc |
| `jungle` | deep green `#4f8a4a` / canopy `#6fae6a` / vine `#4f8a4a` | hanging vine fringe 1.2 m with fruit dots `#f2b84f` | canopy tree over a waterfall cliff, water `#5fc9c9` | palm `#4f8a4a`, trunk `#8b5a3c` | ruin block stack `#b7a58f`, 4 blocks | tiki torch, flame `#f2b84f` | fruit and flame `#f2b84f` | an umbrella canopy with one white water stripe |
| `forest` | bark `#6fa86a` / grass `#8fc48a` / turf `#a9d69a` | grass tuft edge with root knuckles `#8b5a3c` | great round tree `#4f8a4a`, trunk `#8b5a3c` | round-tree pair, small + large | mushroom cottage, cap `#d9765c`, cream `#f2e3c6` | log + fern clump | mushroom cap `#d9765c` | one big green ball over a green disc |
| `city` | plaster `#b98bb0` / paving `#d9c3d6` / kerb `#f6ecd2` | kerb and cobble ring, kerb edge `#6b5f7a` | tower block, walls `#e6f2fb`, roof `#b98bb0`, lit facets | clock tower, face 0.4 × width | townhouse pair with awnings `#e88a8a` | lamp post + planter tree | awnings `#e88a8a` | a boxy tower over a mauve disc |
| `whimsical-land` | candy `#f7c8d8` (p) / cream `#fff1c9` (p) / stripe `#8fc9d8` (p) | scalloped edge, alternating candy stripes; **placeholder until references** | leaning spiral tower, 12° lean | oversized flower, 3 m bloom | upside-down house on its ridge | checker-path spiral, 0.6 m high | stripe and flower `#8fc9d8` (p) | a leaning tower over a pink scalloped disc |
| `fractal-recursion` (R&D) | slate `#8a90a8` (p) / `#a8b0c4` (p) / `#dfe3ff` (p) | each tier carries three 1/3-scale sub-pedestals on its rim | Pythagoras tree, squares `#a8b0c4` | stepped Sierpinski pyramid | spiral shell, 5 turns | a 1/3-scale copy of this marker | sub-pedestal lips `#ff7ad9` (p) | a branching square tree over a disc that repeats itself |

Ownership notes the factory must confirm: the **red-cap lighthouse** belongs to `ice-town` (locked); `harbor-town` therefore takes the ship and crane and has no lighthouse on its marker. The **jagged grey peak with a cable** belongs to `alpine`; `ice-town` keeps the soft white snow cone. `celestial-garden` and the planned catalog `space` family share a star-gold accent but not a ground; keep them non-adjacent on the globe.

## 4. Progression and acceptance

Progress at the marker is architecture only (bible §1.5): tiers, props, creature. Palette, pedestal radii, and camera never change.

| course progress (concepts demonstrated) | tiers | props | creature |
|---|---|---|---|
| < 33 % | 1 | P1, P2 | none |
| 33–66 % | 2 | P1–P3 | if a pset is finished |
| ≥ 67 % | 3 | P1–P4 | latest finished pset's arrival |

A new tier springs up in 400 ms with `progress-level-up.wav`; the props translate up with it and the new prop scales in from 0 over the same 400 ms. The fixed priority order above supersedes the bible's per-terrain-kind ranking; it is deterministic and the same for every student, so two students at the same band see the same marker.

Acceptance, checked on fixed renders at the level-1 pose with the disc at 80 % of frame height, exported at 96 px and 48 px:

1. **Silhouette test, props hidden.** At 48 px the pedestal alone (tiers + rim treatment) is identifiable among the roster by rim shape for at least 10 of 16 families; at 96 px for all 16.
2. **Colour test, props hidden.** At 48 px the pedestal's side + top pair is unique in the roster (ΔE > 20 in Lab against every other family's pair).
3. **Tallest-prop test.** At 48 px P1 alone identifies the family for all 16; no two families share both pedestal top colour (ΔE < 12) and P1 category (mountain, tree, tower, ship, ring, and so on).
4. **Tier test.** 1-tier and 3-tier renders of the same family are distinguishable at 48 px with props hidden.
5. **Night test.** Emissive props are visible at 48 px and bloom does not merge them into one blob.

## 5. Risks

1. **Generic low-poly pack look.** Sixteen discs with a tree and a house each is a Unity asset store screenshot. Mitigation: the rim treatment is mandatory and material-specific, P1 is always the family's skyline element, never a generic tree or house, and every prop passes the "one exaggerated feature" rule from `.fleet/org.md` (thick snow lobes, oversized gondola, a mesa that is 70 % cap).
2. **Protected-silhouette drift.** The Kirby sheet is close at hand and its W2 pyramid, W4 palm island, and W8 volcano map onto our roster. Mitigation: never place the same prop set as any Kirby world (W3 is pines only; ours adds mountain, lighthouse, houses), pedestal side is always a cliff material rather than the sheet's soft dough, and the review sheet carries a per-marker line "closest protected silhouette and how ours differs".
3. **Palette collisions between globe neighbours.** Pale families (`ice-town`, `future-utopia`, `ink-world`) and greens (`forest`, `jungle`, `alpine`, `swamp`) will sit next to each other at N ≥ 12. Mitigation: acceptance check 2 at design time; at layout time, the tour order (bible §3) gets a post-pass that swaps adjacent courses when their pedestal ΔE < 25 and P1 categories match; lip tints are the tie-breaker and may be darkened one step (`L−8`) per family without a re-review.

## 6. Decisions

- 2026-09-20, Philote: **Signpost cut: the marker is the thing itself.** No text object on the globe; the course code is rendered in the HTML course card and on hover/selection. Supersedes bible §4.5 signpost spec. Props stay 2–4.
