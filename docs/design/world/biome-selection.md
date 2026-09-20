# Selected biome directions

Status: selected by Philote on 2026-09-20. This is the approved design roster,
not yet the production asset catalog. Biome ids, palettes, landmarks, and
terrain grammars remain provisional until the mock-biome pass.

## Main biome roster

| Working id | Selected direction | Current catalog relationship | Distinguishing world read |
|---|---|---|---|
| `ice-town` | Ice / Chilly Town | Evolves existing `ice` | Snowy inhabited town, glacier skyline, warm windows, observatory or lighthouse |
| `ink-world` | Ink World | New family | Monochrome brush terrain, paper structures, one seal-red accent |
| `celestial-garden` | Celestial Garden | New family | Star flowers, orbit paths, constellation structures, moon ponds |
| `heavy-industry` | Industrialized / Heavy Machinery | Evolves planned `factory` | Gantries, cranes, pistons, pipes, heavy moving silhouettes |
| `future-utopia` | Futuristic Utopia | Evolves planned `lab` plus `city` | Clean civic towers, glass transit, gardens, luminous infrastructure |
| `harbor-town` | Harbor Town | New city/ocean hybrid | Gabled town rising from docks, ships, lighthouse, warehouses |
| `academy-town` | Academy Campus / City College Town | New city/campus hybrid | Quad, library, lecture halls, dorm streets, student residents |
| `wildwest` | Wild West | Existing planned family | Saloon street, mesa, railway, mine, wind pump |
| `volcanic` | Volcanic | Existing shipped family | Crater silhouette, basalt, lava channels, forge settlement |
| `egyptian-desert` | Desert / Egyptian | Evolves existing `sand` | Dunes, monumental stone, oasis, excavation routes, celestial alignments |
| `alpine` | Alpine | New family | Mountain skyline, cable route, lodge, observatory, snow paths |
| `swamp` | Swamp | New family | Root islands, reed beds, boardwalks, lanterns, shallow water |
| `jungle` | Jungle | Existing planned family | Dense canopy, waterfall, lagoon, rope bridges, overgrown ruins |
| `forest` | Forest | Existing shipped family | Round canopy ridges, woodland paths, tree structures |
| `city` | Regular City | Existing shipped family | Dense street network, civic skyline, transit, lit neighborhoods |
| `whimsical-land` | Whimsical Land | New family; definition intentionally open | Playful impossible terrain and buildings; requires references before locking |

## Interest experiment

| Working id | Direction | Rule |
|---|---|---|
| `fractal-recursion` | Fractal Recursion | Keep as a visual R&D scene, not a main production biome. Test recursive terrain and self-similar landmarks without requiring a full asset family. |

## Normalization notes

- `ice-town` is currently one combined lane. Split `ice` and `chilly-town`
  only if the reference pass produces two clearly different silhouettes.
- `academy-town` should feel like an inhabited city centered on education,
  not a reskinned generic city.
- `heavy-industry` is a stronger, more mechanical evolution of the current
  factory family.
- `future-utopia` should stay clean, civic, and optimistic so it does not
  overlap heavy industry or the laboratory.
- `egyptian-desert` uses Egyptian architectural and astronomical cues as its
  defining settlement language; generic desert remains a possible modifier.
- `whimsical-land` cannot enter production until its material language and
  silhouette rules are defined from references.

## Agreed production sequence

1. Finish globe viewing and navigation behavior.
2. Establish the final globe background and navigation-path language.
3. Build one mock biome and perfect its composition, progression, renderer,
   camera behavior, and QA fixtures.
4. Turn the successful mock into a reusable biome grammar.
5. Apply that grammar to the selected main roster in small review batches.
6. Design each biome's landmark evolution line inside the proven grammar.
7. Keep Fractal Recursion as a separate experimental track.

## Recommended mock biome

Start with **Ice / Chilly Town**. It extends the approved Ice Observatory
visual proof, has the strongest existing assets and references, and exercises
the full system: terrain relief, town density, warm windows, residents,
roads, a shoreline, and a skyline landmark.

