# Medieval Meadow Kingdom: three art directions

Status: factory step 3, camera-corrected 2026-09-20. Map/synthesis only. All directions use `../maps/medieval-meadow-kingdom-plan-v3.svg`; footprint, district progression, water, roads, camera, and course data are identical.

## V1/V2 audit and V3 camera correction

| gate | prior finding | current correction |
|---|---|---|
| References | The river spine, mill, timber roofs, open castle court, and broad meadow matched the take list. The forest/farm circles still read closer to generic zone bubbles than land-shaped districts. | Solid footprints are redrawn as tighter irregular polygons; dashed envelopes remain visibly separate from authored ground. |
| Spacing | D1–D2, D2–D4, and D2–D3 authored boundaries contradicted the stated `18 m` minimum; some drawn extents also exceeded their legend dimensions. | Sampled curved-boundary gaps are now `28.8 m`, `37.2 m`, and `39.0 m`; every other pair is `59.1–142.3 m`. Legend dimensions now match the rounded revised bounds. |
| Camera / Green Crown | V2 incorrectly assumed an all-direction camera and wrapped the Green Crown around all sides, including a south/front ridge beneath the camera. | V3 fixes the camera south/front looking north/back at pitch `34–40°`, yaw `−35°/0°/+35°`. The Green Crown occupies only the north/back with east/west forest wings tapering out by `z = +24 m`; foreground meadow and river continue under the camera and crop/fog out. |
| Castle-only landmark | The castle was singular, but its v1 district/envelope reached the eastern skyline band, visually merging landmark and horizon. | Castle ground is `47 × 43 m`, its jitter envelope stops at least `5 m` before the Green Crown, and the moat/headland remains reached from settlement space only by B3. |
| River/meadow space | The `18 m` river and four preserves read clearly; no additional buildings were needed. | River, tributary, bridges, and preserves remain unchanged. Smaller districts increase readable open meadow without weakening capacity. |
| Anchors | The `14 m` forest oak competed with the `18 m` castle gatehouse. | Forest oak drops to `11 m`; castle remains the only `18 m` authored vertical and the only course landmark. |

## Shared footprint and progression

- World: `278 × 260 m`; overview frame `184 × 176 m`; origin `(0,0)`, `+x` east, `+z` south.
- Camera is fixed at the south/front, looking north/back: pitch `34–40°`, FOV `26°`, yaw `−35°/0°/+35°`; test all three yaws at default and maximum dolly.
- Centres: Forest `(-82,-64)`, River Village `(-35,-10)`, Bridge Market `(+36,+20)`, Farm/Common `(-76,+54)`, Castle `(+75,-67)`.
- Open preserves stay fixed: P1 `44 × 30 m`, P2 `42 × 34 m`, P3 `46 × 36 m`, P4 `50 × 38 m`.
- River stays `18 m` wide inside a `28 m` wet band; tributary `7 m` inside `13 m`; B1 `20 × 5 m`, B2 `27 × 6 m`, B3 `16 × 5 m`.
- Population slots by `0 / 25 / 50 / 75 / 100 %`: Forest `0/1/3/5/6` homes/work sheds; River `0/1/3/5/6` homes/mill additions; Market `0/2/4/6/7` stalls/guild bays; Farm `0/1/2/4/5` cottages/work structures. The anchor exists at `0 %`; accent appears at `25 %`.
- North/back Green Crown skyline by `0 / 25 / 50 / 75 / 100 %`: `8` crowns at `5–7 m`; `12` at `7–9 m`; joined north ridge at `10 m`; north second row at `12–15 m`; `3` back shoulders at `16 m` plus one oak crown at `18 m`. East/west wings taper into fog; no skyline geometry exists south/front.
- Settlement ground, river, roads, bridges, district polygons, preserves, and castle headland elevation never change.
- Landmark stage is course-wide: s1 `<33 %`, s2 `33–66 %`, s3 `≥67 %`. Every direction stays inside the same `47 × 43 m` solid headland and `18 m` maximum silhouette envelope.

## Direction A — Green Crown Commons — **designer pick**

**Mood.** A bright working kingdom with long grass pauses, a cool river, timber craft, and one warm limestone castle; it carries the meadow breadth of `05`, the mill language of `06`, and only the courtyard restraint of `02`.

### Palette

| role | hex |
|---|---|
| ground / ground alt | `#9fcf75` / `#b9dc83` |
| accent family | `#d9765c` |
| side/cliff / forest | `#6f8055` / `#4f7d4a` |
| road core / edge | `#d8c49a` / `#a58d68` |
| court / limestone | `#d9d2c4` / `#c7b98f` |
| wet / water | `#6f9c66` / `#5faeb6` |
| timber / slate roof | `#6b4a3a` / `#475463` |
| night window | `#ffe9a8` |

**Terrain and skyline.** Round meadow folds use two broad greens, not tiled patches. Along the north/back only, the Green Crown alternates oak clumps and low limestone shoulders with a dark second row; short forest wings taper into side fog. Water uses `2–3` large facets per `8 m`, and flower colour is limited to `2–5` patches inside each preserve. South/front is uninterrupted meadow and river under the camera.

### Districts

| district | 48 px anchor | population axis at 0→100 % | district accent |
|---|---|---|---|
| Forest Hamlet + Timber Common | `11 m` broad oak + `8 m` saw wheel | clearing → shed → `3` homes → `5` homes → `6` homes + full sawyard | amber `#e8a13a` |
| River Village + Mill | `9 m` wheel + unequal roof pair | wheel → mill hut → `3` homes → `5` homes → `6` homes + landing | coral `#d9765c` |
| Bridge Market + Guild Court | `27 m` bridge + `3` canopy peaks | bridge → `2` stalls → `4` stalls → `6` stalls → `7` bays/stalls | ochre `#c96f45` |
| Farm + Village Common | `13 m` windmill + L-barn | windmill → barn → `2` work slots → `4` slots → `5` slots + orchard gate | wheat `#e6c45a` |
| Crown Headland + Castle Court | recessed gate + unequal round towers | empty forecourt → s1 court → s2 court → s3 court; no town spill | rose `#b85c6b` |

### Landmark

| stage | persists | grows | lights |
|---|---|---|---|
| s1 | headland, moat, B3, `6 m` gate arch, one `8 m` round tower | low forecourt wall and `2` hedge rooms | `2` gate lanterns |
| s2 | all s1 geometry and the open central court | gatehouse to `13 m`, second tower to `10 m`, one side hall, `6` windows | gate lanterns + `6` windows |
| s3 | gate axis, both towers, open court, side hall | gatehouse to `18 m`, towers to `14/12 m`, second side hall, fountain ring | `12` windows + `4` court lamps + fountain pin light |

Nothing outside the castle envelope grows with landmark stage. The north/back Green Crown is still the only terrain skyline and contains no tower.

### Globe marker

| side / top / lip | rim | P1 `8 m` | P2 `6 m` | P3 `4.8 m` | P4 `4 m` | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|
| `#6f8055` / `#9fcf75` / `#b9dc83` | irregular turf fringe with `6` root knuckles | oak-ridge pair `#4f7d4a` | twin gatehouse `#c7b98f`, roof `#b85c6b` | mill wheel `#6b4a3a` | bridge arc `#a58d68` | gate roof `#b85c6b` | dark double crown above a green cap, one pale gate notch |

**Night.** Ground shifts to `#30483b`, water to `#315f6b`, forest to `#294233`, roofs to `#343843`; windows emit `#ffe9a8 × 1.6`. Only the mill door, market’s `4` lamps, farm door, and castle stage lights emit. No river glow or universal lantern line.

## Direction B — Rosewater River Court

**Mood.** A warmer, more courtly river kingdom: rose tile and dark timber punctuate sage meadows, but the settlement remains five separated working grounds rather than a dense fantasy city.

### Palette

| role | hex |
|---|---|
| ground / ground alt | `#a8cf7a` / `#c1dc8b` |
| accent family | `#c85f68` |
| side/cliff / forest | `#667650` / `#456f46` |
| road core / edge | `#d7bea0` / `#9c7d66` |
| court / limestone | `#d8c7b5` / `#c8b58d` |
| wet / water | `#6c9566` / `#5cabb4` |
| timber / slate roof | `#63453b` / `#4b4651` |
| night window | `#ffe9a8` |

**Terrain and skyline.** Meadow folds are softer and more sage than A. The north/back Green Crown is mostly oak with `3` warm limestone shoulders at full progress and short tapered side wings; clipped hedge blocks stay inside castle and market only. The river is greener and less cyan, with rose reflections forbidden. No ridge or forest sits under the south/front camera.

### Districts

| district | 48 px anchor | population axis at 0→100 % | district accent |
|---|---|---|---|
| Forest Hamlet + Timber Common | flat-topped oak + dark wheel | clearing → charcoal shed → `3` rose-roof homes → `5` → `6` + log court | honey `#d99a43` |
| River Village + Mill | wheel + one rose/one slate roof | wheel → mill hut → `3` homes → `5` → `6` + landing | rose `#c85f68` |
| Bridge Market + Guild Court | pale bridge + striped canopy trio | bridge → `2` stalls → `4` → `6` → `7` + guild bay | copper `#bb6d45` |
| Farm + Village Common | cream-sail windmill + L-barn | windmill → barn → `2` slots → `4` → `5` + orchard gate | oat `#dfba55` |
| Crown Headland + Castle Court | rose-roof twin towers + deep gate | forecourt → s1 → s2 → s3; hedges occupy fixed rooms | wine `#9e465d` |

### Landmark

| stage | persists | grows | lights |
|---|---|---|---|
| s1 | headland, moat, bridge, deep gate, one `8 m` tile-capped tower | `2` low rose-tile galleries | `2` gate lanterns |
| s2 | s1 gate and galleries | gatehouse to `13 m`, second tower `10 m`, one dark-timber hall, `4` hedge blocks | `6` arched windows |
| s3 | twin-tower asymmetry and open court | gatehouse `18 m`, towers `14/12 m`, second gallery, central sundial/fountain | `12` windows + `4` court lamps + sundial pin |

### Globe marker

| side / top / lip | rim | P1 `8 m` | P2 `6 m` | P3 `4.8 m` | P4 `4 m` | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|
| `#667650` / `#a8cf7a` / `#c1dc8b` | soft turf fringe, `6` exposed roots | paired oak crown `#456f46` | rose-tile gate pair `#c8b58d/#c85f68` | dark mill wheel `#63453b` | pale bridge `#d7bea0` | gate roofs `#c85f68` | two rounded trees, then two small rose points over sage |

**Night.** Ground shifts to `#35483d`, water `#315f68`, forest `#263e30`, rose tile `#683b46`; `#ffe9a8 × 1.6` appears in the same fixed lamp/window slots as A. Rose roofs never emit; court hedges remain unlit.

## Direction C — Greywall Pastoral

**Mood.** A quieter border kingdom where cool stepped stone, sparse pines, and working fields carry more weight than decorative roofs; the castle reads as a piece of landform without becoming the horizon.

### Palette

| role | hex |
|---|---|
| ground / ground alt | `#95c982` / `#b5d89a` |
| accent family | `#e0a548` |
| side/cliff / forest | `#71806a` / `#3f704e` |
| road core / edge | `#d4cbb1` / `#958a72` |
| court / limestone | `#c9c8bd` / `#b8b7a5` |
| wet / water | `#668f70` / `#579da9` |
| timber / slate roof | `#625044` / `#4f5b62` |
| night window | `#ffe9a8` |

**Terrain and skyline.** Meadow edges are slightly faceted; the north/back Green Crown alternates broad low hills, sparse pines, and cool limestone shelves, with wings fading at the sides. Its full-progress `16 m` shoulders remain horizontal, not jagged peaks. River facets are larger and greyer than A/B; south/front remains open meadow/water.

### Districts

| district | 48 px anchor | population axis at 0→100 % | district accent |
|---|---|---|---|
| Forest Hamlet + Timber Common | pine-oak crown + squared wheel | clearing → shed → `3` slate homes → `5` → `6` + stone log apron | brass `#d89b3e` |
| River Village + Mill | dark wheel + stepped roof pair | wheel → mill hut → `3` homes → `5` → `6` + stone landing | rust `#c87945` |
| Bridge Market + Guild Court | cool two-span bridge + awning trio | bridge → `2` stalls → `4` → `6` → `7` + guild bay | saffron `#e0a548` |
| Farm + Village Common | angular windmill + low stone barn | windmill → barn → `2` slots → `4` → `5` + orchard wall | straw `#d7b95d` |
| Crown Headland + Castle Court | stepped gate cut + unequal square/round towers | bare court → s1 → s2 → s3; masonry stays sparse | ember `#c76f43` |

### Landmark

| stage | persists | grows | lights |
|---|---|---|---|
| s1 | headland, moat, B3, `6 m` stepped gate recess, one `8 m` squat tower | broken side wall and stone forecourt | `2` gate braziers |
| s2 | gate recess, wall break, forecourt | gate block to `13 m`, second `10 m` tower, one low hall | `4` slit windows + `2` braziers |
| s3 | asymmetric broken-wall profile and open court | gate block to `18 m`, towers `14/12 m`, second low hall, `3` buttresses | `8` slit windows + `4` court braziers |

### Globe marker

| side / top / lip | rim | P1 `8 m` | P2 `6 m` | P3 `4.8 m` | P4 `4 m` | accent object | 48 px silhouette |
|---|---|---|---|---|---|---|---|
| `#71806a` / `#95c982` / `#b5d89a` | clipped turf ledge with `6` stone/root notches | low limestone shoulder + oak `#b8b7a5/#3f704e` | stepped gate `#b8b7a5` | square mill wheel `#625044` | cool bridge arc `#958a72` | gate brazier `#e0a548` | one low grey shoulder, one dark crown, one square gate notch |

**Night.** Ground shifts to `#34484a`, water `#294f5b`, forest `#253e35`, stone `#6f7472`; `#ffe9a8 × 1.6` is limited to approved windows while braziers use `#e0a548 × 1.4`. No bloom may join the two gate towers at `48 px`.

## Shared seed rules

1. Re-sample centre only inside each dashed envelope: Forest `8 m`, River `7 m`, Market `6 m`, Farm `10 m`, Castle `4 m`; yaw limits are `±35° / ±30° / ±25° / ±40° / ±18°`.
2. Reject if solid polygons approach within `20 m`, occupied slots approach water within `4 m`, the castle envelope approaches the Green Crown within `5 m`, or any preserve loses more than `5 %` area.
3. Keep all four preserves and at least `39 %` open meadow/water; flowers remain `2–5` patches per preserve at `1.5–3 m`.
4. House yaw follows its local road at `±18°`; adjacent roofs may not share both yaw and height.
5. Each district uses low `1–2.5 m`, middle `4.5–6 m`, and anchor `8–18 m` silhouettes; castle alone may reach `18 m`.
6. Sample motifs independently; no seed may reproduce one reference’s building count, bridge relation, tree line, and roof sequence together.

## 48 px, neighbour, and protected-silhouette gates

| direction | props hidden | props shown | nearest-biome distinction |
|---|---|---|---|
| A | olive side + bright cap + turf roots + blue slash | oak pair, pale gate notch, wheel circle, bridge arc remain separate | From `jungle-forest-village`: more open yellow-green top, no canopy waterfall. From Nordic highlands: rounded crown, no jagged grey peak/cable/lava. From academy: olive side, no brick or single bell tower. |
| B | sage cap + dark olive side + green-blue slash | rose gate points stay below paired oak crowns; wheel remains circular | From forest: rose/limestone gate and river slash. From academy: rural turf rim and twin gate, not brick coping/single cupola. |
| C | muted green cap + grey-olive side + clipped turf ledge | low grey shoulder, dark oak, square gate, wheel and bridge do not merge | From Nordic highlands: horizontal shelf, no twin peak or cable. From city/academy: `39 %` open meadow and no tower-block/bell-tower P1. |

Closest protected silhouette for all three is the round green W1 pedestal in `03-cartoon-land-and-trees.jpg`. Required differences: `12`-facet olive/grey side, irregular turf/root lip, blue river slash, no sign, no flower/mushroom cluster, and a prop order of Green Crown → gate → wheel → bridge rather than the source arrangement.

## Exactly three risks

1. **Green-family collision.** A/B may drift toward forest or jungle at marker scale. Hold the river slash, limestone gate notch, and brighter meadow top; reject any render where P1 becomes one round tree.
2. **Castle dominance.** Added landmark stages may turn the biome into a dense castle city or merge into the north/back Green Crown. Keep the `5 m` crown buffer, fixed `47 × 43 m` solid headland, open court, and maximum `18 m` gate.
3. **Spacing lost at 100 %.** Population slots may consume the meadow rhythm. Enforce `20 m` district gaps, four preserves, `39 %` open meadow/water, and the listed maximum slot counts.

## Review sheet
1. Direction: **A Green Crown Commons — designer pick** / B Rosewater / C Greywall?
2. Keep v3’s measured district gaps (`28.8 m` minimum; gate `≥20 m`)? **Designer: keep.**
3. Fixed south/front camera, yaw `−35°/0°/+35°`, default/max dolly? **Designer: keep.**
4. Castle towers round/round (A/B) or square/round (C)? **Designer: round/round A.**
5. River water A `#5faeb6`, B `#5cabb4`, or C `#579da9`? **Designer: A.**
6. Landmark stages inside the fixed `18 m` envelope? **Designer: keep.**
7. Marker P1 oak-ridge, P2 gate, P3 wheel, P4 bridge? **Designer: keep.**
8. Forest oak reduced from `14 m` to `11 m`? **Designer: keep.**
9. Night: fixed sparse lamps, no glowing river/roof? **Designer: keep.**
10. Approve A for factory step 4, or request one parameter change?
