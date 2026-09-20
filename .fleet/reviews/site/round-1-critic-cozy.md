# Round 1, Critic 3: cozy-game UI (Nintendo EPD school)

Date: 2026-09-20. Scored the three plans only, on axes 1, 3, 4, 6, 10. Lens: does the chrome look like it came from the hand that made the world? Warmth as a field, roundness as structure, low hierarchy pressure, feedback that carries weight, state readable without text, copy a resident would say. I read the golden scene and the ACNH grid; I did not read the other critics.

## Scores

| Axis | A Paper & Pixel | B Modern DS | C Sticker Toybox |
|---|---|---|---|
| 1 Hierarchy | 8 | 7 | 7 |
| 3 Type discipline | 9 | 9 | 7 |
| 4 Colour restraint | 9 | 9 | 7 |
| 6 Distinctiveness | 8 | 6 | 6 |
| 10 World fit | 9 | 8 | 6 |
| Average | 8.6 | 7.8 | 6.6 |

## A, Paper & Pixel

- Hierarchy 8. "Nothing centred, no gradient, no stat row" and the resident speaks "before any headline asks for anything": that is ACNH's order (the villager talks, the menu waits). Two leaks: the HUD counters (WINDOWS 3/5, CRYSTALS 3/5) sit on the landing at both widths for a visitor who has no world and no idea what a crystal is, and at 390 the primary button lands under the docked bubble, third object down.
- Type 9. Zen Maru Gothic as "the free analogue of Seurat" is a structural lineage, not a mood, and "700 only" with tracking 0 keeps hierarchy in size. Departure Mono confined to 11 and 22, "never inside a UI row", is the right call. Body at 450 needs the variable axis; fine.
- Colour 9. Five tokens, all "taken unchanged", and the rule that colour means "who is talking, never which category" is exactly how ACNH spends colour (the name tab). Lamp and live are fill only, contrast measured. The one wrong note is below.
- Distinctiveness 8. The inverted depth ("the page is the top surface, the world is cut into it, and only the bubble rises") and the tail crossing into the window are not in any template. Cream page, ink lozenge button, hairline cards, Instrument Sans rows is also the Perplexity paper look; the window and the bubble are what keep it ours.
- World fit 9. "The HUD never overlays the world"; the window field is the world's own sky, so the golden render sits in its native colour. The bubble anatomy (lozenge name tab seated top left, tail to the speaker) matches the ACNH dialogue in the reference grid frame for frame.

Strongest move: the provenance bubble as the only chrome allowed inside the window, with the tab in the speaker's own accent (section 4). It is the world speaking about itself in the world's grammar.

Weakest decision: the evidence chips. "Demonstrated is a lozenge filled with ink" and Mastered is the same ink lozenge with a lamp dot, justified as "the states darken the way the observatory's windows light up". Lighting up is not darkening. The world gets brighter as you master it; the chrome gets nearly black. Two of three legend chips become the darkest objects on the page, which pulls the eye from the headline to a legend. EPD never fills a status pill with its darkest ink. Second note: `shadow-window` is a 6 px inset blur laid on a pixel-pass render; a soft gradient on hard pixels reads as a smudge on the DS screen.

Change to raise the lowest axis (Hierarchy): make the chip light up with the window. Touched hollow `ink-20`, Demonstrated `ink-10` fill with the `ink-20` ring, Mastered `lamp` fill with ink text and the ring (lamp is already fill-only, ink on lamp is 10.7:1). The legend stops competing with the headline and the metaphor points the right way. Then drop the counters from the landing and let them live on the classmate's postcard as its postmark.

## B, Modern DS

- Hierarchy 7. Header, upper screen, hinge, sheet is legible, and the hinge "is the only sticky element" is good discipline. But the landing hero puts a five-row table with an `ID` column ("6.1210-041") beside the thesis. A first visitor reads an identifier before a resident's name. Hierarchy pressure is high because the lower screen is a ledger; EPD's lower screen is a menu.
- Type 9. One family, "weights 400, 500, 600 only", Departure Mono "never at 13, never in a sentence, never inside a button", and the honest reason for dropping Geist. Deduction of one: 56 px at 600 with -0.02em tracking is the Linear headline; the plan says "no rounded face anywhere", which is a legitimate choice but rejects the one type trait section 3.2 names as the lineage.
- Colour 9. Signal is "the world's ice deep, unchanged"; states are "one hue deepening, the way the world's crystals deepen", which does match the world's own logic. Coral sent back into the world is correct for Metro. Not aqua, so not the anti-default.
- Distinctiveness 6. The hinge and the beacon are distinctive; the sheet is not. "208 px column, 28 px rows, 13 px UI type", a topic column, a table, a 320 px detail pane: this is the current shell with the lights on, which is the exact risk the plan names for Geist and then builds in layout. Metro tiles appear only for the course grid.
- World fit 8. "The upper screen has no bezel, no rounded corners, no shell; its sky is the page" is the single best world-fit sentence in the round: the world is never in a box. The beacon square reporting `progressState` is state without text, very Tomodachi window icon. Cost: the resident's line becomes a caption ("PIP · ICE BIRD" in mono, the line in 13 px below), a subtitle rather than speech, and the species label turns Pip into a specimen. Tomodachi never labels a Mii by type; ACNH shows only the name.

Strongest move: the sky as page (section 3.1). The diorama sits on its own sky with nothing drawn around it.

Weakest decision: the evidence table on the landing (section 3.1, "ID CONCEPT STATE SOURCE ... rows 28"). It proves the thesis with a spreadsheet.

Change to raise the lowest axis (Distinctiveness): make the lower screen a DSi lower screen, not a Linear list. Topics become Metro tiles in a row, one selected; the selected topic's concepts are a short list of concept, state badge, source, in that order; the id moves into the detail pane and the hover label loses the species. The plan already owns the tile grammar for courses; use it where the eye lands.

## C, Sticker Toybox

- Hierarchy 7. Stamp before title, "one accent per component", "one extruded coral button per screen" are real rules. But at 1440 four HUD sheets float on the world plus a fifth on click, and the hero card sits inside the window over the diorama. The plan's own 390 rule admits the problem: "on a phone the sheets must not cover the picture". Also "there is no separate breadcrumb or nav bar"; the only way home is an 11 px pixel segment at 70 percent ink. EPD never hides the way home in an eyebrow.
- Type 7. Two weights on the whole site is the tightest weight discipline of the three. But body at 17/26 and captions at 12/16 both leave the charter's 13 to 16 UI range, and Fredoka is the face the plan itself concedes "is common on children's products"; the structural defences are good, the choice is still the tell.
- Colour 7. Four tokens plus seven biome fills, all traced. The accent cap makes restraint measurable, which no other plan does. But coral carries three meanings (primary action, Demonstrated state, arrival dot), and a forest `#8fc48a` lozenge flat on cream is a saturated chip the world only shows as terrain under pixels. This is the art review's "too many accents at once" with a cap bolted on.
- Distinctiveness 6. The stamp is claimed as signature, but the golden HUD already does it and A and B both set the same eyebrow in the same face at the same size. What remains is Fredoka plus an extruded coral button plus pastel chips on cream: the cozy edtech template. The three margin props through the pixel pass are the one genuinely new idea.
- World fit 6. Sheets with `0 8px 24px` shadows floating over hard pixels; the world becomes a desktop wallpaper. Credit where due: the 2 px ink outline does rhyme with the pixel pass's edge lines, and the props being crunchy "against crisp type" is the right instinct.

Strongest move: the accent cap tokens (`accent-cap`, `card-accent: 0`, `primary-per-screen: 1`, `outline-places: 2`, section 2). Restraint as a number a critic can count.

Weakest decision: covering the world with four sheets at 1440 (section 3, world view). The world is the product and the chrome sits on its face.

Change to raise the lowest axes (Distinctiveness and World fit together): do at 1440 what the plan already does at 390. Move the sheets off the window onto a paper margin or a lower screen, leave the world uncovered, and keep the props as the only chrome that touches the picture.

## Copy, against "Has reorganized the same three notes twice."

The resident voice is third person, observational, about a small habit, no joke told, no pitch made.

- A. "Turn in a problem set. Someone moves in." states cause and effect without selling. "Nothing lives here yet." and "pset3.pdf did not come through. The upload stopped part way." are plain and warm. The plan is explicit that "the chrome is plain; only residents are deadpan", and the sample copy holds that line. The subline is one sentence too long ("and the ground rises" is a lecture).
- B. "Every landmark up there was a problem set once." is the best single chrome sentence in the round; it knows where the world is on the page. "No files yet, so no ground yet." is the most resident-like empty state anywhere. The error names the cause and the exact next step. "Open page 3" naming the number is the best button label. The wireframe undoes some of this by setting residents as "PIP · ICE BIRD" captions.
- C. "Something moved into your problem set." is a joke, and Kageyama's rule applies: "if they make smart-aleck or witty remarks they don't feel like Mii characters". The subline is a rule of three. The primary "Add a course" contradicts the page's stated job ("make her drop one course file") and the verb changes across the flow (Add a course, Add a file, Try another file). The world-view wireframe sets Mochi's line in uppercase mono ("UNDERSTANDS RECURSION. / REFUSES TO EXPLAIN IT."), which the plan's own rule forbids ("stamps are the only capitals"); a deadpan line shouted is no longer deadpan.

A resident would say A's copy. B's is the narrator's, and it is good narration. C's is the ad.

## Anti-default check (research section 7)

- A: no match. Coral as brand, Nunito at 800 centred, three pastel states and floating cards were all self-caught in section 7 of the plan; the fixes hold.
- B: partial match on "dark developer-tool shell around a pastel toy", inverted: the shell is cream but the grammar (208 column, 28 rows, id table) is the tool's. Partial match on "dense columns". Not matched: aqua (ice deep is a steel blue and traces to the pool).
- C: partial match on "cream ground, terracotta accent". The serif is absent, but an extruded coral primary on cream is that template's button with the hue moved twenty degrees; the plan argues coral is the world's, which is true and does not change how it reads. Neubrutalist chrome is not matched; the cap at two places is real.

## Ranking

1. A, Paper & Pixel, 8.6.
2. B, Modern DS, 7.8.
3. C, Sticker Toybox, 6.6.

Moves A should absorb:

- From C: the extruded press on the one primary button. C section 2 `shadow-edge` (`0 4px 0` ink, drawn as a layer under the face) and section 5 Press ("the face travels 4 px onto its ink edge, release on the spring"). A is the thinnest of the three on feedback that carries weight; its Press is scale .97, which is a tool's press. In A the face stays ink with paper text and the ledge is `ink-20` so nothing leaves the ramp. Research section 3.4 already sanctions exactly this borrow on exactly this control.
- From B: the page-numbered provenance label and the error grammar. "Open page 3" (B section 6) replaces "Show the page" in the bubble, and every error follows B's shape: the cause in one sentence, the next step in the next. A's own section 8 already claims B's Metro tile grid for courses; I agree and count it as part of this move, not a third.

Leave everything else. A's window, ramp, and bubble stay as written, with the chip and counter fixes above.
