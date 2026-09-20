#!/usr/bin/env node
// Animalese-style letter blips: 26 letters + 3 punctuation pauses for each of 5 species voices,
// rendered to assets/audio/voices/<species>/<letter>.wav plus voices/manifest.json.
//
//   node blips.mjs            render all five voices
//   node blips.mjs mint lilac render a subset
//
// Synthesis (all ours, no samples): a band-limited harmonic source (per-species spectral tilt,
// odd-harmonic "hollow" option, optional detuned twin for chorus) shaped by two formant
// resonators (F1/F2 per letter, scaled per species), plus band-passed noise bursts for plosives
// and fricatives. Vowels are longer and lower with a falling contour; consonants are shorter
// and brighter with a rising contour. Deterministic: seeded noise, no Math.random.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_RATE, encodeWav, normalizePeak, fadeEdges, makeRng, hashString, toDbfs, peak } from './lib/wav.mjs';
import { writeAuditionData } from './lib/audition-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const audioDir = path.join(repoRoot, 'assets/audio');
const voicesDir = path.join(audioDir, 'voices');

// One voice per creature accent. basePitch in Hz; tilt = harmonic rolloff exponent (1 = saw-like
// buzz, 2+ = near-sine); formantScale shifts the vocal tract size (<1 bigger creature).
export const SPECIES = {
  peach: { basePitch: 220, accent: '#f2a86f', tilt: 1.5, oddOnly: false, detune: 0, formantScale: 0.92, vibratoHz: 5.5, vibratoDepth: 0.012, breath: 0.035, colour: 'warm, rounded, a little sleepy' },
  coral: { basePitch: 260, accent: '#e88a8a', tilt: 1.0, oddOnly: false, detune: 0, formantScale: 1.0, vibratoHz: 6.5, vibratoDepth: 0.02, breath: 0.02, colour: 'buzzy saw, chatty' },
  mint: { basePitch: 330, accent: '#8fc9d8', tilt: 2.2, oddOnly: false, detune: 0, formantScale: 1.1, vibratoHz: 7, vibratoDepth: 0.03, breath: 0.06, colour: 'pure and airy, flute-like' },
  olive: { basePitch: 300, accent: '#b9c96f', tilt: 1.3, oddOnly: true, detune: 0, formantScale: 0.96, vibratoHz: 4.5, vibratoDepth: 0.008, breath: 0.02, colour: 'hollow, woody, odd harmonics' },
  lilac: { basePitch: 390, accent: '#c9a2e6', tilt: 1.2, oddOnly: false, detune: 0.012, formantScale: 1.15, vibratoHz: 8, vibratoDepth: 0.025, breath: 0.03, colour: 'bright sparkly chorus' },
};

// Letter recipes. f1/f2 are formant centres (Hz) or [start, end] glides; dur in seconds;
// pitch = multiplier on the species base; contour = [startMult, endMult] pitch glide;
// voiced = level of the harmonic source; noise = { band: [lo, hi] Hz, level, burst (ms) or sustained }.
const V = (f1, f2, dur, pitch = 0.97, contour = [1.04, 0.96]) => ({ kind: 'vowel', f1, f2, dur, pitch, contour, voiced: 1, targetDb: -4 });
const N = (f1, f2, dur, pitch = 0.96) => ({ kind: 'nasal', f1, f2, dur, pitch, contour: [1.0, 0.97], voiced: 0.9, lowpass: 1800, targetDb: -6 });
const L = (f1, f2, dur, contour = [0.98, 1.03]) => ({ kind: 'liquid', f1, f2, dur, pitch: 1.0, contour, voiced: 1, targetDb: -5.5 });
const P = (band, f1, f2, voiced, pitch, dur = 0.085) => ({ kind: 'plosive', f1, f2, dur, pitch, contour: [1.1, 1.0], voiced, noise: { band, level: voiced > 0.7 ? 0.5 : 0.8, burst: 12 }, targetDb: voiced > 0.7 ? -5 : -6 });
const F = (band, level, f1, f2, voiced, pitch, dur = 0.095) => ({ kind: 'fricative', f1, f2, dur, pitch, contour: [1.0, 1.08], voiced, noise: { band, level, sustained: true }, targetDb: -9 });

export const LETTERS = {
  a: V(730, 1090, 0.14),
  e: V(530, 1840, 0.13),
  i: V(270, 2290, 0.125, 1.02),
  o: V(570, 840, 0.14, 0.95),
  u: V(300, 870, 0.13, 0.93),
  y: V(270, 2100, 0.11, 1.05, [1.02, 1.0]),
  m: N(250, 1100, 0.11),
  n: N(300, 1400, 0.105),
  l: L(400, 1300, 0.1),
  r: L([450, 350], [1250, 1500], 0.1, [1.0, 1.05]),
  w: L([300, 600], [900, 1200], 0.1, [0.98, 1.02]),
  h: { kind: 'fricative', f1: 600, f2: 1500, dur: 0.095, pitch: 1.02, contour: [1.0, 1.04], voiced: 0.35, noise: { band: [800, 2500], level: 0.7, sustained: true }, targetDb: -8 },
  b: P([400, 1200], 500, 1300, 1, 1.05),
  d: P([1500, 3000], 450, 1700, 1, 1.08),
  g: P([1000, 2200], 400, 1500, 1, 1.04),
  p: P([400, 1200], 500, 1300, 0.55, 1.12, 0.08),
  t: P([2500, 5000], 450, 1700, 0.5, 1.15, 0.08),
  k: P([1200, 2500], 400, 1500, 0.5, 1.1),
  c: P([1200, 2500], 500, 1600, 0.5, 1.12),
  q: P([1200, 2500], [300, 600], [900, 1200], 0.6, 1.08, 0.09),
  s: F([4500, 7000], 0.6, 400, 1800, 0.25, 1.15),
  z: F([4000, 6500], 0.45, 300, 1700, 0.8, 1.1),
  f: F([2500, 5000], 0.5, 400, 1400, 0.3, 1.1, 0.09),
  v: F([2500, 5000], 0.35, 300, 1200, 0.85, 1.05),
  x: F([4000, 7000], 0.55, 400, 1600, 0.3, 1.14),
  j: F([2000, 3500], 0.45, 300, 1900, 0.85, 1.06),
};

export const PAUSES = {
  ',': { file: 'comma', dur: 0.12 },
  '.': { file: 'period', dur: 0.24 },
  '?': { file: 'question', dur: 0.2 },
};

/** Constant-peak-gain band-pass biquad. */
function bandpass(sr) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 0, b2 = 0, a1 = 0, a2 = 0;
  return {
    set(fc, q) {
      const w0 = (2 * Math.PI * Math.min(fc, sr * 0.45)) / sr;
      const alpha = Math.sin(w0) / (2 * q);
      const a0 = 1 + alpha;
      b0 = alpha / a0;
      b2 = -alpha / a0;
      a1 = (-2 * Math.cos(w0)) / a0;
      a2 = (1 - alpha) / a0;
    },
    run(x) {
      const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    },
  };
}

/** One-pole low-pass. */
function lowpass(sr, fc) {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / sr);
  let y = 0;
  return (x) => (y += a * (x - y));
}

const lerp = (a, b, t) => a + (b - a) * t;
const glide = (v, t) => (Array.isArray(v) ? lerp(v[0], v[1], t) : v);

/** Synthesize one letter for one species. Returns Float64Array at SAMPLE_RATE. */
export function synthLetter(speciesName, letter) {
  const sp = SPECIES[speciesName];
  const rec = LETTERS[letter];
  if (!sp || !rec) throw new Error(`unknown species/letter ${speciesName}/${letter}`);
  const sr = SAMPLE_RATE;
  const n = Math.round(rec.dur * sr);
  const out = new Float64Array(n);
  const rng = makeRng(hashString(`${speciesName}:${letter}`));

  const form1 = bandpass(sr), form2 = bandpass(sr), noiseBp = bandpass(sr);
  const nasalLp = rec.lowpass ? lowpass(sr, rec.lowpass) : null;
  const breathBp = bandpass(sr);
  breathBp.set(1800, 0.7);
  const softener = lowpass(sr, 6500); // keeps every voice under the "no harsh noise" line

  let phase = 0, phase2 = 0;
  const attack = Math.round(0.01 * sr);
  const releaseStart = Math.floor(n * 0.6);
  const burstSamples = rec.noise?.burst ? Math.round((rec.noise.burst / 1000) * sr) : 0;
  const noiseCentre = rec.noise ? Math.sqrt(rec.noise.band[0] * rec.noise.band[1]) : 0;
  const noiseQ = rec.noise ? noiseCentre / (rec.noise.band[1] - rec.noise.band[0]) : 1;
  if (rec.noise) noiseBp.set(noiseCentre, Math.max(0.5, noiseQ));

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const u = i / n;
    // pitch: species base x letter multiplier x contour x vibrato
    const f0 = sp.basePitch * rec.pitch * lerp(rec.contour[0], rec.contour[1], u) * (1 + sp.vibratoDepth * Math.sin(2 * Math.PI * sp.vibratoHz * t));
    phase += (2 * Math.PI * f0) / sr;
    let src = 0;
    const K = Math.max(1, Math.floor(5200 / f0));
    for (let k = 1; k <= K; k++) {
      if (sp.oddOnly && k % 2 === 0) continue;
      src += Math.sin(k * phase) / Math.pow(k, sp.tilt);
    }
    if (sp.detune) {
      phase2 += (2 * Math.PI * f0 * (1 + sp.detune)) / sr;
      let s2 = 0;
      for (let k = 1; k <= K; k++) s2 += Math.sin(k * phase2) / Math.pow(k, sp.tilt);
      src = 0.65 * src + 0.35 * s2;
    }
    // formants
    form1.set(glide(rec.f1, u) * sp.formantScale, 5);
    form2.set(glide(rec.f2, u) * sp.formantScale, 8);
    let voiced = 0.55 * form1.run(src) + 0.35 * form2.run(src) + 0.18 * src;
    if (nasalLp) voiced = nasalLp(voiced);
    // consonant articulation: plosive burst at the start, fricative hiss across the letter
    let noise = 0;
    const white = rng() * 2 - 1;
    if (rec.noise) {
      const shaped = noiseBp.run(white);
      if (rec.noise.burst) {
        // band-passed white noise loses most of its energy; x3.2 keeps the click audible over the tail
        const env = i < burstSamples ? 1 - i / burstSamples : 0;
        noise = shaped * rec.noise.level * 3.2 * env;
      } else {
        const env = Math.sin(Math.PI * Math.min(1, u * 1.15)); // hiss swells and fades
        noise = shaped * rec.noise.level * env;
      }
    }
    // breathiness, plus the voiced part fades in slightly after plosive bursts
    const breath = breathBp.run(white) * sp.breath;
    const voicedOnset = rec.noise?.burst ? Math.min(1, i / (burstSamples * 1.5)) : 1;
    let s = voiced * rec.voiced * voicedOnset + breath * voicedOnset + noise;
    // amplitude envelope: raised-cosine attack, hold, smooth release to zero
    let env = 1;
    if (i < attack) env = 0.5 - 0.5 * Math.cos((Math.PI * i) / attack);
    else if (i >= releaseStart) {
      const r = (i - releaseStart) / (n - releaseStart);
      env = Math.pow(1 - r, 1.6);
    }
    out[i] = softener(s) * env;
  }
  normalizePeak(out, rec.targetDb);
  fadeEdges(out, 8, 96);
  return out;
}

async function main() {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const names = wanted.length ? wanted : Object.keys(SPECIES);
  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: 'tools/sound-factory/blips.mjs (formant blip synth, ours)',
    sampleRate: SAMPLE_RATE,
    bitDepth: 16,
    channels: 1,
    scheduler: {
      spacingMs: { min: 60, default: 75, max: 90 },
      wordGapMs: 55,
      moods: {
        neutral: { pitch: 1, tempo: 1 },
        happy: { pitch: 1.15, tempo: 0.85 },
        sad: { pitch: 0.88, tempo: 1.2 },
      },
      note: 'Onset-to-onset spacing; letters overlap slightly. See speak.mjs for the reference scheduler.',
    },
    species: {},
  };
  let totalBytes = 0;
  const rows = [];
  for (const name of names) {
    const sp = SPECIES[name];
    if (!sp) throw new Error(`unknown species ${name}`);
    const dir = path.join(voicesDir, name);
    await mkdir(dir, { recursive: true });
    const letters = {};
    let worst = -Infinity, longest = 0, shortest = Infinity;
    for (const letter of Object.keys(LETTERS)) {
      const samples = synthLetter(name, letter);
      const wav = encodeWav(samples);
      await writeFile(path.join(dir, `${letter}.wav`), wav);
      totalBytes += wav.length;
      const duration = samples.length / SAMPLE_RATE;
      const pk = toDbfs(peak(samples));
      worst = Math.max(worst, pk); longest = Math.max(longest, duration); shortest = Math.min(shortest, duration);
      letters[letter] = { file: `voices/${name}/${letter}.wav`, duration: +duration.toFixed(4), kind: LETTERS[letter].kind, peakDbfs: +pk.toFixed(2) };
    }
    for (const [ch, p] of Object.entries(PAUSES)) {
      const samples = new Float64Array(Math.round(p.dur * SAMPLE_RATE));
      const wav = encodeWav(samples);
      await writeFile(path.join(dir, `${p.file}.wav`), wav);
      totalBytes += wav.length;
      letters[ch] = { file: `voices/${name}/${p.file}.wav`, duration: p.dur, kind: 'pause', peakDbfs: null };
    }
    manifest.species[name] = { basePitch: sp.basePitch, accent: sp.accent, colour: sp.colour, synth: { tilt: sp.tilt, oddOnly: sp.oddOnly, detune: sp.detune, formantScale: sp.formantScale, vibratoHz: sp.vibratoHz, vibratoDepth: sp.vibratoDepth, breath: sp.breath }, letters };
    rows.push({ species: name, basePitch: sp.basePitch, letters: Object.keys(letters).length, shortestMs: Math.round(shortest * 1000), longestMs: Math.round(longest * 1000), worstPeakDb: worst.toFixed(1) });
  }
  if (!wanted.length) {
    await writeFile(path.join(voicesDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await writeAuditionData(audioDir);
  }
  console.table(rows);
  console.log(`${rows.length} voices -> ${path.relative(repoRoot, voicesDir)}  (${(totalBytes / 1024).toFixed(0)} KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
