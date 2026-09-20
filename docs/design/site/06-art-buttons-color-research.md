# Page art, buttons, interlaced colour, and night research

Date: 2026-09-20. Companion to `00-style-research.md`, which fixed the style (Paper & Pixel) and the palette. This file does not re-argue those. It answers four narrower questions with sources and turns each into rules the build teams can apply without a second meeting.

Palette shorthand used below: cream `#fff6df`, lilac `#e8e2f2`, ink `#342d45`, coral `#e88a8a`, lamp `#ffe7a3`, mint `#8fc9d8`, stone `#71697d`, snow `#edf7f7`, ice `#a9cfe8`, ice deep `#6fa4c3`. Every derived hex in this file is `color-mix(in srgb, ...)` of those ten, so the build can use the expression and drop the hex. Contrast figures are WCAG 2 ratios against the stated ground.

## 1. Page art: make it from the world, not from a stock library

### What the strong teams do

Two lineages. Game studios put the game itself on the page: goose.game scatters real in-game props across the margins as physics toys that collide with the page's own HTML (Little Workshop built invisible colliders matched to the UI), A Short Hike's site and press page are nothing but the game's own sky, pines, and screenshots, and Tiny Glade's hero is the diorama with the type sitting inside it. Product teams build a system from their own UI: Shopify's illustration guidance says spot illustrations are rare and empty states often show a simplified version of the real UI; Atlassian sorts every illustration into spot, spot hero, hero, low-fidelity UI, and ambient pattern, and tells teams to decide first whether an illustration is necessary at all; Slack's library was built on four principles (bold, elevated, dimensional, unexpected) with separate object and people styles and an explicit goal of "custom, not stock" that non-illustrators can still extend; Duolingo's characters are built from one or two geometric shapes per part so anyone can pose them, and the same character system runs product, marketing, and animation. Stripe's marketing pages use product UI, diagrams, and gradient imagery as proof beside the copy rather than as decoration.

The shared lesson: page art is a system with a small number of kinds, a fixed grid of sizes, and one rendering recipe. For us the recipe already exists. The world is rendered through `RenderPixelatedPass` at pixel size 4. Every resident and landmark can be rendered once, on a transparent clear colour, at fixed camera angles, and become a sprite. The illustration library is the world.

### Rules

1. There are exactly eight kinds of page art: hero (the live world), section spot, empty state, error, loading, marginalia, divider, and mark (favicon, OG image, app icon); nothing else gets drawn.
2. Every sprite is a render of an existing world asset from the same golden renderer (pixel size 4, normal edge 0.32, depth edge 0.24, one warm key light from upper left, no antialiasing); no hand-drawn art enters the site.
3. Sprites ship at three logical sizes only, 48, 96, and 192 CSS px, each on a 4 px pixel grid (12, 24, and 48 world pixels across), with `image-rendering: pixelated` and integer positions so no pixel is ever half-drawn.
4. Each sprite is rendered with a 1 world-pixel (4 CSS px) transparent margin on every side so neighbouring sprites in a sheet never bleed and hover scaling never clips.
5. A sprite gets a shadow only when it stands on a surface: a hard ellipse of ink at 14 percent, 1 world pixel tall, no blur, drawn in the render pass so it pixelates with the sprite; floating marginalia gets no shadow.
6. A sprite reads at 48 px only if its silhouette is one shape and one dominant colour (a resident, a lamp post, a pine); anything that needs two colours to be recognised (a bridge, a house with a roof) starts at 96.
7. Sprites face the copy: on the left column they look right, on the right column they look left, and no sprite ever faces off the page edge.
8. Marginalia is placed on the 8 px grid in the gutter or on a card corner, never over text, and at most two per viewport height.
9. Empty states show the world's own empty case (a bare island plate with the pier and one lamp) at 192 px above a heading that names why it is empty and one primary action; the sprite is `alt=""` because the text carries the meaning.
10. Error states use one neutral sprite (the signpost) at 96 px and never a resident, so nobody's creature looks blamed for a failed upload.
11. Loading is the world's own idle: the lamp post sprite at 48 px with its light blinking on the 220 ms token, no spinner.
12. Section dividers are a single row of 4 px world pixels (a fence, a path edge, a snow line) tinted with the section's biome colour at 18 percent, one world pixel tall; never a full illustration.
13. The favicon is a 16 px, 32 px, and 48 px render of one resident head (Pip) on a transparent clear; the OG image is the landing hero at 1200 by 630 with the pixel eyebrow and headline baked in.
14. One light source across all art: key from upper left, cool fill from the sky, so a sprite rendered today matches one rendered next spring.
15. Sprites carry provenance like everything else: the file name is `resident.pip.96.png` or `landmark.observatory.192.png`, and a JSON manifest records asset id, camera angle, and world-pixel size so the site can regenerate the whole set when the renderer changes.

### For StudyGotchi

Render pipeline: a `?mode=sprites` route in `prototypes/world-lab` that loads the golden scene, isolates one asset, sets the clear colour to transparent, frames it at one of three fixed orthographic zooms, and writes PNGs at 12, 24, and 48 world pixels (48, 96, 192 CSS px). Camera angles: three-quarter front for residents, three-quarter from the pier side for landmarks, straight-on for the favicon head.

Spot-art inventory:

| Page | Hero | Spot | Empty | Error | Loading | Marginalia | Divider | Mark |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Landing | live world | observatory 192 next to "Turn in a problem set" | none | signpost 96 | lamp 48 | pine 48 top right, Pip 96 peeking at the bubble | snow line | favicon, OG |
| World | live world | none (the world is the art) | bare plate 192 (no evidence yet) | signpost 96 | lamp 48 | none | path edge | favicon |
| Visit | live world (visitor's) | resident 96 in the postcard header | bare plate 192 with "Nobody lives here yet" | signpost 96 | lamp 48 | one resident 48 in the gutter | fence | favicon, OG per world |
| Sign in | none | Pip 96 above the Clerk card | none | signpost 48 inline | lamp 48 | none | none | favicon |
| Empty world | bare plate 192 | pier 96 beside the upload | this page is the empty state | signpost 96 | lamp 48 | none | snow line | favicon |

Tint for marginalia grounds: `color-mix(in srgb, mint 12%, cream)` gives `#f2f1de`, ink on it stays at 11.5:1.

### Sources

- Slack Design, "A behind-the-scenes look at building the Slack Design illustration library": https://slack.design/articles/a-behind-the-scenes-look-at-building-the-slack-design-illustration-library/ (the four principles, the object versus people split, "custom not stock", modularity for non-illustrators).
- Alice Lee, "Creating Slack's Illustration Voice": https://www.byalicelee.com/slack (a product illustration cannot be swapped like a stock image; fix the "how" before the "what").
- Shopify Polaris, Illustrations: https://polaris-react.shopify.com/design/illustrations and Empty state: https://polaris-react.shopify.com/components/layout-and-structure/empty-state (spot illustrations are rare, empty states set expectations, decorative images get empty alt, one primary action).
- Edgar Largo, "Redesigning the illustration style at Shopify": https://edgarlargo.com/redesigning-the-illustration-style-at-shopify/ (the functional to expressive scale, error states stay plain, the illustration inventory with impact ratings).
- Atlassian Design, Illustrations: https://atlassian.design/foundations/illustrations (spot, low-fidelity UI, ambient pattern; decide if art is necessary first).
- Duolingo, Characters: https://design.duolingo.com/illustration/characters and "Building character": https://blog.duolingo.com/building-character/ (geometric parts so anyone can pose, one design language shared with the mascot).
- Little Workshop, Untitled Goose Game site: https://www.littleworkshop.fr/projects/untitled-goose-game/ (in-game props as page marginalia, colliders matched to the HTML).
- A Short Hike press page: https://ashorthike.com/press/ (the game's own renders as the only art).
- MDN, "Crisp pixel art look with image-rendering": https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look and `image-rendering`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-rendering (integer scaling, pixelated, transparent padding in sheets).

## 2. Buttons: a press you can feel, built from transform and colour only

### What the strong teams do

Duolingo's button sits on a hard bottom shadow in a darker tone of its own fill; pressing collapses the shadow and drops the face 4 px. Josh Comeau's "3D button" is the same idea with three layers (shadow, edge, front) moved only with `translateY`, a slow spring out (600 ms) and a near-instant press (34 ms), and a `:focus-visible` outline so the effect never costs keyboard users their ring. Emil Kowalski's guidance is the counterweight: `scale(0.97)` on `:active`, 100 to 160 ms for press feedback, ease-out for anything that responds to the user, never ease-in, and asymmetric timing (slow where the user decides, fast where the system answers). Raycast's keycaps are 20 px tall, 4 px radius, one hairline border, and two inset shadows (a light top line and a dark bottom line) that suggest a physical key without any drop shadow; its primary CTA is a neutral near-white pill, so the whole system has no chromatic button. Linear's controls are 28 and 32 px, flat, alpha hairlines, and one accent used for the primary and the focus ring and nowhere else. Apple's 2025 guidance is to use standard button styles, keep 44 pt touch targets, and tint only the important action; Liquid Glass is for the navigation layer, explicitly not for content, so it is not relevant to a paper page. Nintendo's Switch UI, per the CEDEC 2018 talk, has around 300 sound effects built on two syllables ("ka" and "chi") at one shared tempo so consecutive confirmations form a rhythm, movement sounds change pitch by what the cursor lands on, and screen transitions play a call and a response; there is no menu music, because the click itself is the pleasure.

### Rules

1. Four heights only: 28 (dense rows and chips), 32 (default UI), 36 (page actions), 44 (the one primary action on a touch surface); label sizes 12, 13, 14, 15 in Instrument Sans at 500.
2. Six states, each visibly distinct: idle, hover, focus-visible, active, disabled, loading; hover and focus-visible are different states and both must survive on every ground the button can sit on.
3. Only `transform` and colour (`background-color`, `color`, `border-color`, `outline-color`) animate; `box-shadow`, `width`, `height`, `padding`, and `filter` never do.
4. Press-in is 75 ms ease-out; release is the single spring token; hover colour is 140 ms; loading and disabled changes crossfade at 160 ms.
5. The primary is the only button that uses coral, and coral carries ink text (`#342d45` on `#e88a8a` is 5.3:1; cream on coral is 2.3:1 and fails), so cream text on coral is banned.
6. Secondary is a cream sheet with an ink hairline at 20 percent (`color-mix(in srgb, ink 20%, cream)` = `#d6cec0`) and ink text; tertiary is text only with an ink 7 percent hover fill (`#f1e8d4`); neither adds a colour.
7. Hover on filled buttons mixes 8 percent ink into the fill (`color-mix(in srgb, ink 8%, coral)` = `#da8384`); active mixes 14 percent (`#cf7d80`); the same two percentages apply to every fill so the family feels like one material.
8. The focus ring is a 2 px outline in coral offset 2 px on cream and lilac, and 2 px lamp on ink grounds, drawn with `outline` (never `box-shadow`) so Windows high-contrast users still get one.
9. Disabled is 45 percent opacity on the whole control with `cursor: not-allowed`, never a new grey, so disabled state derives from the same tokens.
10. Loading replaces the label with the 48 px lamp sprite scaled to the label's height and keeps the width fixed so the row does not reflow.
11. The pixel button draws its corners as steps of one world pixel (4 px): a 36 px button loses a 4 by 4 square at each corner, no `border-radius`, and its shadow is a solid ink block offset one world pixel down and right; on press the face translates 4 px down and right and the shadow disappears.
12. Sound, if shipped, is opt-in, plays only on confirm and on state change (never hover, never focus, never navigation), stays under 60 ms, uses the two letter-blip syllables the world already owns at one shared tempo, and always accompanies a visible state change.
13. `prefers-reduced-motion` keeps the colour change and the 1 px press but drops the spring release and the loading blink.
14. Every button treatment is judged in a row of three (primary, secondary, tertiary) on cream, lilac, and ink grounds before it is approved; a treatment that needs a new colour on any ground is rejected.

### For StudyGotchi

Build these seven and compare them in the `?view=references` page on real copy ("Start your world", "Visit a world", "Open page 3", "Close"):

| Name | Lineage | Construction |
| --- | --- | --- |
| Paper Flat | Linear, Perplexity | 32 px, 8 px radius, coral fill with ink text for primary; cream sheet plus ink 20 percent hairline for secondary; hover ink 8 percent. The control baseline. |
| Keycap | Raycast, Megaminx Lab | 28 or 32 px, 6 px radius, cream face, hairline, one light inset line at top (cream 60 percent) and one dark inset line at bottom (ink 14 percent), pressed by `translateY(1px)`. For chips and shortcuts. |
| Extruded | Duolingo, Josh Comeau | 36 or 44 px, 12 px radius, three layers; edge is `color-mix(in srgb, ink 24%, coral)`; rest 4 px up, hover 6 px, active 2 px; 75 ms in, spring out. Primary only, one per page. |
| Pixel Step | DS system menus, Poolsuite | 36 px, stepped 4 px corners, cream face, ink 1 world-pixel offset shadow, Departure Mono label at 11 px; press removes the shadow and shifts the face. For counters and the two-screen hinge. |
| Bubble | Animal Crossing dialogue | 32 px, full pill, lilac fill (`#e8e2f2`) with ink text, `scale(0.97)` press and spring release; the "Open page 3" action inside a speech bubble. |
| Sticker | Neubrutalism, softened | 28 px, 6 px radius, 2 px ink outline, one biome fill at 18 percent; not pressable; the Touched, Demonstrated, Mastered badge, with Mastered filled in lamp `#ffe7a3`. |
| Lamp Pulse | Animal Crossing bounce, Nintendo confirm | Any of the above after a successful confirm: the fill crossfades to lamp for 250 ms and back, plus the optional confirm blip; a state, not a treatment, applied to at most one button at a time. |

Recommendation for the first build: Paper Flat as the family, Extruded for the single primary on landing and empty world, Keycap for chips, Sticker for evidence badges, Bubble inside provenance cards. Pixel Step is the wild card the two-screen direction may want; build it, but it does not ship unless that direction wins.

### Sources

- Josh Comeau, "Building a Magical 3D Button with HTML and CSS": https://www.joshwcomeau.com/animation/3d-button/ (layered construction, translateY only, 34 ms press, 600 ms release, focus-visible handling).
- Emil Kowalski, "7 Practical Animation Tips": https://emilkowal.ski/ui/7-practical-animation-tips (scale 0.97 on active, ease-out for responses, never ease-in, 100 to 160 ms press budget).
- Curio, Duolingo style guide: https://designbycurio.com/learn/duolingo-2024 (the push shadow as a darker tone of the fill, reserved for the single most important action).
- Raycast, "A fresh look and feel": https://www.raycast.com/blog/a-fresh-look-and-feel (keycap as the brand metaphor) and the Refero token capture of Raycast: https://styles.refero.design/style/3b6a17f0-3bdf-418c-a95e-0b89e5a8b2f8 (20 px keycap, inset shadow stack, neutral filled CTA, no chromatic button).
- Apple Human Interface Guidelines, Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons and "Adopting Liquid Glass": https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass (44 pt targets, tint only the important action, glass belongs to navigation not content).
- Famitsu report on the CEDEC 2018 Nintendo Switch UI talk: https://www.famitsu.com/news/201808/22162761.html and GAME Watch: https://game.watch.impress.co.jp/docs/news/1139303.html (300 effects in three families matched to three message types, one tempo for confirms, movement pitch by target, call and response on transitions, no menu music).
- MDN, `:focus-visible`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible and the WCAG note on box-shadow rings in high-contrast mode: https://stackoverflow.com/questions/52589391/css-box-shadow-vs-outline (why the ring is an outline).
- MDN, Web Audio best practices and autoplay policy: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices (audio needs a gesture; give mute and volume controls).
- Superdesign, Claymorphism recipe: https://superdesign.dev/styles/claymorphism (animate transform, not shadow).

## 3. Interlacing colour: one thread, many tints, no stripes

### What the strong teams do

The 60-30-10 rule (dominant, secondary, accent) travels from interior design and is still a useful diagnostic: strip a screen to a hue map and the accent should appear in a few deliberate clusters. Its critics are right that real products have hover, focus, error, and progress states that are behaviour, not canvas, so shipped systems replace proportions with roles. Radix gives every hue a 12-step scale where steps 1 and 2 are grounds, 3 to 5 are component fills (idle, hover, active), 6 to 8 borders, 9 and 10 solids, 11 and 12 text, and the same step numbers mean the same thing in every hue. Stripe rebuilt its palette in CIELAB so a yellow and a blue at the same step have the same contrast against the ground. Linear defines a whole theme from three values (base colour, accent colour, contrast) in LCH and derives 98 variables from them; its most recent refresh deliberately reduced how much blue chroma leaked into the neutrals to get a "more neutral and timeless" grey. Material 3 tints its surfaces with the primary hue so containers read as related to the accent without using it. Perplexity's chrome is one warm paper, one warm ink, and one teal that appears only where something is active or cited. Animal Crossing changes the whole sky and cloud colour every hour (turquoise at 6 am, blue at 2 pm, purple and orange at 6 pm, deep blue at 8 pm) so time is read from the tint of everything rather than from a clock, and Tiny Glade changes the water and light per glade so the same build reads as a different season.

### Rules

1. Coral appears at most three times per viewport: the primary action, the live-state dot or badge, and the focus ring; a fourth use means one of the first three is wrong.
2. Lamp appears only where something is mastered or just succeeded, so it is a progress signal, never decoration; the sole exception is the loading lamp, which is the same idea (the world waking up).
3. Every section ground is cream mixed with one biome colour at 8, 12, or 18 percent in sRGB, never above 18, and never two tinted sections adjacent; a tinted section is always followed by plain cream or lilac.
4. Tints are earned by content: a section tints toward mint because it is about the ice biome, toward coral because it shows a live resident, toward lamp because it shows mastery; a tint with no reason is removed.
5. Ink stays ink on every tint: at 18 percent every tint in the table below keeps ink above 10:1, so the text tokens do not change when the ground does.
6. All greys derive from ink alpha on the current ground (3.5, 5.5, 7, 10.5, 14, 20, 65 percent); no hex grey is ever typed.
7. The accent thread is a fixed set of five places where coral may live: the primary button, the live badge, the focus ring, the active nav underline, and the speaker tab on a provenance bubble; anything else that wants attention uses ink weight or lamp.
8. The lamp thread is a fixed set of four places: the Mastered badge fill, a mastered landmark's window light in the world, the progress bar's filled segment, and the confirm pulse on a button.
9. Biome colours never appear as solid fills in the chrome, only as tints of cream (8 to 18 percent) or as sprites; the world owns the saturated versions.
10. Two adjacent tinted regions must differ by at least 6 percentage points of the same mix or by hue, so a 12 percent mint card on an 8 percent mint section is legal and two 12 percent mint regions touching are not.
11. Semantic roles are aliased once: `--accent` is coral, `--progress` is lamp, `--field` is lilac, `--info` is mint at 18 percent; components reference roles, never palette names.
12. Hover and selection tints on cream never exceed 14 percent ink, so the paper still reads as paper while selected.
13. The whole page ground is allowed to drift toward the visiting world's biome by at most 8 percent on visit pages (the `?palette=` sheet's sand and mint grounds are the ceiling), and the drift is applied to the page and the sheet together so cards do not float.

### For StudyGotchi

Tint table (all `color-mix(in srgb, <biome> N%, cream)`; ink contrast on the result):

| Biome colour | 8 percent | 12 percent | 18 percent |
| --- | --- | --- | --- |
| mint `#8fc9d8` | `#f6f2de` (11.6) | `#f2f1de` (11.5) | `#ebeede` (11.1) |
| coral `#e88a8a` | `#fdedd8` (11.4) | `#fce9d5` (11.1) | `#fbe3d0` (10.6) |
| lamp `#ffe7a3` | `#fff5da` (12.0) | `#fff4d8` (11.9) | `#fff3d4` (11.8) |
| ice `#a9cfe8` | `#f8f3e0` (11.8) | `#f5f1e0` (11.5) | `#f0efe1` (11.3) |
| ice deep `#6fa4c3` | `#f3efdd` (11.3) | `#eeecdc` (11.0) | `#e5e7da` (10.4) |
| lilac `#e8e2f2` | `#fdf4e1` (12.0) | `#fcf4e1` (11.9) | `#fbf2e2` (11.8) |

Ink alpha ramp on cream: 3.5 `#f8efda`, 5.5 `#f4ebd7`, 7 `#f1e8d4`, 10.5 `#eae1cf`, 14 `#e3dac9`, 20 `#d6cec0`, 65 `#7b737b` (dim text, 4.3:1, large labels only). On lilac: 3.5 `#e2dcec`, 5.5 `#ded8e8`, 7 `#dbd5e6`, 10.5 `#d5cfe0`, 14 `#cfc9da`, 20 `#c4becf`.

Accent surfaces: coral at 16 percent on cream (`#fbe5d1`) is the live badge ground; the badge dot is solid coral; the badge text is ink. Lamp at 40 percent on cream (`#fff0c7`) is the Mastered badge ground where the full lamp is too loud, for example in a dense row.

Token sketch: `--ground: var(--cream); --sheet: var(--cream); --field: var(--lilac); --tint: color-mix(in srgb, var(--biome) 12%, var(--ground)); --hair: color-mix(in srgb, var(--ink) 20%, var(--ground)); --hover: color-mix(in srgb, var(--ink) 7%, var(--ground));` and every section sets only `--biome`.

### Sources

- Radix Colors, "Understanding the scale": https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale and "Aliasing": https://www.radix-ui.com/colors/docs/overview/aliasing (12 step roles, semantic and mutable aliases, shadows and overlays remapped per mode).
- Stripe, "Designing accessible color systems": https://stripe.com/blog/accessible-color-systems (perceptually uniform steps, equal contrast across hues).
- Linear, "How we redesigned the Linear UI (part II)": https://linear.app/now/how-we-redesigned-the-linear-ui and "A calmer interface for a product in motion": https://linear.app/now/behind-the-latest-design-refresh (three LCH variables generate the theme; less blue chroma in the neutrals; warmer grey without going muddy).
- Material 3, "How the system works": https://m3.material.io/styles/color/system/how-the-system-works and "Introducing tone-based surfaces": https://m3.material.io/blog/tone-based-surface-color-m3 (tonal palettes, surface tint from the primary, surface container roles).
- MDN, `color-mix()`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/color-mix (syntax, oklab default, sRGB when a specific hex is needed).
- ColorArchive, "The 60-30-10 ratio is a heuristic, not a law": https://colorarchive.org/notes/june-2026-surface-vs-accent-ratio/ (the hue-map diagnostic) and Brainy, "The 60-30-10 rule is broken": https://brainy.ink/paper/60-30-10-rule-color (why roles replace proportions).
- Refero token capture of Perplexity: https://styles.refero.design/style/e9fff87a-63ce-4c19-840f-98233db62f58 (one paper, one ink, one accent that only marks active and cited).
- Animal Crossing Design, "Time of Day: How the Skies in Animal Crossing Change Hourly": https://acrossingdesign.wordpress.com/2022/08/08/time-of-day-how-the-skies-in-animal-crossing-change-hourly/ (whole-scene tint as the clock).
- Tiny Glade dev diary, launch notes: https://www.eprison.de/spiele/tiny-glade/steam-news/6250522009517328308/8065/75892.html (water and light change per glade; the same build reads as another season).

## 4. Grey mode and night mode: derive both, ship one behaviour

### What the strong teams do

Apple's Dark Mode has two background sets, base and elevated: the base recedes, the elevated layer is lighter so sheets and popovers advance, foreground colours do not change, and custom colours are checked at every elevation; Apple also asks for white images to be dimmed so they do not glow. Material's older dark theme used a `#121212` ground and a white overlay ladder (5 percent at 1 dp up to 16 percent at 24 dp) with the accent moved to a lighter, less saturated 200 tone; Material 3 replaced the overlay with surface container roles tinted by the primary and darkened dark surfaces slightly. Linear generates dark from the same three LCH variables as light. Radix gives every scale a dark twin where step 1 is still the app ground and step 2 the raised surface, and recommends mutable aliases so panel, shadow, and overlay remap per mode (shadows become pure black in dark, overlays get darker). GitHub ships dark and dark dimmed as token overrides of one functional system and defaults to following the system when the user has not chosen. Slack redefines every variable in one `.sk-client-theme--dark` block, writes the theme into localStorage, and paints it before first render to avoid the white flash. Superhuman's dark-theme notes add the useful detail that accents in dark themes should keep hue, drop lightness a little, and gain saturation, while text sits at about 90 percent opacity to avoid halation. Things 3 and Perplexity show the grey daytime case: a cool or warm off-white with a single accent, ornament removed, colour only for meaning. Animal Crossing's night is not a filter over the day: the sky goes to deep blue, lamps come on, and windows glow, so light sources become the composition.

### Rules

1. Night is derived, not designed: page, sheet, raised, hairline, and text all come from mixing cream into ink, and nothing is hand-picked.
2. No pure black anywhere: the darkest value is ink mixed 12 percent toward black (`#2e283d`) and it is the page, not the sheet.
3. Elevation lightens: sheet is ink, raised surfaces (popover, bubble, menu) are ink plus 8 percent cream, and a modal is ink plus 14 percent cream, so the ladder reads as Apple's base to elevated.
4. Text is never pure cream on ink: body is cream at 92 percent over ink (`#efe6d3`, 10.5:1), dim text is cream at 62 percent (`#b2aaa4`, 5.7:1).
5. Coral at night loses lightness and keeps hue: `color-mix(in srgb, ink 15%, coral)` = `#cd7c80` (4.2:1 on ink, fine for the button fill with ink text, and for a badge dot); coral is still never text.
6. Lamp at night barely changes: `color-mix(in srgb, ink 10%, lamp)` = `#ebd49a` (9.0:1 on ink), because a lamp is the thing that is supposed to glow at night.
7. The world's sky at night is lilac mixed 65 percent toward ink (`#736c82`), snow is snow mixed 50 percent toward ink (`#90929e`), and every landmark window and lamp post switches to lamp; the world is a night scene, not a dimmed day scene.
8. Shadows become rims: drop shadows are removed, and raised surfaces get a 1 px top inset line of cream at 12 percent so edges are read by light, not by darkness.
9. The pixel renderer's clear colour and the sprite sheet's transparent ground are re-rendered against the night page, and any sprite with a baked cream halo is regenerated.
10. The focus ring at night is lamp (10.7:1 on ink), not coral (5.3:1), so keyboard users get the strongest ring available.
11. Grey daytime is cream pulled 16 percent toward stone (`#e8dfcf`) as the page, cream pulled 6 percent toward stone (`#f6eed9`) as the sheet, lilac pulled 15 percent toward stone (`#d6d0e0`) as the field, and ink unchanged (9.9:1 on the grey page).
12. In grey mode coral is pulled 25 percent toward stone (`#ca8287`) and lamp 25 percent toward stone (`#dcc89a`), so the accents sit down with the paper; sprite renders are not recoloured, only their grounds are.
13. The theme is written before first paint (an inline script reads the stored choice and sets `data-theme` on `html`) so night never flashes cream.
14. Ship three settings: Day, Night, and Follow the world (default), where Follow the world uses the student's local sunset and sunrise to switch, and the choice is remembered per browser; grey mode is a fourth, explicit, opt-in setting and not part of the automatic cycle.

### For StudyGotchi

Night derivation (all `color-mix(in srgb, ...)`):

| Role | Expression | Hex | Check |
| --- | --- | --- | --- |
| page | `ink 88%, black` | `#2e283d` | base layer |
| sheet | `ink` | `#342d45` | cards, the world frame |
| raised | `cream 8%, ink` | `#443d51` | bubbles, menus |
| modal | `cream 14%, ink` | `#50495b` | dialogs |
| hairline | `cream 12%, ink` | `#4c4557` | borders, rims |
| text | `cream 92%, ink` | `#efe6d3` | 10.5:1 on ink |
| dim text | `cream 62%, ink` | `#b2aaa4` | 5.7:1 on ink |
| accent | `ink 15%, coral` | `#cd7c80` | fill with ink text |
| accent tint | `coral 20%, ink` | `#584053` | badge ground |
| lamp | `ink 10%, lamp` | `#ebd49a` | 9.0:1 on ink |
| focus ring | `lamp` | `#ffe7a3` | 10.7:1 on ink |
| sky (world) | `ink 65%, lilac` | `#736c82` | night sky |
| snow (world) | `ink 50%, snow` | `#90929e` | moonlit snow |
| mint (world) | `ink 20%, mint` | `#7daabb` | ice pools |

Grey daytime derivation:

| Role | Expression | Hex | Check |
| --- | --- | --- | --- |
| page | `stone 16%, cream` | `#e8dfcf` | ink 9.9:1 |
| sheet | `stone 6%, cream` | `#f6eed9` | cards |
| field | `stone 15%, lilac` | `#d6d0e0` | the world frame |
| hairline | `ink 20%, page` | `#c4bbb3` | borders |
| text | `ink` | `#342d45` | unchanged |
| dim text | `ink 50%, stone` | `#524b61` | 7.7:1 on cream |
| accent | `stone 25%, coral` | `#ca8287` | ink text 4.4:1 |
| lamp | `stone 25%, lamp` | `#dcc89a` | mastered |
| mint tint | `stone 25%, mint` | `#88b1c1` | info |

Beyond colour, three things change in night: the world's key light drops to 40 percent and the lamp posts and observatory windows become emissive in lamp; the Clerk card takes the night sheet and hairline through the appearance API; and the OG image stays the day render, because link previews are seen out of context.

Recommendation: default to Follow the world. It is what the game already does, it is the one behaviour a student will remember ("my island gets dark when my room does"), and it makes night a feature rather than a preference. Offer Day and Night as overrides in the same menu, follow the system only as a fallback when location and time are unavailable, and keep grey mode as a separate, explicit choice for students who want a Kindle. Every override is stored per browser and applied before first paint.

### Sources

- Apple Human Interface Guidelines, Dark Mode: https://developer.apple.com/design/human-interface-guidelines/dark-mode and WWDC19 "Implementing Dark Mode on iOS": https://developer.apple.com/videos/play/wwdc2019/214/ (base and elevated background sets, foregrounds do not change, dim white images, check contrast at every elevation).
- Material Design, "Building a Material Dark Theme on Android": https://m3.material.io/blog/android-dark-theme-tutorial (the `#121212` ground, the white overlay ladder, the 200 tone accent) and "Introducing tone-based surfaces": https://m3.material.io/blog/tone-based-surface-color-m3 (surface containers replace overlays, dark surfaces slightly darkened).
- Linear, "How we redesigned the Linear UI (part II)": https://linear.app/now/how-we-redesigned-the-linear-ui (light and dark from the same three LCH variables plus a contrast setting).
- Radix Colors, "Aliasing": https://www.radix-ui.com/colors/docs/overview/aliasing (mutable aliases; shadows go black and overlays darken in dark mode).
- GitHub Changelog, "Dark and dimmed themes are now generally available": https://github.blog/changelog/2021-04-14-dark-and-dimmed-themes-are-now-generally-available/ and Primer color usage: https://primer.style/product/getting-started/foundations/color-usage/ (dimmed as an override theme, default to system when unset, inverted neutral scales share tokens).
- Slack Engineering, "Building Dark Mode on Desktop": https://slack.engineering/building-dark-mode-on-desktop/ (one variable block per theme, stored choice, paint before first render to avoid the flash).
- Superhuman, "How to design delightful dark themes": https://blog.superhuman.com/how-to-design-delightful-dark-themes/ (darken distant surfaces, avoid pure black and white, deepen accents by keeping hue and lowering lightness, 90 percent text).
- Cultured Code, "Hello, X!": https://culturedcode.com/things/blog/2017/11/hello-x/ and the Refero capture of Things: https://www.webdesignhot.com/design.md/things-app/ (ornament removed, the app as a sheet of paper, one accent, cool system grey ground).
- Animal Crossing Wiki, Day and Night Cycle: https://animalcrossing.fandom.com/wiki/Day_and_Night_Cycle (seasonal sunrise and sunset times; the model for Follow the world).

## Art direction addendum

Ten rules across the four topics, in priority order. The first five are the ones a build cannot ship without.

1. All page art is a render of an existing world asset from the golden pixel renderer, delivered as a transparent sprite at 48, 96, or 192 px on a 4 px grid; no hand-drawn or stock illustration enters the site.
2. Coral appears at most three times per viewport (primary action, live badge, focus ring) and always carries ink text, never cream.
3. Section grounds are cream mixed with one biome colour at 8, 12, or 18 percent, earned by the section's content, never adjacent to another tinted section, and ink does not change on them.
4. Buttons come in four heights (28, 32, 36, 44), animate only transform and colour, press in at 75 ms and release on the one spring, and draw their focus ring with `outline`.
5. Night is derived from ink by mixing cream in (page `#2e283d`, sheet `#342d45`, raised `#443d51`, text `#efe6d3`), elevation lightens, shadows become 1 px cream rims, and the focus ring becomes lamp.
6. Lamp is reserved for progress and success (Mastered badge, mastered windows, progress fill, confirm pulse, loading lamp) and is the one colour that keeps its glow at night.
7. Every grey is ink alpha on the current ground at 3.5, 5.5, 7, 10.5, 14, 20, or 65 percent; no grey hex is ever typed into a stylesheet.
8. Sprites are rendered under one light (key upper left, cool sky fill), face the copy, get a hard 1 world-pixel shadow only when standing on a surface, and start at 96 px if they need two colours to be read.
9. The theme defaults to Follow the world, switching at the student's local sunset and sunrise, with Day, Night, and a separate grey mode as remembered overrides, all applied before first paint.
10. Sound is opt-in, plays only on confirm and state change, stays under 60 ms, uses the world's own letter-blip syllables at one tempo, and never carries information a visible state does not.
