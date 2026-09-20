# Claude Design briefs for StudyGotchi

Paste each brief into Claude Design (claude.ai/design) as its own project. Attach the
reference images listed under "Attach" (they are in the chat and in
`docs/research/game-art/`). Export HTML for anything we will port into Next.js/Tailwind,
SVG for icons, PDF/PPTX for the deck. Do not let it invent product copy that claims
features we have not built; the demo ledger below is the whole feature list.

## Shared aesthetic block (prepend to every brief)

> **Project:** StudyGotchi, a web game where a student's real course progress fills in a
> living world. Course files (lecture PDFs, psets, exam feedback) become a cited concept
> graph; each concept is a spot in the world. Touched concept = sprout. Demonstrated
> concept = landmark, and the ground rises. Finished pset = a small creature appears in
> that topic's biome. Click anything to see the source page it came from. Other students
> can visit your world read-only.
>
> **Aesthetic name:** Toybox Low-Poly. Chunky faceted low-poly geometry where the facets
> are a feature (Pokémon Rumble toys, low-poly kiwi bird and mouse), blob bodies with dot
> eyes (Ditto), floating layered islands with pedestal cliffs (Kirby world-select cakes,
> Penguin Isle), dense small props, many tiny creatures wandering. 3D has NO outlines and
> soft 3-step toon shading. 2D UI is the opposite: sticker style with thick dark-brown
> outlines (the cartoon beaver), rounded corners, cream backgrounds, big friendly type.
>
> **Palette (biomes, hex):** forest ground #8fc48a accent #4f8a4a; city ground #d9c3d6
> accent #b98bb0; ice ground #e6f2fb accent #a9cfe8; sand ground #efd9a2 accent #d2a95e;
> meadow ground #bfe0a0 accent #8fbf6a. Sky/background #f3e4ee. Ink for UI outlines
> #3a2f45. Cream panel #fffaf3. One saturated accent per creature (peach #f2a86f, coral
> #e88a8a, mint #8fc9d8, olive #b9c96f, lilac #c9a2e6).
>
> **Type:** rounded sans (Nunito / SF Pro Rounded feel). Headlines 700, body 500.
> **Tone:** deadpan, warm, never cutesy in copy; the creatures are cute, the UI is calm.
> Motion: bold held poses, overshoot ease-out, nothing slower than 400 ms in UI.

## Brief 1: Style bible and design system (do this first)

Attach: the twelve reference images, `board-A-soft-toy-creatures.png`,
`board-D-biome-island.png`, and the two `proto-island-*.png` screenshots.

> Build a design system and a one-page style bible for StudyGotchi from the aesthetic
> block and the attached references. Include: colour tokens (biome palettes, ink, cream,
> accents, semantic states for touched/demonstrated/new-creature), type scale, spacing,
> radius (large: 16–24 px), shadow (soft, tinted #5a3f6b at 12%), sticker-outline rule
> for 2D UI (3 px #3a2f45), iconography rules (single readable silhouette, no text inside
> icons), and a "do / don't" row contrasting our look with generic flat dashboards. Add a
> motion section: overshoot pop-in for anything that appears, gentle bob for idle, no
> anticipation frames. Export as HTML plus a token JSON I can paste into Tailwind v4 CSS
> variables.

## Brief 2: World HUD and provenance card (interactive prototype)

Attach: `proto-island-100b.png`, `proto-island-patch.png`.

> Design the overlay UI that sits on top of a 3D island canvas (treat the canvas as a
> fixed background image, do not design the 3D). Screens: (1) Overview: top-left course
> chip (course number + name), progress ring (% of concepts demonstrated), biome legend
> as sticker chips (name + colour swatch), a "How the map fills in" mini-legend with the
> three rules; (2) Patch level: breadcrumb "6.1210 › Graphs & shortest paths", back
> button, topic chips to jump between patches; (3) Provenance card (bottom-right, slides
> up): concept name, evidence state (Touched / Demonstrated) as a sticker badge, source
> line "Lecture 14, page 3" with an "Open page" button, and for creatures: name, topic,
> "arrived when pset 4 was finished", a rename field; (4) Visitor banner: "You are
> visiting Ada's world (read-only)". Make it an interactive HTML prototype with the card
> opening on click of hotspot circles placed over the screenshot. Keep panels
> translucent cream with blur, sticker outlines only on interactive elements.

## Brief 3: Landing, sign-in, and "My worlds" (world select)

> Design three pages. Landing: one headline ("Your notes become a world."), a looping
> hero slot for a screen recording, three rule cards (sprout / landmark / creature), a
> sponsor-safe footer. Sign-in: single card, email + Google, no marketing. My worlds: a
> grid of island cards, one per course (7 courses: 6.1210, 18.06, 18.03, 6.1400, 8.022,
> 8.223, 16.C20), each card shows a small island thumbnail slot, course number, progress
> ring, creature count, and "Last evidence: pset 4 · 2h ago"; plus a "Visit a friend"
> input for a share code. Export HTML for porting to Next.js + Tailwind v4.

## Brief 4: Landmark and prop concept sheets (per biome)

Attach: the isometric research-station icon set, the Kirby snow pedestal, Penguin Isle.

> For each biome (ice, forest, city, sand, meadow) produce one sheet: a 3-stage landmark
> (sprout → small building → grand landmark) that reads at 64 px, 6 filler props (trees,
> rocks, lamps, docks, crystals, fences as fits the biome), and a colour strip using that
> biome's ground + accent. Style: chunky low-poly toy, faceted, no outlines, soft
> 3-step shading, one readable silhouette per object, isometric 3/4 view. Ice gets:
> igloo → observatory dome → glacier lighthouse; city: kiosk → clock tower → library;
> forest: stump → treehouse → great tree; sand: tent → adobe hut → pyramid greenhouse;
> meadow: signpost → windmill → greenhouse dome. Export SVG per sheet and PNG previews.
> These are modelling references for our Blender pipeline, so keep proportions honest
> (heights in metres: stage 1 ≈ 0.5, stage 2 ≈ 1.0, stage 3 ≈ 1.8).

## Brief 5: Creature roster sheet

Attach: `board-A-soft-toy-creatures.png`, the Ditto, the kiwi, the mouse, the Rumble
toys, plus `assets/creatures/generated/contact-sheet.png` once it exists.

> Design a roster page for 30 procedurally generated creatures grouped by biome: each
> cell has the creature render slot (square), a two-word name suggestion, its archetype
> (blob / bean / bird / biped), and a one-line personality in Tomodachi deadpan ("Refuses
> to acknowledge the glacier."). Add a "pick your favourites" checkbox per cell and a
> sticky summary bar with the count. This is a review tool for us, not a product page.

## Brief 6: Judge deck (8 slides)

> Eight slides in the style bible: 1 title with island hero; 2 the problem (course
> files are dead after the semester; effort is invisible); 3 the loop (files → cited
> concept graph → evidence → world); 4 the three rules with visuals; 5 provenance (click
> a landmark, see the page); 6 visiting worlds; 7 what is real vs. what is next (be
> honest); 8 team + stack (Next.js 16, FastAPI + Postgres/pgvector, React Three Fiber,
> Blender asset factory). Export PPTX and PDF.

## Handoff format back to the repo

- HTML prototypes → `docs/design/claude-design/<brief>/` (we port by hand into
  `frontend/components/`; Claude Design's Claude Code handoff bundle is also fine).
- SVG icons → `frontend/public/icons/`.
- Token JSON → paste into `frontend/app/globals.css` as CSS variables under `@theme`.
- Concept sheets (PNG/SVG) → `assets/reference/landmarks/<biome>/`.
