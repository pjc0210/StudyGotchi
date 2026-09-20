# Biome lab: fix plan after review 1

Philote's review of `prototypes/biome-lab/` pass 1, 2026-09-20 02:35. Each item states the change, the reference that defines it, and the acceptance check. Supersedes §3–§4 of `biome-world-structure.md` where they conflict.

## Verdict on pass 1

- **Cut** the concentric region mounds: the island reads as "a bunch of mounds".
- **Cut** the closed island silhouette: the back should run into a horizon mountain range, the other side into glacier shelf.
- **Cut** the continuous spiral route: clusters only need to be recognisable groups; local paths, docks, and fences are enough.
- **Cut** elevation-as-growth for towns and camps. Growth is population (buildings, structures, props, lights, residents). Elevation growth moves to the mountain range only.
- **Change** render fidelity: consistent, "smooth but a little pixelated" at every zoom; no crunch at the far stations.
- **Change** the whale: a rare event with clean surface → blow → dive and an occasional breach, never a permanent object.
- **Keep** the DS toon ramp, snow-top / ice-riser cliff colouring at the coast, the fog horizon, the region panel and camera stations, the catastrophe sequence.

## New references (`refs/`)

| file | take |
|---|---|
| `lowpoly-ice-arch-horizon-range.png` | A jagged mountain range as the back horizon, pale and fogged; one hero ice arch as a natural landmark; icebreaker; polar bears on a floe |
| `lowpoly-winter-lake-cabin-crystal-cave.png` | Frozen lake with dark open-water patches; pink-lavender rock outcrops; ice cave with a glowing crystal; cabin at the shore; pastel palette |
| `lowpoly-snow-valley-cabin-stream.png` | Rolling snow ground with rock outcrops, a frozen stream and waterfall, fences, snowmen, bare trees; blue-grey palette; the land is soft, not stepped |
| `soft-pale-snow-forest-igloo.png` | The fidelity target: soft, pale, almost white, few colours, gentle grain; pale-blue frozen rivers as negative space |
| `lowpoly-lumber-camp-props.png` | Cluster clutter that says "settled": log piles, cart, stumps, fences, barrels, benches, flowers poking through |
| `iso-arctic-research-station-huts.png` | The offshore mini-island content: blue quonset huts, tower with dish, helipad, crates |
| `penguin-isle-lighthouse-rock.png` | Landmark on its own ice rock at the water's edge; red cap as the one warm accent; fog gradient |
| `iso-arctic-base-slab-icebreaker-whale.png` | Land as a slab with an ice cliff cross-section; red base buildings; icebreaker moored in cracked ice; whale tail as a moment, not a fixture |
| `lowpoly-dense-snow-village-river.jpg` | What 100 % population looks like: dense timber houses, watchtowers, windmill, fenced fields, a river through the middle |
| `night-cabin-warm-windows.png` | Night: deep blue everything, warm windows, string-lit tree, snow drifting |

## Fix list

### 1. Land shape (replaces the island metaball)

- One landmass, not an island. The back third of the terrain continues to the edge of the world and rises into a **mountain range** that dissolves into the fog. The camera never sees a back coastline.
- West side: **glacier shelf**, a broken field of flat ice plates at sea level with ice-blue cliff edges (slab cross-section), one **ice arch** as a natural landmark, floes and a polar-bear-sized floe or two.
- Front and east: **harbour water**. A **mini island** 25–35 m offshore to the southeast carries the research station (quonset huts, tower, helipad). A short causeway or boat route, not a bridge.
- Interior: a **frozen lake** with two or three dark open-water patches, fed by a **frozen stream** from the mountains; a **rock outcrop** with an ice cave and glowing crystal on the glacier side.
- Ground is a single soft heightfield: ±0.6 m rolling relief, no plateaus, no discs. Cliffs only at coastlines (1.5–2.5 m vertical drop, ice-blue faces) and at the mountain foot.
- Acceptance: from arrival, the silhouette has no closed back edge; three distinct land forms are visible (shelf, mainland, mini island); no concentric rings anywhere.

### 2. Clusters (replaces regions-as-mounds)

Clusters sit on flat ground and are recognisable by content, not by shape. Each keeps its topic slot and its progress slider.

| cluster | where | anchor that reads at 48 px | population axis |
|---|---|---|---|
| Harbour | front coast | plank docks, moored icebreaker, **whale skeleton arch** on the quay | stilted houses, boats, crates, lamps |
| Town | centre-front | plaza tree with lights, frozen fountain | timber houses in pairs, fences, benches, bunting |
| Lake | centre | skating ring, dark water patches | ice-fishing huts, benches, snowmen |
| Lumber camp | west-centre, pine edge | log piles and a cart | cabins, stumps, fences, sawhorse |
| Glacier camp | west shelf | ice arch, crystal spire, ice cave | tents, crates, sleds, flags |
| Research station | offshore mini island | dish tower, helipad | quonset huts, fuel drums, antenna |
| Landmark | headland rock at the harbour mouth | igloo → observatory → lighthouse (red cap) | stage only |

- Paths: each cluster gets 1–3 short local paths (dock planks, a lane between house pairs, a trampled track to the lake). No inter-cluster route. Residents wander within their cluster and along the shore.
- Acceptance: at overview, every cluster is identifiable by its anchor alone with buildings hidden.

### 3. Growth encoding (replaces A + B)

- **Population** per cluster by band: 0 % anchor only; 25 % first buildings and the warm accent; 50 % half the buildings, fences, lamps; 75 % all buildings, clutter props, string lights; 100 % extras (watchtower or windmill for the town, second dock and boat for the harbour, helicopter on the pad, tents doubled at the glacier camp).
- **Mountain range** by course fraction: peaks grow taller and more numerous per band (0 %: three low peaks; 100 %: a full jagged range with snow caps and a distant second row). This is the only elevation that ever changes.
- Landmark stage from the course fraction as before. Residents = finished psets, distributed to clusters by progress.
- Catastrophe unchanged in sequence; the ruin state hides the cluster's lights and knocks over a subset of props instead of dropping a terrace.
- Acceptance: 0 % vs 100 % is distinguishable at 48 px through the mountain silhouette and the town density, with the ground unchanged.

### 4. Render fidelity

- Target look: `soft-pale-snow-forest-igloo.png`. Smooth with a light pixel grain, never chunky.
- Pixel pass scales with the camera: internal cell size chosen so a world metre covers about the same number of screen pixels at every station (pixel size 4 at resident, 3 at region, 2 at overview and arrival). Edge strengths halved at the far stations so outlines do not turn to noise.
- Fewer, paler colours on the ground: snow, pale ice, pale lavender rock. Saturated colour only on accents (red caps, timber, lights, crystal).
- Acceptance: side-by-side screenshots at the four stations show the same perceived grain; text and UI stay native.

### 5. Whale

- Hidden underwater 90 % of the time. Every 45–90 s (seeded) it surfaces on a slow arc 20–40 m off the harbour: rise (1.2 s), blow (a white puff that grows and fades over 1.5 s), glide (3 s), dive with the tail lifting (1.5 s). One in four surfacings is a **breach**: a jump with a splash ring.
- Never within 15 m of a cluster; never during a catastrophe; one whale.
- Acceptance: at overview you can watch for a minute and see it once; it is never visible in a fixed screenshot unless you wait for it.

### 6. Palette and props

- Ground: snow `#eef4f7`, pale ice `#d8e9f4`, cliff ice `#8fbfdc`, rock `#c9bfd0` (pink-lavender), dark water `#2f5f80`, open-water patches on the lake `#3f6f90`.
- Timber: dark `#4a3c36` and red `#c8524a`; roofs snow; windows `#ffe7a3`.
- New props: log pile, cart, stump, sawhorse, barrel, bench, snowman, bare tree, sled, fuel drum, quonset hut, dish tower, helipad, whale skeleton arch, ice arch, ice cave with crystal.
- Night per `night-cabin-warm-windows.png`: deep blue ground, warm windows and string lights, snow drifting, aurora faint.

## Review 2 decisions (Philote, 2026-09-20 08:52–09:14)

- Pixel cell fixed at 2 px at every station; no adaptive 3/4 px.
- Districts are large, non-circular, shaped by the land, and **multi-purpose**: one district can hold several features. Harbour = dock + stilted quay + the town behind it. Forest town = timber town + river + sawmill/lumber yard, wrapped in forest along the back of the land. Lake = skating ring + fishing huts inside or beside the town. The research station is the exception: alone on its own, bigger, island.
- Fewer, bigger districts (target four: harbour-and-town, forest town, lake, glacier shelf; research island as the fifth, solitary). Topics map several-to-one when a course has more topics than districts.
- Scale: creatures ≈ 1.8 m and ≥ 6 % of viewport height at the district station; houses 4.5–6 m; districts sized for their 100 % population with breathing room; ≥ 20 m of empty snow between districts.
- Every iteration is judged against the reference images with a side-by-side composite and a written checklist, not against the designer's own impression.
- Philote will describe the remaining districts one at a time; only described districts get polished.

## Order of work

1. Land shape and mountain range (item 1, mountain half of item 3).
2. Clusters on flat ground with local paths and anchors (item 2).
3. Population growth and catastrophe rewire (item 3).
4. Adaptive pixel pass (item 4).
5. Whale event (item 5).
6. Props and palette pass (item 6).

Layout stays data-driven (`biome-layout.ts` + `terrain.ts`) so the same structures serve the other families; tests updated to the new rules (no elevation growth, cluster anchors present at 0 %, whale hidden by default).
