# 07 – Sound Design Research

Research scout notes for StudyGotchi (Next.js + React Three Fiber, browser-only playback). Facts verified against live sources on 2026-09-19; see Sources.

## 1. How the reference games do voices

| Game | Technique | What we can borrow |
| --- | --- | --- |
| Tomodachi Life | Real TTS: compressed Nuance/Cerence voices (`libNTTS`, "Samantha" US / "Serena" EU) plus a pronunciation-override file ("Luweegi"). Sliders: pitch (register), speed (rate), quality/depth (timbre), tone, accent, intonation. JP build uses a separate syllable engine (fans match it to AquesTalk2). Fan clones run eSpeak NG in WASM through a "Mii-ify" DSP chain. | Real words + heavy pitch/rate mangling reads as "robotic but cute". |
| Animal Crossing (Animalese) | One sample per letter (older games) or per kana/syllable (New Horizons: ~240 `Kana`/`KanaEx` units per personality), concatenated as text scrolls, then sped up. Pitch = personality × species body size × mood. Punctuation = pause. | Letter blips are trivially cheap and charming; species → pitch offset fits our creatures. |
| Celeste | Per-character synth tone with formant-EQ automation performed on a MIDI keyboard; takes sorted into 20 quick / 10 emphasized / 10 sentence-end syllables per emotion; FMOD picks randomly (never twice in a row), `dialogue_portrait` selects emotion, `dialogue_end` low-passes the tail. | Emotion buckets + no-repeat random scheduler, easy in JS. |
| Banjo-Kazooie / Yooka-Laylee | Recorded human grunts played randomly per syllable, pitch-shifted per character (same sample reused lower for other NPCs). | One "blorp" set reused across species via `playbackRate`. |
| Undertale / Deltarune | One short synthesized blip per non-space character, character-specific sample, punctuation pauses. | The simplest "text blip" pattern. |
| The Sims (Simlish) | ~90% improvised by voice actors over animation; ~10% curated lexicon ("sul sul"). Designed never to repeat. | Not cheap to reproduce; lesson is "emotion first, no words". |
| Pikmin / Kirby | Sound staff's own voices plus library squeaks (Warner Bros. "Continuous Little Squeaks", Kurzweil "Qnirp"), mixed by camera distance. | Cute = short, pitchy, slightly wet; fade with camera distance. |

Open-source JS Animalese implementations:

| Repo | License | Notes |
| --- | --- | --- |
| `Acedio/animalese.js` | Listed "Other" on GitHub (unclear) | Original 2014 lib; 26 × 150 ms samples in `animalese.wav`, concatenates into a WAV data URI. Sample provenance unclear; treat the wav as unlicensed and record our own. |
| `@pompompurin/animalese` (npm) | MIT | Repackaged animalese.js; same wav caveat. |
| `stefanlegg/animalese-web` | MIT (Mar 2026) | Web Audio rewrite: lookahead scheduler, per-letter pitch jitter, `onLetter` callback for typewriter sync, `shortenWords` option. Best architecture reference. |
| `izure1/animalese-tts` | MIT (Mar 2026) | Pluggable analyzers (English/Japanese/Korean), `PitchManager` effect, browser + Node samplers, on jsDelivr. |

## 2. Procedural / cheap SFX for the web

| Tool | Status (Sep 2026) | License | Agent-authorable? |
| --- | --- | --- | --- |
| ZzFX (`zzfx` 1.3.2) | Active, npm updated Sep 2025 | MIT | Yes: one positional array of ~20 numbers `[volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]` (recent versions add a `filter` param). <1 KB. An LLM can emit dozens of presets as JSON; e.g. heart `[,,537,.02,.02,.22,1,1.59,-6.98,4.97]`. |
| ZzFXM | Active | MIT | Yes: `zzfxM(instruments, patterns, sequence, bpm)` renders a stereo buffer; tracker-style song data is plain JSON, few hundred bytes gzipped. Good for chiptune loops, not for cozy lo-fi. |
| jsfxr (`jsfxr` 1.4.1) | Active, May 2026 | Unlicense | Yes: sfxr param objects + named presets (`pickupCoin`, `powerUp`, `blipSelect`, `explosion`, `hitHurt`, `jump`, `click`…), `sfxr-to-wav` CLI for baking. |
| Tone.js 15.1.x | Maintained | MIT | Yes: synth graphs in code; ~400 KB, better for music/arps than one-shots. |
| Raw Web Audio | Standard | — | Yes; zero deps; best latency. |
| howler.js 2.2.4 | Stable but last release Sep 2023; v3 TS/ESM rewrite is an open PR | MIT | Playback only (sprites, fades, format fallback). `@goldenratio/wolf` is a maintained TS/ESM port (zlib). |
| Sonant-X 2.0.3 | Lightly maintained (Oct 2024) | zlib (npm says ISC) | JSON instruments from Sonant-X Live; niche. |
| Bfxr2 | Beta JS rewrite of Bfxr | MIT | GUI tool; export wav. |
| ChipTone 0.5.1 | HTML5/Win/Mac, slow updates | Output CC0 | GUI tool; export wav. |

Agent workflow: have a subagent write `sfx/presets.ts` as `{ name: number[] }` ZzFX arrays plus a short description; a Node script renders each via ZzFX's buffer path (or jsfxr's `sfxr-to-wav`) to `.wav` for review, and the browser plays the arrays directly (precache with `zzfxG`, play through a shared `AudioContext`).

## 3. AI sound / music generation

| Service | What it does | Cost (verified) | License / suitability |
| --- | --- | --- | --- |
| ElevenLabs Sound Effects (`eleven_text_to_sound_v2`) | Text → SFX, 0.5–30 s, `loop: true` for seamless ambience, `prompt_influence`; MP3 (WAV on higher tiers) | $0.12/min API; ~200 credits/generation; Free 10k credits/mo | Commercial use needs Starter+ ($6/mo); free tier requires attribution. Great for creature chirps ("cute pink slime chirp", "cute gibberish creature speech"). |
| ElevenLabs Music | Text → full tracks, stems | $0.15/min | Broad commercial use on paid plans; film/TV/large-studio games need Enterprise. Fine for a hackathon. |
| Stable Audio 2.5 / 3.0 | Text → music/SFX; 3.0 has open weights | API / fal / Replicate per-call | Community License: free commercial use under $1M revenue (must register); you own outputs. |
| Suno / Udio | Web apps only | — | No official public API as of Sep 2026 (Suno partner program only). Skip. |
| Meta AudioCraft (MusicGen/AudioGen) | Open weights, local | GPU time | Code MIT, weights CC-BY-NC 4.0. Non-commercial only; OK for a demo, not a product. |
| Google Lyria 2 (`lyria-002`, Vertex) | 30 s instrumental WAV | $0.06/clip; Lyria 3 $0.04/clip | Watermarked; commercial use per Google Cloud terms. Lyria RealTime is experimental, unpriced. |
| OpenAI `gpt-4o-mini-tts` | Steerable TTS via `instructions` ("squeaky, giggly, tiny creature") | $0.60/M in, $12/M audio-out tokens | Good for expressive character lines; pitch-shift client-side for creature feel. |
| xAI Grok TTS / Voice Agent | 5 voices (eve, ara, rex, sal, leo), inline speech tags (laughs, whispers), custom voice clone | $15/M chars TTS; $0.08/min S2S | Real-time voice agent for a "talk to your gotchi" feature. |
| Deepgram Aura-2 | 40+ IVR-style English voices, `speed` 0.7–1.5, IPA pronunciation override; no pitch/SSML | $0.030/1k chars (our $200 ≈ 6.6M chars) | Voices are corporate, not character-like; use for narrator/tutor lines, or pitch-shift in Web Audio. Deepgram STT (Nova-3) is the better use of the credit. |

## 4. Free sound libraries

| Source | License | Automation | Attribution |
| --- | --- | --- | --- |
| Freesound | Per-sound CC0 / CC-BY / CC-BY-NC | APIv2 (`/apiv2/search/text/?query=…&filter=license:"Creative Commons 0"&fields=id,name,previews,license&token=KEY`); Python/JS clients | None for CC0; credit author + license for CC-BY. Always filter CC0. |
| Kenney (UI Audio 50, Interface Sounds 100, Impact Sounds 130) | CC0 | Direct zip download | Optional |
| OpenGameArt | Per-asset (CC0, CC-BY, OGA-BY, GPL); filter by license in search | No official API | Depends on asset |
| Sonniss GDC bundles (2016–2026, 200 GB+) | Royalty-free EULA, lifetime, unlimited projects | Manual download | None. No redistribution of raw files; no AI training. |
| Pixabay music/SFX | Pixabay Content License | Scrape-unfriendly; manual | None (Content ID claims possible on YouTube) |
| Mixkit | Mixkit License (Envato) | Manual | None |
| Incompetech (Kevin MacLeod) | CC-BY 4.0 | Manual | Required credit line |

## 5. Web Audio integration in R3F

- Autoplay: Chrome 71+ and Safari create `AudioContext` suspended until user activation. Gate audio behind a "Tap to enter your world" overlay and call `ctx.resume()` inside the click handler (iOS requires it there). Three's `AudioContext.getContext()` is global; resume it once and drei's `PositionalAudio` shares it.
- One context, three gain buses: `music`, `sfx`, `voice`. Ducking = ramp `music.gain` to 0.35 over 150 ms when a voice starts, back to 1 over 600 ms on `onended`.
- UI sounds: decode once into `AudioBuffer`s (or ZzFX arrays) and fire `AudioBufferSourceNode.start()`; sub-10 ms latency, no howler needed. Use howler/wolf only for sprite sheets with MP3/WebM fallbacks.
- Spatial: drei `<PositionalAudio url distance loop autoplay>` on each creature for idle chirps; `refDistance` ~2 gives Pikmin-style "far = faint".
- Music: `loop = true` with `loopStart/loopEnd` on bar boundaries; crossfade day/night with two sources on the `music` bus.

## 6. Sound palette proposal

| # | Sound | Method | Notes |
| --- | --- | --- | --- |
| 1 | `ui.tap` | ZzFX preset | 40 ms sine blip, slight pitch jitter |
| 2 | `ui.confirm` | ZzFX | Two-note upward (C→G) |
| 3 | `ui.cancel` | ZzFX | Downward, filtered |
| 4 | `ui.hover` | ZzFX | Very quiet tick |
| 5 | `ui.error_nudge` | ZzFX | Wobbly "mmp" |
| 6 | `ui.open_panel` / `close_panel` | Kenney Interface Sounds (CC0) | Paper/slide |
| 7 | `world.visit_whoosh` | ElevenLabs SFX or Freesound CC0 | 1 s airy whoosh + sparkle tail |
| 8 | `egg.wobble` | Freesound CC0 (rubber squeak) | Pitch randomize ±3 st |
| 9 | `egg.crack` | Kenney Impact + ZzFX noise burst | Layered |
| 10 | `creature.hatch` | ElevenLabs SFX ("magical hatch, sparkle, tiny gasp") | Stinger, 2 s |
| 11 | `creature.evolve` | ElevenLabs SFX + ZzFXM 4-note riser | Stinger, 3 s |
| 12 | `progress.level_up` | ZzFXM jingle (MIT, agent-authored) | 1-bar arpeggio |
| 13 | `progress.streak` | ZzFX | Coin-like, ascending |
| 14 | `fail.explode` (comic) | Freesound CC0 cartoon pop + ZzFX noise + `creature.blorp` at –12 st | Cartoon "poof", not violent |
| 15 | `fail.recover` | ZzFX slide-up + sparkle | Bounce back |
| 16–20 | `creature.<species>.greet` ×5 | ElevenLabs SFX one-shots or recorded human "blorp" set with per-species `playbackRate` | Pikmin-like squeaks; species → pitch table |
| 21–25 | `creature.<species>.idle` ×5 | Same set, quieter, random 8–20 s interval via `PositionalAudio` | |
| 26 | `creature.speak` (dialogue blips) | Animalese-style letter blips (see below) | Per-species base pitch |
| 27 | `creature.happy` / `sad` | Pitch/tempo variants of greet set | Mood modifier like AC |
| 28 | `amb.day_loop` | ElevenLabs Music or Stable Audio; fallback Pixabay/Incompetech | 60–90 s cozy lo-fi, loop-trimmed |
| 29 | `amb.night_loop` | Same | Slower, fewer highs |
| 30 | `amb.room_tone` | ElevenLabs SFX `loop: true` ("soft dorm room, distant rain") | Under music |

### Creature voice approach

| Option | Pros | Cons |
| --- | --- | --- |
| A. Animalese-style letter/syllable blips (recommended) | Zero API cost/latency, works offline, tiny, text-synced typewriter effect, species pitch table is a natural fit, no licensing worries if we record our own 26–40 samples (ZzFX-synthesized or a teammate's voice). | Not intelligible; must record/synthesize our own sample set (the animalese.js wav has unclear provenance). |
| B. Cloud TTS + client pitch shift (OpenAI `instructions`, xAI speech tags, Deepgram `speed`) | Real words; Tomodachi-like humor; OpenAI/xAI can act "squeaky". | 300–800 ms latency, cost per line, network dependency, pitch-shifting in Web Audio (`playbackRate`) also changes speed; Deepgram voices sound corporate. |
| C. Pure chirps (no text mapping) | Cheapest emotional read; Pikmin charm. | No sense of "talking"; pairs best with A as idle/greet layer. |

Recommendation: A for dialogue + C for greet/idle, generated once (ElevenLabs SFX or ZzFX), with B reserved for a hero moment (e.g. the creature reads your study goal aloud in a Tomodachi voice).

## Sources

- Tomodachi Life TTS: https://miichart.com/tomodachi-life-voice-generator ; https://www.reddit.com/r/tomodachilife/comments/1kbkz2g/ ; https://www.tumblr.com/smallmariofindings/666519009028669440 ; https://github.com/coah80/ttsmodachi
- Animalese: https://nookipedia.com/wiki/Animalese ; https://www.vg-resource.com/thread-37422.html ; https://github.com/Acedio/animalese.js ; https://github.com/stefanlegg/animalese-web ; https://github.com/izure1/animalese-tts ; https://www.npmjs.com/package/@pompompurin/animalese
- Celeste dialogue: https://threadreaderapp.com/thread/1416483583053602816.html ; https://github.com/EverestAPI/Resources/wiki/Character-Dialogues
- Banjo/Undertale blips: https://www.reddit.com/r/GameAudio/comments/7ychks/ ; https://gamedev.stackexchange.com/questions/141704
- Simlish: https://www.polygon.com/22891664/the-sims-similish-maxis-studios-electronic-arts-ea/ ; https://www.acmi.net.au/stories-and-ideas/simlish-sound-and-the-performance-of-emotion-in-the-sims/
- Pikmin: https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-10-pikmin-4-part-3/
- ZzFX / ZzFXM: https://github.com/KilledByAPixel/ZzFX ; https://www.npmjs.com/package/zzfx ; https://github.com/keithclark/ZzFXM
- jsfxr: https://github.com/chr15m/jsfxr ; https://www.npmjs.com/package/jsfxr
- Tone.js: https://github.com/tonejs/tone.js ; howler.js: https://github.com/goldfire/howler.js/releases ; https://github.com/goldfire/howler.js/pull/1769 ; https://www.npmjs.com/package/@goldenratio/wolf
- Sonant-X: https://github.com/nicolas-van/sonant-x ; Bfxr2: https://github.com/increpare/bfxr2 ; ChipTone: https://sfbgames.itch.io/chiptone
- ElevenLabs: https://elevenlabs.io/pricing/api ; https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert ; https://elevenlabs.io/docs/overview/capabilities/sound-effects ; https://elevenlabs.io/eleven-music-api ; https://elevenlabs.io/sound-effects/blob
- Stability: https://stability.ai/license ; https://huggingface.co/stabilityai/stable-audio-3-medium/blob/main/LICENSE.md ; https://stability.ai/news-updates/stability-ai-introduces-stable-audio-25-the-first-audio-model-built-for-enterprise-sound-production-at-scale
- Suno/Udio: https://www.musicbusinessworldwide.com/suno-explores-developer-api-seeking-apps-that-unlock-experiences-generative-music-makes-possible-for-the-first-time/ ; https://gptproto.com/blog/suno-api
- AudioCraft: https://github.com/facebookresearch/audiocraft ; https://github.com/facebookresearch/audiocraft/issues/198
- Lyria: https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/lyria-music-generation ; https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing ; https://ai.google.dev/gemini-api/docs/realtime-music-generation
- OpenAI TTS: https://developers.openai.com/api/docs/guides/text-to-speech ; https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
- xAI: https://docs.x.ai/developers/model-capabilities/audio/text-to-speech ; https://docs.x.ai/developers/models
- Deepgram: https://developers.deepgram.com/docs/tts-voice-controls ; https://developers.deepgram.com/docs/tts-models ; https://deepgram.com/pricing
- Libraries: https://freesound.org/docs/api/resources_apiv2.html ; https://kenney.nl/assets/interface-sounds ; https://www.kenney.nl/assets/impact-sounds ; https://opengameart.org/content/interface-sounds ; https://gdc.sonniss.com/ ; https://sonniss.com/gameaudiogdc/ ; https://pixabay.com/service/license-summary/ ; https://mixkit.co/terms/ ; https://www.incompetech.com/music/royalty-free/licenses/
- Web Audio / R3F: https://developer.chrome.com/blog/autoplay ; https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay ; https://drei.docs.pmnd.rs/abstractions/positional-audio ; https://github.com/pmndrs/drei/issues/1031
