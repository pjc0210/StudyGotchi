# Round 1, Critic 1: HIG review of the three site plans

Date: 2026-09-20. Critic 1, Apple HIG school. Plans scored on axes 1, 3, 4, 6, 10 against the
charter, the research doc, and the approved golden frame. Other critics' notes not read. Lens: one
focal point per screen, a tint that means interactive and nothing else, toolbars that consolidate,
materials that agree with what they frame.

## Scores

### Direction A, Paper & Pixel

- Hierarchy 8. The world view rule "The HUD sits on the paper margin" and "The world is never
  covered by a card" gives every screen one picture and a clear frame of controls. The landing
  hero loses a point: eyebrow, 56 px headline, subline, window, bubble, two actions, a counters
  row, and a three-state legend share one viewport, and the plan wants two first reads at once
  ("letting a resident name the page it came from before any headline asks for anything") while
  its type scale hands the first read to the headline.
- Type discipline 9. Three faces, each with a stated job and a floor: Zen Maru Gothic "700 only",
  Instrument Sans "Nothing below 13 in this face", Departure Mono "Only 11 and 22, never 13, never
  inside a UI row". The 450 body weight is the one soft spot; nobody will hold to it.
- Colour restraint 9. Five tokens "taken unchanged", states drawn from the ink ramp plus one lamp
  dot, coral demoted to "one 8 px dot for a thing happening now", the 65 to 75 percent change
  justified by measurement. The resident accent on the name tab is bounded to one bubble at a time.
- Distinctiveness 8. The inverted depth model ("the page is the top surface, the world is cut into
  it, and only the bubble rises") and the postcard visit page are not in any template I know. The
  residual risk is real: cream page, lozenges, a rounded gothic headline. The ink-filled primary
  is the main defence.
- World fit 8. Nothing but the bubble's tail crosses into the window, and the window is the world's
  own sky so the diorama floats without a box. The materials fight the picture in one place: a
  blurred inset shadow (`inset 0 2px 6px`) is a soft edge around a hard-facet 4 px pixel pass.
Average 8.4.

Strongest move: the recessed window with the rule that no chrome except the bubble's tail enters
it (section 2 shadow table and section 3 concept). It is the only plan whose HUD never covers the
picture at 1440.

Weakest decision: the landing counters row ("WINDOWS 3/5 CRYSTALS 3/5 RESIDENTS 3") under the hero
window. A first-time visitor has no referent for these numbers; on the landing they are noise that
competes with the two actions beside them.

Change to raise the lowest axes: cut the counters from the landing hero and move the three-state
legend below the fold, so the hero is eyebrow, headline, subline, window with bubble, two actions.
For world fit, replace `shadow-window` with a 1 px inset hairline plus a 2 px flat ink-14 band, no
blur, so the edge is as crisp as the pixels inside it.

### Direction B, Modern DS

- Hierarchy 7. The hinge is a correct toolbar: three jobs, one bar, "there is one bar at any
  moment". The landing undoes it: the thesis sits beside a five-row, four-column evidence table
  ("ID CONCEPT STATE SOURCE") below a 60vh world, so the headline lands under the fold next to a
  data grid. The signed-in view is a 208 column, table, 320 pane workspace; clear, but dense.
- Type discipline 9. One family, "Weights 400, 500, 600 only", six sizes with named uses, mono
  "Never at 13, never in a sentence, never inside a button". The tightest system of the three. One
  wobble: tile labels at "UI 15 at 500", a size the type table does not define.
- Colour restraint 8. Five tokens, all world colours, coral sent back into the world, states as
  "one hue deepening". The deduction is HIG, not palette: `signal` is at once "Selection, the
  primary action fill, the selected tile edge, the Mastered badge, the hinge beacon". A tint that
  means interactive and also means a completed status makes a Mastered badge look pressable.
- Distinctiveness 6. The hinge is ownable. The rest is the plan's own citation, "Linear's chrome
  discipline (208 px column, 28 px rows, 13 px UI type, alpha hairlines)", recoloured lilac. The
  plan names the danger ("the old tool with the lights on") and answers it with a font change
  only. A blue signal on a light grey field is also the Metro and Windows default.
- World fit 7. "The world's own sky is the page, so the world never sits in a box" is the boldest
  world move of the three and it is right. But the header, the camera control, and a 13 px hover
  label all float on the pixel pass, and the 60vh strip at 1440 leaves a round island in empty sky
  above a dense table that pulls the eye down.
Average 7.4.

Strongest move: the hinge that pins and replaces the header on scroll, "the wordmark moves into it
on the left", "It is the only sticky element" (sections 3.3 and 4). Toolbar consolidation done
properly; the beacon square that reports `progressState` is the one honest indicator light here.

Weakest decision: the landing hero's evidence table. A landing page is a thesis, and the plan puts
an ID column reading "6.1210-041" beside it.

Change to raise the lowest axis: on the landing, the lower screen shows the thesis and one
provenance row only, the row for whatever resident the pointer is over above (the plan already has
Travel doing this in the world view). The table stays in the signed-in view. The hinge then visibly
joins the two screens, which no template does, and the dashboard read goes.

### Direction C, Sticker Toybox

- Hierarchy 7. The stamp-then-title rule ("the stamp says where, the title says what") is a sound
  two-level heading system. Against it: the hero headline sits inside the world window, and the
  1440 world view has "Four HUD sheets float on it" plus a fifth on click plus biome chips. Five
  cards over one picture is five focal points.
- Type discipline 7. Two weights on the site is admirable. But the charter fixes UI and body at 13
  to 16 px and C sets body at 17 and captions at 12. The world view wireframe sets a resident's
  sentence in uppercase pixel mono ("UNDERSTANDS RECURSION. REFUSES TO EXPLAIN IT."), which the
  plan's own rule forbids ("Stamps are the only capitals"). With Instrument Sans at 500 only,
  buttons, body, and labels have no weight axis left.
- Colour restraint 7. The accent cap tokens are the best restraint mechanism in any plan. The
  deduction: coral is "The primary button fill, the Demonstrated sticker fill, the dot on a
  resident row", so again action and status share a hue, and the seven `sticker-*` grounds are a
  second colour system the other plans keep out of the chrome.
- Distinctiveness 6. Fredoka, an extruded coral button with a hard ink edge, pastel lozenge
  stickers, and pixel props in the margins is a recognisable genre, and the plan says so ("It is
  common on children's products"). The stamp is the signature, but A and B set the same Departure
  Mono eyebrow, so it is the least ownable signature of the three.
- World fit 6. Full bleed world at 1440 with four sheets over it, bobbing pixel renders of
  residents inside a chrome sheet, and three margin props "through the same pixel pass as the
  world". The approved frame carries two cards; this plan more than doubles the load.
Average 6.6.

Strongest move: the accent cap (section 2, "The accent cap"): `accent-cap` 1 per component,
`card-accent` 0, `primary-per-screen` 1, `outline-places` 2. The only round 1 restraint rules a
critic can count in a build.

Weakest decision: four HUD sheets floating over the world at 1440 (section 3), undoing the plan's
own 390 rule that "the sheets must not cover the picture".

Change to raise the lowest axes: at 1440 dock residents and counters into one sheet outside the
world, or below it as at 390, so only the topic card sits on the picture as in the golden frame;
and cut the margin props, decoration in a plan whose thesis is that nothing is built to fill space.

## Anti-default check (research section 7)

- A: no match. Numbered strip cut, only states numbered. Lozenges everywhere is not on the list but
  is the cozy-template tell to watch in the build.
- B: partial match on "Broadsheet hairlines, zero radius, dense columns": the screens "have no
  radius: they bleed" and the signed-in sheet is three hairline-divided columns of 28 px rows.
  Partial match on "Dark developer-tool shell around a pastel toy" in structure only: Linear's
  layout with the dark removed. Revise the landing density before build.
- C: partial match on "Cream ground, high-contrast serif display, terracotta accent": cream page
  with a coral primary is two of three; no serif. Partial match on neubrutalism: outlines are held
  at 2 places, but `shadow-edge` `0 4px 0 ink` is the hard offset shadow the research files under
  3.5, not the claymorphism two-inset recipe 3.4 asked for on the primary. Revise before build.

## Ranking

1. A, Paper & Pixel, 8.4
2. B, Modern DS, 7.4
3. C, Sticker Toybox, 6.6

## What A should absorb

1. From B, the pinned single bar (B section 3.3 "there is one bar at any moment" and section 4).
   A's world view has chrome above the window (eyebrow, camera control, Share) and below it
   (residents strip, drop zone, counters); at 390 that is two bars around a 4:5 window. When the
   window scrolls out, collapse eyebrow, camera control, and counters into one 36 px pinned bar.
   A's own list picks B's tile grid; the grid is fine, but the bar is the HIG move.
2. From C, the accent cap tokens (C section 2 "The accent cap"), written into the merged brief as
   rules: one accent per component, zero on cards, one primary per screen. A's bubble tab and live
   dot already sit inside these caps; the tokens make that checkable in round 2.

Do not absorb C's 2 px ink outline on the state badges, which A's section 8 proposes. A's depth
model is the hairline ring; a 2 px outline on three chips would be the one heavy edge on a page
built to have none, and A's states already separate by fill through the ramp.
