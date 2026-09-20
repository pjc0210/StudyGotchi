# Nordic Volcanic Highlands: factory step 3 directions

Status: review directions, 2026-09-20. All three use the camera-corrected footprint in [`../maps/nordic-volcanic-highlands-plan-v4.svg`](../maps/nordic-volcanic-highlands-plan-v4.svg) and the reference synthesis in [`nordic-volcanic-highlands.md`](nordic-volcanic-highlands.md). These are art-direction alternatives, not separate maps.

## Locked footprint and progression

All directions keep the `328 × 284 m` world, `(0,0)` camera target, `41–49 m` S-fjord, `127 × 98 m` connected archipelago basin, three open preserves, three bridges, three boat lanes, five district polygons, and fixed headland centre `(133,−90)`. Ground, water, bridge, preserve, skyline-foot, headland, and the measured `20.014 m` minimum clearance never move. The camera stays south/front, looking north/back at pitch `34–40°`, FOV `26°`, yaw `−35° / 0° / +35°`, and dolly `0.6–1.6×`.

| district | centre | jitter / yaw | anchor visible with buildings hidden | shared population axis |
|---|---:|---:|---|---|
| Fjord village + quay | `(−84,31)` | `7 m`; `−18° ±22°` | T-quay, `19 m` crossbar, plus `8 × 6 m` boathouse | 0 anchor; 25% boathouse + 2 homes; 50% 5 homes + fish racks; 75% 8 homes + market; 100% second dock + cargo skiff |
| Basalt canyon + mine/forge | `(−124,−64)` | `8 m`; `+12° ±18°` | `16 m` gantry across `6 m` black slit | 0 gantry/adit; 25% forge; 50% ore yard + 2 sheds; 75% hoist + carts + lamps; 100% second adit |
| Highland hamlet + pasture | `(−27,−49)` | `9 m`; `−6° ±28°` | crossed `15 × 8 m` and `13 × 7 m` turf halls | 0 halls; 25% red shed; 50% 18 m wall + 2 crofts; 75% smokehouse + hay yard; 100% communal drying barn |
| Geothermal farms + outpost | `(76,−14)` | `10 m`; `+17° ±20°` | `15 m` steam tripod plus 3 aqua pools | 0 tripod/pools; 25% turf shed; 50% 3 plots + pipe; 75% survey hut + racks; 100% fourth pool + second collector |
| Lava archipelago | `(67,92)` | `6 m`; `+31° ±14°` | `13 m` natural arch on 3 unequal islets | 0 arch/islets; 25% beacon; 50% 4 cooled steps; 75% sampling shelter + 2 beacons; 100% mooring + instrument mast |

Population is fixed-ground in five bands: 0 / 25 / 50 / 75 / 100%. Residents encode finished problem sets. Course fraction grows only the environmental volcano skyline: 3 broad `8 m` shoulders → 5 at `11 m` → 7 at `15 m` with shallow asymmetric caldera → 9 at `18 m` plus `12 m` rear row → 11 at `22 m` plus complete rear row. The caldera glow occupies at most `8%` of its arc.

Shared spacing after maximum jitter is: canyon–hamlet `20.336 m`, hamlet–geothermal `20.184 m`, geothermal–lava `20.014 m`, geothermal–headland `27.175 m`, and all other district-edge gaps `35.350–195.482 m`. The conservative runtime minimum is therefore `20.014 m`. P1 `30 × 18 m`, P2 `28 × 26 m`, and P3 `34 × 32 m` remain empty.

Camera validation is limited to the actual rig. At yaw `−35°`, default and maximum dolly retain the north skyline while the west wing fades into fog. At yaw `0°`, both dollies frame the full caldera row behind the fjord. At yaw `+35°`, both dollies retain the north skyline while the east wing fades into fog. At all six checks, foreground fjord water continues under the south crop; no front skyline, coastline, terrain edge, or circular enclosure is visible.

## V1 hard-audit trace across all 12 references

| reference | v1 finding | v4 disposition |
|---|---|---|
| `01-volcanic-canyon.jpg` | Black slit and bridge were present, but canyon/hamlet envelopes overlapped by `11.1 m` at maximum jitter | Canyon moved `42 m` west; post-jitter clearance is `20.336 m`; lava remains a `0.5 m` seam |
| `02-village-facing-volcano.jpg` | Settlement-to-skyline scale contrast existed only in prose; the skyline footprint was visually ambiguous | Broad shoulder footprint is drawn across the north rim; village remains small and no hero cone appears |
| `03-volcanic-archipelago.jpg` | Failed: “boat-only” lava islets sat on green ground | Islets now occupy a connected `127 × 98 m` fjord-water basin with no road bridge |
| `04-modular-lava-landscape.jpg` | Crack pattern was useful, but three similar islets could read as a repeated kit | Islets use 6-, 7-, and 8-vertex footprints at three scales; only one carries the `13 m` arch |
| `05-volcanic-settlement.jpg` | Forge warmth was separated, but the ridge route cut too close to district envelopes | Track was redrawn through the moved centres; forge stays low and no windmill/repeated hut kit is used |
| `06-volcano-shape-kit.png` | Failed visually: v1’s north trace and south baffles read as sharp Alpine peaks | North trace is flattened into wide caldera shoulders; all south/front skyline geometry is removed |
| `07-volcanic-flora.jpg` | Aqua/black contrast was present but competed with lava on adjacent ground | Geothermal moved to `(76,−14)` and lava to `(67,92)` with `20.014 m` post-jitter clearance and water between |
| `08-volcanic-outpost.jpg` | Single tripod avoided the grid, but its district nearly touched the headland and lava envelope | Headland moved to `(133,−90)`; tripod remains unique; no tower repetition or neon grid |
| `09-norway-fjord-village.jpg` | Painted quay ribbon read Nordic, but water did not dominate enough around district 5 | Enlarged connected basin makes water the largest field; quay remains a thin red/cream shoreline ribbon |
| `10-gudvangen-fjord-valley.jpg` | S-fjord negative space succeeded, but the camera model incorrectly assumed a south horizon | Fjord now runs beneath the south/front camera crop; only the north/back has near/rear skyline rows |
| `11-undredal-fjord-village.jpg` | Uneven quay density and pasture gap succeeded | Retained; no church silhouette, exact village trace, or white-house dominance |
| `12-southern-norway-village.jpg` | Turf halls and long red masses succeeded | Retained as crossed halls with uneven yaw; suburban spacing and copied barn profile remain excluded |

## Direction A — Fjord First / Ashen Homesteads — designer pick

**Mood.** A quiet Norwegian settlement lives beneath charcoal volcanic shoulders; the water and painted timber read first, geothermal steam second, lava last.

### Palette

| role | hex | note |
|---|---|---|
| ground | `#68765b` | muted olive highland turf |
| accent | `#c85643` | one painted-red object per district |
| side / cliff | `#2e3440` | blue-charcoal basalt |
| basalt top | `#4b4a52` | neutral, never purple |
| road core / edge | `#8a7f6d` / `#544f49` | warm gravel over dark kerb |
| wet | `#526a68` | desaturated teal shore |
| water / deep | `#315b70` / `#203f52` | largest colour field |
| geothermal | `#7cc8be` | pool and valve only |
| lava / hot | `#d95336` / `#ffad42` | archipelago and canyon seams only |
| timber cream / turf roof | `#e8dfc9` / `#556b46` | Nordic settlement pair |
| night window | `#ffe9a8` | fixed |

### Terrain and horizon

Use mossy, gently rolling ground with `±0.6 m` relief between districts. Fjord cliffs are `5–9 m` dark faces; settlement shelves remain flat. The skyline exists only north/back: broad, layered, slightly snow-traced `#c7d4d6`, never a central cone, with a cooler rear row `#55616a`. East/west wings taper into fog. South/front has no skyline or coastline; fjord water and ground continue beneath the camera crop as shown in v4.

### District art

| district | anchor treatment | population treatment | district accent |
|---|---|---|---|
| Fjord village + quay | dark-plank T with ochre `#d08a3c` boathouse | red/cream timber, turf roofs, sparse fish racks | red quay house `#c85643` |
| Basalt canyon + mine/forge | pale timber gantry over unlit black slit | low forge, ore carts, soot-grey sheds; lava only as 0.5 m seams | forge door `#ffad42` |
| Highland hamlet + pasture | crossed turf halls and dry-stone fence | long low red/cream crofts with broad pasture gaps | drying barn `#c85643` |
| Geothermal farms + outpost | pale tripod over 3 aqua pools | turf sheds, fenced plots, short dark pipes; no orange | valve wheel `#c85643` |
| Lava archipelago | low black arch with one orange seam | tiny neutral shelter and cooled steps; no trees or houses | one seam `#d95336` |

### Landmark s1 / s2 / s3

- **Persists:** a `9 m` basalt cairn ring on the fixed east headland; 3 split stones and a central socket remain visible at every stage.
- **s1:** cairn ring, `2.5 m` high; no light.
- **s2 grows:** add a `7 m` open wayfinding ring and `9 m` timber mast; a thin aqua sightline points toward the fjord.
- **s3 grows:** add a `13 m` bifurcated beacon crown and 3 wind vanes without widening the ring.
- **Lights:** s2 has 3 windows at `#ffe9a8 ×1.2`; s3 lens uses `#ffe9a8 ×1.6` and a slow `110°` sweep. Stone and headland never emit.

### Globe marker

| side / top / lip | rim treatment | P1 `8 m` | P2 `6 m` | P3 `4.8 m` | P4 `4 m` | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|
| `#2e3440` / `#68765b` / `#526a68` | irregular basalt lip cut by one front-right fjord notch | broad asymmetric caldera shoulder, no cone | steam tripod + aqua pool | crossed turf halls | low lava arch | P4 seam `#d95336` | dark shoulder over a blue-notched moss disc |

### Night

Ground shifts to `#34434a`; water to `#172f40`; cliff to `#202631`. Windows and quay lamps use `#ffe9a8 ×1.6`; geothermal pools emit `#7cc8be ×0.7`; lava uses `#d95336 ×1.1` with no bloom beyond `2 px` at 96 px. No red sky. Fog becomes `#52606a`.

## Direction B — Steam Country / Sulfur Moss

**Mood.** A working highland community channels warm springs through olive moss and pale timber; geothermal craft is the main secondary read while lava stays archaeological.

### Palette

| role | hex | note |
|---|---|---|
| ground | `#727b54` | sulfur-olive turf |
| accent | `#e2a33b` | ochre utility marks |
| side / cliff | `#313841` | cool basalt |
| basalt top | `#55565a` | lighter than A |
| road core / edge | `#94866d` / `#5d5548` | mineral gravel |
| wet | `#667a70` | warm-grey shore |
| water / deep | `#38677a` / `#234756` | brighter glacial teal |
| geothermal | `#91d6c6` | larger visual share than A |
| lava / hot | `#b94b32` / `#ef8a38` | old, dim seams |
| timber red / cream | `#a54b3f` / `#eadfc3` | restrained settlement notes |
| night window | `#ffe9a8` | fixed |

### Terrain and horizon

Keep the same relief and camera-facing north skyline, but add pale mineral rims `#b9c8ad` around only the three geothermal pools and 2–4 m steam wisps at the north caldera notch. The skyline remains charcoal and broad; no fumarole is taller than a shoulder. Shore moss is continuous except at the black canyon and archipelago basin; the south/front remains open beneath the camera.

### District art

| district | anchor treatment | population treatment | district accent |
|---|---|---|---|
| Fjord village + quay | cream T-quay cap with red boathouse | cream and red timber, ochre nets, no industrial crane | net floats `#e2a33b` |
| Basalt canyon + mine/forge | timber gantry with mineral-stained footings | inactive-looking mine, low smithy, grey carts | ore marker `#e2a33b` |
| Highland hamlet + pasture | olive turf halls with cream gables | spring-fed troughs, crofts, herb-drying racks | drying cloth `#e2a33b` |
| Geothermal farms + outpost | tripod and 3 brighter pools | visible short pipe loops, mineral beds, bath shed, survey mast | pool valves `#e2a33b` |
| Lava archipelago | cooled arch, orange nearly absent | geology shelter, sample flags, weather mast | one old seam `#b94b32` |

### Landmark s1 / s2 / s3

- **Persists:** a `9 m` mineral-stained basalt ring and central spring socket.
- **s1:** 3 cairn stones around a shallow non-emissive basin.
- **s2 grows:** add a `7 m` copper-toned instrument ring and 2 steam gauges.
- **s3 grows:** add a `13 m` weather mast with 3 open vanes and a suspended lens.
- **Lights:** s2 gauges use `#91d6c6 ×0.8`; s3 lens uses `#ffe9a8 ×1.5`; the basin never glows.

### Globe marker

| side / top / lip | rim treatment | P1 `8 m` | P2 `6 m` | P3 `4.8 m` | P4 `4 m` | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|
| `#313841` / `#727b54` / `#667a70` | split basalt with 3 pale mineral deposits and fjord notch | broad steam-notched caldera shoulder | large tripod + aqua pool | turf hall pair | cooled arch | P2 valve `#e2a33b` | dark shoulder and forked tripod over olive/blue notch |

### Night

Ground shifts to `#3e493b`; water to `#1d3b49`; cliff to `#232a31`. Windows use `#ffe9a8 ×1.5`; pool edges `#91d6c6 ×1.0`; 4 steam wisps catch pale aqua light but do not emit. Lava is `#b94b32 ×0.6`. Fog is `#5a6564`; sky stays blue-grey.

## Direction C — Ember Fjord / Black-Rock Evening

**Mood.** A harsher black-rock fjord carries sparse Nordic settlement and a remote ember archipelago; lava is more visible than A or B but remains physically separated from daily life.

### Palette

| role | hex | note |
|---|---|---|
| ground | `#5f6854` | darker lichen turf |
| accent | `#e76b3f` | ember orange, one object per district maximum |
| side / cliff | `#272b33` | near-black basalt |
| basalt top | `#3b3c42` | dark neutral |
| road core / edge | `#807569` / `#47433f` | ash gravel |
| wet | `#495f61` | dark shore |
| water / deep | `#294f64` / `#183546` | strong cold contrast |
| geothermal | `#70bcb5` | subdued |
| lava / hot | `#e45b35` / `#ff9b38` | confined but brightest |
| timber red / cream | `#9f4038` / `#ded5bf` | fewer painted surfaces |
| night window | `#ffe9a8` | fixed |

### Terrain and horizon

Use the same fjord, basin, north/back double skyline row, and fog-tapered side wings. Expose more black basalt at canyon and shore, but keep at least `62%` of interior land as turf so the world does not become generic Volcanic. The caldera has a thin `#e45b35` break only at 75–100%; it never forms a full orange rim. Snow trace is omitted; fog is cooler `#c8d0d1`; no south/front skyline is allowed.

### District art

| district | anchor treatment | population treatment | district accent |
|---|---|---|---|
| Fjord village + quay | black quay, cream boathouse with red door | sparse dark-timber houses, turf roofs, wide water frontage | one red door `#e76b3f` |
| Basalt canyon + mine/forge | near-black gantry and brighter forge aperture | compact ore yard, charcoal sheds, visible but narrow seam | forge aperture `#ff9b38` |
| Highland hamlet + pasture | dark turf halls with cream gables | fewer crofts, more stone wall and lichen meadow | red smokehouse `#9f4038` |
| Geothermal farms + outpost | dark tripod, subdued teal pools | black pipe stubs and low sheds; no orange machinery | survey pennant `#e76b3f` |
| Lava archipelago | strongest black arch / orange seam contrast | black sampling shelter, ember beacons, cooled stepping stones | arch seam `#e45b35` |

### Landmark s1 / s2 / s3

- **Persists:** a `9 m` black cairn ring with one split ember-coloured stone.
- **s1:** low cairn and dark socket; ember stone is matte.
- **s2 grows:** add a `7 m` obsidian observation ring and `9 m` mast.
- **s3 grows:** add a `13 m` open crown with 4 smoke-cut fins; no crater form.
- **Lights:** s2 has one `#e45b35 ×0.8` slit; s3 lens uses `#ffe9a8 ×1.4`; the fins silhouette rather than glow.

### Globe marker

| side / top / lip | rim treatment | P1 `8 m` | P2 `6 m` | P3 `4.8 m` | P4 `4 m` | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|
| `#272b33` / `#5f6854` / `#495f61` | sharp basalt lip, deep fjord notch, one broken ember seam | broad broken caldera shoulder | dark tripod + small teal pool | turf hall pair | high-contrast lava arch | P4 seam `#e45b35` | black shoulder and arch separated by a cold blue notch |

### Night

Ground shifts to `#303834`; water to `#142a39`; cliff to `#171b22`. Windows use `#ffe9a8 ×1.4`; geothermal uses `#70bcb5 ×0.5`; lava uses `#e45b35 ×1.4`, limited to district 5 and the canyon aperture. Fog becomes `#414b55`. The sky remains navy, never red or orange.

## Shared seed rules

Use `hash(courseId, "nordic-volcanic-highlands", directionId, districtId)`. Sample district centres only inside the v4 envelopes, then rejection-sample until every conservative post-jitter district clearance is `≥20 m`, preserves remain clear, and every boat lane retains `8 m`. Randomize centre, legal yaw, fixed building slots, 2–3 colour-order permutations, and clutter density. Never randomize terrain, water, bridge centres, preserves, skyline feet, headland, camera model, anchor category, or progression counts.

Each district has 1 anchor at `11–16 m`, 2–3 medium masses at `6–9 m`, and small props at `3–5 m`, with uneven `3–11 m` spacing. No two adjacent buildings may share both yaw within `8°` and footprint within `10%`. Reject mirrored arrangements, equal-radius district rings, repeated 3-building kits, and any seed that puts orange lava and aqua geothermal accents in the same district.

## 48 px, nearest-biome, and protected-silhouette checks

| direction | props hidden at 48 px | props shown at 48 px | nearest-biome separation | protected-silhouette check |
|---|---|---|---|---|
| A | blue fjord leads from open front crop to north charcoal shoulders | red quay, aqua tripod, and orange arch stay 6+ px apart | vs `volcanic`: water is largest field and no cone; vs `harbor-town`: no ship/crane; vs `alpine`: no cable/twin spike | never use cone + orange rim + forge-house; P1 is a broad offset shoulder |
| B | brighter teal fjord and olive cap remain non-circular | forked tripod is second read after fjord; old lava is tertiary | vs `volcanic`: geothermal aqua, mineral olive, and weak lava; vs `swamp`: steep charcoal rim and no reeds; vs `harbor-town`: no warehouse row | no neon grid/tower stack from ref 08; marker keeps only one tripod |
| C | near-black rim still exposes a cold blue fjord notch and 62% turf interior | lava arch is isolated at right; quay remains Nordic red/cream | vs `volcanic`: orange occupies under 4% of marker and no crater cone; vs `ice-town`: no snow cone/lighthouse; vs `alpine`: no snow/cable | no red sky, lava ocean, full glowing crater rim, or skull-like cone |

## Exactly three risks

1. Direction C can collapse into shipped generic Volcanic if orange exceeds `4%` of marker pixels or lava appears outside district 5/canyon seams; enforce the colour-area and placement gates.
2. Direction B can read as a sci-fi utility world if pipes form a grid or the tripod repeats; cap visible pipe runs at 3 and keep exactly 1 tripod.
3. Direction A can read as a generic Norwegian village if the north/back double skyline and geothermal/canyon anchors are weak; require all 5 anchors in the 48 px overview.

## Review sheet
1. Keep shared footprint/progression for all three? **Designer: keep.**
2. Choose A Fjord First, B Steam Country, or C Ember Fjord? **Designer: A.**
3. Keep water as the largest colour field? **Designer: keep.**
4. Keep lava confined to archipelago plus canyon seams? **Designer: keep.**
5. Keep the volcano as skyline, never the course landmark? **Designer: keep.**
6. Landmark A cairn → ring → aurora beacon? **Designer: keep.**
7. Marker P1 shoulder / P2 tripod / P3 halls / P4 arch? **Designer: keep.**
8. Keep 5 multi-purpose districts rather than split features? **Designer: keep.**
9. Keep v4 camera framing, `≥20 m` jitter gaps, and three open preserves? **Designer: keep.**
10. Approve A for step 4 decisions, or change one palette/anchor/landmark parameter?
