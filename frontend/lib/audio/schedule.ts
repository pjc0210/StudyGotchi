/**
 * Animalese-style letter scheduler. A faithful port of tools/sound-factory/speak.mjs
 * (the offline reference) and the inline twin in assets/audio/audition.html.
 *
 * Text becomes a list of letter events, 60-90 ms apart. Each event names the letter WAV to
 * play, when, at what playback rate (pitch) and gain. Mood scales pitch and tempo. The hash
 * and PRNG are the same FNV-1a + mulberry32 pair the sound factory uses, so a given
 * (species, mood, text) plays identically here and in the rendered demo files.
 */

export type VoiceMood = "neutral" | "happy" | "sad";

export interface MoodParams {
  pitch: number;
  tempo: number;
}

export const MOODS: Record<VoiceMood, MoodParams> = {
  neutral: { pitch: 1.0, tempo: 1.0 },
  happy: { pitch: 1.15, tempo: 0.85 },
  sad: { pitch: 0.88, tempo: 1.2 },
};

export interface ScheduleOptions {
  /** onset-to-onset spacing in ms; x tempo lands inside the 60-90 ms window for every mood */
  spacingMs: number;
  wordGapMs: number;
  pauses: Record<string, number>;
  /** +-jitter deterministic per-letter pitch wobble */
  jitter: number;
  /** pitch drifts down this fraction across the sentence */
  declination: number;
  questionRise: number;
}

export const DEFAULTS: ScheduleOptions = {
  spacingMs: 75,
  wordGapMs: 55,
  pauses: { ",": 120, ".": 240, "!": 240, "?": 200 },
  jitter: 0.03,
  declination: 0.04,
  questionRise: 1.08,
};

export interface LetterEvent {
  char: string;
  /** seconds from the start of the utterance */
  at: number;
  /** AudioBufferSourceNode.playbackRate */
  rate: number;
  gain: number;
  kind: "letter" | "pause";
}

export interface Schedule {
  events: LetterEvent[];
  /** seconds; the last event's onset plus its spacing */
  duration: number;
  species: string;
  mood: VoiceMood;
  spacingMs: number;
}

const VOWELS = new Set("aeiouy");
const FRICATIVES = new Set("szfvxjh");

/** FNV-1a, matching tools/sound-factory/lib/wav.mjs (not the murmur-style hash in lib/seed.ts). */
export function fnvHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function schedule(text: string, species: string, mood: VoiceMood = "neutral", opts: Partial<ScheduleOptions> = {}): Schedule {
  const o: ScheduleOptions = { ...DEFAULTS, ...opts };
  const m = MOODS[mood] ?? MOODS.neutral;
  const rng = makeRng(fnvHash(`${species}|${mood}|${text}`));
  const clean = text.toLowerCase();
  const events: LetterEvent[] = [];
  let cursor = 0;
  const totalLetters = (clean.match(/[a-z]/g) || []).length || 1;
  let letterIndex = 0;
  let wordStart = true;
  let wordLetters: LetterEvent[] = [];

  const closeWord = (rising: boolean) => {
    if (rising) for (const ev of wordLetters.slice(-2)) ev.rate *= o.questionRise;
    if (wordLetters.length) wordLetters[wordLetters.length - 1].rate *= 0.98; // word-final dip
    wordLetters = [];
    wordStart = true;
  };

  for (const ch of clean) {
    if (ch >= "a" && ch <= "z") {
      const decl = 1 - o.declination * (letterIndex / totalLetters) * (mood === "happy" ? 0.5 : 1);
      const jitter = 1 + (rng() * 2 - 1) * o.jitter;
      const stress = wordStart ? 1.03 : 1;
      const ev: LetterEvent = {
        char: ch,
        at: +(cursor / 1000).toFixed(4),
        rate: +(m.pitch * decl * jitter * stress).toFixed(4),
        gain: +((wordStart ? 1.0 : 0.9) * (VOWELS.has(ch) ? 1.0 : FRICATIVES.has(ch) ? 0.8 : 0.92)).toFixed(3),
        kind: "letter",
      };
      events.push(ev);
      wordLetters.push(ev);
      cursor += o.spacingMs * m.tempo + (VOWELS.has(ch) ? 8 : 0);
      letterIndex++;
      wordStart = false;
    } else if (ch === " ") {
      closeWord(false);
      cursor += o.wordGapMs * m.tempo;
    } else if (o.pauses[ch] !== undefined) {
      closeWord(ch === "?");
      events.push({ char: ch, at: +(cursor / 1000).toFixed(4), rate: 1, gain: 0, kind: "pause" });
      cursor += o.pauses[ch] * m.tempo;
    }
    // anything else (digits, emoji, symbols) is silent and takes no time
  }
  closeWord(false);
  return { events, duration: +(cursor / 1000).toFixed(4), species, mood, spacingMs: +(o.spacingMs * m.tempo).toFixed(1) };
}
