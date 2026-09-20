# Layout grammar (level 2, on the sphere)

Composition rules for one course island, implementable from `galaxy.ts` (`Course`, `Topic`, `Concept`, `DecorItem`, `TerrainKind`). Everything lives on the planet of radius `R(N)` (bible §3); nothing is unrolled. Lengths in metres; deterministic from `planet.seed`. Pass order: island → plazas → roads → terraces → buildings → clusters → shores → decals → lights → creatures; later passes only read earlier outputs.

Palette offsets: `L+6` = lightness +6 % (HSL), `H−4` = hue −4°, from the kind's `tint`.

## 0. Coordinates on the sphere

- **Biome frame** at `C = course.dir`: `up = dir`, `east`, `north` (`tangentFrame`). Layout coordinates `(x, z)` are metres in this frame, x east, z south.
- **Exp map**: `(x, z) → dir` by rotating `up` through `ρ = √(x² + z²) / R` toward `(x·east − z·north)`. Radial lengths exact, circumferential shrink by `sin ρ / ρ` (≤ 3 % at 24°), so all spacing checks run in `(x, z)`. `logmap` is the inverse.
- **Height is radial**: `p = (R + h(dir)) · dir`; `h` = `kindSample` height (rescaled: `peaks` ≈ 3 m, `flat` ≈ 0.1 m, water bowl −0.6 m) plus terraces (e). Sea level `h = −0.4`.
- **Local frame**: `N = dir`, `T` = curve tangent in the tangent plane, `B = N × T`; objects use `orientOnSphere(dir, yaw)`.
- **Topics** are re-laid inside the island: centres by best-candidate (18 tries) within `0.8 · r_b` of `C` in `(x, z)`, `r_t = clamp(0.62 · nearest-neighbour distance, 7, 14)` m; the old `topic.radius` (rad) is not used. The outermost topic still takes the `water` kind, its neighbour `shore`.

## 1. Island

`inside(dir)`: metaball sum `Σ max(0, 1 − (dist(dir, t.dir) / (1.15 r_t))²) ≥ 0.5`. Rim beach: signed distance `b` to the boundary (positive inland), `0 < b < 1.5` lerps height 0.4 → −0.4 and tint → biome `wet`; `b < 0` is sea. Water topics touching the boundary become bays; interior ones are lakes.

## (a) Plazas: flattened caps

- Plaza at `topic.dir`: a cap of radius `r_p` = 2.2 m (city 3.0 m) with `h` held at `h(topic.dir) + 0.08`; 12-gon pad in the biome `plaza` tint, stone rim `#b7a58f` 0.12 m, riser where the step > 0.15 m.
- The topic nearest `C` is the **hub**: `r_p` = 4.0 m plus the biome hub set (city: fountain, `planter-tree` ×4, `bench` ×4; ice: skating ring).
- Grand landmark stage from demonstrated fraction `d`: 0 → pad with a 0.5 m stake; `0 < d < 0.5` → s1; `0.5 ≤ d < 1` → s2; `d = 1` → s3. +Z faces the road exit toward the hub. Upgrade: 500 ms pop, `landmark-upgrade.wav`.

## (b) Roads: great-circle-ish ribbons

Nodes: plaza centres and concept pads (`logmap` positions).

1. **Spanning tree** per topic: Prim from the plaza, `w = len × (1 + 0.6 · slope) × (water ? 4 : 1)`, `slope = |Δh| / len`.
2. **Loop**: each leaf connects to its nearest non-parent node if the segment crosses no road and `len < 1.5 ×` mean tree edge; stop after `ceil(n / 3)` loop edges.
3. **Inter-topic**: Prim over plazas plus a ring in angular order around `C` (skip ring edges > 30 m). Water topics get one road ending in a dock. The causeway landing joins the hub by a main road.
4. **Winding**: Catmull-Rom through the ends and `k = ceil(len / 6)` interior points offset perpendicular by `±jitter × len` (city 0.25, ice 0.12, others 0.18), alternating sign, seeded. Curves live in `(x, z)`; within the island they are great-circle-ish to < 3 %.
5. **Class**: inter-topic and plaza-adjacent edges **main** (1.2 m, ice 0.9), others **minor** (0.8 m, ice 0.6).
6. **Ribbon**: core = biome `road` tint (default `L−8`), edge band 0.15 m each side at `L+6` of the core, lifted 0.03 m along the normal. Junctions: 12-gon of radius 1.1 × width.
7. **Furniture**: lamps every 6 m on main roads, alternating sides, 0.35 m outside the edge band, facing the road; fences (`meadow-fence-segment` 1.0 m) on the water side of roads within 1.5 m of a waterline and around plaza rims with 1.2 m gaps at entries. City: string lights between lamps ≤ 8 m apart, sag 0.3 m, 7 bulbs.

### Ribbon pseudocode (sphere)

```
function ribbon(curveXZ, width, R, h):
  pts = curveXZ.sample(step = 0.5)             // in (x, z) metres
  for i in pts:
    dir  = expmap(pts[i])                      // unit vector
    dirN = expmap(pts[i+1]); dirP = expmap(pts[i-1])
    T = normalize(dirN - dirP); T -= dir * dot(T, dir); normalize(T)
    B = cross(dir, T)                          // across the road, tangent to the sphere
    for side in [-1, +1]:
      for (w, tint) in [(width/2 + 0.15, edgeTint), (width/2, coreTint)]:
        q = normalize(dir * R + B * side * w)  // step across, then back onto the sphere
        p = q * (R + h(q) + 0.03)              // radial lift above the terraced ground
        emit(p, tint)
  connect consecutive quads as a strip; vertex colours carry the two tones.
Causeways use the same loop with dir sampled by slerp between island landings and h = sea + 0.5.
```

## (c) Buildings

Recipes `house`, `tower`, `chimney`, `lighthouse`, `dock`, plus concept buildings (h).

- Slots every `footprintWidth + 0.5` m along both road edges from 1.5 m past each junction; centre = edge + 0.35 m + half footprint depth; yaw = road normal with +Z toward the road; sides alternate.
- Reject within 0.5 m of a plaza rim, 0.6 m of another building, 1.2 m of a pad it does not own, or on slope > 12° after terracing.
- Jitter ±0.12 m along the normal, ±4° yaw, scale 0.9–1.15; never mirror.
- Fill order: main roads outward from the plaza; stop at `round(kind count × d)`, ≤ 12 per topic.

## (d) Prop clusters

Recipes `pine`, `roundTree`, `rock`, `crystal`, `shrub`, `flower`, `cactus`, `palm`, `hexColumn`, `coral`, `iceberg`, `floe`, `geyser`, `mountain`.

- Centres by best-candidate (12 tries) in the topic cap, ≥ 2.5 m apart, ≥ 0.4 m from road edge bands, ≥ 0.6 m from buildings, ≥ 0.3 m from pads. `mountain` ≥ 4 m from roads, biased to the topic rim.
- Members: 3 (a fourth at 25 %), angles 0°, 120°, 240° ± 25°, radii 0.35–0.7 m; scales 1.0, 0.8, 0.65 largest-first by distance from the nearest road; random yaw.
- Mixing inside a cluster only per the biome sheet. Budget 3–5 clusters per topic; empty ground between is the point.

## (e) Terraces: radial steps

- Under every landmark, building and pad: hold `h` constant within `footprint_radius + 0.3` m, smoothstep blend over 0.4 m; stone rim 0.1 m tall where the step > 0.15 m.
- Within 3 m of any road on `hills`, `raised`, `peaks`, `slope`: quantise `h` to 0.5 m steps (`h = 0.5 · round(h / 0.5)`); risers are radial (along the normal) in the biome `base` tint; roads climb them with 1.5 m ramps.
- `water` and `flat` profiles are never terraced. Vertex normals of risers stay hard (facets are a feature).

## (f) Shorelines

Along any waterline (lake, bay, or the island rim), with `s` = signed surface distance (positive on land):

- `0 < s < 0.6`: tint lerps to the biome `wet` colour (default `L+8`, hue 10° toward the water).
- `−0.9 < s < 0`: water `alt` lerps 35 % toward the land tint (shallows).
- Shard row on `s = 0.15`: one instance every 0.7 m (ice 1.4 m), jitter 0.2 m, random yaw, scale 0.5–0.9. Ice: `ice-block-stack` × 0.4 plus `floe` discs 1.2 m out; others: white foam wedges 0.3 × 0.1 m bobbing 0.02 m at 0.4 Hz.
- Docks: a road meeting water continues 2 m as `dock-plank` segments at `h = 0.2`; one boat 1.5 m off the end.

## (g) Ground variation

- Tint per vertex: `kind.tint`, then `L += 5 · fbm(p · 0.08) + 2 · fbm(p · 0.5)`, `H += 3 · fbm(p · 0.12 + 17)`, with `p` the world point; cross-kind blends keep `SOFT_TOPIC`.
- Detail decals (instanced, ≤ 40 tris, ≤ 0.05 m tall): 0.06 / m² on `flat`, 0.02 / m² elsewhere, never on roads, pads or water; per biome sheet (snow patches, grass tufts, cracked earth, cobble patches). Decals are the only parent-less objects allowed.

## (h) Density budgets and progress

Per topic (reference radius 10 m):

| item | max | driven by |
|---|---|---|
| grand landmark | 1 | stage from `d` |
| concept pads | spots (4–6) | always; 0.6 m disc in road tint |
| sprouts | touched, not demonstrated | 0.3 m sprout on the pad |
| concept buildings | demonstrated concepts | the pad's building takes the nearest road slot (c); the pad becomes its front step |
| filler buildings | `round(kind count × d)`, ≤ 12 | (c) |
| prop clusters | 3–5 | static |
| lamps | ≤ 8 | static; lit count at night = `round(d × lamps)` |
| fence segments | ≤ 20 | static |
| decals | ≤ 25 | static |
| creatures | 0–3 | course total = finished psets; newest 3 at the hub, then one per topic by `d` |

Island totals: ≤ 1,200 instances, ≤ 180 draw calls (props instanced per recipe). Creatures walk on roads and plazas only (`walk`, 0.5 m/s, `orientOnSphere` each frame), pause 3–8 s at pads, `sleep` on benches at night.

## Acceptance (engineer self-test)

1. No building > 0.6 m from a road edge; no prop < 0.4 m from one.
2. Every cluster has ≥ 2 members and ≥ 2 distinct scales.
3. Road graph connected; ≥ 1 cycle per topic with ≥ 5 pads; the causeway landing reaches the hub.
4. Every landmark and building stands on a cap with slope < 3°, its up vector within 0.5° of the local normal.
5. Every waterline, island rim included, has both tint bands and a shard row.
6. Same seed and N → byte-identical placement.
