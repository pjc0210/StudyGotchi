# Ice / Chilly Town landmark

Status: primitive design approved for review, 2026-09-20.  
Line: **igloo → observatory → red-cap lighthouse on the harbour headland rock**.

## 1. Read at a glance

The landmark is a solitary warm signal at the harbour mouth. Its low white dome becomes an observatory and then a lighthouse that dominates the district skyline, while the original igloo remains visible as the keeper's annex. The red cap is the one saturated accent; no stage has a signpost, label, or world-space text.

## 2. Shared headland rock

| part | dimensions | colour role | construction |
|---|---:|---|---|
| cliff-ice slab | 10.0 × 9.2 m footprint; 0.40 m high | cliff ice `#8fbfdc` | irregular aligned 12-sided slab, widest toward the harbour |
| snow cap | 9.6 × 8.8 m footprint; **0.08 m thick** | snow `#eef4f7`, highlight `#ffffff` | one clean faceted cap with three shallow wind-cut notches |
| lavender face | 3.4 m wide on the seaward side | rock `#c9bfd0` | one exposed face only; never a second accent |
| access shelf | 1.4 × 3.2 m, 0.12 m high | pale ice `#d8e9f4` | runs from the annex door toward the district-facing edge |

The slab sits at the harbour mouth with its long axis pointing toward the mainland. It remains unchanged at every stage; progress changes the architecture on it, not its height or palette.

## 3. Palette roles

| role | hex | use |
|---|---|---|
| snow | `#eef4f7` | igloo shell, roofs, headland cap |
| white highlight | `#ffffff` | windward snow facets |
| pale ice | `#d8e9f4` | entry tunnel, observatory trim |
| cliff ice | `#8fbfdc` | headland side, lighthouse bands |
| lavender rock | `#c9bfd0` | one exposed headland face |
| cream | `#f4e9d2` | observatory and lighthouse walls |
| ink | `#3a2f45` | doors, shutter, gallery rail |
| timber red | `#c8524a` | lighthouse cap; the only saturated accent |
| window light | `#ffe9a8` | windows and lamp room |

Every object uses two or three flat colours plus one accent. Materials are rough, untextured, and faceted; no outlines are modelled.

## 4. Stage sheet

| stage | footprint | total height above rock | construction | silhouette at 48 px |
|---|---:|---:|---|---|
| s1 — igloo | 2.6 m dome diameter plus 0.7 × 0.6 m entry tunnel | 1.55 m | 10 × 6 faceted half-sphere, five visible block courses suggested by facets rather than lines | one low white dome with a blue front notch |
| s2 — observatory | 3.8 m base diameter; igloo annex offset 2.6 m east and 1.4 m south | 4.75 m | 10-sided 2.8 m cream base, low 3.9 m faceted dome, 1.4 × 0.5 m tilted shutter | round blue-lavender dome above a cream drum, with the small igloo beside it |
| s3 — lighthouse | 3.0 m base tapering to 2.1 m; igloo annex keeps the s2 offset | 8.65 m | 10-sided 6.4 m cream tower, three 0.55 m cliff-ice bands, 2.8 m gallery, 1.6 m lamp room, red 2.2 m cap | tall cream tower, three blue bars, one red dot, and a low white annex |

### s1 — Igloo

- Centre the igloo 0.6 m landward of the rock centre.
- Use a broad, slightly squashed dome: width-to-height ratio 1.68:1.
- Point the entry tunnel toward the mainland access shelf.
- Set the doorway in ink `#3a2f45`; no window is required for the s1 daytime read.
- At night, a 0.32 × 0.42 m panel inside the entry emits window light `#ffe9a8` × 1.6.
- Triangle target: fewer than 400.

### s2 — Observatory

- Replace the igloo's central position with the observatory drum; move the complete igloo to the annex offset without changing its proportions.
- Keep the dome visibly descended from the igloo: the same broad half-sphere becomes the observatory roof, recoloured lavender-blue.
- Place three 0.40 × 0.50 m windows around the harbour-facing half of the drum.
- Tilt the ink shutter 34° from horizontal and 18° toward the harbour so it changes the skyline.
- At night, all three windows emit `#ffe9a8` × 1.6; the shutter and dome do not emit.
- Triangle target: fewer than 900.

### s3 — Lighthouse

- Replace the observatory drum with the tapered tower; keep the igloo annex in the same s2 position.
- Retain the observatory dome as the faceted lamp-room cap, recoloured timber red `#c8524a`.
- Use **three** cliff-ice bands centred 1.6, 3.4, and 5.2 m above the tower base. Each band is 0.55 m high and projects 0.09 m from the wall.
- Put the gallery deck at 6.25 m, the lamp-room centre at 7.30 m, and the red-cap peak at 8.65 m.
- At night, the lamp room emits `#ffe9a8` × 1.6. A narrow translucent sweep rotates at 0.9 rad/s, one turn in about 7 seconds; its bloom must remain separate from the annex light at 48 px.
- Triangle target: fewer than 1,600.

## 5. Persistence and growth

| element | s1 | s2 | s3 |
|---|---|---|---|
| headland rock | present | unchanged | unchanged |
| igloo shell | main building | persists as observatory annex | persists as keeper's annex |
| broad dome motif | igloo shell | grows into observatory dome | becomes the lamp-room cap |
| vertical silhouette | none | 4.75 m observatory | grows to 8.65 m lighthouse |
| lit surfaces | entry panel | entry panel + three windows | annex panel + lamp room |
| motion | none | none | rotating night sweep |

Stage changes preserve recognisable parts instead of replacing the landmark with unrelated buildings. Geometry grows upward; the headland never rises.

## 6. Day and night

Day follows the world key light at azimuth −35° and elevation 40° with no emissive materials. At night, the world key light changes to `#8fa3d8` at intensity 0.55 and elevation 28°; windows and the lamp room emit `#ffe9a8` × 1.6. The rock, snow, tower walls, lighthouse bands, and red cap never emit.

The lighthouse sweep is visible only at night. It uses a narrow cone with low opacity and no opaque core; at 48 px the lamp reads as one warm point rather than a bloom blob.

## 7. Ruin and recovery blockout

Low priority; this is a blockout for later animation and does not change the approved stage geometry.

### Ruin

1. Weather rolls in and the beacon slows to a stop over 0.8 seconds.
2. All emissive surfaces go dark.
3. The red cap tilts 12° toward the sea without detaching.
4. The middle band's harbour-facing segment drops onto the headland access shelf.
5. Windblown snow fills the annex entry to half its 0.42 m opening.

### Recovery

1. The annex entry clears and its window relights.
2. The fallen band segment lifts back into the middle ring over 0.6 seconds.
3. The cap settles upright over 0.5 seconds.
4. The lamp room relights, waits 0.3 seconds, then resumes its 0.9 rad/s sweep.

The tower never collapses, sinks into the rock, changes palette, or morphs into another structure.

## 8. Acceptance

- At 48 px, s1 reads as one low white dome; s2 as a round dome over a drum; s3 as a tall barred tower with one red cap.
- At 96 px, the original igloo is visible in all three stages.
- The 0.08 m snow cap remains visible along the headland edge.
- The s3 tower has exactly three blue bands.
- Night bloom keeps the lamp room and annex window as two distinct warm points.
- No signpost, label, course code, or world-space text appears.
- s1 stays below 400 triangles, s2 below 900, and s3 below 1,600.

## 9. Decisions

- 2026-09-20, Philote: place the landmark on the harbour headland rock.
- 2026-09-20, Philote: keep the line **igloo → observatory → red-cap lighthouse**.
- 2026-09-20, art review: increase the headland snow cap from 0.05 m to **0.08 m**.
- 2026-09-20, art review: increase lighthouse bands from two to **three**.
- 2026-09-20, Philote: the red-cap lighthouse belongs to Ice / Chilly Town; Harbor Town owns ship and crane silhouettes instead.
- 2026-09-20, Philote: use no signposts or world-space text on globe markers or landmarks.
- 2026-09-20, Philote: use an occlusion crossfade between marker and biome; never morph the marker into the landscape.
- 2026-09-20, Philote: replace the stacked-tier marker grammar with one visible circular plinth and one connected terrain mass that projects outward and upward like a landscape bouquet.
- 2026-09-20, Philote: keep a clear plinth visible around the terrain, following the Kirby W3 composition reference without its sign or exact silhouette.
- 2026-09-20, Philote: use **Chilly Village Burst** for the Ice marker; final scale pass attaches only the bases, reduces outward lean to 8–12°, and enlarges the crowns beyond the plinth: 32 m three-peak mountain range, 28 m red-cap lighthouse, 28 m pine cluster, and 24 m gabled houses.
