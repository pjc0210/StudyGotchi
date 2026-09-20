# City biome co-design session (30 minutes)

Run by the producer with Philote. Goal: leave with eight recorded choices that the World Designer folds into `biomes/city.md` and the World Engineer builds from. Rules: one screen at a time, every choice is binary with a default, no open discussion longer than 90 s per choice; park anything else in the notes.

## Setup (before the call)

Open in tabs: `refs/snowy-fishing-village.jpg`, `refs/lowpoly-island-lighthouse.png`, `refs/isometric-research-station-set.png`, `assets/landmarks/renders/city-landmark-s1.png`, `-s2`, `-s3`, `city-plaza-slab-with-fountain.png`, the creature contact sheet for city ids, and `prototypes/world-lab/screenshots/p2-level1.png` (the "what we are leaving" picture). Have `biomes/city.md` open for live edits.

## Agenda

| min | step | what happens |
|---|---|---|
| 0–3 | Frame | Show the village reference and `p2-level1.png` side by side. One sentence: "roads first, houses follow roads, lights follow lamps; nothing random." Read the mood line from `city.md`. |
| 3–5 | Grammar in 90 s | Show the layout-grammar acceptance list (6 lines). Say what a topic is (plaza + pads + roads) and that this session only picks style knobs. |
| 5–25 | Eight choices | Below, in order. Record each as `Cn: A|B` plus one phrase of reasoning. |
| 25–28 | Read-back | Read the eight choices aloud; confirm the default was overridden where it was. |
| 28–30 | Next steps | Engineer builds the city island with these choices; screenshot review at the next gate; the two open items from `city.md` not covered here (bay boat motion, downtown prop) go to the questions list. |

## The eight choices

Show the reference named, describe both options in one line each, state the default, take the answer.

**C1. Road shape** (show: village reference roads)
- A. Winding: jitter 0.25, Catmull-Rom curves, houses fan along bends (the reference).
- B. Grid-ish: jitter 0.08, near-straight streets, blocks read as blocks (Little Low Poly City).
- Default **A**.

**C2. Block size** (show: village reference, count houses between junctions)
- A. Tight: house slots every 1.1 m, 0.5 m gaps, 8–12 houses per topic; dense village.
- B. Loose: slots every 1.6 m, hedges between, 5–8 houses per topic; garden suburb.
- Default **A** for downtown and suburb, B for park and hills (say so; the choice sets the downtown value).

**C3. Roof colours** (show: reference red/blue/teal roofs vs the current mauve sheet)
- A. Rotation: mauve 50 %, coral 30 %, mint 20 % by building index.
- B. Charter only: all mauve roofs, coral doors and window frames as the accent.
- Default **A**.

**C4. Square feature** (show: `city-plaza-slab-with-fountain.png` and the reference's tree square)
- A. Fountain slab with one planter tree beside it, four benches facing in.
- B. One oversized planter tree (2.5 ×) with a bench ring, no fountain.
- Default **A**.

**C5. Waterfront** (show: reference docks)
- A. Yes: the harbour topic runs its main road onto a 3-plank dock with white rails, two boats, foam row; the bay opens to the sea.
- B. No: harbour becomes a second park; the island rim is beach only.
- Default **A**.

**C6. Lights** (show: reference string lights; night table in the bible)
- A. String lights on every main road between lamps ≤ 8 m apart, plus around the square; all bulbs lit at night.
- B. Square only; roads keep plain lamps.
- Default **A**.

**C7. Landmark variants** (show: s1 kiosk, s2 clock tower, s3 library renders, then the fix list)
- A. Accept the family with the art-review fixes (pale walls, bigger clock face, four fat columns).
- B. Swap s3: library → a lighthouse-on-quay for the harbour city read (new asset).
- Default **A**.

**C8. Creature roster** (show: contact sheet crops of the six ids)
- A. Heroes plus fillers: `blob-city-2`, `bean-city-1`, `flat-city-1`, `sprite-city-2`, `biped-city-1` (five visible over time).
- B. Heroes only: `blob-city-2` and `bean-city-1`, everything else waits for recolours.
- Default **A**.

## Record block (paste into `biomes/city.md` under "Decisions")

```
Decisions 2026-__-__ (session with Philote)
C1 road shape: A|B — 
C2 block size: A|B — 
C3 roofs: A|B — 
C4 square: A|B — 
C5 waterfront: A|B — 
C6 lights: A|B — 
C7 landmarks: A|B — 
C8 creatures: A|B — 
Parked: 
```

## Exit criteria

All eight lines filled; any B answer has a one-phrase reason; the engineer has the record block and the two reference images before the call ends.
