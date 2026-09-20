# Round 1, Critic 2: Linear-school product designer

Date: 2026-09-20. Plans, not builds, on axes 1, 3, 4, 6, 10. Measuring stick: the Linear paragraph
in the Megaminx brief (13 px UI at one medium weight, four greys of text, alpha hairlines, 28 px
rows, headings in the same family at a display cut). I have not read the other critics.

## Scores

| Axis | A Paper & Pixel | B Modern DS | C Sticker Toybox |
|---|---|---|---|
| 1 Hierarchy | 8 | 7 | 6 |
| 3 Type discipline | 7 | 8 | 6 |
| 4 Colour restraint | 9 | 8 | 6 |
| 6 Distinctiveness | 7 | 8 | 5 |
| 10 World fit | 9 | 7 | 6 |
| Average | 8.0 | 7.6 | 5.8 |

### A, Paper & Pixel

- Hierarchy 8. Eyebrow, headline, body, one ink primary, then the states band; "The HUD never
  overlays the world" and "one bubble at a time" keep one thing leading. Deductions: the landing
  hero shows "WINDOWS 3/5 CRYSTALS 3/5 RESIDENTS 3" to a stranger who cannot yet know what a window
  is, and the 1440 world view has no evidence list at all (only a residents strip, a drop zone,
  and counters), so the daily surface is underdrawn.
- Type 7. Three families. Zen Maru Gothic at four sizes (56, 40, 28, 20) is a display face doing
  body work at 20; "28/34 titles" is the only off-grid leading in the plan; Instrument Sans at
  "450 body, 500 labels, 600 buttons" is three weights where Linear's rows use one. Departure Mono
  "tracked 0.08em at 11" is 0.88 px, a sub-pixel offset that will blur a pixel face at 1x.
- Colour 9. Five tokens, all unchanged world values; `lamp` and `live` are "Fill only, never
  text"; states are "the ramp, not three pastels"; biome grounds "never enter the chrome". The one
  slip: coral means both "happening now" and "Pip is speaking", so the plan's own rule that colour
  means "who is talking, never which category" is broken by `live`.
- Distinctiveness 7. Cream, rounded gothic, lozenge chips is the cozy template's silhouette. The
  inverted depth ("the page is the top surface, the world is cut into it") and the pixel mono
  reference line inside the bubble are what pull it away. Zen Maru Gothic over Nunito is a real
  choice with a stated reason.
- World fit 9. The world is recessed, nothing covers it, the only crossing is a bubble tail. Small
  tension: a blurred inset shadow (`inset 0 2px 6px`) and a 16 px rounded window edge against
  4 px hard pixels; the plan says "hairlines instead of shadows" and then shades the one place the
  pixels are.

Strongest move: the inverted depth model plus the monochrome state ladder tied to the
observatory's windows lighting (section 2, Shadow and Colour). Chrome and world tell one story.
Weakest decision: the display face at four sizes including 20 px bubble lines, with three UI
weights under it.
Change to raise Type: display at two sizes only (56 hero, 28 title on 32 leading); bubble lines in
Instrument Sans 16/24; UI at 500 for labels and buttons alike, 450 for body only; Departure Mono
letter spacing in whole pixels (1 px), as C does.

### B, Modern DS

- Hierarchy 7. The hinge is a well-formed toolbar (leading eyebrow, centre tabs, trailing
  counters) and "the only sticky element". But the landing hero's proof is a five-row table with an
  "ID" column reading "6.1210-041": a first visitor is shown a database before a sentence. Header
  36 plus hinge 36 plus camera segmented plus hover label is four bars around one picture.
- Type 8. Two families, eight sizes, three weights, and the only plan where every line height sits
  on the 4 grid. "UI: 13/20 at 500. Rows, buttons, tabs" is the Linear row. One unlisted style:
  the tile wireframe says "UI 15 at 500", which is body size at label weight and appears in no
  token row. Same 0.08em sub-pixel tracking on the pixel face as A.
- Colour 8. Five tokens, states as "one hue deepening" (tint, ice, ice deep), coral sent back into
  the world. Deductions: seven biome grounds enter the chrome as tile icon fills, and `signal` is
  asked to be selection, primary fill, tile edge, Mastered badge, and beacon at once, which is one
  colour with five meanings.
- Distinctiveness 8. Sky as the page with "no bezel, no rounded corners, no shell" and a fold
  between two screens is a device nobody's landing page has. The cost is the signed-in lower screen:
  208 column, 28 px rows, 320 pane is Linear's three-zone layout with the lights on, and the plan
  says so ("following Linear").
- World fit 7. The world has no edge, which the plan counts as a virtue ("never sits in a box"),
  but a diorama's edge is part of the object, and cool lilac around a cool world does not pop the
  way the cream card does in the golden frame. The table beneath makes the world read as a chart's
  illustration, the exact "screenshot embedded in a tool" the research names.

Strongest move: the hinge as a three-group toolbar that pins, carries the eyebrow and counters,
and reports `progressState` through one 11 px beacon (section 4). Governance and signature in one
36 px strip.
Weakest decision: the ID table as the landing hero's evidence.
Change to raise Hierarchy and World fit: on the landing only, replace the table with three receipt
rows in prose (concept, state badge, source), no ID column, and give the thesis the wider column;
keep the full table for the signed-in world view where it belongs.

### C, Sticker Toybox

- Hierarchy 6. "Four HUD sheets float on it, each stamped" plus a fifth on click is the golden
  HUD's card-over-world approach multiplied by four; every region opens with the same 11 px stamp,
  so nothing leads. The accent cap is real discipline, but the topic card wireframe holds
  "(Touched) (Demonstrated) (Mastered)" inside one card, breaking the plan's own `card-accent: 0`
  and "A card with two badges is two cards".
- Type 6. Three weights on the whole site is the tightest count of the three. Sizes are the
  loosest: Instrument Sans at 17, 15, 13, 12 with 15 carrying two leadings (15/22 and 15/20), and
  17/26 and 15/22 off the 4 grid. Body at 500 only means no weight contrast exists between a label
  and a sentence, and 13/16 HUD rows are tight for a face that has to read next to crunchy pixels.
  Credit: "1 px letter spacing" on the pixel face is the only integer tracking in the round.
- Colour 6. Four tokens plus seven `sticker-*` fills is eleven chrome colours before the ramp.
  Coral is the primary fill, the Demonstrated fill, and the arrival dot: one accent, three
  meanings. The plan's defence, "the world's own coral rather than an invented terracotta", is a
  derivation argument, not a perceptual one; on a thumbnail coral on cream is the template.
- Distinctiveness 5. Fredoka at 56 plus an extruded coral button is Duolingo's edtech silhouette,
  which the research already files as "kids' products, edtech, wellness onboarding". The stamp
  signature is the least new of the three: the plan admits it is "as the golden scene already
  stamps it".
- World fit 6. `shadow-sheet` at "0 8px 24px" under four sheets floating on the world puts four
  soft blurs over hard facets, and the coral button competes with coral residents inside the
  picture. The margin props through the pixel pass are the one move that makes the world look
  better.

Strongest move: the accent cap as tokens (`accent-cap`, `card-accent`, `primary-per-screen`,
`outline-places`, section 2). Restraint written as numbers a build can be audited against; neither
other plan has this.
Weakest decision: the extruded coral primary with a hard `0 4px 0 ink` offset. Template accent,
neubrutalist shadow, and the world's only warm accent spent on a button.
Change to raise Distinctiveness: primary becomes ink with paper text, Press on transform only, no
extrusion; coral returns to the arrival dot and the Demonstrated sticker; the topic card's three
stickers move out into the states band so `card-accent: 0` holds.

## Type counts

- A: 3 families, 9 sizes (56, 40, 28, 20; 16, 14, 13; 11, 22), 5 weights (700; 450, 500, 600; mono
  single). Not disciplined: Megaminx's full count plus a display face on top.
- B: 2 families, 8 sizes (56, 36, 28, 20, 15, 13; 11, 22), 4 weights (400, 500, 600; mono), one
  unlisted 15/500. Disciplined; the closest to the Linear stick.
- C: 3 families, 9 sizes with 15 at two leadings (56, 40, 28; 17, 15, 13, 12; 11, 22), 3 weights
  (600; 500; 400). Weights disciplined, sizes not; two leadings off the grid.

## Anti-default check

- A: no match. The cozy template silhouette is present and defended (ink primary, monochrome
  states, coral demoted).
- B: partial match to "Dark developer-tool shell around a pastel toy", in light. The dark canvas is
  gone but the dashboard grammar (ID table as landing proof, 208/table/320 under the picture) is
  the same shell relit. Revise the landing table before build. No match to broadsheet: tiles are
  12, controls 8.
- C: partial match to "Cream ground, high-contrast serif display, terracotta accent" (no serif;
  coral primary on cream is the accent half) and to the neubrutalist entry (outlines are held to
  two places, but `0 4px 0 ink` is neubrutalism's hard offset shadow). Neither full; both are what
  shows in a thumbnail.

## Ranking

1. A, 8.0. 2. B, 7.6. 3. C, 5.8. A wins on colour and world fit and would survive daily use,
provided the 1440 world view gains the evidence surface it currently lacks.

## Absorb into A

1. From B: the evidence table as the sheet under A's window on the signed-in world view (B section
   3.3: 208 topic column, 28 px rows at 13/500, 320 detail pane), and B's rule that every line
   height sits on 4. A has no evidence list at 1440; this is the gap, not a flourish. Source: B,
   sections 2 (Spacing, Type) and 3.3.
2. From C: the accent cap token family (`accent-cap: 1`, `card-accent: 0`, `primary-per-screen: 1`,
   `outline-places: 2`) written into `tokens.json` so round 2 can be audited by count. Source: C,
   section 2, "The accent cap".
