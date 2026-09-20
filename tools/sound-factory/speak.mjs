#!/usr/bin/env node
// Reference implementation of speak(text, species, mood): turns text into a schedule of letter
// blips (60-90 ms onset spacing, mood-modulated pitch and tempo), then renders it offline by
// mixing the WAV letters from assets/audio/voices/<species>/.
//
//   node speak.mjs                                   demo sentence for every species -> voices/demo-<species>.wav
//   node speak.mjs --moods                           also render demo-<species>-happy/sad.wav
//   node speak.mjs "text" --species mint --mood happy --out /tmp/x.wav
//
// The browser twin (assets/audio/audition.html) uses the same schedule() rules with
// AudioBufferSourceNode.playbackRate for `rate` and ctx.currentTime + at for timing.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_RATE, encodeWav, decodeWav, resample, mixInto, limitPeak, makeRng, hashString, toDbfs, peak } from './lib/wav.mjs';
import { writeAuditionData } from './lib/audition-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const audioDir = path.join(repoRoot, 'assets/audio');
const voicesDir = path.join(audioDir, 'voices');

export const MOODS = {
  neutral: { pitch: 1.0, tempo: 1.0 },
  happy: { pitch: 1.15, tempo: 0.85 },
  sad: { pitch: 0.88, tempo: 1.2 },
};

export const DEFAULTS = {
  spacingMs: 75, // onset-to-onset; x tempo lands inside the 60-90 ms window for all moods
  wordGapMs: 55,
  pauses: { ',': 120, '.': 240, '!': 240, '?': 200 },
  jitter: 0.03, // +-3 % deterministic per-letter pitch wobble
  declination: 0.04, // pitch drifts down ~4 % across the sentence
  questionRise: 1.08,
};

const VOWELS = new Set('aeiouy');
const FRICATIVES = new Set('szfvxjh');

/**
 * Pure scheduler. Returns { events, duration }. Each event: { char, at (s), rate, gain, kind }.
 * Letters map to voices/<species>/<char>.wav; kind 'pause' events are silent and only advance time.
 */
export function schedule(text, species, mood = 'neutral', opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const m = MOODS[mood] ?? MOODS.neutral;
  const rng = makeRng(hashString(`${species}|${mood}|${text}`));
  const clean = text.toLowerCase();
  const events = [];
  let cursor = 0;
  const totalLetters = (clean.match(/[a-z]/g) || []).length || 1;
  let letterIndex = 0;
  let wordStart = true;
  let wordLetters = [];

  const closeWord = (rising) => {
    if (rising) for (const ev of wordLetters.slice(-2)) ev.rate *= o.questionRise;
    if (wordLetters.length) wordLetters[wordLetters.length - 1].rate *= 0.98; // word-final dip
    wordLetters = [];
    wordStart = true;
  };

  for (const ch of clean) {
    if (ch >= 'a' && ch <= 'z') {
      const decl = 1 - o.declination * (letterIndex / totalLetters) * (mood === 'happy' ? 0.5 : 1);
      const jitter = 1 + (rng() * 2 - 1) * o.jitter;
      const stress = wordStart ? 1.03 : 1;
      const ev = {
        char: ch,
        at: +(cursor / 1000).toFixed(4),
        rate: +(m.pitch * decl * jitter * stress).toFixed(4),
        gain: +((wordStart ? 1.0 : 0.9) * (VOWELS.has(ch) ? 1.0 : FRICATIVES.has(ch) ? 0.8 : 0.92)).toFixed(3),
        kind: 'letter',
      };
      events.push(ev);
      wordLetters.push(ev);
      cursor += o.spacingMs * m.tempo + (VOWELS.has(ch) ? 8 : 0);
      letterIndex++;
      wordStart = false;
    } else if (ch === ' ') {
      closeWord(false);
      cursor += o.wordGapMs * m.tempo;
    } else if (o.pauses[ch] !== undefined) {
      closeWord(ch === '?');
      events.push({ char: ch, at: +(cursor / 1000).toFixed(4), rate: 1, gain: 0, kind: 'pause' });
      cursor += o.pauses[ch] * m.tempo;
    }
    // anything else (digits, emoji, symbols) is silent and takes no time
  }
  closeWord(false);
  return { events, duration: +(cursor / 1000).toFixed(4), species, mood, spacingMs: +(o.spacingMs * m.tempo).toFixed(1) };
}

const letterCache = new Map();
async function loadLetter(species, char) {
  const manifest = await manifestCache();
  const entry = manifest.species[species]?.letters[char === '!' ? '.' : char];
  if (!entry) return null;
  const key = entry.file;
  if (!letterCache.has(key)) {
    const { samples } = decodeWav(await readFile(path.join(audioDir, entry.file)));
    letterCache.set(key, samples);
  }
  return letterCache.get(key);
}

let manifestPromise = null;
function manifestCache() {
  manifestPromise ??= readFile(path.join(voicesDir, 'manifest.json'), 'utf8').then(JSON.parse);
  return manifestPromise;
}

/** Offline renderer: mixes the letter WAVs per schedule(). Returns Float64Array at 44.1 kHz. */
export async function renderSpeech(text, species, mood = 'neutral', opts = {}) {
  const sched = schedule(text, species, mood, opts);
  const tail = Math.round(0.15 * SAMPLE_RATE);
  let out = new Float64Array(Math.round(sched.duration * SAMPLE_RATE) + tail);
  for (const ev of sched.events) {
    if (ev.kind !== 'letter') continue;
    const src = await loadLetter(species, ev.char);
    if (!src) continue;
    const shifted = resample(src, ev.rate);
    const at = Math.round(ev.at * SAMPLE_RATE);
    if (at + shifted.length > out.length) {
      const grown = new Float64Array(at + shifted.length + tail);
      grown.set(out);
      out = grown;
    }
    mixInto(out, shifted, at, ev.gain);
  }
  const gain = limitPeak(out, -1);
  return { samples: out, schedule: sched, limitGain: gain };
}

export const DEMO_SENTENCE = 'hello i live in the ice biome now';

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
  const text = argv.find((a, i) => !a.startsWith('--') && !['--species', '--mood', '--out'].includes(argv[i - 1]));
  const manifest = await manifestCache();
  const rows = [];

  if (text) {
    const species = flag('--species', 'peach');
    const mood = flag('--mood', 'neutral');
    const out = flag('--out', path.join(voicesDir, `speak-${species}-${mood}.wav`));
    const r = await renderSpeech(text, species, mood);
    await writeFile(out, encodeWav(r.samples));
    rows.push({ file: path.relative(repoRoot, out), species, mood, ms: Math.round((r.samples.length / SAMPLE_RATE) * 1000), peakDb: toDbfs(peak(r.samples)).toFixed(1), letters: r.schedule.events.filter((e) => e.kind === 'letter').length });
  } else {
    const moods = argv.includes('--moods') ? Object.keys(MOODS) : ['neutral'];
    const demos = [];
    for (const species of Object.keys(manifest.species)) {
      for (const mood of moods) {
        const r = await renderSpeech(DEMO_SENTENCE, species, mood);
        const file = mood === 'neutral' ? `demo-${species}.wav` : `demo-${species}-${mood}.wav`;
        await writeFile(path.join(voicesDir, file), encodeWav(r.samples));
        const duration = r.samples.length / SAMPLE_RATE;
        demos.push({ species, mood, text: DEMO_SENTENCE, file: `voices/${file}`, duration: +duration.toFixed(4), peakDbfs: +toDbfs(peak(r.samples)).toFixed(2), spacingMs: r.schedule.spacingMs });
        rows.push({ file, ms: Math.round(duration * 1000), spacingMs: r.schedule.spacingMs, peakDb: toDbfs(peak(r.samples)).toFixed(1), limited: r.limitGain < 1 ? `x${r.limitGain.toFixed(2)}` : '' });
      }
    }
    manifest.demos = demos;
    manifest.scheduler = { ...manifest.scheduler, defaults: DEFAULTS, moods: MOODS, reference: 'tools/sound-factory/speak.mjs' };
    await writeFile(path.join(voicesDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await writeAuditionData(audioDir);
  }
  console.table(rows);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
