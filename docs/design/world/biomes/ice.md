# Biome sheet: ice (6.1210 Introduction to Algorithms)

Status: draft, 2026-09-19.

## Mood

A quiet research outpost on a snow island: igloo clusters and one observatory along packed-snow paths, a frozen lake with a skating ring, pine stands, the glacier lighthouse at the coast; the Kirby W3 pedestal seen from inside.

## References

- `../refs/kirby-w3-pedestal.png`: the level-1 marker (tiers, three pine heights, signpost).
- `../refs/penguin-isle-terraces.png`: the level-2 rhythm (tiers, igloo on its own pad, empty ice between groups).
- `prototypes/world-lab/screenshots/glb-swap-level2-ice.png`: keep the pedestal edge; kill the crystal sprinkle and the pill labels.

## Palette

| role | hex | note |
|---|---|---|
| ground (charter) | `#e6f2fb` | |
| accent (charter) | `#a9cfe8` | |
| base | `#d9e4ee` | pedestal side, terrace risers |
| road core / edge | `#d6e1ea` / `#e9f0f6` | packed snow, tint `L−7` / `L+1` |
| plaza pad | `#cfdde9` | |
| wet | `#eef8ff` | shore band on land |
| water (open) | `#7fb6dd` | |
| frozen lake surface | `#cfe6f5` | facets alternate with `#dbeefa` |
| pine | `#4f8a4a`, snow caps `#ffffff` | |

Terrain-kind tints from `galaxy.ts` stand, one override: `snow city` `#eef3f7` → `#f2f5f8` so houses read.

## Terrain kinds

| kind | profile | recognised by | recipe → asset | roads |
|---|---|---|---|---|
| mountain | peaks | 2–3 `mountain-cone` on the rim, 1.6–2.4 m | rock → `snow-boulder` | no |
| glacier | raised | crystal clusters on 0.5 m tiers | crystal → `ice-crystal-cluster` | terraced |
| frozen lake | water | flat facet disc; skating ring at the hub | floe → 0.8 m discs | dock only |
| snow city | flat | igloo pairs and houses facing the road | house → `ice-landmark-s1` ×0.7 alternating with `city-small-house` (walls `#e6f2fb`, roof `#a9cfe8`) | yes |
| coast | slope | dock, boat, shard row; lighthouse only at `d = 1` | lighthouse → `ice-landmark-s3`, else `ice-block-stack` ×3 | yes |
| ocean | water | icebergs (`ice-block-stack` ×2.5) | iceberg, boat | no |
| pine forest | hills | pine stands in 3s, three heights | pine → `ice-pine-snow` | yes |
| tundra | flat | boulders, low shrubs, faint green | shrub → `meadow-bush` recoloured `#cfd8c8` | yes |

Snow-patch decals on `snow city` and `tundra` only.

## Landmark family

s1 igloo (`0 < d < 0.5`), s2 observatory dome (`d ≥ 0.5`), s3 glacier lighthouse (`d = 1`). The hub plaza takes a skating ring instead of a landmark pad: 3.2 m frozen-lake disc, fence ring with two gaps, 4 lamps. Artisan requests (review, ice 5/5): snow cap 0.05 → 0.08 m, lighthouse bands 2 → 3.

## Prop roster

| prop | per topic | parent | scale | notes |
|---|---|---|---|---|
| `ice-pine-snow` | 6–12 | cluster | 0.65–1.2 | three heights per cluster |
| `ice-crystal-cluster` | 3–6 | cluster | 0.6–1.0 | glacier only |
| `ice-snow-boulder` | 3–6 | cluster | 0.5–1.0 | pairs with pine |
| `ice-ice-block-stack` | 4–8 | shore, plaza | 0.4–1.0 | shard row; plaza walls |
| `ice-dock-plank` | 2 | shore | 1.0 | coast road end |
| `city-lamp-post` (+0.1 m snow cap) | ≤ 6 | road | 1.0 | |
| `meadow-fence-segment` (wood → `#b7a58f`) | ≤ 16 | road, plaza | 1.0 | skating ring, lake-side roads |
| `ice-frozen-lake-disc` | 0 | — | — | cut; the lake is terrain |

New props: 1.0 m boat (shared with ocean/coast), ice-block wall segment 1.0 × 0.35 m.

## Roads and plaza style

Packed snow, main 0.9 m, minor 0.6 m, jitter 0.12 (nearly straight). Lamps every 8 m. `snow city` buildings come in pairs 0.9 m apart on one pad. Ice-block walls 0.35 m tall around non-hub plazas. Two creatures circle the skating ring at 0.8 m/s when present.

## Level-1 marker

Pedestal side `#d9e4ee`, cap `#e6f2fb` with a 0.7 m white snow lip. Props in priority (at `PROP_SCALE_L1`): `mountain-cone` (8 m), pine stand of 3 (6 m), igloo pair (4.8 m), crystal cluster (4 m). Plank gets a 0.5 m snow cap.

## Night

Snow takes the moon: ground `L−18`, `H` +8° toward blue; lake surface `#3f5f88` with `#e6f2fb` facets at 20 %. Windows lit on demonstrated igloos and the observatory; the lighthouse lamp sweeps 6 s per turn (emissive cone 12°). Lamps sparse (every 8 m), so the ring of 4 hub lamps is the brightest spot. Optional aurora band later.

## Creature roster

- `bird-ice-1` (hero, `#8fc3ea`): the kiwi waddle sells the snowfield.
- `blob-ice-8333` (alt): hat too tall per review; shorten.
- `biped-ice-2` (`#7fd1c0`, tuft): reads against white.
- `sprite-ice-2` (`#7fd1c0`, bow): plaza sitter.
- `blob-ice-1706` (`#a9d6f5`): low contrast on snow city; tundra or glacier only.
- `bean-ice-1` (`#7fd1c0`, hat): whisker-free bean.

## Open questions for Philote

1. Hub: skating ring on the frozen lake, or the observatory dome on a raised terrace? (pick: ring)
2. Igloo pairs as `snow city` houses, or recoloured city houses only? (pick: alternate both)
3. Coast lighthouse always, or only when the coast topic is complete? (pick: only when complete)
4. Snowfall on by default for ice, or off like every biome? (pick: off, toggle)
5. Lake ice: plain two-facet tint, or dark crack strips? (pick: plain)
