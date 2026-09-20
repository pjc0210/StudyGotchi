# Biome sheet: <biome id> (<course code> <course name>)

Status: draft | approved by Philote on <date>. ≤ 700 words. Every colour is a hex or an offset from the terrain kind tint (`L+6`, `H−4`). Every count is a number.

## Mood

One sentence: what a finished biome feels like, and the one reference image it should be mistaken for.

## References

- `../refs/<file>` — what to take from it (one clause).
- `prototypes/world-lab/screenshots/<file>` — what to keep or kill from the current prototype.

## Palette

| role | hex | note |
|---|---|---|
| ground (charter) | | |
| accent (charter) | | |
| base (pedestal side, cliff riser) | | |
| road core / road edge | | |
| plaza pad | | |
| wet (shore land band) | | |
| water | | |
| night window | `#ffe9a8` | fixed |

Ground tints per terrain kind: table of `kind → tint, alt` (from `galaxy.ts`, with any overrides and the reason).

## Terrain kinds

For each kind: profile, the one thing that makes it recognisable at 48 px, its prop recipe mapping, decal type, and whether roads may cross it.

## Landmark family

Which s1 / s2 / s3 asset stands on which plaza, how the hub differs, and any recolour or fix requested from the Landmark Artisan (cite the art-direction note).

## Prop roster

| prop (manifest id) | count per topic | parent (road / plaza / shore / cluster) | scale range | notes |
|---|---|---|---|---|

List new props needed with a one-line brief each, and cross-biome reuse with the recolour.

## Roads and plaza style

Road width, winding jitter, furniture spacing, hub plaza contents, dock/shore treatment, anything that deviates from `01-layout-grammar.md` defaults.

## Level-1 marker

Pedestal side/cap colours, the 4 signature props in priority order with their heights at `PROP_SCALE_L1`, signpost variant.

## Night

Deviations from the bible §7 table only: ground tint shift, which materials light up and at what emissive, any moving light, anything optional.

## Creature roster

4–6 ids from `assets/creatures/generated/manifest.json` with contrast on this ground, one line on why each fits; note any recolour required.

## Open questions for Philote

3–5, each "A or B (or C)?" with the designer's pick marked.
