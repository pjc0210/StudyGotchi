# Site style research

Date: 2026-09-20. Question: what named design style should the StudyGotchi website take after, now that the world itself has a locked look (the pixelated ice observatory), and how much of it should be beige, how much Nintendo?

Short answer: the style is **Paper & Pixel**. A cozy-game paper chrome in the Animal Crossing lineage, wrapped around a pixelated low-poly diorama in the A Short Hike lineage, set with the spacing and type discipline we already built for Megaminx Lab. Beige is the paper. Nintendo is the pixels and the roundness. The full reasoning, the alternatives we measured, and everything already on hand follow.

## 1. What we already decided, in pixels

These are the facts the site has to agree with. They are not up for redesign in this round.

- **The world is pixelated low-poly 3D.** Approved 2026-09-20 in `prototypes/world-lab` (`?mode=golden`, treatment A). Render at low internal resolution through `RenderPixelatedPass` (pixel size 4, normal edge 0.32, depth edge 0.24), no antialiasing, hard facets, flat materials, one warm key light. HTML UI stays at native resolution on top. Source: `prototypes/world-lab/src/golden/golden-spec.ts`.
- **The world palette.** Sky `#e8e2f2` (lilac grey), snow `#edf7f7`, ice `#a9cfe8`, ice deep `#6fa4c3`, stone `#71697d`, ink `#342d45`, cream `#fff6df`, coral `#e88a8a`, mint `#8fc9d8`, light `#ffe7a3`. Biome grounds and accents in `.fleet/org.md` (forest, city, ice, sand, meadow, ocean, volcanic; creature accents peach, coral, mint, olive, lilac).
- **The UI already living on the golden scene.** Cream cards, ink type, small tracked pixel-mono eyebrows (`VISUAL PROOF 01`, `6.1210 · SORTING & RECURRENCES`), a rounded sans display line, and one coral accent for a live state. This is the seed of the chrome.
- **The sound direction.** The music folder is bossa nova, ukulele, marimba, "cozy puzzle" loops; the voices are letter blips in five colour-named voices (coral, lilac, mint, olive, peach). The audio is already Animal Crossing adjacent. The visuals should agree with the ears.
- **The copy voice.** Deadpan, warm, never cutesy. "Has reorganized the same three notes twice." "Understands recursion. Refuses to explain it."

## 2. What the live site does today, and why it fights the world

The deployed product (`frontend/app/globals.css`) is a dark developer-tool shell: canvas `#0a0b0d`, four dark surfaces, Geist Sans and Geist Mono, an amber brand `#f0b429`, a left rail of five nav items, and a stock Clerk sign-in card on a pale pink field. The world sits inside it as a pastel island in a black frame.

Three problems, none of them about the 3D:

1. The frame and the picture disagree. A dark Linear-style shell tells the eye "dashboard"; the pastel diorama tells it "toy". The world reads as a screenshot embedded in a tool.
2. The brand colour is off palette. Amber `#f0b429` appears nowhere in the world. The art review already flagged yellow and orange hats as the accidental de facto palette; the site repeats the mistake.
3. Two type systems. Geist in the shell, rounded sans in the world overlay, stock Clerk type in auth. Nothing is chosen; each surface uses its default.

This is the status quo direction. It is measured below and scored last.

## 3. The named styles on the table

Each style is named as the design world names it, with its lineage, what it would give us, what it would cost, and the verdict. Verdicts: **Take** (a foundation), **Borrow** (one or two moves, traced to a source), **Leave**.

### 3.1 Pixelated low-poly 3D ("3D pixel art", "lo-fi 3D")

The look of A Short Hike, and before it Animal Crossing: Wild World on the DS: real 3D geometry rendered to a low-resolution buffer and upscaled with nearest-neighbour filtering, so the pixels are large and the geometry is honest. The community calls it 3D pixel art or pixelated 3D; there is no single formal name. Our own name for it is Modern DS.

- Gives us: a world that is unmistakably a game, cheap to render, forgiving of simple geometry, and already approved.
- Costs: text and thin lines inside the 3D pass smear, so every label, chip, and card must live in HTML at native resolution. The chrome has to be crisp precisely because the world is crunchy.
- Verdict: **Take.** It is the fixed point everything else orbits.

### 3.2 Cozy-game UI (Animal Crossing: New Horizons lineage)

Sand-cream neutrals, mint and sky as fields, extreme corner radii that approach lozenges, round-stroked medium-weight type, speech-bubble dialogue, tactile bounce on selection, low hierarchy pressure (nothing screams), and ambient warmth across the whole field rather than warmth as an accent. Design writers file it under the kawaii tradition and, since 2020, as "the comfort aesthetic". ACNH sets UI text in Seurat, a Japanese rounded gothic.

- Gives us: the beige. Cream paper is a legitimate ground for a learning product that wants to feel like a desk rather than a console. It makes the lilac world pop instead of competing with it. Speech bubbles are a ready-made provenance card: a creature says where the evidence came from.
- Costs: the well-documented failure mode is "pastel on pastel": mint text on cream fails contrast, and soft shadows swallow focus rings. Our ink `#342d45` on cream `#fff6df` is 11.8:1, so the ink stays. Also the two generic traps: cream plus a high-contrast serif plus terracotta (the template answer), and rounded type at every size until nothing has hierarchy.
- Verdict: **Take** as the chrome base. Paper, roundness, bubbles, ambient warmth. Not the leaf icons, not the bouncing everything.

### 3.3 Frutiger Aero and Frutiger Metro (the literal DS and Wii era)

The Wii, DS, and 3DS system menus are the canonical Frutiger Aero: glossy translucent panels, aqua and grass, bubbles, skeuomorphic buttons, humanist sans (Frutiger, Segoe), calm music. Frutiger Metro is the flatter cousin that followed: white and light grey fields, rounded rectangular tiles in a grid (the Wii channel grid, DSi menu), flat vector icons, one signal blue. Nintendo's own version of Aero was always the restrained one.

- Gives us: the "Nintendo hardware" feeling without cosplay if we take Metro, not Aero. The channel grid is a course selector. The two-screen DS layout (world above, data below) is an honest information architecture for us: the diorama and the evidence are two different reading modes. Humanist sans is a cleaner UI face than a rounded one at 13 px.
- Costs: full Aero gloss reads as 2007 and as a meme, and it fights flat pixel geometry. Metro alone is cold; it needs the paper.
- Verdict: **Borrow** two moves. The two-screen frame as a layout device, and the flat tile grid for choosing a course. Leave the gloss, the bubbles, and the aqua.

### 3.4 Claymorphism

Puffy pastel surfaces with a large radius (20 to 40 px), two inset shadows and a tinted drop shadow, coined by Michał Malewicz in 2021 as the accessible fix for neumorphism. Mainstream carriers are Duolingo's extruded buttons and Fall Guys. In 2026 it sits in a niche: kids' products, edtech, wellness onboarding.

- Gives us: a pressable primary button with real affordance, the "toy" tactility the fleet charter asks for, and Duolingo proves it works on a learning product.
- Costs: as a whole chrome it reads "kids' app" and data density hates it. It also fights the pixel world: soft inflated shapes next to hard facets.
- Verdict: **Borrow** one move. Press feedback and depth on the one primary action and on chips only, in the same spirit as Megaminx Lab's keycaps. Never on containers.

### 3.5 Neubrutalism (the "sticker outline" UI in the earlier Claude Design brief)

Thick black borders, hard offset shadows, flat saturated fills, bold type, zero radius or slight radius. Nielsen Norman defines it as high-contrast blocky layouts with bold colours and thick borders. Our earlier brief softened it into "sticker style with 3 px dark-brown outlines, cream backgrounds, big friendly type."

- Gives us: a sticker badge for evidence states (Touched, Demonstrated, Mastered) that reads at a glance, and a genuine point of view.
- Costs: as a chrome it is loud, it dates fast, and it argues with a quiet pixel world. The art review's most consistent complaint about the assets was "too many accents at once"; a neubrutalist chrome multiplies that.
- Verdict: **Leave** as a chrome. **Borrow** the sticker badge as one component, with the ink outline at 2 px and only on state badges.

### 3.6 Warm paper minimalism (Perplexity, Things 3, the "paper" school)

Off-white paper, warm black ink, one alpha ramp of the ink for every idle, hover, active, and border state, generous line height, restrained radii. We already measured this lineage for Megaminx Lab and use its alpha state ramp there.

- Gives us: the discipline. The alpha ramp means every hover and selection derives from ink, so no grey is invented. It is the cheapest way to make cream feel expensive.
- Costs: on its own it is the cream-and-serif default the whole industry ships in 2026. It needs the pixels and the roundness to become ours.
- Verdict: **Borrow** the alpha state ramp and the paper reading column for notes and visited worlds.

### 3.7 Dark developer-tool shell (status quo)

Linear, Raycast, Vercel: near-black canvas, alpha hairlines, 13 px UI, one accent.

- Gives us: it is already built, and it is what our team defaults to.
- Costs: everything in section 2.
- Verdict: **Leave.** Keep the discipline (spacing, hairlines, type scale). Drop the dark canvas.

## 4. Verdict: Paper & Pixel

The style has a name so the team can say it in one breath. **Paper & Pixel**: a cozy-game paper chrome around a pixelated low-poly world, with Linear-grade spacing discipline.

What each word buys:

- **Paper** is the beige. A warm ground the world sits on like a diorama on a desk. Cards are sheets, notes are sheets, a visited world is a postcard.
- **Pixel** is the Nintendo. The world is crunchy; the eyebrow labels, counters, and data are set in a pixel mono so the chrome admits it lives next to a DS screen. Nothing else is pixelated: body type, buttons, and icons are crisp.
- The discipline is Megaminx Lab's: a 4/8 grid, a fixed type scale, control heights of 28/32/36, hairlines as alpha, one spring, durations of 75/100/140/160/220/250 ms, and a critic panel with a stop rule.

Two grounds are candidates, both already in the world: cream `#fff6df` (the card paper) and lilac grey `#e8e2f2` (the sky). One is the page, the other is the field the world floats in. Which is which is the first thing the direction teams disagree about, and that is fine.

Type roles, decided in iteration like Megaminx Lab's display face:

- Display: a rounded gothic with restraint. Candidates: Nunito (already loaded in `frontend`), Zen Maru Gothic or M PLUS Rounded 1c (the free analogues of ACNH's Seurat), Fredoka at one weight.
- UI and body: a humanist sans at 13 to 16 px. Candidates: Instrument Sans (Megaminx Lab), Nunito at 500 (single family), Geist (already loaded).
- Utility: a pixel mono for eyebrows, counters, coordinates, evidence ids. Departure Mono (SIL OFL, set at multiples of 11 px). Alternates on Google Fonts: Pixelify Sans, Silkscreen, Tiny5, Micro 5, Jersey 10/15/20/25, DotGothic16.

Signature candidates, one of which the winning direction owns:

- The two-screen frame: the world in the upper screen, evidence and residents in the lower, a hinge between them.
- The speech-bubble provenance card: click a creature, it tells you the page it came from.
- The pixel eyebrow: every section is stamped in pixel mono with its course and topic, the way the golden scene already does.

## 5. What is on hand

Nothing below needs a purchase.

**Renderer.** `RenderPixelatedPass`, `EffectComposer`, `OutputPass` from `three/addons` (three 0.186), already wired in `GoldenIceScene.tsx`. CSS `image-rendering: pixelated` for any raster icon. Native-resolution HTML for all text.

**Tokens.** Tailwind v4 `@theme` in `frontend/app/globals.css` (replace the dark values, keep the mechanism). Megaminx Lab's `tokens.css` for the alpha state ramp (`color-mix` of ink at 3.5 / 5.5 / 7 / 10.5 / 14 / 20 / 65 percent), the neutral ramp, the 4/8 spacing ladder, and the motion tokens; its `motion.css` for the twelve named patterns (Press, Lift, Settle, Travel, Reveal, Crossfade, Snap, Pulse, Aperture, Rise, Fade, Dismiss). Path: `/Users/philote/MIT Dropbox/Frank Gonzalez/Projects/megaminx-lab/src/app/tokens.css` and `src/ui/motion.css`.

**Fonts.** Nunito and Geist already in `frontend`. Instrument Sans, IBM Plex Mono, and Unbounded via Fontsource in Megaminx Lab. Departure Mono via `brew install font-departure-mono` or the OFL zip. Zen Maru Gothic, M PLUS Rounded 1c, Fredoka, Pixelify Sans, Silkscreen, Tiny5, Micro 5, Jersey, DotGothic16 on Google Fonts.

**World assets.** Palette and contracts in `.fleet/org.md`. Hero roster of ten creatures and the ice landmark family (rated 5/5) in `.fleet/reviews/2026-09-19-art-direction-review.md`. Biome catalog in `assets/biomes/catalog.json`. Audio in `assets/audio` with manifests.

**Auth.** Clerk's appearance API can take our tokens (fonts, radii, colours, the card) so the sign-in stops looking like a stock card on a pink field.

**Process.** Megaminx Lab's design brief, critic rubric, stop rule, copy rules, and the `?view=references` dev page pattern for studying references on our own content. Path: `/Users/philote/MIT Dropbox/Frank Gonzalez/Projects/megaminx-lab/docs/program/design-brief.md` and `motion-system.md`. The earlier Claude Design briefs in `docs/plans/claude-design-briefs.md` still hold for the world HUD and the provenance card; their "sticker outline" chrome is superseded by this document.

## 6. Reference set

Patterns, never skins. Public pages may be studied; assets are never copied and reference screenshots never enter the repo.

- Animal Crossing: New Horizons in-game UI: Game UI Database, `https://www.gameuidatabase.com/gameData.php?id=606`. Take: speech-bubble dialogue with the speaker's name on a tab, cream panels, lozenge radii, the map's soft legend chips. Leave: leaf motifs, saturated marketing red.
- Curio's style guide on the same: `https://designbycurio.com/learn/animal-crossing-horizons`. Take: the argument that roundness is structural and that ambient warmth is a field, not an accent.
- A Short Hike: `https://ashorthike.com/`. Take: pixelated 3D as the rendering truth, and a one-page site whose every colour comes from the game's own sky and pines.
- Tiny Glade: `https://pouncelight.games/tiny-glade/`. Take: a hero that is the diorama itself with the type sitting inside the scene; three actions, nothing else.
- Untitled Goose Game: `https://goose.game/`. Take: one colour, one voice, deadpan copy, props scattered in the margins. The tone benchmark.
- Poolsuite: `https://poolsuite.net/`. Take: pixel-crisp window chrome on a warm ground, a bottom dock of labelled tiles, a clock in the corner. The proof that pixel UI can feel premium on the web.
- Frutiger Aero Archive: `https://frutigeraeroarchive.org/`. Study only: this is the era the DS belongs to, and it is what we are not doing in full. Its history page separates Aero from Metro.
- Claymorphism recipe: `https://superdesign.dev/styles/claymorphism`. Take: the two-inset-plus-drop shadow for the one primary button; the warning that animating `box-shadow` is expensive, so press animates `transform` only.
- Neubrutalism guide: `https://neubrutalism.com/`. Study only: the sticker badge's ancestor.
- Megaminx Lab design brief and motion system (local paths above). Take: everything about discipline.

## 7. Anti-defaults

Each direction is checked against these before it is built. If a plan matches one, it is revised.

- Cream ground, high-contrast serif display, terracotta accent. The 2026 template.
- Near-black ground, one acid green or vermilion accent. The other template.
- Broadsheet hairlines, zero radius, dense columns.
- Dark developer-tool shell around a pastel toy.
- Glossy Aero panels, bubbles, aqua.
- Neubrutalist chrome with 3 px outlines on everything.
- Numbered section markers where the content is not a sequence. Evidence states (Touched, Demonstrated, Mastered) are a sequence and may be numbered; nav items are not.
- Gradient text, floating blobs, glassmorphism on content.

## 8. Decisions this research leaves to the direction round

1. Which of cream and lilac grey is the page, and which is the field the world floats in.
2. The display face: rounded gothic (Nunito, Zen Maru Gothic) or the same humanist family at a display cut.
3. The signature: two-screen frame, speech-bubble provenance card, or pixel eyebrow.
4. How much of the pixel mono appears at 13 px in real UI rows versus only in eyebrows and counters.
5. Whether the course selector is a Metro tile grid, an archipelago of small worlds, or a list.

Three direction teams answer these in `docs/design/site/directions/`, a critic panel scores them against the rubric in the fleet charter, and the winner absorbs one or two moves from the others before anything is coded.
