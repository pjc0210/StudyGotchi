# Direction C: Sticker Toybox

Date: 2026-09-20. Designer: Direction C. Brief of record: `docs/design/site/00-style-research.md`.
Charter: `.fleet/design-org.md`. Lineage: the Toybox Low-Poly sticker brief in
`docs/plans/claude-design-briefs.md`, neubrutalism softened to two pixels in two places, Kirby
packaging, Duolingo's extruded primary button on exactly one control, and the Untitled Goose
Game site for tone (one colour, one voice, deadpan copy, props in the margins). In one line: a
cream sheet with stamps on it. The page is paper, the world is the picture printed on it, and
everything else is a stamp (pixel mono, ink) or a sticker (a flat lozenge, one colour).

## 1. Subject, audience, single job

StudyGotchi turns a student's real course files, lecture PDFs, problem sets and exam feedback,
into a living world: a touched idea is a sprout, a demonstrated idea becomes a landmark and the
ground under it rises, a finished problem set brings a small resident to that topic's biome, and
every landmark and resident opens to the page it came from. The audience is an MIT undergraduate
who says courses by number (6.1210, 18.06), keeps problem sets in a folder she never reopens, and
will show a friend her world before her grades. The landing page has one job: make her drop one
course file, so a sprout appears where that idea lives.

## 2. Tokens

### Colour

Four named colours, one alpha ramp, one sticker family. The chrome owns no hue the world lacks.

| Token | Hex | Derivation | Where it may appear |
|---|---|---|---|
| `paper` | `#fff6df` | World cream, unchanged | The page, every card and sheet, the Touched sticker, text on ink |
| `ink` | `#342d45` | World ink, unchanged | All text, the 2 px outline, the button's edge, the Mastered sticker |
| `sky` | `#e8e2f2` | World sky, unchanged | The world canvas clear colour and nothing else in the chrome |
| `coral` | `#e88a8a` | World coral (Pip's accent, the golden HUD's live state) | The primary button fill, the Demonstrated sticker fill, the dot on a resident row that arrived this session |

Alpha ramp, `ink` over `paper` by `color-mix`, in percent: 3.5 (idle tint), 5.5 (hover fill),
7 (row hairline), 10.5 (pressed fill), 14 (card hairline, input border), 20 (selected hairline),
70 (secondary text and every stamp). Perplexity and Megaminx Lab end the ramp at 65; the text step
is 70 here because ink at 65 percent is 4.3:1 on paper and 11 px stamps need 4.5:1. At 70, 4.9:1.

Sticker family: the biome grounds from `.fleet/org.md`, unchanged. They fill biome chips and
nothing else, never text, a page, a card, or an outline.

| Token | Hex | Ink text on it |
|---|---|---|
| `sticker-ice` | `#e6f2fb` | 11.2:1 |
| `sticker-forest` | `#8fc48a` | 6.5:1 |
| `sticker-city` | `#d9c3d6` | 7.9:1 |
| `sticker-sand` | `#efd9a2` | 9.6:1 |
| `sticker-meadow` | `#bfe0a0` | 9.1:1 |
| `sticker-ocean` | `#9fd3e0` | 7.8:1 |
| `sticker-volcanic` | `#c9a08f` | 5.5:1 |

Measured pairs: `ink` on `paper` 12.1:1, `paper` on `ink` 12.1:1, `ink` on `coral` 5.2:1. `coral`
text on `paper` is 2.3:1 and is forbidden. World `mint` and `light` are not chrome tokens.

### The accent cap

| Token | Value | Rule |
|---|---|---|
| `accent-cap` | 1 per component | A component (badge, chip, button, card, row, stamp, banner) may carry `paper`, `ink`, the ramp, and at most one of `coral` or one `sticker-*`. |
| `card-accent` | 0 | A card has no accent of its own; its one accent is delegated to the single badge or chip inside it. A card with two badges is two cards. |
| `primary-per-screen` | 1 | One extruded coral button per screen. Everything else pressable is paper with a hairline. |
| `outline-places` | 2 | The 2 px `ink` outline appears on state stickers and on the primary button. Never on cards, inputs, chips, banners, or the world window. |

### Type

| Role | Face | Sizes (px, size/line) | Weight | Rules |
|---|---|---|---|---|
| Display | Fredoka | 56/60, 40/44, 28/32 | 600 only | Sentence case, tracking -0.01em, never below 28, never in caps, never in a button |
| UI and body | Instrument Sans | 17/26, 15/22, 13/16, 12/16 | 500 only | Buttons and inputs 15/20; HUD rows 13/16; captions under stickers 12/16 |
| Utility | Departure Mono | 11/16, 22/24 | 400 | Uppercase, 1 px letter spacing, `ink` at 70 percent. Stamps, ids, timestamps at 11; HUD counters and the share code at 22 |

Two weights on the whole site, plus a pixel face that has one. Why Fredoka at 600: Nunito 800 is
what the current landing already sets, so it is the habit, not a choice, and with M PLUS Rounded
1c it is Direction A's rounded-gothic territory; Baloo 2 reads as a nursery at any weight.
Fredoka has round terminals that rhyme with the 999 px lozenges, wide bowls that hold at 56 px
next to the crunchy world, and a variable axis, so 600 can be set exactly: 700 tips into balloon
letters, 500 loses the chunk. It is common on children's products, so the defences are structural:
one weight, never under 28 px, never capitals, a deadpan sentence in it every time, and Instrument
Sans 500 as the straight face under it (Nunito 500 for body was rejected: two soft faces on one
sheet is the kids' app read). Pixel mono never sets a UI row (13 is not a multiple of 11).

### Radius, shadow, spacing

Radius 4 (kbd, swatches), 8 (inputs, secondary buttons), 12 (primary button, course tiles), 16
(cards, the world window), 999 (state stickers, biome chips).

| Shadow token | Value | Use |
|---|---|---|
| `shadow-edge` | `0 4px 0` `ink` | The primary button's extrusion, drawn as a layer under the face; the face travels onto it. `box-shadow` never animates. |
| `shadow-sheet` | `0 1px 0` `ink` 7%, `0 8px 24px` `ink` 10.5% | HUD sheets floating over the world canvas only. Cards on the paper page take a 1 px hairline at 14 percent and no shadow. Stickers have no shadow: flat is what makes them stickers. |
| `shadow-focus` | `0 0 0 2px` `paper`, `0 0 0 4px` `ink` | Every focusable thing; drawn as a shadow so it follows the radius, including lozenges. |

Spacing ladder 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Page gutter 32 at 1440, 16 at 390.
Reading column 640. Control heights 28 (state sticker, biome chip), 32 (secondary button, input),
36 (primary button face; 40 with its edge, on the 4 grid). Stamp to title 8. Title to body 12.
Card padding 16 at 390, 24 at 1440. HUD sheets 320 wide at 1440.

## 3. Layout

Concept: the world is printed on the sheet, every region is stamped before it is titled, sheets
float over the world at 1440 and stack under it at 390, and structure comes from stamps and space.

### Landing, 1440

The hero is the thesis: the real 6.1210 world, awake, with its stamped card where the golden HUD
already puts it. Not a screenshot of the product; the product.

```text
+----------------------------------------------------------------------------------+
| STUDYGOTCHI · 6.1210 · ICE                              Sign in   [ Add a course ] |
| +------------------------------------------------------------------------------+   |
| |  world window, sky ground, 16 radius, 720 tall, the ice observatory          |   |
| |  three residents bobbing; hover one and its line fades in beside it          |   |
| |   +----------------------------------+                 Mochi                 |   |
| |   | 6.1210 · SORTING & RECURRENCES   |                 UNDERSTANDS RECURSION.|   |
| |   | Something moved into             |                 REFUSES TO EXPLAIN IT.|   |
| |   | your problem set.                |                                       |   |
| |   | Lecture PDFs, problem sets and   |                                       |   |
| |   | exam feedback become a world.    |                                       |   |
| |   | Each thing in it opens to the    |                                       |   |
| |   | page it came from.               |                                       |   |
| |   | [ Add a course ]  Look around    |                                       |   |
| |   +----------------------------------+                                       |   |
| +------------------------------------------------------------------------------+   |
|                                                                             *      |
| HOW THE GROUND FILLS IN                                                            |
| +------------------------+  +------------------------+  +------------------------+ |
| | TOUCHED · SPROUT       |  | DEMONSTRATED · LANDMARK|  | PROBLEM SET · RESIDENT | |
| | (Touched)              |  | (Demonstrated)         |  | pixel resident, still  | |
| | You opened the idea. A |  | You used it and it held|  | You finished the set.  | |
| | sprout, where it lives.|  | The ground rises.      |  | Someone moves in.      | |
| +------------------------+  +------------------------+  +------------------------+ |
| VISIT A WORLD    Other students can look at your world. Nobody can touch it.  *    |
| [ 6P2K 41NW                 ] [ Visit ]                                    *       |
+----------------------------------------------------------------------------------+
```

`*` marks the three margin props, the only three on the whole site: a sprout, a lamp post, a
crystal, through the same pixel pass as the world so they are crunchy against crisp type.
Landing page only. `(Touched)` in a wireframe is a state sticker.

### Landing, 390

```text
+------------------------------+
| STUDYGOTCHI · 6.1210 · ICE   |
| +--------------------------+ |
| | world window 358 x 300   | |
| | sky ground, 16 radius    | |
| | observatory, residents   | |
| +--------------------------+ |
| 6.1210 · SORTING & RECURR.   |
| Something moved              |
| into your problem            |
| set.                         |
| Lecture PDFs, problem sets   |
| and exam feedback become ... |
| [       Add a course       ] |
| HOW THE GROUND FILLS IN      |
| +--------------------------+ |
| | TOUCHED · SPROUT         | |
| | (Touched) You opened it. | |
| +--------------------------+ |
|   two more cards, stacked    |
| VISIT A WORLD                |
| [ 6P2K 41NW      ] [ Visit ] |
+------------------------------+
```

At 390 the card sits under the world, display drops to 40/44, the button goes full width, the
props are gone.

### World view with HUD, 1440

The whole viewport is the world window. Four HUD sheets float on it, each stamped, each carrying
at most one accent; the provenance sheet is the fifth and appears only after a click.

```text
+----------------------------------------------------------------------------------+
| < 6.1210 · WORLD                                    [ Overview | Resident ]  Share |
|             the ice observatory, full bleed on sky, pixel pass                     |
|                                                            +--------------------+  |
|                                                            | RESIDENTS · 3      |  |
|                                                            | (pip)    Pip     . |  |
|                                                            | (mochi)  Mochi     |  |
|                                                            | (glyph)  Glyph     |  |
|   +----------------------------------+                     +--------------------+  |
|   | 6.1210 · SORTING & RECURRENCES   |     +----------------------------------+    |
|   | Your work keeps the              |     | LECTURE 14 · PAGE 3              |    |
|   | observatory awake.               |     | Merge sort        (Demonstrated) |    |
|   | Demonstrated ideas light windows,|     | Used in problem set 3, question 2|    |
|   | reveal crystals and strengthen   |     | [ Open the page ]          Close |    |
|   | the beacon. Nothing is built to  |     +----------------------------------+    |
|   | fill space.                      |                                             |
|   | (Touched) (Demonstrated) (Mastered)                       +----------------+   |
|   +----------------------------------+                        | WINDOWS    3/5 |   |
|                                                               | CRYSTALS   3/5 |   |
|   ice   forest   city                                         | RESIDENTS    3 |   |
|                                                               +----------------+   |
+----------------------------------------------------------------------------------+
```

The topic card is the golden HUD card, kept; its three state stickers are the legend and the only
outlined things on the screen apart from the button in the top bar. The counters are Departure
Mono at 22, the only place pixel type gets big. The residents sheet shows the creatures as small
pixel renders, bobbing; the coral dot after Pip marks an arrival this session and is the only
coral besides the button. The biome chips under the card are lozenges in their ground colour, no
outline, only for biomes present in this world, largest land first.

### World view, 390

Borrowed shape from Direction B: two screens with a hinge, the world above, the HUD below.

```text
+------------------------------+
| < 6.1210 · WORLD  [ Ov | Re ]|
| +--------------------------+ |
| |  world 390 x 360, full   | |
| |  width, no radius        | |
| +--------------------------+ |
| ============ hinge ========= |
| 6.1210 · SORTING & RECURR.   |
| Your work keeps the          |
| observatory awake.           |
| (Touched)(Demonstr.)(Master.)|
| ice   forest   city          |
| WINDOWS 3/5   CRYSTALS 3/5   |
| RESIDENTS · 3                |
| (pip)   Pip                . |
| (mochi) Mochi   (glyph) Glyph|
+------------------------------+
```

The provenance sheet rises from the bottom edge when a landmark or resident is tapped.

### Visit page, 1440

A read-only look at another student's world. The banner is the only new element: a stamped paper
strip above the world, carrying the one primary button, because the visitor is the person we most
want to add a course.

```text
+----------------------------------------------------------------------------------+
| VISITING · ADA · 6.1210                                                            |
| You are looking at Ada's world. You can look. You cannot touch.                    |
|                                          Visit another world     [ Add a course ]  |
|------------------------------------------------------------------------------------|
|             Ada's world, full bleed on sky            [ Overview | Resident ]       |
|                                                            +--------------------+  |
|   +----------------------------------+                     | RESIDENTS · 5      |  |
|   | 6.1210 · GRAPHS & SHORTEST PATHS |                     | (five, bobbing)    |  |
|   | Ada has kept the lighthouse lit  |                     +--------------------+  |
|   | since problem set 5.             |                                             |
|   | (Touched) (Demonstrated) (Mastered)                          +----------------+ |
|   +----------------------------------+                           | WINDOWS    5/5 | |
|   ice   forest   city   ocean                                    | RESIDENTS    5 | |
+----------------------------------------------------------------------------------+
```

Read-only means no drop zone, no rename field, no `Share`. Landmarks and residents still open a
provenance sheet with the concept, state and source line, but without `Open the page` unless the
owner has shared sources (a product decision, flagged for the producer). At 390 the banner is a
stamped strip with the sentence alone, the rest follows the world view layout, and `Add a course`
sits full width at the very end, after the residents.

## 4. Signature: the stamp

Every page, section, card and sheet is stamped before it is titled: Departure Mono at 11 px,
uppercase, ink at 70 percent, 1 px letter spacing, 8 px above the title, in the form
`SCOPE · THING`, narrowing left to right the way a file path does.

```text
STUDYGOTCHI · 6.1210 · ICE            the landing hero
6.1210 · SORTING & RECURRENCES        a topic card, as the golden scene already stamps it
LECTURE 14 · PAGE 3                   a provenance sheet
VISITING · ADA · 6.1210               the visit banner
```

Why it belongs to this subject. A course is already a stamp culture: students say 6.1210, not the
course name; they say pset 4 and L14 p.3. The files the product ingests are themselves stamped
with course, lecture and page numbers, and the world's whole promise is that everything traces
back to one of those stamps. The stamp is the label, the breadcrumb and the citation at once:

- The stamp is the navigation. There is no separate breadcrumb or nav bar. Each segment is a
  link one level up (`6.1210` in `6.1210 · SORTING & RECURRENCES` opens the world), and the `<`
  before a page stamp is the only back control.
- The stamp is the only place pixel type meets the paper (plus the 22 px counters, which are
  stamps that got big), and the title never repeats it: the stamp says where, the title says what.
- Any screenshot is self-locating: a card pasted into a group chat still says its course and
  topic. Screen readers hear it as a real label, the first line of the heading group.

## 5. Motion

Every animation is an instance of a Megaminx pattern at a Megaminx duration: 75 / 100 / 140 /
160 / 220 / 250 ms, and 720 ms as the ceiling for the one orchestrated moment. Only `transform`,
`opacity`, color, background and border animate. Layout never moves. One spring, `--ease-spring`.
The direction's identity is that anything that appears pops in with one overshoot. In the
Megaminx system that is a variant of Reveal, not a new pattern: transform on `--ease-spring`
(overshoot to 1.043 at 40 percent, settled by 70), opacity on `--ease-out-quint` because the
spring never eases an opacity, both over `--duration-tactile` 220 ms, from `scale(.92)` to none.
Call it Reveal, sticker variant; "pops" below means this. Aperture is not used: the Iris is
Megaminx Lab's.

| Pattern | Where | Timing |
|---|---|---|
| Press | The primary button: the face travels 4 px onto its ink edge, `translateY(4px)`, `--duration-instant` on `--ease-standard`; release back up on `--ease-spring` over `--duration-tactile`. Secondary buttons and chips take `scale(.97)`, the standard Press. | 75 in, 220 out |
| Lift | Hover on rows, secondary buttons, stamp segments: background to the 5.5 percent step. No transform. | 100, `--ease-out-quad` |
| Settle | The Overview / Resident camera segmented thumb in the HUD. | 220, `--ease-spring` |
| Travel | Selection in the residents sheet and the course tile grid: fill on the new row, off the old. | 140, `--ease-out-quad` |
| Reveal, sticker variant | Provenance sheet mounting; a state sticker the moment its state changes; the visit banner; the hero card on first paint, once; a toast. | 220, transform on spring, opacity on quint |
| Crossfade | World to evidence list and back; the landing hero canvas on first paint. | 250, `--ease-out-quint` |
| Snap | A state sticker's fill changing under its fixed outline (paper to coral, coral to ink); a biome chip's fill when its first landmark appears. The outline is the ring and never widens. | 140 fill |
| Pulse | The drop zone's dashed ink outline crawls while a file is dragged over it, and only then. | 1.6 s loop, linear |
| Rise | The status line after ingestion ("Added lecture 14. 3 ideas touched.") and after save. | 160, `--ease-out-quint` |
| Fade | A resident's line appearing on hover, in the world and in the residents sheet. Frequent, so opacity only. | 100, `--ease-out-quad` |
| Dismiss | Provenance sheet close, toast close. | 100, `--ease-out-quad` |

Idle bob. Residents in the HUD sheet bob 2 px on `translateY`, ease-in-out sine, on Pulse's 1.6 s
period, staggered per resident. It is the one thing here not among the twelve; it borrows Pulse's
period and rule (loop only while it means something: here, "alive"), runs only while the pointer
is outside the sheet, and stops under reduced motion. The motion director may keep or cut it.
The one orchestrated moment: Arrival. When a finished problem set is processed and a resident
comes to a biome, the chrome does three things while the world does the walk-in underneath: the
topic sticker Snaps to its new fill at 0 ms, the RESIDENTS counter Rises at 140 ms, the new
resident row pops into the residents sheet at 220 ms with its coral dot. Done by 440 ms, inside
the 720 ceiling; once per arrival, never on page load. The landing page has no orchestration: one
Crossfade for the canvas and one pop for the card. Reduced motion: every transform collapses,
opacity may still fade within 100 ms, the bob and the Pulse stop, Arrival becomes three instant
fill changes.

## 6. Copy

Hero headline (Fredoka 600, 56/60):
> Something moved into your problem set.

Hero subline (Instrument Sans 500, 17/26):
> Lecture PDFs, problem sets and exam feedback become a world. Touched ideas sprout, demonstrated
> ideas become landmarks, finished problem sets bring residents. Each thing in it opens to the
> page it came from.

Empty state (a course with no files yet), stamp `6.1210 · WORLD`:
> Flat ground. No residents. Add a lecture PDF or a problem set and the first sprout appears
> where that idea lives. [ Add a file ]

Error (a scanned PDF with no text layer), stamp `6.1210 · LECTURE 14`:
> This PDF has no text we can read. It is probably a scan. Export it from your notes app with
> text, or drop the original lecture PDF from the course site. [ Try another file ]

Three button labels: `Add a course` (primary, extruded, the only coral button on any screen; the
toast says "Added 6.1210"); `Open the page` (secondary, on every provenance sheet); `Visit a
world` (secondary, next to the share code field; the banner then says "You are looking at Ada's
world"). Voice rules: active verbs, sentence case, the same verb through a flow, errors say what
to do next, deadpan and warm. Residents keep their golden lines. Stamps are the only capitals.

## 7. Self-critique against defaults

Checked against the research doc's section 7 and the frontend design skill's three template
looks, the first draft drifted in five places.

1. Toward a full neubrutalist chrome. The first pass put the 2 px ink outline on the HUD sheets,
   the provenance sheet, the inputs and the world window, and gave cards a hard offset shadow,
   because "sticker sheet" was taken literally; the world looked like a comic panel and every
   card competed with the pixel edges in the render. Changed: outlines on the three state
   stickers and the one button, nothing else (`outline-places` holds the count at 2); cards are
   flat paper with a 14 percent hairline; the world window has no border.
2. Toward rainbow chips. The first pass ran all seven biome chips across the top of every page as
   navigation and put a creature accent dot on every resident row: the accessory overload the
   art review flagged on the creatures, moved into the chrome. Changed: chips appear in the world
   legend only, only for biomes present, ordered by land area, without outlines; resident rows
   show the creature itself, and the only dot marks an arrival this session. `card-accent: 0`
   and `accent-cap: 1` exist so this drift is measurable next round.
3. Toward yellow. The first pass filled the Mastered sticker with the world's lamp light, a real
   derivation (five lit windows, beacon at full strength) but also the yellow the art review
   called the accidental de facto palette. Changed: Mastered is solid ink with paper text. The
   three states read as one sticker getting inked: outline, coral, solid. One accent hue remains.
4. Toward two soft faces. The first pass paired Fredoka with Nunito 500, both rounded, the kids'
   app read. Changed: Instrument Sans 500 for UI and body, Fredoka from 700 to 600, never under 28.
5. Toward the cream template. Cream is mandated, so the check was whether the rest of the
   template followed. It did not: no serif, the accent is the world's own coral rather than an
   invented terracotta, and the eyebrows are pixel type rather than tracked caps in a grotesk.
   One catch on the way: the golden HUD's coral "Demonstrated" text fails contrast at 2.3:1,
   fixed here rather than inherited.

Also removed: numbered markers on the rule cards (only state stickers may be numbered); a fourth
margin prop; a footer line that named tools.

## 8. What this direction would borrow if it wins

From Direction A, Paper & Pixel: the speech-bubble provenance card, for residents only. A
resident that says its own source line ("Lecture 14, page 3. I was there.") on a paper bubble
with a name tab fits a creature better than a stamped sheet does; landmarks keep the sheet.
Source: ACNH dialogue, Game UI Database entry 606, via A's plan.

From Direction B, Modern DS: the two-screen frame at 390, already drawn into the world and visit
wireframes (world above, evidence below, a visible hinge; on a phone the sheets must not cover
the picture). Source: DSi menu via B's plan. Also the flat tile grid for the course selector: one
paper tile per course, each stamped with its number and biome, no thumbnail chrome, 12 px radius.
Source: Wii channel grid read through Frutiger Metro, via B's plan. Not borrowed from either:
lilac grey as the page (cream around sky is the whole point of the sheet), and any humanist
display cut (the chunk is this direction's one risk, spent on Fredoka).
