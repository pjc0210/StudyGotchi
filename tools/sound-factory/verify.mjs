#!/usr/bin/env node
// Verifies every WAV under assets/audio: RIFF header, 44.1 kHz / 16-bit / mono, duration,
// peak <= ceiling (default -1 dBFS), no NaN/silence where sound is expected, manifest <-> file
// agreement, total size budget. Exit code 1 on any failure so QA can run it blind.
//
//   node verify.mjs [--ceiling -1] [--budget-mb 8] [--verbose]

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeWav, peak, toDbfs } from './lib/wav.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const audioDir = path.join(repoRoot, 'assets/audio');
const argv = process.argv.slice(2);
const opt = (name, dflt) => (argv.includes(name) ? Number(argv[argv.indexOf(name) + 1]) : dflt);
const ceilingDb = opt('--ceiling', -1);
const budgetMb = opt('--budget-mb', 8);
const verbose = argv.includes('--verbose');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.wav')) out.push(p);
  }
  return out;
}

const problems = [];
const files = await walk(audioDir);
let totalBytes = 0;
const stats = { count: 0, worstPeak: -Infinity, shortest: Infinity, longest: 0, byDir: {} };

for (const file of files) {
  const rel = path.relative(audioDir, file);
  const buf = await readFile(file);
  totalBytes += buf.length;
  let wav;
  try {
    wav = decodeWav(buf);
  } catch (e) {
    problems.push(`${rel}: ${e.message}`);
    continue;
  }
  if (wav.sampleRate !== 44100) problems.push(`${rel}: sample rate ${wav.sampleRate}`);
  if (wav.channels !== 1) problems.push(`${rel}: ${wav.channels} channels`);
  const pk = peak(wav.samples);
  const pkDb = toDbfs(pk);
  const isPause = /\/(comma|period|question)\.wav$/.test(rel);
  if (Number.isNaN(pk)) problems.push(`${rel}: NaN samples`);
  if (pkDb > ceilingDb + 0.01) problems.push(`${rel}: peak ${pkDb.toFixed(2)} dBFS > ${ceilingDb}`);
  if (!isPause && pkDb < -30) problems.push(`${rel}: nearly silent (${pkDb.toFixed(1)} dBFS)`);
  if (isPause && pk !== 0) problems.push(`${rel}: pause file is not silent`);
  const dur = wav.samples.length / wav.sampleRate;
  const dirKey = rel.split('/')[0] + (rel.startsWith('voices/') && !rel.includes('demo-') ? '/letters' : rel.includes('demo-') ? '/demos' : '');
  const d = (stats.byDir[dirKey] ??= { files: 0, seconds: 0, bytes: 0 });
  d.files++; d.seconds += dur; d.bytes += buf.length;
  stats.count++;
  if (!isPause) {
    stats.worstPeak = Math.max(stats.worstPeak, pkDb);
    stats.shortest = Math.min(stats.shortest, dur);
    stats.longest = Math.max(stats.longest, dur);
  }
  if (rel.startsWith('voices/') && !rel.includes('demo-') && !isPause && (dur < 0.08 || dur > 0.14 + 1e-6)) problems.push(`${rel}: letter duration ${(dur * 1000).toFixed(0)} ms outside 80-140`);
  if (verbose) console.log(rel.padEnd(36), `${(dur * 1000).toFixed(0).padStart(5)} ms`, `${pkDb.toFixed(1).padStart(6)} dBFS`);
}

// manifest <-> file agreement
const sfxManifest = JSON.parse(await readFile(path.join(audioDir, 'sfx/manifest.json'), 'utf8'));
for (const s of sfxManifest.sounds) {
  try { await stat(path.join(audioDir, s.file)); } catch { problems.push(`sfx manifest: missing ${s.file}`); }
}
const voiceManifest = JSON.parse(await readFile(path.join(audioDir, 'voices/manifest.json'), 'utf8'));
for (const [sp, v] of Object.entries(voiceManifest.species)) {
  const n = Object.keys(v.letters).length;
  if (n !== 29) problems.push(`voices manifest: ${sp} has ${n} letters, expected 29`);
  for (const l of Object.values(v.letters)) {
    try { await stat(path.join(audioDir, l.file)); } catch { problems.push(`voices manifest: missing ${l.file}`); }
  }
}
for (const d of voiceManifest.demos ?? []) {
  try { await stat(path.join(audioDir, d.file)); } catch { problems.push(`voices manifest: missing demo ${d.file}`); }
}
const sfxOnDisk = files.filter((f) => f.includes('/sfx/')).length;
if (sfxOnDisk !== sfxManifest.sounds.length) problems.push(`sfx: ${sfxOnDisk} files on disk vs ${sfxManifest.sounds.length} in manifest`);
try { await stat(path.join(audioDir, 'manifest.js')); } catch { problems.push('assets/audio/manifest.js missing (audition page needs it)'); }
if (totalBytes > budgetMb * 1024 * 1024) problems.push(`total ${(totalBytes / 1048576).toFixed(2)} MB exceeds ${budgetMb} MB budget`);

console.table(Object.fromEntries(Object.entries(stats.byDir).map(([k, v]) => [k, { files: v.files, seconds: +v.seconds.toFixed(2), KB: Math.round(v.bytes / 1024) }])));
console.log(`${stats.count} WAVs, ${(totalBytes / 1048576).toFixed(2)} MB total (budget ${budgetMb} MB)`);
console.log(`peaks: worst ${stats.worstPeak.toFixed(2)} dBFS (ceiling ${ceilingDb}); durations ${Math.round(stats.shortest * 1000)}-${Math.round(stats.longest * 1000)} ms`);
console.log(`sfx: ${sfxManifest.sounds.length} sounds; voices: ${Object.keys(voiceManifest.species).length} species x 29; demos: ${(voiceManifest.demos ?? []).length}`);
if (problems.length) {
  console.log(`\nFAIL (${problems.length}):`);
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
console.log('OK: all checks passed');
