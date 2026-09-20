#!/usr/bin/env node
// Renders every preset in presets.json to assets/audio/sfx/<name>.wav (44.1 kHz, 16-bit mono)
// using the real ZzFX sample generator (zzfx@1.3.2, MIT, Frank Force) and writes
// assets/audio/sfx/manifest.json + assets/audio/manifest.js for the audition page.
//
//   node render.mjs                 render all
//   node render.mjs ui-tap card-*   render a subset (glob-ish prefix match with *)
//   node render.mjs --ceiling -1    peak ceiling in dBFS (default -1)
//
// zzfx's ES module creates `new AudioContext` at import time, which Node does not have; the
// stub module (imported first) lets ZZFX.buildSamples (the zzfxG algorithm) run untouched.
import './lib/audio-context-stub.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZZFX } from 'zzfx';
import { SAMPLE_RATE, encodeWav, peak, toDbfs, limitPeak, mixInto, fadeEdges } from './lib/wav.mjs';
import { writeAuditionData } from './lib/audition-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const audioDir = path.join(repoRoot, 'assets/audio');
const sfxDir = path.join(audioDir, 'sfx');

const argv = process.argv.slice(2);
const ceilingDb = Number(argv.includes('--ceiling') ? argv[argv.indexOf('--ceiling') + 1] : -1);
const filters = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--ceiling');
const matches = (name) =>
  !filters.length || filters.some((f) => (f.endsWith('*') ? name.startsWith(f.slice(0, -1)) : name === f));

ZZFX.sampleRate = SAMPLE_RATE;
ZZFX.volume = 1; // presets carry their own volume; master scaling is the runtime's job

/** Build one ZzFX array deterministically (randomness forced to 0 for reproducible files). */
export function buildSamples(params) {
  const p = params.slice();
  p[1] = 0;
  return Float64Array.from(ZZFX.buildSamples(...p));
}

/** Render a preset entry ({zzfx} or {layers}) into a Float64Array. */
export function renderPreset(entry) {
  const layers = entry.layers ?? [{ zzfx: entry.zzfx, at: 0, gain: 1 }];
  const rendered = layers.map((l) => ({ ...l, samples: buildSamples(l.zzfx) }));
  const total = Math.max(...rendered.map((l) => Math.round((l.at ?? 0) * SAMPLE_RATE) + l.samples.length));
  const out = new Float64Array(total);
  for (const l of rendered) mixInto(out, l.samples, Math.round((l.at ?? 0) * SAMPLE_RATE), l.gain ?? 1);
  return out;
}

async function main() {
  const presets = JSON.parse(await readFile(path.join(here, 'presets.json'), 'utf8'));
  await mkdir(sfxDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: 'tools/sound-factory/render.mjs',
    synth: presets.zzfx.package,
    paramOrder: presets.zzfx.params,
    sampleRate: SAMPLE_RATE,
    bitDepth: 16,
    channels: 1,
    peakCeilingDbfs: ceilingDb,
    note: 'Files are deterministic renders with randomness=0. For live variation, synthesize from `zzfx`/`layers` with the authored randomness instead of playing the WAV.',
    sounds: [],
  };

  const rows = [];
  let totalBytes = 0;
  for (const [name, entry] of Object.entries(presets.sounds)) {
    if (!matches(name)) continue;
    const samples = renderPreset(entry);
    const rawPeakDb = toDbfs(peak(samples));
    const gain = limitPeak(samples, ceilingDb);
    fadeEdges(samples, 16, 64);
    const wav = encodeWav(samples);
    await writeFile(path.join(sfxDir, `${name}.wav`), wav);
    totalBytes += wav.length;
    const duration = samples.length / SAMPLE_RATE;
    const peakDb = toDbfs(peak(samples));
    manifest.sounds.push({
      name,
      file: `sfx/${name}.wav`,
      group: entry.group ?? 'sfx',
      bus: entry.group === 'ambient' ? 'ambient' : 'sfx',
      description: entry.description,
      duration: +duration.toFixed(4),
      peakDbfs: +peakDb.toFixed(2),
      renderGain: +gain.toFixed(4),
      ...(entry.layers ? { layers: entry.layers } : { zzfx: entry.zzfx }),
    });
    rows.push({ name, ms: Math.round(duration * 1000), peak: peakDb.toFixed(1), raw: rawPeakDb.toFixed(1), limited: gain < 1 ? `x${gain.toFixed(2)}` : '' });
  }

  if (!filters.length) {
    await writeFile(path.join(sfxDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await writeAuditionData(audioDir);
  } else {
    // Partial render: merge into the existing manifest so other entries survive.
    const mpath = path.join(sfxDir, 'manifest.json');
    let existing = null;
    try { existing = JSON.parse(await readFile(mpath, 'utf8')); } catch { /* first run */ }
    const merged = existing ?? manifest;
    for (const s of manifest.sounds) {
      const i = merged.sounds.findIndex((x) => x.name === s.name);
      if (i >= 0) merged.sounds[i] = s; else merged.sounds.push(s);
    }
    merged.generatedAt = manifest.generatedAt;
    await writeFile(mpath, JSON.stringify(merged, null, 2) + '\n');
    await writeAuditionData(audioDir);
  }

  console.table(rows);
  const over = rows.filter((r) => Number(r.peak) > ceilingDb + 0.01);
  console.log(`${rows.length} sounds -> ${path.relative(repoRoot, sfxDir)}  (${(totalBytes / 1024).toFixed(0)} KB)`);
  console.log(over.length ? `WARNING: ${over.length} over ceiling` : `all peaks <= ${ceilingDb} dBFS`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
