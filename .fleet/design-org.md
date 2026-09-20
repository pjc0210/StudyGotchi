# StudyGotchi Site Design Fleet: charter

Date: 2026-09-20. Producer: the coordinating agent in Cursor. The producer never draws; it
routes work, holds the brief, runs the critic panel, and runs the human gate with Philote.
Sibling of `.fleet/org.md` (the asset superfactory). That charter owns the 3D world's look;
this one owns the website's chrome around it. Repo memory is the shared state: every worker
writes to its own territory and nothing else, and nobody commits.

Brief of record: `docs/design/site/00-style-research.md`. Every worker reads it first.
Every worker who designs also reads the frontend-design skill at
`/Users/philote/.claude/skills/frontend-design/SKILL.md` and follows its process: brainstorm,
plan as tokens, review the plan against defaults, then build, then critique again.

## Aesthetic contract (all workers)

Paper & Pixel. A cozy-game paper chrome (Animal Crossing lineage) around a pixelated low-poly
world (A Short Hike lineage), set with the Megaminx Lab discipline (4/8 grid, fixed type
scale, control heights 28/32/36, alpha hairlines, one spring, durations 75/100/140/160/220/250).
The world's palette is fixed and comes first: sky `#e8e2f2`, cream `#fff6df`, ink `#342d45`,
coral `#e88a8a`, mint `#8fc9d8`, light `#ffe7a3`, plus the biome grounds in `.fleet/org.md`.
Every chrome colour must trace to the world or to ink at an alpha. No colour is invented.

Type has three roles: display (rounded gothic or humanist at a display cut, decided by the
directions), UI and body (humanist sans, 13 to 16 px), utility (a pixel mono, Departure Mono
at multiples of 11 px, for eyebrows, counters, ids). Text never enters the 3D pass.

Copy: active verbs, sentence case, the same verb through a flow, errors say what to do next,
labels name the thing not the widget. Deadpan and warm. No em or en dashes in shipped text.

Anti-defaults are listed in the research doc, section 7. A plan that matches one is revised
before it is scored.

## Roles

| Role | Owns | Reads |
|---|---|---|
| Design lead | `docs/design/site/02-design-brief.md` (the merged brief after round 1), `docs/design/site/tokens.json` | research, all directions, critic notes |
| Direction A designer, "Paper & Pixel" | `docs/design/site/directions/a-paper-and-pixel.md`, later `frontend/app/design/a/` | research, golden scene, Megaminx brief |
| Direction B designer, "Modern DS" | `docs/design/site/directions/b-modern-ds.md`, later `frontend/app/design/b/` | same |
| Direction C designer, "Sticker Toybox" | `docs/design/site/directions/c-sticker-toybox.md`, later `frontend/app/design/c/` | same |
| Motion director | `docs/design/site/03-motion.md`, later `frontend/app/motion.css` | Megaminx `motion-system.md`, the winning direction |
| Copy editor | `docs/design/site/04-copy.md` | research section 1, the golden scene lines, the winning direction |
| Critic 1, HIG reviewer | `.fleet/reviews/site/round-N-critic-hig.md` | the three directions, never the other critics' notes |
| Critic 2, Linear-school product designer | `.fleet/reviews/site/round-N-critic-linear.md` | same |
| Critic 3, cozy-game UI designer (Nintendo EPD school) | `.fleet/reviews/site/round-N-critic-cozy.md` | same |
| Reference scout | `docs/design/site/05-references.md` | web; writes URL, what to take, what to leave, date |
| Accessibility auditor | `.fleet/reviews/site/round-N-a11y.md` | built directions in the browser |

Reviewers run on a different model than the designer they review when the fleet is run by
hand. Inside one Cursor session, workers inherit the parent model unless Philote asks.

## The three directions

All three share the aesthetic contract, the world palette, the pixel mono utility face, the
copy rules, and the accessibility floor (4.5:1 body text, visible focus, reduced motion
respected, responsive to 375 px). They differ in chrome, in the one signature element, and
in which of cream and lilac grey is the page.

- **A, Paper & Pixel.** Cream is the page. The world floats in a lilac-grey field cut into the
  paper like a window. Lozenge radii on chips, 12 to 16 px on cards. Rounded gothic display.
  Speech-bubble provenance card as the signature. Lineage: ACNH UI, Perplexity's alpha ramp,
  Poolsuite's pixel-crisp chrome. Risk to defend against: generic cozy pastel.
- **B, Modern DS.** Lilac grey is the page; cream is the sheet. Two-screen frame as the
  signature: the world in the upper screen, evidence and residents in the lower, a visible
  hinge. Course selector is a flat Metro tile grid. Humanist sans throughout at a display
  cut, no rounded face. Lineage: DSi and Wii menus read through Frutiger Metro, Linear's
  chrome discipline. Risk to defend against: cold device cosplay.
- **C, Sticker Toybox.** Cream page, 2 px ink outlines on state badges and on the primary
  button only, chunky rounded display at one weight, biome chips as pastel stickers,
  overshoot pop on anything that appears. Pixel eyebrow as the signature. Lineage: the
  earlier Claude Design brief, softened neubrutalism, Kirby packaging. Risk to defend
  against: kids' app, too many accents.

After scoring, the winner absorbs one or two specific moves from the other two in a merge
round. Every absorbed move traces to a named source.

## Round 1 deliverable (plans, no code)

Each direction designer writes one document at its owned path with these sections, in
this order, and nothing else:

1. Subject, audience, single job of the landing page, in three sentences.
2. Tokens: 4 to 6 named colours with hex and the world colour each derives from; three type
   roles with the exact face, sizes, weights; radius scale; shadow tokens (at most three);
   spacing ladder.
3. Layout: one-sentence concept and ASCII wireframes at 1440 and 390 for three screens:
   the landing page (the hero is a thesis), the world view with its HUD, and the visit page
   (a read-only look at another student's world).
4. Signature: the one element the site is remembered by, and why it belongs to this
   subject.
5. Motion: which of the twelve Megaminx patterns are used where, and the one orchestrated
   moment (if any), with durations from the tokens.
6. Copy: the hero headline and subline, one empty state, one error, three button labels,
   written in the product voice.
7. Self-critique against defaults: which anti-default the first draft drifted toward, and
   what changed.
8. What this direction would borrow from the other two if it wins.

Length: 250 to 400 lines. Hex values appear once, in the tokens section, and are referenced
by name elsewhere.

## Round 2 deliverable (built)

The winning direction, merged, is built as a durable gallery route in the product, not as a
throwaway: `frontend/app/design/page.tsx` renders the landing hero, the world HUD over the
golden scene, the provenance card, the auth card (Clerk appearance), and every control in
every state, with a `?refs` mode that puts a reference pattern beside our version of it, the
way Megaminx Lab's `?view=references` does. Tokens land in `frontend/app/globals.css` under
`@theme`, and `docs/design/site/tokens.json` mirrors them. No hardcoded colours outside those
two files.

## Critique rubric

Three critics score independently and cannot see each other's notes. Ten axes, 1 to 10:

1. Hierarchy
2. Spacing rhythm on the 4/8 grid
3. Type discipline
4. Colour restraint (every colour traces to the world or to ink alpha)
5. Tactility of controls
6. Distinctiveness (would this be mistaken for a template, or for the current dark shell?)
7. Accessibility (axe plus manual contrast and focus)
8. Responsiveness (1440, 1024, 390)
9. Motion (scored by the motion director; every animation traces to a named pattern)
10. World fit (does the chrome make the pixel world look better, or compete with it?)

Round 1 (plans) scores axes 1, 3, 4, 6, 10 only. Round 2 (built) scores all ten.

Stop rule per surface: average 9.0 or higher with no axis under 8 from all three critics,
for two consecutive rounds, with axe clean and zero hardcoded colours outside `globals.css`
and `tokens.json`.

Pixel discipline each built round: 4/8 alignment, radius scale 4/8/12/16 (lozenges are
`999px` and count as a fifth step), hairline crispness at 1x and 2x, control heights
28/32/36, type scale adherence, text never rendered inside the pixel pass.

## Loop

1. Round 1 (parallel): three direction designers write plans. Reference scout writes the
   reference ledger. Copy editor drafts the voice sheet from the golden scene lines.
2. Gate: producer runs the three critics on the plans, tabulates, shows Philote. Philote
   picks a winner and names the one or two moves to absorb. This is the only human gate
   before code.
3. Merge: design lead writes `02-design-brief.md` and `tokens.json` from the winner plus the
   absorbed moves. Motion director writes `03-motion.md`.
4. Round 2: the winning direction's designer builds the gallery route against the merged
   brief. Accessibility auditor runs axe and manual checks in the browser.
5. Critics score the built gallery on all ten axes. Repeat 4 to 5 until the stop rule holds.
6. Hand off: the producer routes the tokens and components into `frontend/` through the
   frontend owner (PJ's branch is the primary base). Nothing lands in `frontend/` without
   that routing.

Known failure modes carried over from `.fleet/org.md`: a worker finishing by producing text
where a file was owed (every task here names its output path), and reviewers seeing each
other's notes (critics write to separate files and are launched in parallel).

## What this fleet does not touch

The 3D world's look (owned by `.fleet/org.md`), the backend, and any teammate's branch. The
Claude Design briefs in `docs/plans/claude-design-briefs.md` may still be pasted into Claude
Design for the world HUD and provenance card once `02-design-brief.md` exists; their sticker
chrome paragraph is superseded by the research doc.
