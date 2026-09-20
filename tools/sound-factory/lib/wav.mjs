// Tiny stdlib-only WAV helpers (44.1 kHz, 16-bit PCM, mono) plus level utilities.
// No native deps; used by render.mjs, blips.mjs and speak.mjs.

export const SAMPLE_RATE = 44100;

export const toDbfs = (lin) => (lin > 0 ? 20 * Math.log10(lin) : -Infinity);
export const fromDbfs = (db) => Math.pow(10, db / 20);

export function peak(samples) {
  let p = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > p) p = a;
  }
  return p;
}

export function rms(samples) {
  let acc = 0;
  for (let i = 0; i < samples.length; i++) acc += samples[i] * samples[i];
  return samples.length ? Math.sqrt(acc / samples.length) : 0;
}

/** Scale `samples` in place so the peak never exceeds `ceilingDb`. Returns the gain applied (1 = untouched). */
export function limitPeak(samples, ceilingDb = -1) {
  const p = peak(samples);
  const c = fromDbfs(ceilingDb);
  if (p <= c || p === 0) return 1;
  const g = c / p;
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return g;
}

/** Scale `samples` in place so the peak sits exactly at `targetDb`. Returns the gain applied. */
export function normalizePeak(samples, targetDb = -3) {
  const p = peak(samples);
  if (p === 0) return 1;
  const g = fromDbfs(targetDb) / p;
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return g;
}

/** Add `src * gain` into `dest` starting at `offset` samples (dest must be long enough). */
export function mixInto(dest, src, offset = 0, gain = 1) {
  const n = Math.min(src.length, dest.length - offset);
  for (let i = 0; i < n; i++) dest[offset + i] += src[i] * gain;
  return dest;
}

/** Short linear fade at both ends to guarantee click-free edges. */
export function fadeEdges(samples, fadeInSamples = 32, fadeOutSamples = 128) {
  const n = samples.length;
  for (let i = 0; i < fadeInSamples && i < n; i++) samples[i] *= i / fadeInSamples;
  for (let i = 0; i < fadeOutSamples && i < n; i++) samples[n - 1 - i] *= i / fadeOutSamples;
  return samples;
}

/** Encode float samples (-1..1) as a 16-bit PCM mono RIFF/WAVE Buffer. */
export function encodeWav(samples, sampleRate = SAMPLE_RATE) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM fmt chunk size
  buf.writeUInt16LE(1, 20); // format tag: PCM
  buf.writeUInt16LE(1, 22); // channels
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = samples[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

/** Decode a 16-bit PCM RIFF/WAVE Buffer into mono Float32Array (channels are averaged). */
export function decodeWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        formatTag: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(body, Math.min(body + size, buf.length));
    }
    pos = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error('missing fmt or data chunk');
  if (fmt.formatTag !== 1 || fmt.bitsPerSample !== 16) throw new Error('only 16-bit PCM is supported');
  const frames = Math.floor(data.length / (2 * fmt.channels));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let acc = 0;
    for (let c = 0; c < fmt.channels; c++) acc += data.readInt16LE((i * fmt.channels + c) * 2) / 32768;
    out[i] = acc / fmt.channels;
  }
  return { sampleRate: fmt.sampleRate, channels: fmt.channels, samples: out };
}

/** Deterministic PRNG (mulberry32) so renders are reproducible. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Resample `src` by playback `rate` (1 = unchanged, 1.15 = +15% pitch and shorter) with linear
 * interpolation. This is the offline twin of AudioBufferSourceNode.playbackRate.
 */
export function resample(src, rate) {
  if (rate === 1) return Float32Array.from(src);
  const outLen = Math.max(1, Math.floor(src.length / rate));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const x = i * rate;
    const i0 = Math.floor(x);
    const frac = x - i0;
    const a = src[i0] ?? 0;
    const b = src[i0 + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}
