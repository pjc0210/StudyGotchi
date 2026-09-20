# sound-factory

Procedural, fully-licensed sound kit for StudyGotchi. Everything is authored as data
(`presets.json`, the recipe tables in `blips.mjs`) and rendered to plain 44.1 kHz / 16-bit
mono WAV by Node scripts, so agents can iterate on numbers instead of audio files.

Territory: `tools/sound-factory/` (this folder) and `assets/audio/` (outputs). Nothing else.

## Outputs

| Path | What |
|---|---|
| `assets/audio/sfx/<name>.wav` | 29 sound effects, deterministic renders of `presets.json` |
| `assets/audio/sfx/manifest.json` | name, file, group, bus, duration, peak dBFS, description, the ZzFX params (or layers) |
| `assets/audio/voices/<species>/<letter>.wav` | 5 voices (peach, coral, mint, olive, lilac) x 26 letters + `comma`/`period`/`question` pauses |
| `assets/audio/voices/manifest.json` | per-species base pitch, synth settings, letter table, scheduler constants, demo list |
| `assets/audio/voices/demo-<species>.wav` | "hello i live in the ice biome now" spoken by each voice |
| `assets/audio/manifest.js` | both manifests as a `<script>` global for the audition page (fetch of JSON is blocked over `file://`) |
| `assets/audio/audition.html` | static audition page: play buttons, live synth, speak box, bus sliders, autoplay gate |

Budget: ~3.6 MB total (limit 8 MB). Everything peaks at or below -1 dBFS (`verify.mjs` fails otherwise).

## Regenerate

```bash
cd tools/sound-factory
npm install                # once; pulls zzfx@1.3.2 only
npm run all                # render.mjs -> blips.mjs -> speak.mjs -> verify.mjs
# or individually
node render.mjs            # all SFX (+ manifest.json, manifest.js)
node render.mjs ui-* card-open   # a subset (prefix globs), merged into the manifest
node blips.mjs [species…]  # letter WAVs + voices/manifest.json
node speak.mjs             # demo sentence per species; --moods adds happy/sad variants
node speak.mjs "text" --species mint --mood happy --out /tmp/x.wav
node verify.mjs [--verbose]   # format, durations, peaks, manifest <-> disk, size budget
```

Audition: open `assets/audio/audition.html`. Over `file://` the browser refuses `fetch()` of the
WAV bytes, so the page falls back to `<audio>` elements for WAV playback (timing jitters by
~10-30 ms; "Synth live" still runs through Web Audio). For the precise path run
`npm run serve` and open <http://127.0.0.1:8765/audition.html>. Nothing plays until the first click.

## Adding or tuning a preset

1. Add an entry to `presets.json` under `sounds`:

   ```json
   "egg-wobble": {
     "group": "creature",
     "description": "Rubbery wobble, E4, 200 ms.",
     "zzfx": [0.5, 0.05, 330, 0.005, 0.06, 0.14, 1, 1.3, 4, -40, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -2000]
   }
   ```

   The 21 slots, in order: `volume, randomness, frequency, attack, sustain, release, shape,
   shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation,
   bitCrush, delay, sustainVolume, decay, tremolo, filter`. Write every slot (JSON has no
   holes; `null` would become 0). Units that trip people up: `slide` is 500 Hz per second,
   `deltaSlide` is 500 Hz/s per second, `pitchJump` is in Hz and fires once after
   `pitchJumpTime` s (with `repeatTime` it re-arms on every repeat, so the start pitch climbs:
   that is how the arpeggios work), `filter` is negative for low-pass (cutoff is about
   2x the value) and positive for high-pass, `tremolo` needs `repeatTime` and should stay at or
   below 0.5 for one pulse per repeat. Shapes: 0 sine, 1 triangle, 2 saw, 3 tan, 4 noise,
   5 square.
2. For a layered sound use `"layers": [{ "name", "at", "gain", "zzfx" }, …]` (see
   `creature-arrive`, `explode-comic`). Layers are summed; if the sum crosses the -1 dBFS
   ceiling the renderer scales the file down and prints `x0.xx` in the `limited` column, so
   lower the layer volumes instead.
3. `node render.mjs <name>` and read the table: duration in ms, peak, whether it was limited.
4. Toybox rules we kept: sine or triangle for anything pitched, noise only as low-passed air,
   notes on C/D-major pentatonic (C5 523, D5 587, E5 659, G5 784, A5 880; D-major arps
   A4 440, D5 587, F#5 740, A5 880), volumes 0.2-0.75, nothing longer than ~1.1 s except
   ambience.

Renders are deterministic: `randomness` is forced to 0 for the file and kept in the manifest,
so the runtime can synthesize live from `zzfx`/`layers` (with the authored randomness) when
it wants variation, or just play the WAV.

## Voices

`blips.mjs` is a small formant synth, not samples: a band-limited harmonic source with a
per-species spectral tilt (peach warm 1.5, coral saw-like 1.0, mint near-sine 2.2, olive odd
harmonics only, lilac detuned twin for chorus), two formant resonators (F1/F2 per letter,
scaled by species size), band-passed noise bursts for plosives and sustained hiss for
fricatives, a 10 ms raised-cosine attack and a smooth release. Vowels are 125-140 ms with a
falling pitch contour and sit a little under the base pitch; consonants are 80-105 ms,
brighter, with a rising contour. Base pitches: peach 220, coral 260, mint 330, olive 300,
lilac 390 Hz. Edit the `SPECIES` and `LETTERS` tables at the top of `blips.mjs`.

`speak.mjs` is the reference scheduler: 75 ms onset spacing (x0.85 happy, x1.2 sad, so
64-90 ms), +8 ms after vowels, 55 ms word gap, pauses `,` 120 / `.` `!` 240 / `?` 200 ms,
`?` lifts the last two letters of the word by 8 %, first letter of each word +3 % pitch,
word-final letter -2 %, a 4 % downward drift across the sentence, +-3 % deterministic
per-letter jitter. Mood: happy +15 % pitch, sad -12 %. Pitch is `playbackRate` on the letter
buffer, exactly what the browser does with `AudioBufferSourceNode`. `audition.html` carries a
copy of `schedule()` because module imports are blocked over `file://`; keep the two in sync.

## Licence

- ZzFX (`zzfx@1.3.2`) by Frank Force, MIT. `render.mjs` calls its `ZZFX.buildSamples`
  (the `zzfxG` algorithm) untouched under Node; the only trick is `lib/audio-context-stub.mjs`,
  which stubs the `AudioContext` global the module instantiates at import time.
  `assets/audio/audition.html` contains a verbatim port of the same function for live
  synthesis in the page; the MIT notice is in the file. Ship the MIT notice with any bundle
  that includes ZzFX code.
- Every WAV, `presets.json`, the blip synth, the scheduler and the page are generated here
  and belong to the project. No downloaded samples were used, so there is nothing else to
  attribute.

## Proposed Web Audio bus layout (runtime)

```
AudioContext (created and resumed inside the first user gesture: "Tap to enter your world")
└─ master GainNode (user volume; also the mute switch)
   ├─ music  GainNode  1.0   loops, crossfade day/night with two sources
   ├─ sfx    GainNode  0.9   UI + world one-shots (AudioBufferSourceNode per play)
   │  └─ ambient GainNode 0.6  wind/bird one-shots, drei PositionalAudio idle chirps
   └─ voice  GainNode  0.9   letter blips + creature greet/happy/sad
```

- Ducking: when a `voice` event starts, `music.gain.setTargetAtTime(0.35, t, 0.05)` (~150 ms);
  on the last letter's `onended`, `setTargetAtTime(1.0, t, 0.2)` (~600 ms). The audition page's
  "Demo ducking" button runs exactly this ramp.
- Decode every WAV once into an `AudioBuffer` (or `zzfxG` the params once) and fire
  `AudioBufferSourceNode.start()`; no howler needed. `playbackRate` gives species and mood
  pitch; ±3 % random rate on UI taps stops them sounding mechanical.
- Autoplay: Chrome and Safari start the context suspended; `ctx.resume()` must run inside a
  click/touch handler (iOS insists). Three's `AudioContext.getContext()` is global; resume it
  once and drei's `PositionalAudio` shares it.
- Limits: keep per-bus peaks in mind; the files are at -1 dBFS or lower, letters at -4 to
  -9 dBFS, so overlapping blips through a 0.9 voice bus stay clear of clipping.
