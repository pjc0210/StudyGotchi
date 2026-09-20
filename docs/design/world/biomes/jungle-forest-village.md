# Biome sheet: jungle / forest village

Status: plan v3, 2026-09-20. Map/synthesis only.

## Mood and ownership

An inhabited vertical village fills layered canopy above waterfall, lagoon, bridges, and ruins. Forest remains open round-canopy woodland on visible ground.

## Reference synthesis: take / leave

The [ledger](../refs/biome-library/jungle-forest-village/LEDGER.md) records provenance and decisions. Take inhabited decks, mixed scales, warm windows, civic density, land-shaped districts, clearings, bridges. Leave Minecraft language, asset lineups, repeated islands, wall-to-wall density, floating edges, round plazas, conifers. Mix 3 or more sources per district.

## Palette

| role | hex |
| --- | --- |
| ground / alt ground | `#69a85f` / `#93bd62` |
| primary canopy / second row | `#356f48` / `#234c3b` |
| cliff / pedestal side | `#4f8a4a` |
| root road core / edge | `#c69758` / `#6c4c37` |
| ruin stone | `#b7a58f` |
| wet bank / water | `#2b797c` / `#55c4c2` |
| accent fruit / flame | `#f2b84f` |
| night window | `#ffe9a8` |

## Fixed land, water, and routes

Field `288 × 264 m`; origin `(0,0)`; ground `y = 0 ±0.6 m` and never grows. A fixed `9.5 m` river in a `14 m` wet band runs from the `18 m` fall at `(+22,−118)` to a `62 × 52 m` lagoon and east outflow. No-build clearings: Firefly `38 × 24 m` at `(−2,+8)`, Orchid `32 × 26 m` at `(−91,−70)`, Sunbreak `36 × 26 m` at `(+27,+52)`.

Routes: 5 local loops, 3 root trails, rope crossings of `27 m` and `18 m`, and a lagoon boardwalk. No spiral or global boulevard.

## Districts

| district | nominal centre; footprint | seeded centre / yaw | 48 px anchor and subareas |
| --- | --- | --- | --- |
| Great Canopy Village | `(−53,−27)`; `74 × 58 m` | `±12 x`, `±8 z`; `−18° ±12°` | `16 m` Mother Tree; civic deck, homes, nursery, kitchen |
| Falls Terraces | `(+24,−79)`; `66 × 52 m` | `±10 x`, `±7 z`; `+10° ±15°` | `18 m` fall + `27 m` bridge; shrine, mist garden, homes |
| Lagoon Quarter | `(+69,+2)`; `68 × 58 m` | `±9 x`, `±11 z`; `−8° ±18°` | `18 × 9 m` stilt hall; docks, reeds, fishing decks |
| Ruin Commons | `(−76,+55)`; `64 × 54 m` | `±12 x`, `±9 z`; `+16° ±20°` | `14 m` root gate; vine court, market, archive |
| Riverworks | `(+6,+66)`; `72 × 52 m` | `±10 x`, `±8 z`; `−12° ±20°` | `12 m` waterwheel; farms, dye racks, mill deck |

Footprints are irregular. Reject gaps under `20 m` or clearing overlap; keep `≥55%` open. Anchor offset is at most `3 m`. Each gets 1 dominant `12–18 m`, 2–4 mids `7–11 m`, and 9–18 small props `1–4 m`, unevenly Poisson-spaced.

## Skyline, horizon, and camera

Skyline growth is north/back only: `0%` = 8 crowns `14–18 m`, ridge `10–12 m`; `25%` = +4 crowns `18–21 m`; `50%` = +5 crowns, decks `16 m`; `75%` = ridge `18–22 m`, second rear row; `100%` = 2 emergents `26 m`, ridge `22–24 m`.

Rear skyline: `z = −132 to −76 m`; second row: `−132 to −101 m`; side wings fade by `z = +30 m`. No south wall: lagoon ground reaches `z = +190 m` beneath foreground fog. Camera: pitch `34–40°`, FOV `26°`, yaw `−35° / 0° / +35°`, distance `138 / 205 m`.

## Landmark site

Root-Crown Shrine: fixed `34 × 42 m` headland at `(+102,+80)`, water on 3 sides, boardwalk only. Its triangular silhouette persists.

## 48 px and nearest-biome tests

Buildings hidden: two rear canopy rows, one white fall, turquoise lagoon, open foreground. Props shown: Mother Tree decks, rope span, stilt hall, and ruin gate stay separate. Marker: vine pedestal; P1 canopy/waterfall, P2 palm, P3 ruins, P4 torch.

Versus Forest, Jungle has darker side `#4f8a4a`, denser top `#69a85f`, and canopy/waterfall P1 instead of a round tree. Versus Swamp, it is bright green/turquoise, high rope-connected decks instead of low boardwalk huts, and no mossy cypress.

## Missing references

Missing: top-down inhabited treehouse district; waterfall-to-lagoon plan; overhead rope network; ruin headland; night view with subordinate windows.
