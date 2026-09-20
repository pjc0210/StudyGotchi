// zzfx's ES module evaluates `new AudioContext` at import time. Node has no Web Audio, so we
// install an inert stand-in. Import this module BEFORE 'zzfx' (ESM evaluates imports in order).
// Only ZZFX.buildSamples (pure math) is used offline; ZZFX.play would need a real context.
globalThis.AudioContext ??= class AudioContext {};
