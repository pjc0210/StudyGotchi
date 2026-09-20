# Direction A: Paper & Pixel

Date: 2026-09-20. Designer: Direction A. Brief of record: `docs/design/site/00-style-research.md`,
section 4 and the fleet charter in `.fleet/design-org.md`. This document is a plan; no code.

## 1. Subject, audience, single job

StudyGotchi turns a student's real course files (lecture PDFs, problem sets, exam feedback) into a
living pixel world: a touched concept is a sprout, a demonstrated concept becomes a landmark and
the ground rises, a finished problem set brings a small resident to that topic's biome, and every
resident and landmark can be clicked to see the page it came from. The audience is a university
student in one real course (6.1210 is the working example) who already keeps these files, plus
the classmates who visit that student's world read-only. The single job of the landing page is
to make one visitor believe that the world grows only from real work, by letting a resident name
the page it came from before any headline asks for anything, and then to start their own world.

## 2. Tokens

### Colour

Cream is the page. The world floats in a lilac-grey field cut into the paper like a window. Every
chrome colour below is a world colour taken unchanged, or ink at an alpha. No colour is invented,
and no world colour is warmed, cooled, or desaturated to make a "brand" version of it.

| Token    | Hex       | Derives from                                                   | Use                                                                                            |
| -------- | --------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `paper`  | `#fff6df` | World cream, unchanged (the golden HUD's card colour)          | The page, cards, sheets, speech bubbles, the text on ink fills                                 |
| `window` | `#e8e2f2` | World sky, unchanged                                           | The field the world floats in; the only place the world's own sky is allowed on the page         |
| `ink`    | `#342d45` | World ink, unchanged                                           | Text, the primary button fill, and through the alpha ramp every hairline, hover, and state fill |
| `lamp`   | `#ffe7a3` | World light, unchanged (the observatory's lit-window glow)     | The Mastered mark: an 8 px lit dot inside an ink chip. Fill only, never text                    |
| `live`   | `#e88a8a` | World coral, unchanged (Pip's accent)                          | One thing at a time that is happening now: a fresh event, a visitor present. Fill only, never text |

Contrast, measured on paper: ink on paper 11.8:1 (research doc); ink on window 10.3:1; ink on
live 5.2:1; lamp on ink 10.7:1. Live on paper is 2.3:1, so coral is never text and never a line.

The ink alpha ramp (Perplexity lineage, mixed over paper) drives every idle, hover, active, border,
and secondary-text state, so no grey is ever picked by eye:

| Step     | Ink alpha | Use                                                                  |
| -------- | --------- | -------------------------------------------------------------------- |
| `ink-3`  | 3.5%      | Idle fill on a chip that is not selected, the drop zone at rest      |
| `ink-5`  | 5.5%      | Hover fill on rows and nav                                           |
| `ink-7`  | 7%        | Active fill on rows, the sheet's resting shadow                      |
| `ink-10` | 10.5%     | The hairline: card ring, dividers, the window's inner edge           |
| `ink-14` | 14%       | The selected chip's border, the window's inset shade                 |
| `ink-20` | 20%       | Strong border on the focused input, the Touched chip's outline       |
| `ink-75` | 75%       | Secondary text and captions                                          |

Perplexity's ramp stops at 65 percent for secondary text. Over this paper, ink at 65 percent
measures 4.3:1 and fails the 4.5:1 floor, so the text step is 75 percent (5.7:1). This is the one
place the lineage value was changed, and it was changed by measurement.

Resident accents (coral, mint, light, and the peach, olive, and lilac in `.fleet/org.md`) are
read from the world roster at render time to paint a speaker's name tab. They are not chrome
tokens and the chrome never uses them for anything but that tab. Snow, ice, ice deep, and stone
stay in the world and never enter the chrome: the window field is enough sky.

Evidence states use the ramp, not three pastels. Touched is a hollow lozenge with an `ink-20`
outline. Demonstrated is a lozenge filled with ink, paper text. Mastered is the same ink lozenge
with the lamp dot lit at its left. The states darken the way the observatory's windows light up
(1, 3, 5 in the golden spec), which is the same story told twice, once in the world and once in
the chrome, without a third colour system.

### Type

| Role    | Face                          | Sizes (px/line)                                     | Weights          | Notes                                                                                                  |
| ------- | ----------------------------- | --------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------ |
| Display | Zen Maru Gothic               | 56/60 hero at 1440, 40/44 at 390; 28/34 titles; 20/28 bubble lines | 700 only         | Tracking 0. Rounded gothics collapse when tracked tight. Used for headlines, card titles, and what residents say, nothing else |
| UI/body | Instrument Sans (variable)    | 16/24 body; 14/20 UI and buttons; 13/20 rows and captions | 450 body, 500 labels, 600 buttons | Nothing below 13 in this face. The same face and weights as Megaminx Lab so the 13 px row discipline transfers whole |
| Utility | Departure Mono                | 11/16 eyebrows and small counters; 22/24 the world counters and the postmark | single weight    | Uppercase, tracked 0.08em at 11. Only 11 and 22, never 13, never inside a UI row. The one pixelated thing outside the window |

Why Zen Maru Gothic and not the other three. Nunito is what the current landing page already sets
at 800 with tight tracking, and it is the rounded sans on every cozy template of the last five
years; keeping it would keep the page mistakable. Fredoka at any weight is a balloon and belongs to
Direction C's toybox, not to paper. M PLUS Rounded 1c has the right lineage but a wide, heavy Latin
that reads as a mascot font above 40 px. Zen Maru Gothic is the free analogue of Seurat, the face
Animal Crossing sets its UI in, so the lineage is structural rather than a mood; its Latin is
narrower than Nunito's, so a 56 px headline stays dense and bookish; and its terminals are rounded
just enough to agree with the lozenges without inflating. One weight, 700, keeps hierarchy in size
and colour rather than in a parade of weights. Instrument Sans is the UI face because a rounded
face at 13 px loses its counters, and because Megaminx Lab already proved the 13/14/16 ladder in it.
Geist leaves with the dark shell it belonged to.

Text never enters the 3D pass. The world is rendered at pixel size 4; every label, chip, counter,
and bubble is native-resolution HTML on the paper or, for the bubble alone, over the window.

### Radius

`4` id chips and kbd, `8` inputs and the segmented control, `12` cards, `16` sheets, dialogs, the
speech bubble, and the window cut, `999` lozenges for chips, buttons, and name tabs. Nothing else.

### Shadow (three)

| Token            | Recipe                                                            | Use                                                                                       |
| ---------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `shadow-hairline`| `0 0 0 1px` ink-10                                                | Every card and bubble edge. Cards do not float on paper; they are sheets laid on it        |
| `shadow-sheet`   | `0 1px 0` ink-7, `0 4px 12px` ink-5                               | The speech bubble and dialogs only, because they are the one layer above the paper         |
| `shadow-window`  | `inset 0 2px 6px` ink-14, `inset 0 0 0 1px` ink-10                | The window. The world is recessed into the page, so its shadow is inside, not under it     |

The depth model is inverted from the usual card stack: the page is the top surface, the world is
cut into it, and only the bubble rises above the paper. Press animates transform, never shadow.

### Spacing

Ladder `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`. Page gutter 24 at 390, 48 at 1440. Content
width 1344 at 1440; reading column 640 for notes and the visit caption. Control heights 28 (chips),
32 (buttons, segmented), 36 (primary button, inputs). Card padding 16, sheet padding 24.

## 3. Layout

Concept: the page is a sheet of cream paper with a lilac window cut into it; everything the world
cannot render (type, chips, counters) lives on the paper around the cut, and the only chrome that
crosses into the window is a resident's speech bubble. The HUD never overlays the world.

### Landing, 1440

The hero is a thesis. The most characteristic thing in this subject's world is a resident telling
you which page it came from, so the hero is the window with Pip already speaking, and the headline
sits on the paper beside it. Nothing centred, no gradient, no stat row.

```text
+--------------------------------------------------------------------------------------------------+
| STUDYGOTCHI                                                              Visit a world   Sign in |
|                                                                                                  |
|  6.1210 · SORTING & RECURRENCES        +-------------------------------------------------------+ |
|                                        |  window (lilac, inset shadow, radius 16)              | |
|  Turn in a problem set.                |            . . observatory . .    +-----+             | |
|  Someone moves in.                     |         /   pixel world with   \  | Pip |____________ | |
|                                        |        |    three residents     |  | Has reorganized  || |
|  Your lecture PDFs, problem sets, and  |         \______________________/  | the same three   || |
|  exam feedback become a small world.   |                  Pip  <-----------| notes twice.     || |
|  Ideas you touch sprout. Ideas you     |                                   | P.14 · PSET 2    || |
|  demonstrate become landmarks, and     |                                   | [Show the page]  || |
|  the ground rises. Every resident can  |                                   +------------------+| |
|  tell you which page it came from.     |                                                       | |
|                                        +-------------------------------------------------------+ |
|  [ Start your world ]   Visit a world     WINDOWS 3/5    CRYSTALS 3/5    RESIDENTS 3             |
|                                                                                                  |
|  1 TOUCHED                 2 DEMONSTRATED                3 MASTERED                              |
|  ( ) hollow chip           (#) ink chip                  (o#) ink chip, lamp lit                 |
|  Lecture opened.           Problem solved.               Assessment confirmed.                   |
|  A sprout appears.         A landmark. The ground rises. The beacon holds.                       |
+--------------------------------------------------------------------------------------------------+
```

The three states are numbered because they are a real sequence. Nothing else on the site is
numbered. Below this band: one postcard of a classmate's world (the visit page in miniature) and a
footer in Departure Mono with the course list. No testimonials, no logo row.

### Landing, 390

```text
+--------------------------------------+
| STUDYGOTCHI                  Sign in |
|                                      |
| 6.1210 · SORTING & RECURRENCES       |
| Turn in a problem set.               |
| Someone moves in.                    |
| Your lecture PDFs, problem sets, and |
| exam feedback become a small world.  |
| +----------------------------------+ |
| | window, 1:1                      | |
| |        . . observatory . .       | |
| |      pixel world, Pip in front   | |
| |               Pip                | |
| +----------------------------------+ |
|                ^                     |
|  +-----+       |                     |
|  | Pip |______________________________|
|  | Has reorganized the same three   ||
|  | notes twice.                     ||
|  | P.14 · PSET 2    [Show the page] ||
|  +----------------------------------+|
| [        Start your world          ] |
|            Visit a world             |
| WINDOWS 3/5  CRYSTALS 3/5  RES. 3    |
+--------------------------------------+
```

At 390 the bubble cannot fit inside the window without covering the world, so it docks under the
window as a sheet and its tail points up at the speaker. Same tab, same line, same button.

### World view with HUD, 1440

```text
+--------------------------------------------------------------------------------------------------+
| < Courses    6.1210 · SORTING & RECURRENCES                        [ Overview | Resident ]  Share |
|              The Ice Observatory                                                                 |
| +----------------------------------------------------------------------------------------------+ |
| |  window                                                                                      | |
| |                                                                                              | |
| |                     . . pixel world . .            +-------+                                 | |
| |                                                    | Mochi |_______________                  | |
| |                                                    | Understands recursion. |                | |
| |                                        Mochi <-----| Refuses to explain it. |                | |
| |                                                    | P.3 · PSET 4           |                | |
| |                                                    | [Show the page]        |                | |
| |                                                    +------------------------+                | |
| |                                                                                              | |
| +----------------------------------------------------------------------------------------------+ |
| (Pip) (Mochi) (Glyph)   3 residents          Drop a file anywhere      WINDOWS 3/5  CRYSTALS 3/5 |
|                                              ......................                RESIDENTS 3   |
+--------------------------------------------------------------------------------------------------+
```

The HUD sits on the paper margin: course and topic eyebrow top left, the camera segmented control
and Share top right, the residents strip and the drop zone bottom left, the counters in Departure
Mono 22 bottom right. The world is never covered by a card. Landmarks are clickable in the window
and open the same bubble with the landmark's name on the tab.

### World view, 390

```text
+--------------------------------------+
| < 6.1210 · SORTING & REC.   [Ov|Res] |
| The Ice Observatory                  |
| +----------------------------------+ |
| | window, 4:5                      | |
| |                                  | |
| |       . . pixel world . .        | |
| |              Mochi               | |
| |                                  | |
| +----------------------------------+ |
| (Pip) (Mochi) (Glyph)     Drop file  |
| WINDOWS 3/5 CRYSTALS 3/5 RESIDENTS 3 |
|                 ^                    |
|  +-------+      |                    |
|  | Mochi |______________________________|
|  | Understands recursion. Refuses   ||
|  | to explain it.                   ||
|  | P.3 · PSET 4     [Show the page] ||
|  +----------------------------------+|
+--------------------------------------+
```

### Visit page, 1440

A visited world is a postcard: the window is smaller (16:10), the paper margin is wider, and the
caption below it is set in Departure Mono like a postmark. The bubble keeps the speaker, the line,
and the page reference, but the Show the page button is absent because the file belongs to the
host (assumption for the copy editor and product owner to confirm).

```text
+--------------------------------------------------------------------------------------------------+
| < Back to your world                                                                   Read only |
|                                                                                                  |
|          +----------------------------------------------------------------------------+          |
|          |  window, 16:10                                                             |          |
|          |                                                                            |          |
|          |                      . . Maya's pixel world . .                            |          |
|          |                                                                            |          |
|          +----------------------------------------------------------------------------+          |
|          MAYA'S ICE OBSERVATORY · 6.1210 · VISITED 20 SEP                                        |
|          WINDOWS 5/5    CRYSTALS 4/5    RESIDENTS 4                                              |
|                                                                                                  |
|          (Pip) (Fen) (Lark) (Ode)          You can look. Nothing here is yours to change.        |
+--------------------------------------------------------------------------------------------------+
```

### Visit page, 390

```text
+--------------------------------------+
| < Back to your world       Read only |
|                                      |
| +----------------------------------+ |
| | window, 4:5                      | |
| |     . . Maya's pixel world . .   | |
| |                                  | |
| +----------------------------------+ |
| MAYA'S ICE OBSERVATORY · 6.1210      |
| VISITED 20 SEP                       |
| WINDOWS 5/5 CRYSTALS 4/5 RESIDENTS 4 |
| (Pip) (Fen) (Lark) (Ode)             |
| You can look. Nothing here is yours  |
| to change.                           |
+--------------------------------------+
```

## 4. Signature: the speech-bubble provenance card

Click a resident and it tells you the page the evidence came from, with the speaker's name on a tab.

Anatomy: a paper sheet at radius 16 with the hairline ring and the sheet shadow; a lozenge tab
seated on the sheet's top-left edge, filled with the speaker's own accent from the world roster,
carrying the name in Instrument Sans 13/500 in ink; a 12 px tail cut from the same paper that
points at the speaker and is the one shape allowed to cross from the paper into the window; the
resident's line in Zen Maru Gothic 20/28; a reference line in Departure Mono 11 (page, file, and
date); and one 32 px button, Show the page. Landmarks get the same bubble with the landmark's name
on an `ink-3` tab, because a landmark does not speak in first person: its line is the concept and
the evidence ("Merge sort. Demonstrated in pset 2, problem 3.").

Rules: one bubble at a time. It Reveals from its tail. Escape, tap outside, or clicking another
resident Dismisses it. It is the only chrome permitted inside the window. At 390 it docks below the
window as a sheet with the tail pointing up. Opened from the residents strip by keyboard, focus
moves into the bubble and the tab is its accessible name.

Why it belongs to this subject. The product's whole claim is that nothing in the world is
decoration: every resident and landmark exists because a page exists. A tooltip would report that;
a character saying it makes the claim in the product's own voice, which is why the deadpan lines
belong to the residents and never to the chrome. The bubble with a name tab is the Animal Crossing
dialogue device read through Perplexity's paper (a ring, not a drop shadow, on everything but the
bubble itself) and Poolsuite's chrome (the reference line is pixel mono, so the card admits it lives
next to a DS screen). The accent on the tab is the resident's, so colour on this site means "who is
talking", never "which category", and no colour is spent on decoration.

## 5. Motion

Every animation is one of the twelve Megaminx patterns with Megaminx durations and curves. Nothing
moves layout; only transform, opacity, colour, background, border, and box-shadow animate.

| Pattern   | Where                                                                   | Timing                                                           |
| --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Press     | Buttons, chips, the name tab, the segmented control                     | Down 75 ms standard; release 220 ms spring, scale .97            |
| Lift      | Nav items, residents strip on hover, rows in the course list            | 100 ms out-quad, fill to `ink-5`, no transform                   |
| Settle    | The Overview / Resident camera segmented thumb                          | 220 ms spring on transform only                                  |
| Travel    | Selection moving along the residents strip and the course list          | 140 ms out-quad, fill on the new row, off the old                |
| Reveal    | The speech bubble mounting, origin at its tail; dialogs                 | 160 ms out-quint, opacity 0 to 1, translateY 4 px, scale .98    |
| Crossfade | Switching course, entering or leaving a visit                           | 250 ms out-quint on the incoming view; the outgoing is replaced  |
| Snap      | An evidence chip changing state (Touched to Demonstrated to Mastered)   | Fill 140 ms; a 2 px ink ring full for the first third of 220 ms then fading |
| Pulse     | The drop zone's dashed `ink-20` border while a file is held over it     | Dash offset crawling one period per 1.6 s, linear; off otherwise |
| Rise      | Counters changing (3/5 to 4/5), the save status line                    | 160 ms out-quint, opacity and 4 px rise; the live region never remounts |
| Fade      | The resident's name label following the pointer inside the window       | 100 ms out-quad, opacity only; frequent, so no travel            |
| Dismiss   | Closing the bubble or a dialog                                          | 100 ms out-quad to opacity 0, pointer-events off, then unmount   |
| Aperture  | The orchestrated moment below                                           | 720 ms on the aperture curve                                     |

The one orchestrated moment: cutting the window. On first paint of a world (landing hero or world
view, once per session), the window's area is covered by two paper-coloured half-planes meeting at
its horizontal centre line. They slide apart along their normals over 720 ms on the aperture curve,
so the world appears as a widening slit, like a letter being opened, and the last paper pixel
leaves the window's rounded edge at exactly 720 ms. The counters Rise at 720. Pip's bubble Reveals
at 880. Nothing else on the page animates during it, and it never repeats on its own.

Reduced motion collapses every transform and animation: the cover fades over 100 ms, the bubble
appears in place, chips change fill in 100 ms, Pulse and the spring are off. The world's camera
pose changes snap. Focus is a 2 px ink outline at 2 px offset and is never animated.

## 6. Copy

Hero headline (Zen Maru Gothic 56/60): "Turn in a problem set. Someone moves in."

Subline (Instrument Sans 16/24): "Your lecture PDFs, problem sets, and exam feedback become a small
world. Ideas you touch sprout. Ideas you demonstrate become landmarks, and the ground rises. Every
resident can tell you which page it came from."

Empty state (a world with no files), eyebrow "NO FILES YET", display "Nothing lives here yet.",
body "Drop a lecture, a problem set, or exam feedback. The first sprout comes from the first
file.", button "Drop a file".

Error (an upload that stopped): "pset3.pdf did not come through. The upload stopped part way. Drop
it again; nothing was added to the world." Button "Drop it again". No apology, no exclamation.

Three button labels: "Start your world", "Show the page", "Visit a world". "Start your world" is
the primary and keeps its verb through the flow: the page it opens says "Your world starts with a
file." The chrome is plain; only residents are deadpan. "Has reorganized the same three notes
twice." belongs to Pip and is never used as marketing copy on the paper.

## 7. Self-critique against defaults

The first draft of this plan, written before checking it against the research doc's section 7,
drifted toward the 2026 template in four places. Each is named with what replaced it.

1. Coral as the brand accent. The draft filled the primary button and the wordmark with coral, and
   coral on cream is the terracotta-on-cream template with the hue nudged ten degrees. Changed: the
   primary button is ink with paper text; coral is demoted to `live`, one 8 px dot for a thing
   happening now, and otherwise appears only when Pip is the one speaking.
2. Nunito Extrabold at 56 px, tracked tight, centred, over two buttons. This is the current landing
   page and every cozy template. Changed: Zen Maru Gothic 700 at tracking 0, set left on the paper
   beside the window, with the resident speaking before the headline is read.
3. Three pastel state colours. The draft coloured Touched mint, Demonstrated coral, Mastered light,
   which is pastel-on-pastel, fails contrast on paper, and invents a category colour system beside
   the residents' accents. Changed: the states use the ink ramp plus the lamp dot, the way the
   observatory's windows light up, so the chrome and the world tell one story.
4. Cards floating on cream with soft drop shadows. The default card stack puts the content on
   raised sheets over a ground. Changed: the depth model is inverted; the world is recessed with
   an inset shadow, cards sit flush with a hairline ring, and only the bubble rises.

Two smaller catches. A numbered "How it works" strip (01, 02, 03) was cut and the numbering kept
only for the three evidence states, which are a real sequence. And the Departure Mono was
creeping into 13 px UI rows for flavour; it is now confined to 11 and 22, because a pixel face in a
row of Instrument Sans is decoration, and in an eyebrow it is information about where the label is.

The risk named in the charter is "generic cozy pastel". The defences are: a single display weight,
one accent that means one thing, the ink ramp for every state, hairlines instead of shadows, the
inverted depth, and copy that only the residents are allowed to be charming in.

## 8. What this direction would borrow if it wins

From B, Modern DS: the flat Metro tile grid for the course selector, one tile per course with the
tile's face being that course's window in miniature (source: DSi and Wii channel menus via Frutiger
Metro, in B's plan). And B's two reading modes, kept without the hinge: at 390 the evidence list
docks under the window as the "lower screen", which is where the bubble already lives.

From C, Sticker Toybox: the 2 px ink outline on the three state badges only, so Touched,
Demonstrated, and Mastered read at a glance from across the page (source: the sticker badge in the
earlier Claude Design brief, softened neubrutalism). And one overshoot pop, spent in one place: a
new resident's arrival in the world uses C's pop through the Megaminx spring on release, because
"someone moves in" is the one event on this site that deserves to bounce.

Nothing else is absorbed. The paper, the window, the ink ramp, and the bubble stay as written.
