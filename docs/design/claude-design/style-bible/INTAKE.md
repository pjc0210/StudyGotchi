# Style bible intake (Claude Design export)

Source: `~/Downloads/studygotchi-style-bible.zip` (343,830 bytes, exported 2026-09-19 20:39, canvas
created 20:30Z). Unzipped here unchanged by the Intake worker on 2026-09-19. Charter reference:
`.fleet/org.md`. Nothing in `frontend/` was touched; the Tailwind block below is prepared only.

## Artefacts present

| File | What it is |
|---|---|
| `style-bible.html` | Compiled canvas, 503 KB, self-contained: 8 boards, 19 inline SVGs, **12 reference photos embedded as JPEG data-URIs** (board 01), Nunito loaded from `fonts.googleapis.com` (only external request). No scripts, no iframes. |
| `artboards-src/*.dc.html` (8) | Board sources: `Main` (01 References), `Colour` (02), `Type` (03), `Surface` (04 spacing/radius/shadow), `Sticker` (05 sticker rule + components), `Icons` (06), `DoDont` (07), `Motion` (08, interactive). |
| `artboards-src/canvas.json` | Board layout (2 columns x 4 rows, 1280 px wide boards) and the handoff note: "tokens.json is the token source of truth; theme.css is the same set as a Tailwind v4 @theme block". |
| `tokens.export.json` | The export's token file, byte-identical copy kept for provenance (was `tokens.json` in the zip). |
| `tokens.json` | Normalised version (flat kebab-case keys, px/ms numbers, lowercase hex, plus a `charter-only` section for the biomes the bible omits). Regenerable from `tokens.export.json`. |
| `theme.tailwind-v4.css` | The export's own Tailwind v4 `@theme` block + `@utility sticker` / `@utility glass`. |

The 12 embedded reference photos (tile dioramas, toy creatures, low-poly animals, sticker
register, soft toys, layered island, etc.) have no provenance in the export. Treat them as
mood references inside the bible only; do not lift them into the app or the repo's asset tree.

## Colour tokens vs the charter palette

Every colour the bible shares with `org.md` is an exact hex match (17/17):

| Token | Bible | Charter | |
|---|---|---|---|
| forest ground / accent | #8fc48a / #4f8a4a | same | OK |
| city ground / accent | #d9c3d6 / #b98bb0 | same | OK |
| ice ground / accent | #e6f2fb / #a9cfe8 | same | OK |
| sand ground / accent | #efd9a2 / #d2a95e | same | OK |
| meadow ground / accent | #bfe0a0 / #8fbf6a | same | OK |
| sky | #f3e4ee | same | OK |
| ink | #3a2f45 | same | OK |
| creature peach / coral / mint / olive / lilac | #f2a86f / #e88a8a / #8fc9d8 / #b9c96f / #c9a2e6 | same | OK |
| **ocean ground / accent** | absent | #9fd3e0 / #4f8fb0 | **MISSING** |
| **volcanic ground / accent** | absent | #c9a08f / #8a4a3f | **MISSING** |

Flags

- The bible is a **5-biome** system ("Five biomes, each a ground and an accent"); the charter lists
  7. Ocean and volcanic have no ramp, no chip, no state colour. Added under `charter-only` in
  `tokens.json`; the light/shade ramps (+/-14 L) still need generating for them.
- Additions the charter does not have (not conflicts): cream `#fffaf3`, cream-glass
  `rgba(255,250,243,.78)`, ink-muted `#6b5f78`, ink-faint `#e9dce6`, ink-disabled `#b9a9b8`,
  error-text `#b34a4a`, shadow tint `#5a3f6b`, and a 3-step ramp per biome colour
  (e.g. forest ground light `#b4dab0` / shade `#6ea369`).
- Semantic states reuse charter colours: touched = meadow ground, demonstrated = peach, new
  creature = lilac, visiting = ice accent, error = coral, focus = forest accent.
- Board 07 contains Tailwind default blues/greys (`#2563eb`, `#3b82f6`, `#8b5cf6`, `#6b7280`,
  `#e5e7eb`, `#f9fafb`, `#ffffff`, ...) only as the "don't" example. They are not tokens.

## Typography

One family: **Nunito** (fallback `'SF Pro Rounded', ui-rounded, system-ui, sans-serif`), weights
500 body / 700 subhead / 800 head. Scale: display 56/1.05/800 (-0.01em), h1 40/1.1/800,
h2 28/1.2/800, h3 22/1.25/700, body 17/1.5/500, caption 14/1.45/500 (muted ink), label
13/1.3/800 caps +0.12em. Rules: sentence case except labels, no italics, tabular figures for
numbers, course numbers in the same face (never monospace), creature names get h3, max line
64 characters, body never below 14 px. Voice: "deadpan and warm; state facts, do not cheer".
Note for the frontend: the export links Google Fonts; self-host Nunito 500/700/800 if the app
must work offline or without third-party requests.

## Component list (board 05, 06, 07)

- Sticker rule: every pressable/pickable/status element wears a 3 px ink outline, flat fill,
  rounded corner. Over the 3D canvas only interactive elements get the outline; panels are glass.
  Full pages (landing, sign-in, My worlds) outline the panels too.
- Buttons: primary (ink-filled), secondary (cream + 3 px hard drop shadow `0 3px 0 #3a2f45`,
  pressed removes the drop and moves down 3 px), ghost (no outline, tertiary only). Min height 44 px, button 48 px.
- Chips (36 px): legend chips with a square swatch per biome; topic chips are toggles (selected = ink-filled).
- Badges (32 px): state badges in caps, filled with the semantic colour (Touched / Demonstrated / New).
- Course chip + progress ring: 6 px ring, forest accent on a pale track, round caps, counts demonstrated concepts only; breadcrumb one level deep at most.
- Inputs: focus swaps the outline to forest accent (3 px, no glow); error swaps to coral with `#b34a4a` message text.
- Banners: full-width sticker strips pinned top-centre, one line; the visiting banner has no close button.
- Provenance card: glass panel, lg radius, raised shadow; "the only place a heading sits inside glass".
- HUD panels: glass (cream 78% + 12 px blur), 24 px inset from the viewport edge.
- Course card (do/don't): cream, one ink outline, big rounded type, a picture of the world instead of a number.
- Icons: 24 px grid, 2.5 px ink stroke, round caps/joins; set = sprout, landmark, creature (the only filled ones), source page, visiting, rename, graph, island/world. Sizes 16 / 22 / 32, never below 16, no glyph text, SVG with `stroke: currentColor`, aria-label on icon-only buttons.
- Surfaces: 4 px grid (4, 8, 12, 16, 24, 32, 48, 64), radii 12 / 16 / 24 / pill, nested radii shrink by padding, never a square corner; shadows `rest 0 6 16 #5a3f6b@12%`, `raised 0 12 28 #5a3f6b@16%`, always violet-tinted, no inner shadows, no glows.

## Motion rules (board 08)

"Bold held poses. Anything that appears pops in with an overshoot. Anything idle bobs. Nothing
anticipates, nothing eases in slowly, nothing in the UI takes longer than 400 ms."

- hover/press 120 ms ease-out (colour + the 3 px drop only)
- pop-in 320 ms `cubic-bezier(.2,1.4,.4,1)`, scale 0.6 -> 1.08 -> 1 (badges, chips, creatures on arrival, sprouts); no fade-only appears
- slide-up 360 ms `cubic-bezier(.2,1.2,.4,1)`, translateY 24 -> -3 -> 0 (provenance card, banners, panels); close 200 ms, no overshoot
- idle bob 2400 ms ease-in-out, translateY 0 -> -6 -> 0, phase offset per creature; in 3D the same curve drives the body, not the feet
- never over 400 ms; no anticipation, no blur, no parallax; `prefers-reduced-motion` disables the three animations

## Contradictions / tensions with the aesthetic contract

1. **Creature colour count.** Charter: "2-3 flat colours plus one accent". Bible board 02: "A
   creature is its accent plus cream plus ink eyes, nothing else" (one colour + cream + ink).
   The generated set uses body / secondary / accent / dark / white slots. Needs a ruling.
2. **Shading wording.** Charter: "soft 3-step toon shading". Bible: "hard steps and no gradients
   ... bands snap, never blend", ramp = base +/-14 L, same hue, no black in shadows. Same idea,
   but "soft" vs "hard steps" should be reconciled in the toon shader spec.
3. **Biome count.** 5 vs 7 (above).
4. **Bird budget.** Board 01: "Under 60 faces and still a kiwi" as a reference; charter budget is
   < 1500 per creature. Not a conflict, but the bible sets a much lower aspiration.
5. **Animation vocabulary.** Charter names clips `idle`, `walk`, `happy`, `sad`, `sleep`; the bible
   defines only the idle bob for 3D. Walk/happy/sad/sleep timing and overshoot rules are undefined.
6. **Naming drift inside the export.** `tokens.json` calls the hard drop `shadow.sticker-drop`; the
   CSS names it `--shadow-drop`. The CSS `--spacing: 4px` restates Tailwind's default (harmless).
   `--ease-out` overrides Tailwind's built-in `ease-out` (intended, but note it).
7. Everything else (no outlines in 3D, sticker outline only in 2D, dot eyes, one identifying
   feature, readable at 48 px, cream/sky/ink) agrees with the charter.

## Tailwind v4 `@theme` block (prepared, not applied)

Paste after `@import "tailwindcss";` in `frontend/app/globals.css` when the producer routes it.
This is the export's block with three edits: the two missing charter biomes added (base colours
only, ramps TODO), `--shadow-drop` renamed to `--shadow-sticker-drop` to match `tokens.json`, and
comments trimmed. Utilities it yields: `bg-sky`, `text-ink`, `bg-forest-ground`,
`border-ink`, `rounded-lg`, `shadow-rest`, `ease-overshoot`, `duration-appear`, `text-h1`,
`animate-pop`, `border-sticker`, `blur-glass`.

```css
@theme {
  /* core */
  --color-sky: #f3e4ee;
  --color-cream: #fffaf3;
  --color-cream-glass: rgba(255, 250, 243, 0.78);
  --color-ink: #3a2f45;
  --color-ink-muted: #6b5f78;
  --color-ink-faint: #e9dce6;
  --color-ink-disabled: #b9a9b8;

  /* biomes: ground + accent with the 3-step ramp (light / base / shade) */
  --color-forest-ground: #8fc48a;  --color-forest-ground-light: #b4dab0;  --color-forest-ground-shade: #6ea369;
  --color-forest-accent: #4f8a4a;  --color-forest-accent-light: #79ab74;  --color-forest-accent-shade: #3a6b36;
  --color-city-ground: #d9c3d6;    --color-city-ground-light: #ece0ea;    --color-city-ground-shade: #bda5ba;
  --color-city-accent: #b98bb0;    --color-city-accent-light: #d0adc8;    --color-city-accent-shade: #986e90;
  --color-ice-ground: #e6f2fb;     --color-ice-ground-light: #f6fafd;     --color-ice-ground-shade: #c7dcec;
  --color-ice-accent: #a9cfe8;     --color-ice-accent-light: #c6e1f1;     --color-ice-accent-shade: #86b2cf;
  --color-sand-ground: #efd9a2;    --color-sand-ground-light: #f6e8c2;    --color-sand-ground-shade: #d5bc7e;
  --color-sand-accent: #d2a95e;    --color-sand-accent-light: #e0c184;    --color-sand-accent-shade: #b08a45;
  --color-meadow-ground: #bfe0a0;  --color-meadow-ground-light: #d6ecc2;  --color-meadow-ground-shade: #9fc47f;
  --color-meadow-accent: #8fbf6a;  --color-meadow-accent-light: #aed08e;  --color-meadow-accent-shade: #6f9d4f;
  /* charter biomes missing from the bible; ramps TODO (+/-14 L, same hue) */
  --color-ocean-ground: #9fd3e0;   --color-ocean-accent: #4f8fb0;
  --color-volcanic-ground: #c9a08f; --color-volcanic-accent: #8a4a3f;

  /* creature accents */
  --color-peach: #f2a86f;
  --color-coral: #e88a8a;
  --color-mint: #8fc9d8;
  --color-olive: #b9c96f;
  --color-lilac: #c9a2e6;

  /* semantic states */
  --color-touched: #bfe0a0;        --color-touched-dot: #4f8a4a;
  --color-demonstrated: #f2a86f;   --color-demonstrated-dot: #d2a95e;
  --color-creature: #c9a2e6;       --color-creature-dot: #b98bb0;
  --color-visiting: #a9cfe8;
  --color-error: #e88a8a;          --color-error-text: #b34a4a;
  --color-focus: #4f8a4a;

  /* type */
  --font-sans: "Nunito", "SF Pro Rounded", ui-rounded, system-ui, sans-serif;
  --text-display: 56px;  --text-display--line-height: 1.05; --text-display--font-weight: 800; --text-display--letter-spacing: -0.01em;
  --text-h1: 40px;       --text-h1--line-height: 1.1;       --text-h1--font-weight: 800;
  --text-h2: 28px;       --text-h2--line-height: 1.2;       --text-h2--font-weight: 800;
  --text-h3: 22px;       --text-h3--line-height: 1.25;      --text-h3--font-weight: 700;
  --text-body: 17px;     --text-body--line-height: 1.5;     --text-body--font-weight: 500;
  --text-caption: 14px;  --text-caption--line-height: 1.45; --text-caption--font-weight: 500;
  --text-label: 13px;    --text-label--line-height: 1.3;    --text-label--font-weight: 800; --text-label--letter-spacing: 0.12em;

  /* spacing (4 px grid = Tailwind default), radius, sticker outline */
  --spacing: 4px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 999px;
  --border-width-sticker: 3px;

  /* shadow (violet-tinted, never black) and glass */
  --shadow-rest: 0 6px 16px rgba(90, 63, 107, 0.12);
  --shadow-raised: 0 12px 28px rgba(90, 63, 107, 0.16);
  --shadow-sticker-drop: 0 3px 0 #3a2f45;
  --blur-glass: 12px;

  /* motion */
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-overshoot: cubic-bezier(0.2, 1.4, 0.4, 1);
  --ease-overshoot-soft: cubic-bezier(0.2, 1.2, 0.4, 1);
  --duration-hover: 120ms;
  --duration-close: 200ms;
  --duration-appear: 320ms;
  --duration-panel: 360ms;
  --duration-bob: 2400ms;
  --animate-pop: sg-pop 320ms cubic-bezier(0.2, 1.4, 0.4, 1) both;
  --animate-slide-up: sg-slide 360ms cubic-bezier(0.2, 1.2, 0.4, 1) both;
  --animate-bob: sg-bob 2400ms ease-in-out infinite;

  @keyframes sg-pop   { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
  @keyframes sg-slide { 0% { transform: translateY(24px); opacity: 0 } 70% { transform: translateY(-3px); opacity: 1 } 100% { transform: translateY(0) } }
  @keyframes sg-bob   { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
}

@media (prefers-reduced-motion: reduce) {
  .animate-pop, .animate-slide-up, .animate-bob { animation: none; }
}

@utility sticker {
  border: 3px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-cream);
}
@utility glass {
  background: var(--color-cream-glass);
  backdrop-filter: blur(var(--blur-glass));
}
```
