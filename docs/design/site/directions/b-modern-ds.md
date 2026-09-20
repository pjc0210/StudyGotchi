# Direction B: Modern DS

Round 1 plan. Owner: Direction B designer. Brief of record: `docs/design/site/00-style-research.md`.
Lineage: DSi and Wii system menus read through Frutiger Metro (flat tiles, white and light grey
fields, one signal colour, humanist sans), Linear's chrome discipline (208 px column, 28 px rows,
13 px UI type, alpha hairlines), the Megaminx Lab motion system. Frutiger Aero is studied only for
what to subtract: gloss, translucency, bubbles, grass, aqua. What remains is Metro; Metro plus paper
is this direction.

## 1. Subject, audience, single job

StudyGotchi turns a student's real course files (lecture PDFs, problem sets, exam feedback) into a
living pixel world: a touched concept is a sprout, a demonstrated concept becomes a landmark and the
ground rises, a finished problem set brings a small resident to that topic's biome, and every
resident and landmark opens to the page that earned it. The audience is a university student mid
semester who already has a folder of PDFs and no reason to open it. The landing page has one job:
show the world and its receipts in one viewport, so the student sees at a glance that the picture
above is built from the evidence below, and drops a first file.

## 2. Tokens

### Colour

Five colours. Every one is a world colour or ink at an alpha. No colour is invented, and no blue
enters from outside the world.

| Token | Hex | Derivation and use |
|---|---|---|
| `page` | `#e8e2f2` | The world's sky, unchanged. The page ground and the upper screen. The world's own sky is the page, so the world never sits in a box. |
| `sheet` | `#fff6df` | The world's cream, unchanged. The lower screen, cards, tiles, the segmented thumb. |
| `ink` | `#342d45` | The world's ink, unchanged. All text, all hairlines, all state fills, the focus ring, via the alpha ramp below. Ink on sheet is 12.1:1, ink on page 10.3:1. |
| `signal` | `#6fa4c3` | The world's ice deep, unchanged: the observatory's pool, the deepest colour in the scene. Selection, the primary action fill, the selected tile edge, the Mastered badge, the hinge beacon at full strength. It is 2.5:1 on sheet, so signal is never text; ink on signal is 4.8:1, so labels sit on it. |
| `ice` | `#a9cfe8` | The world's ice, unchanged. The Demonstrated badge, the hinge beacon at partial strength, the drop zone while a file is over it. Ink on ice is 7.2:1. |

The ink alpha ramp, after Megaminx Lab's Perplexity ramp, with one change: 3.5 / 5.5 / 7 / 10.5 /
14 / 20 / 75 percent. Names: `state-3` (idle tint), `state-5` (hover fill), `state-7` (pressed fill,
segmented track), `state-10` (selected row fill), `hairline` (14, every border), `hairline-strong`
(20, the hinge's lower edge and the Touched badge edge), `ink-dim` (75, secondary text). Megaminx
uses 65 for dim text; on cream 65 measures 4.3:1 and on lilac grey 3.6:1, both under the floor, so
dim text is lifted to 75, which measures 5.7:1 on sheet and 4.8:1 on page. Placeholder and disabled
text use 65 and never carry information that is not also stated nearby.

Evidence states are one hue deepening, the way the world's crystals deepen: Touched is `state-5`
fill with a `hairline-strong` edge, Demonstrated is `ice`, Mastered is `signal`, all with ink text.
No green, amber, or red enters the chrome. Coral, mint, and light stay inside the world as resident
accents and lit windows; the chrome quotes them only as a resident's swatch pulled from the resident
record, which is data. Biome tile icons use the biome ground from `.fleet/org.md` as their single
fill, with ink lines; those grounds are referenced by biome name and never restated here.

### Type

Three roles, one humanist family plus the pixel utility face. No rounded face anywhere.

- **Display, UI, and body: Instrument Sans** (variable, bundled through Fontsource as Megaminx Lab
  does). Chosen over Geist because Geist is the face of the dark shell this replaces; keeping it
  would make the new chrome read as the old tool with the lights on. Instrument Sans has a wider,
  warmer humanist skeleton closer to Frutiger's, the DS era's own face, and holds a 56 px headline
  at 600 without a rounded display face. Weights 400, 500, 600 only.
  - Display: 56/60 at 600, tracking -0.02em, at 1440; 36/40 at 390. The hero headline only.
  - Section head: 28/32 at 600, tracking -0.01em. Title: 20/24 at 600, card and pane titles.
  - UI: 13/20 at 500. Rows, buttons, tabs, table cells, the topic column. Linear's row type.
  - Body: 15/24 at 400. Landing prose, the subline, notes on the visit page.
- **Utility: Departure Mono** at multiples of 11 px, uppercase, tracking 0.08em, `ink-dim`.
  - 11/16: eyebrows (course code and topic), evidence ids, source references, hinge counters.
  - 22/24: the three counters in the world response pane and the resident count on a course tile.
  - Never at 13, never in a sentence, never inside a button. The research asked how much pixel
    mono appears in real UI rows: here it is the id column and nothing else. Rows read in
    Instrument Sans.

### Radius

4 / 8 / 12 / 16. Badges and the id chip take 4, controls 8, tiles and cards 12, the provenance card
16. No lozenges; Metro tiles are rounded rectangles. The two screens have no radius: they bleed.

### Shadow

Three tokens, all ink at an alpha.

- `shadow-hairline`: `0 0 0 1px` ink at 14 percent. The border of every sheet surface, drawn as a
  shadow so it stays one device pixel at 1x and 2x.
- `shadow-raised`: `0 1px 0` ink at 10 percent plus `0 2px 6px` ink at 8 percent. The segmented
  thumb and the primary button at rest. Tiles never take it; Metro is flat.
- `shadow-overlay`: `0 8px 24px` ink at 20 percent. The provenance card and the course grid overlay.

### Spacing

4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64. Control heights 28 / 32 / 36. Row height 28 with
8 px radius and 7 px side padding, following Linear. Column 208 for the topic list. Detail pane 320.
The hinge is 36 tall. Page gutter 32 at 1440, 16 at 390. The upper screen is `clamp(440px, 60vh,
640px)` tall at 1440 and `100vw` tall at 390, so the fold of the page lands on the hinge.

## 3. Layout

Concept: the page is a DS held open. The world lives in the upper screen, which is the page itself
with no frame; evidence and residents live in the lower screen, a cream sheet bleeding to the edges;
between them runs a visible 36 px hinge carrying the course eyebrow, the sheet's tabs, and the
world's counters, which pins to the top of the viewport when the world scrolls away.

### 3.1 Landing page, 1440

The hero is the two screens together. Above, the demo world renders live and answers the pointer.
Below, the sheet opens with the thesis on the left and the world's receipts on the right, so the
headline is proven by the rows beside it.

```
+------------------------------------------------------------------------------------------------+
| StudyGotchi                                                  Worlds to visit   Sign in          |  header 36, floats on the sky
|                                                                                                  |
|                        [ the ice observatory, pixel pass, full width, 60vh ]                     |  upper screen: page
|                                                                        [Overview | Resident ]   |  camera segmented, 28
|  PIP · ICE BIRD                                                                                  |  hover label, mono 11
|  Has reorganized the same three notes twice.                                                     |  UI 13, Fade on change
+=[#]==6.1210 · SORTING & RECURRENCES=======[ Evidence | Residents | Landmarks ]==WINDOWS 3/5 · CRYSTALS 3/5 · RESIDENTS 3=+  hinge 36
|  Every landmark up there            |  ID          CONCEPT                   STATE          SOURCE         |  lower screen: sheet
|  was a problem set once.            |  6.1210-041  Merge sort recurrence     Mastered       pset4 p.3     |  rows 28
|                                     |  6.1210-042  Master theorem, case 2    Demonstrated   quiz1 p.2     |
|  Drop lecture PDFs, problem sets,   |  6.1210-043  Recursion tree depth      Demonstrated   lec12 p.7     |
|  and exam feedback. What you        |  6.1210-044  Amortized analysis        Touched        lec14 p.1     |
|  demonstrate becomes a place.       |  6.1210-045  Potential method          Touched        lec14 p.9     |
|  What you finish brings someone     |                                                                   |
|  to live there.                     |  3 residents · 5 landmarks · 2 sprouts · read 14 pages            |  mono 11
|  [Start your world]  Visit a world  |                                                                   |
+------------------------------------------------------------------------------------------------+
|  How a world grows                                                                               |  section head 28
|  1 Touched       a sprout appears where the concept was first met                                 |  numbered: a real sequence
|  2 Demonstrated  the sprout becomes a landmark and the ground rises                               |
|  3 Mastered      the landmark lights, and a finished problem set brings a resident                |
+------------------------------------------------------------------------------------------------+
|  Worlds you can visit                                                                            |  Metro tile grid, 4 wide
|  +----------------+ +----------------+ +----------------+ +----------------+                       |  tiles 12 radius, flat
|  | [ice]  6.1210  | | [forest] 18.600| | [city]  6.1800 | | [ocean]  8.02  |                       |  one flat icon, mono 11
|  | Sorting and    | | Probability    | | Systems        | | Electricity    |                       |  UI 15 at 500
|  | recurrences    | |                | |                | | and magnetism  |                       |
|  | 3 RESIDENTS    | | 7 RESIDENTS    | | 1 RESIDENT     | | 12 RESIDENTS   |                       |  mono 22 count
|  +----------------+ +----------------+ +----------------+ +----------------+                       |
+------------------------------------------------------------------------------------------------+
```

The upper screen has no bezel, no rounded corners, no shell; its sky is the page, the header floats
on it and scrolls away with it, and the hinge and the sheet together are the whole frame.

### 3.2 Landing page, 390

The two screens stack as they already do; the change is proportion and the hinge's behaviour. The
upper screen becomes a square (100vw tall) so the world reads as a picture, not a strip. The hinge
keeps the beacon, the course code, and the tabs, drops the counters into the sheet's first row, and
when the world scrolls out it pins to the top and gains a 28 px "Back to world" chip.

```
+----------------------------------------+
| StudyGotchi                    Sign in  |  header 36
|    [ ice observatory, 390 x 390 ]       |  upper screen: page
|                        [Overview|Resid] |  camera segmented, 28
| PIP · ICE BIRD                          |
| Has reorganized the same three notes    |
| twice.                                  |
+=[#]=6.1210======[ Evidence | Residents ]=+  hinge 36, pins on scroll
| WINDOWS 3/5 · CRYSTALS 3/5 · RESIDENTS 3 |  counters row, mono 11
| Every landmark up                       |  display 36/40
| there was a problem                     |
| set once.                               |
| Drop lecture PDFs, problem sets, and    |  body 15/24
| exam feedback. What you demonstrate     |
| becomes a place. What you finish brings |
| someone to live there.                  |
| [Start your world]                      |  primary 36 tall, full width
| Visit a world                           |  text button 36
| 6.1210-041  Merge sort recurrence       |  rows 28, source becomes
|             Mastered · pset4 p.3        |  a second line
+-----------------------------------------+
| How a world grows: 1 2 3 stacked        |
| Worlds you can visit: tiles, 2 wide     |
+-----------------------------------------+

+=[Back to world]=6.1210==[ Evidence | Resid ]=+  the hinge pinned at the top after the world scrolls out
```

### 3.3 World view with HUD, 1440

The signed-in student's own world. The upper screen holds the world and two HUD elements only, the
camera segmented control and the hover label; everything else the golden HUD carried (counters,
state cards, thesis card) moves to the hinge and the sheet, which is why the upper screen can be
quiet. Three zones in the sheet: the topic column at 208, the evidence table, a 320 px detail pane.

```
+------------------------------------------------------------------------------------------------+
| StudyGotchi   Courses                                              Share world    [avatar]      |  header 36, scrolls away
|                                                                                                  |
|                       [ your ice observatory, pixel pass, 60vh ]                                 |  upper screen: page
|                                                              [Overview | Resident | Landmark ]  |  camera, 28
|  MOCHI · SNOW BLOB                                                                               |
|  Understands recursion. Refuses to explain it.                                                   |
+=[#]==6.1210 · SORTING & RECURRENCES=======[ Evidence | Residents | Landmarks ]==WINDOWS 3/5 · CRYSTALS 3/5 · RESIDENTS 3=+  hinge 36
| TOPICS                | ID           CONCEPT                     STATE         SOURCE       | 6.1210-042                  |
| Sorting            5  | 6.1210-041   Merge sort recurrence       Mastered      pset4 p.3   | Master theorem, case 2      |  title 20
| Recurrences        4  | 6.1210-042   Master theorem, case 2      Demonstrated  quiz1 p.2   |                             |
| Amortization       2  | 6.1210-043   Recursion tree depth        Demonstrated  lec12 p.7   | Demonstrated                |  badge, ice
| Hashing            0  | 6.1210-044   Amortized analysis          Touched       lec14 p.1   | Quiz 1, question 2, graded  |  body 15
| Graphs             0  | 6.1210-045   Potential method            Touched       lec14 p.9   | 9/10. The small dome by the |
|                       |                                                                     | pool.                       |
| + Add a course        |  Drop files here. Lecture PDFs, problem sets, exam feedback.        |                             |  opens tile grid
|                       |  [ dashed hairline drop zone, 88 tall, Pulse while a file is over ] | [Open page 2]  Show in world|  primary 32
|                       |  Read 14 pages. 2 new sprouts. 1 landmark rose.                     | Mochi lives here.           |  Rise on change
+------------------------------------------------------------------------------------------------+
```

Scroll behaviour at 1440: the upper screen scrolls with the page like any hero. When its bottom
edge reaches the top of the viewport, the hinge pins there and the wordmark moves into it on the
left ("StudyGotchi · 6.1210"). The header has already scrolled away, so there is one bar at any
moment. Scrolling back up unpins the hinge and the world returns. The detail pane is sticky inside
the sheet below the hinge. Pressing the course eyebrow in the hinge opens the Metro tile grid as an
overlay over the lower screen only, the world staying visible above: your courses, then an "Add a
course" tile with a dashed hairline. Selecting a tile crossfades the sheet and swaps the world.

### 3.4 World view with HUD, 390

```
+----------------------------------------+
| StudyGotchi                   [avatar]  |  header 36
|    [ your world, 390 x 390 ]            |  upper screen
|                  [Overview|Resid|Landm] |  camera, 28, labels shorten
| MOCHI · SNOW BLOB                       |
| Understands recursion. Refuses to       |
| explain it.                             |
+=[#]=6.1210======[ Evidence | Residents ]=+  hinge 36, pins
| WINDOWS 3/5 · CRYSTALS 3/5 · RESIDENTS 3 |
| [Sorting 5] [Recurrences 4] [Amort. 2]  |  topics as 28 px chips, scroll x
| 6.1210-041  Merge sort recurrence       |  rows 28 + second line
|             Mastered · pset4 p.3        |
| [Drop or choose files]                  |  36 tall, full width
| Read 14 pages. 2 new sprouts.           |  Rise
+-----------------------------------------+
```

Tapping a row at 390 opens the detail as a sheet card rising from the bottom (Reveal) with the
state, the source, the resident's line, and "Open page 2"; its top edge carries the provenance
card's 16 px radius, so it is the same object in a different place.

### 3.5 Visit page, 1440

A read-only look at another student's world. Same two screens, same hinge. What changes: the hinge
says who you are visiting, the sheet has no drop zone and no add tile, source pages open but nothing
can change, and the one primary action is to start your own.

```
+------------------------------------------------------------------------------------------------+
| StudyGotchi                                                       Start your world              |  header 36
|                        [ Maya's ice observatory, pixel pass, 60vh ]                              |  upper screen
|                                                                        [Overview | Resident ]   |
|  GLYPH · BOOK BEETLE                                                                             |
|  Carries the example everyone keeps forgetting.                                                  |
+=[#]==VISITING · MAYA'S 6.1210=============[ Evidence | Residents | Landmarks ]==WINDOWS 5/5 · CRYSTALS 5/5 · RESIDENTS 6=+  hinge 36
| TOPICS                | ID           CONCEPT                     STATE         SOURCE       | 6.1210-051                  |
| Sorting            5  | 6.1210-051   Heap invariant              Mastered      pset3 p.1   | Heap invariant              |
| Recurrences        6  | 6.1210-052   Build-heap in linear time   Mastered      pset3 p.2   |                             |
| Amortization       4  | 6.1210-053   Decrease-key                Demonstrated  lec9 p.4    | Mastered                    |  badge, signal
| Hashing            3  | ...                                                                 | Problem set 3, question 1.  |
| Graphs             2  |  Maya's world is read-only. Open any page; nothing here can change.  | [Open page 1]               |
+------------------------------------------------------------------------------------------------+
```

The residents' lines still appear on hover; they are the warmest part of a visit. No "Share" and
no avatar in the header; the trailing action is the visitor's own next step.

### 3.6 Visit page, 390

```
+----------------------------------------+
| StudyGotchi           Start your world  |
|    [ Maya's world, 390 x 390 ]          |
|                        [Overview|Resid] |
| GLYPH · BOOK BEETLE                     |
| Carries the example everyone keeps      |
| forgetting.                             |
+=[#]=MAYA'S 6.1210==[ Evidence | Resid ]=+  hinge 36, pins
| WINDOWS 5/5 · CRYSTALS 5/5 · RESIDENTS 6 |
| Read-only. Open any page; nothing here  |
| can change.                             |
| 6.1210-051  Heap invariant              |
|             Mastered · pset3 p.1        |
+-----------------------------------------+
```

## 4. Signature: the hinge

The site is remembered for the fold between its two screens. The upper screen is the world and is
the page itself, sky to the edges, with nothing drawn around it. The lower screen is a cream sheet.
Between them runs a 36 px hinge: `page` tinted with `state-5`, a `hairline` above and a
`hairline-strong` below, carrying three things that each belong to both screens. On the left, the
beacon and the course eyebrow in Departure Mono, naming the world above and the sheet below. In the
middle, the segmented tabs that decide what the sheet shows about the world. On the right, the
counters the world's own state produces: windows lit, crystals shown, residents present.

The beacon is an 11 px square, pixel crisp, no radius. It is not a power light. It is the
observatory's beacon read out of `progressState`: `ink` at 14 percent when beacon strength is 0,
`ice` at 0.65, `signal` at 1.4. When a dropped problem set moves a topic to Mastered, the beacon in
the world brightens and the square on the hinge takes the same step. That is the only reason the
hinge may carry a light: it reports the world.

Why it belongs to this subject: the diorama and the evidence are two reading modes, one spatial and
one tabular, and the product's claim is that they are the same data. A DS puts the picture above
and the controls below because they are different kinds of attention; StudyGotchi has the same
split for the same reason, and the hinge is the honest place to say the two are joined. On scroll
the hinge is what stays: the world folds away, the sheet keeps reading, and the hinge remembers
which world it holds and how far along it is. At 390 it keeps the beacon, the course code, and two
tabs, hands its counters to the sheet's first row, and when the world scrolls out it pins to the
top and grows a "Back to world" chip that folds the world open again. It is the only sticky element.

## 5. Motion

Every animation is one of the twelve Megaminx patterns, set with the Megaminx tokens. Layout never
moves; `prefers-reduced-motion` collapses every transform, and opacity may still fade within 100 ms.

| Pattern | Where in this direction | Timing |
|---|---|---|
| Press | Primary and secondary buttons, the "Back to world" chip, course tiles (a tile is a button with a picture, so it may scale; rows never do) | down 75 ms `ease-standard`, release 220 ms `ease-spring` |
| Lift | Hover on buttons, tiles, topic rows, evidence rows: fill to `state-5`, hairline to `hairline-strong`; no transform, Metro is flat | 100 ms `ease-out-quad` |
| Settle | The hinge tabs' thumb and the camera segmented thumb | 220 ms `ease-spring` |
| Travel | Selection moving in the topic column and the evidence table; hovering a resident in the world moves the `state-10` fill to its row in the sheet | 140 ms `ease-out-quad` |
| Reveal | The provenance card, the course tile grid overlay, the 390 detail card | 160 ms `ease-out-quint`, backdrop 140 ms |
| Crossfade | Lower screen content when a hinge tab or a course tile changes; the sheet paints first so no lilac flashes through the cream | 250 ms `ease-out-quint` |
| Snap | A state badge changing after a file is read: fill over 140 ms, a 2 px `signal` ring on the badge's edge full for the first third of 220 ms then fading; the ring never widens | 140 ms fill, 220 ms ring |
| Pulse | The drop zone's dashed hairline crawls only while a file is held over it | one dash period per 1.6 s, linear |
| Aperture | The one orchestrated moment, below | 720 ms `ease-aperture` |
| Rise | The status line under the drop zone ("Read 14 pages. 2 new sprouts.") and the counters in the hinge when they change | 160 ms `ease-out-quint` |
| Fade | The hover label in the upper screen as the pointer crosses residents and landmarks: opacity only, it changes too often to travel | 100 ms `ease-out-quad` |
| Dismiss | The provenance card and the tile grid overlay closing | 100 ms `ease-out-quad`, then unmount |

The orchestrated moment: opening the world. On the first paint of a student's own world view, once
per session, the sheet starts covering the whole viewport with the hinge at its top edge and slides
down on `transform` over 720 ms on `ease-aperture` to its resting place while the world fades in
behind it over the last 250 ms. It is Aperture with one blade instead of five: the blade is the
sheet, the uncovered region is the upper screen, and the travel equals the upper screen's height so
the last cream pixel leaves at exactly 720 ms. It never runs on the landing or visit pages, never
repeats on its own, and under reduced motion the sheet is simply in place and the world fades within
100 ms. Nothing else exceeds 250 ms. The world's own idle motion belongs to `.fleet/org.md`; the
chrome adds no ambient motion of its own.

## 6. Copy

Hero headline: **Every landmark up there was a problem set once.**

Hero subline: Drop lecture PDFs, problem sets, and exam feedback. What you demonstrate becomes a
place. What you finish brings someone to live there. Click anything to see the page that earned it.

Empty state, a course with no files yet (bare ground above, one row in the sheet):

> No files yet, so no ground yet.
> Drop a lecture PDF or a problem set. The first concept you touch becomes a sprout.

Error, a file that could not be read:

> Couldn't read pset4.pdf. Its pages are images with no text layer.
> Drop the original PDF from the course site, or a copy exported with text.

Three button labels: **Start your world** (the primary, everywhere a visitor can begin), **Open
page 3** (the provenance action, always naming the page number), **Visit a world** (the landing's
secondary). Supporting labels that keep the same verbs: "Drop files here", "Add a course",
"Share world", "Show in world", "Back to world" on the pinned hinge chip. Resident lines come from
the golden roster and appear only when a resident is hovered or opened.

## 7. Self-critique against defaults

The first draft was device cosplay. It drew a 24 px radius shell around the upper screen with a
7 percent ink bezel, inset the lower screen in the same shell at 16 px, set the hinge as an ink bar
with cream pixel mono on it, and put two 6 px lights on the hinge, one for "power" and one for
"activity". The ink bar also pulled the page back toward the near-black shell this direction
replaces: a dark strip carrying accent-coloured mono is the dark developer tool in miniature.
Everything that made it a fake handheld was cut. The upper screen has no bezel and no radius; its
sky is the page, so there is nothing to draw around. The sheet bleeds to the edges. The hinge is a
tinted fold between two hairlines in the page's own colour, a toolbar with three jobs rather than a
piece of plastic. One light remains, allowed only because it reports a real value from
`progressState`; the "power" light, which reported nothing, went.

Two smaller drifts. The type was Geist by habit, because it is already loaded; that would have kept
the shell's voice in the new chrome, so the face moved to Instrument Sans. And coral entered the
chrome as a second accent for "live" states, because the golden HUD used it that way; Metro has one
signal colour, so coral went back into the world and the chrome's states became one hue deepening
(ink tint, ice, ice deep), which the world's crystals already do.

Checked against the research's anti-default list: no serif, no terracotta; no near-black ground; no
zero-radius broadsheet; no dark shell; no gloss, bubbles, or aqua (each absent after studying the
Aero archive for exactly these); no outlines beyond the one hairline; numbered markers only on
Touched, Demonstrated, Mastered, a real sequence, and the first draft's numbered landing sections
were unnumbered; no gradient text, blobs, or glass on content. Remaining risk, named: Metro without
paper is cold. If the built round reads cold, the fix is more sheet below the hinge, never a new
colour.

## 8. What this direction would borrow if it wins

From A, Paper & Pixel: the speech-bubble provenance card, as the shape of the detail pane when a
resident is the subject. The resident's name sits on a tab at the card's top edge and the line reads
under it, so the card is spoken rather than tabulated. Radius stays at 16 and the tail is a 45
degree cut, not a lozenge, so it remains a Metro object. Source: the ACNH dialogue pattern the
research names in section 6.

From C, Sticker Toybox: the 2 px ink outline on the state badge, at Mastered only, so the last step
of the sequence has an edge the eye finds at a glance across a long table. Source: the softened
neubrutalist badge the research files under 3.5. The rest of C, the overshoot pop and the pastel
sticker chips, would fight the flat tile grid and stays out.
