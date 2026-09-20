/**
 * The one Web Audio graph for the site.
 *
 *   master ─┬─ music  (looped beds and the ambience layer; ducks under speech)
 *           ├─ sfx    (one-shots from the kit)
 *           └─ voice  (Animalese letter blips)
 *
 * Browsers keep an AudioContext suspended until a user gesture, so nothing here makes a sound
 * before `unlock()` has run inside a click. Every play call before that is a silent no-op; the
 * music the director asked for is remembered and starts the moment the context is running.
 *
 * SFX and voice letters are decoded once and kept (they are tiny). Beds are decoded on demand
 * and only the last few stay in memory. Beds loop as AudioBufferSourceNodes so a running
 * context can start them at any time in every browser, including Safari.
 */

import { BGM, CROSSFADE_MS, DUCK_RATIO, VOICE_LETTERS, sfxFile, voiceFile, type BgmId, type BgmTrack, type SfxName, type VoiceSpecies } from "./catalog.ts";
import { schedule, type VoiceMood } from "./schedule.ts";

export type Bus = "music" | "sfx" | "voice";

export interface AudioState {
  unlocked: boolean;
  muted: boolean;
  gains: Record<Bus, number>;
  bgm: BgmId | null;
  ambience: BgmId | null;
  speaking: boolean;
}

type LayerKind = "bgm" | "ambience";

interface MusicLayer {
  id: BgmId;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export interface PlayOptions {
  gain?: number;
  rate?: number;
  /** seconds from now */
  at?: number;
}

const STORAGE_KEY = "studygotchi.audio.v1";
const DEFAULT_GAINS: Record<Bus, number> = { music: 0.8, sfx: 0.9, voice: 0.9 };
/** lookahead so the first letter is never late */
const SPEECH_LEAD = 0.05;
const MAX_SPEECH_CHARS = 80;
const MUSIC_CACHE = 3;

const SERVER_STATE: AudioState = {
  unlocked: false,
  muted: false,
  gains: DEFAULT_GAINS,
  bgm: null,
  ambience: null,
  speaking: false,
};

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

class AudioRuntime {
  private state: AudioState = SERVER_STATE;
  private listeners = new Set<() => void>();

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<Bus, GainNode> | null = null;

  private buffers = new Map<string, Promise<AudioBuffer>>();
  private musicBuffers = new Map<string, Promise<AudioBuffer>>();
  private layers: Record<LayerKind, MusicLayer | null> = { bgm: null, ambience: null };
  private layerTokens: Record<LayerKind, number> = { bgm: 0, ambience: 0 };
  private wanted: Record<LayerKind, BgmId | null> = { bgm: null, ambience: null };

  private speechToken = 0;
  private speechSources: AudioBufferSourceNode[] = [];
  private speechTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window === "undefined") return;
    let gains = DEFAULT_GAINS;
    let muted = false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{ gains: Partial<Record<Bus, number>>; muted: boolean }>;
        gains = { ...DEFAULT_GAINS, ...saved.gains };
        muted = !!saved.muted;
      }
    } catch {
      // a corrupt preference is not worth a broken page
    }
    this.state = { ...SERVER_STATE, gains, muted };
  }

  // ---------- store ----------

  getSnapshot = (): AudioState => this.state;
  getServerSnapshot = (): AudioState => SERVER_STATE;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private set(patch: Partial<AudioState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
  }

  private persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ gains: this.state.gains, muted: this.state.muted }));
    } catch {
      // private mode; the session still works
    }
  }

  // ---------- lifecycle ----------

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.state.muted ? 0 : 1;
    master.connect(ctx.destination);
    const buses = {} as Record<Bus, GainNode>;
    for (const name of ["music", "sfx", "voice"] as Bus[]) {
      const g = ctx.createGain();
      g.gain.value = this.state.gains[name];
      g.connect(master);
      buses[name] = g;
    }
    this.ctx = ctx;
    this.master = master;
    this.buses = buses;
    const sync = () => {
      const running = ctx.state === "running";
      if (running !== this.state.unlocked) this.set({ unlocked: running });
      if (running) this.applyWanted();
    };
    ctx.addEventListener("statechange", sync);
    sync();
    return ctx;
  }

  /**
   * Call inside a user gesture. Idempotent. Resolves true once the context is running, false
   * if the browser still refuses after a short wait (no gesture happened yet).
   */
  unlock(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return Promise.resolve(false);
    if (ctx.state !== "running") {
      // Outside a gesture this promise may never settle, so we never wait on it directly.
      ctx.resume().catch(() => {});
    }
    return this.awaitRunning(1500);
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === "running";
  }

  /** True once the context runs, false after `timeoutMs` so a queued one-shot is dropped rather than played late. */
  private awaitRunning(timeoutMs: number): Promise<boolean> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(false);
    if (ctx.state === "running") return Promise.resolve(true);
    return new Promise((resolve) => {
      const done = (ok: boolean) => {
        ctx.removeEventListener("statechange", onChange);
        clearTimeout(timer);
        resolve(ok);
      };
      const onChange = () => {
        if (ctx.state === "running") done(true);
      };
      const timer = setTimeout(() => done(ctx.state === "running"), timeoutMs);
      ctx.addEventListener("statechange", onChange);
    });
  }

  /** One-shots wait briefly for an unlock already in flight; a context that was never created plays nothing. */
  private whenRunning(): Promise<boolean> {
    if (!this.ctx) return Promise.resolve(false);
    return this.awaitRunning(1500);
  }

  // ---------- buffers ----------

  private decode(url: string, cache: Map<string, Promise<AudioBuffer>>): Promise<AudioBuffer> {
    let p = cache.get(url);
    if (p) return p;
    const ctx = this.ctx;
    if (!ctx) return Promise.reject(new Error("audio locked"));
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return r.arrayBuffer();
      })
      .then((ab) => ctx.decodeAudioData(ab));
    cache.set(url, p);
    p.catch(() => cache.delete(url));
    return p;
  }

  /** Warm the decode cache so the first tap is not late. Safe to call before unlock (no-op). */
  preload(urls: string[]) {
    if (!this.ctx) return;
    for (const u of urls) this.decode(u, this.buffers).catch(() => {});
  }

  preloadSfx(names: SfxName[]) {
    this.preload(names.map(sfxFile));
  }

  preloadVoice(species: VoiceSpecies) {
    this.preload([...VOICE_LETTERS].map((c) => voiceFile(species, c)));
  }

  private play(buffer: AudioBuffer, bus: Bus, { gain = 1, rate = 1, at = 0 }: PlayOptions = {}): AudioBufferSourceNode | null {
    const ctx = this.ctx;
    const buses = this.buses;
    if (!ctx || !buses) return null;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(buses[bus]);
    src.start(ctx.currentTime + Math.max(0, at));
    src.addEventListener("ended", () => {
      src.disconnect();
      g.disconnect();
    });
    return src;
  }

  // ---------- sfx ----------

  playSfx(name: SfxName, opts: PlayOptions = {}) {
    if (!this.ctx) return;
    this.whenRunning()
      .then((ok) => (ok ? this.decode(sfxFile(name), this.buffers) : null))
      .then((buf) => {
        if (buf) this.play(buf, "sfx", opts);
      })
      .catch((err) => console.warn(`[audio] sfx ${name} failed`, err));
  }

  // ---------- voice ----------

  /**
   * Speak `text` as letter blips in the species' voice. Music ducks for the duration.
   * Resolves with the utterance length in seconds (0 when audio is locked or the text is empty).
   */
  async speak(text: string, species: VoiceSpecies, mood: VoiceMood = "neutral", opts: { at?: number; gain?: number } = {}): Promise<number> {
    if (!this.ctx) return 0;
    const clean = text.trim().slice(0, MAX_SPEECH_CHARS);
    if (!clean) return 0;
    if (!(await this.whenRunning())) return 0;

    this.stopSpeech();
    const token = ++this.speechToken;
    const sched = schedule(clean, species, mood);
    const letters = sched.events.filter((e) => e.kind === "letter");
    if (letters.length === 0) return 0;

    const chars = [...new Set(letters.map((e) => e.char))];
    const loaded = await Promise.all(
      chars.map((c) =>
        this.decode(voiceFile(species, c), this.buffers)
          .then((b) => [c, b] as const)
          .catch(() => null),
      ),
    );
    if (token !== this.speechToken || !this.ctx) return 0; // a newer utterance took over
    const byChar = new Map(loaded.filter((x): x is readonly [string, AudioBuffer] => x !== null));

    const lead = SPEECH_LEAD + (opts.at ?? 0);
    const level = opts.gain ?? 1;
    for (const ev of letters) {
      const buf = byChar.get(ev.char);
      if (!buf) continue;
      const src = this.play(buf, "voice", { gain: ev.gain * level, rate: ev.rate, at: lead + ev.at });
      if (src) this.speechSources.push(src);
    }
    const total = lead + sched.duration + 0.15;
    this.duck(total);
    this.set({ speaking: true });
    this.speechTimer = setTimeout(() => {
      if (token === this.speechToken) {
        this.speechSources = [];
        this.set({ speaking: false });
      }
    }, total * 1000);
    return sched.duration;
  }

  stopSpeech() {
    this.speechToken++;
    for (const s of this.speechSources) {
      try {
        s.stop();
      } catch {
        // already ended
      }
    }
    this.speechSources = [];
    if (this.speechTimer) {
      clearTimeout(this.speechTimer);
      this.speechTimer = null;
    }
    if (this.state.speaking) {
      this.set({ speaking: false });
      this.unduck();
    }
  }

  /** Music down to 35% in ~150 ms, back up over ~600 ms once `seconds` have passed. */
  duck(seconds: number) {
    const ctx = this.ctx;
    const music = this.buses?.music;
    if (!ctx || !music) return;
    const base = this.state.gains.music;
    const now = ctx.currentTime;
    music.gain.cancelScheduledValues(now);
    music.gain.setTargetAtTime(base * DUCK_RATIO, now, 0.05);
    music.gain.setTargetAtTime(base, now + seconds, 0.2);
  }

  private unduck() {
    const ctx = this.ctx;
    const music = this.buses?.music;
    if (!ctx || !music) return;
    const now = ctx.currentTime;
    music.gain.cancelScheduledValues(now);
    music.gain.setTargetAtTime(this.state.gains.music, now, 0.2);
  }

  // ---------- music ----------

  setBgm(id: BgmId | null) {
    this.setLayer("bgm", id);
  }

  setAmbience(id: BgmId | null) {
    this.setLayer("ambience", id);
  }

  currentTrack(): BgmTrack | null {
    return this.state.bgm ? BGM[this.state.bgm] : null;
  }

  private setLayer(kind: LayerKind, id: BgmId | null) {
    this.wanted[kind] = id;
    this.set(kind === "bgm" ? { bgm: id } : { ambience: id });
    if (this.ready) void this.applyLayer(kind);
  }

  private applyWanted() {
    void this.applyLayer("bgm");
    void this.applyLayer("ambience");
  }

  private async applyLayer(kind: LayerKind) {
    const ctx = this.ctx;
    const buses = this.buses;
    if (!ctx || !buses) return;
    const id = this.wanted[kind];
    const current = this.layers[kind];
    if (current?.id === id) return;

    const token = ++this.layerTokens[kind];
    if (current) {
      this.layers[kind] = null;
      this.fadeOut(current);
    }
    if (!id) return;

    const track = BGM[id];
    let buffer: AudioBuffer;
    try {
      buffer = await this.decodeMusic(track.file);
    } catch (err) {
      console.warn(`[audio] bed ${id} failed to load`, err);
      return;
    }
    if (token !== this.layerTokens[kind] || !this.ctx) return; // superseded while decoding

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(buses.music);
    source.start();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(track.gain, now + CROSSFADE_MS / 1000);
    this.layers[kind] = { id, source, gain };
  }

  private fadeOut(layer: MusicLayer) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const seconds = CROSSFADE_MS / 1000;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
    layer.gain.gain.linearRampToValueAtTime(0, now + seconds);
    try {
      layer.source.stop(now + seconds + 0.05);
    } catch {
      // never started
    }
    layer.source.addEventListener("ended", () => {
      layer.source.disconnect();
      layer.gain.disconnect();
    });
  }

  private decodeMusic(url: string): Promise<AudioBuffer> {
    const p = this.decode(url, this.musicBuffers);
    // most-recently-used goes last; the oldest bed not currently playing is dropped
    this.musicBuffers.delete(url);
    this.musicBuffers.set(url, p);
    const inUse = new Set(Object.values(this.layers).map((l) => l && BGM[l.id].file));
    for (const key of this.musicBuffers.keys()) {
      if (this.musicBuffers.size <= MUSIC_CACHE) break;
      if (key !== url && !inUse.has(key)) this.musicBuffers.delete(key);
    }
    return p;
  }

  // ---------- mix ----------

  setGain(bus: Bus, value: number) {
    const v = clamp01(value);
    this.set({ gains: { ...this.state.gains, [bus]: v } });
    this.persist();
    const ctx = this.ctx;
    const node = this.buses?.[bus];
    if (ctx && node) {
      node.gain.cancelScheduledValues(ctx.currentTime);
      node.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    }
  }

  setMuted(muted: boolean) {
    this.set({ muted });
    this.persist();
    const ctx = this.ctx;
    const master = this.master;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
    }
  }

  toggleMuted() {
    this.setMuted(!this.state.muted);
  }
}

export const audio = new AudioRuntime();

// Dev-only handle for poking the mixer from the console or a browser test, like the lab's window.__stats.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __studygotchiAudio?: AudioRuntime }).__studygotchiAudio = audio;
}
