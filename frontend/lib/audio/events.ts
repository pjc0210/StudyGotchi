/**
 * The one table that ties what happens on screen to what you hear. Components call
 * `emit({ type })` where the visual change happens, so picture and sound cannot drift.
 *
 * Scene events (world / island / space / night) drive the music director; everything else is
 * a one-shot from the kit, sometimes with a creature saying its name.
 */

import type { BiomeId } from "@/lib/world/types";
import { BIOME_VOICE, type SfxName, type VoiceMood, type VoiceSpecies } from "./catalog.ts";
import { EMPTY_SCENE, makeThrottle, pickMusic, type Scene } from "./director.ts";
import { audio } from "./runtime.ts";

export type CreaturePersonality = "sleepy" | "bold" | "curious" | "grumpy" | "shy";

export type AudioEvent =
  /** the product page mounted with the globe on screen (no gesture yet; music waits for unlock) */
  | { type: "enter-world" }
  /** the student picked a course; called inside the click so the context can unlock. `arrival` picks the transition sound. */
  | { type: "enter-island"; biome: BiomeId | null; arrival?: "dive" | "visit" }
  /** the island's payload arrived or changed and we know which biome dominates it */
  | { type: "island-biome"; biome: BiomeId | null }
  | { type: "leave-island" }
  /** the product page unmounted */
  | { type: "leave-world" }
  /** the Information tab (/knowledge) mounted: the sky zooms out and the astral bed fades in */
  | { type: "enter-space" }
  | { type: "leave-space" }
  /** a star in the knowledge sky: hover twinkles (throttled), select chimes */
  | { type: "star"; kind: "hover" | "select" }
  /** the Weak Areas lens came on */
  | { type: "lens-weak" }
  /** a cluster label was clicked and the camera is flying to it */
  | { type: "cluster-focus" }
  | { type: "night"; on: boolean }
  | { type: "ui"; kind: "tap" | "confirm" | "cancel" | "hover" }
  | { type: "card"; open: boolean }
  | { type: "creature-select"; label: string; species: VoiceSpecies; mood: VoiceMood; personality?: CreaturePersonality }
  | { type: "creature-arrive" }
  | { type: "creature-sleep" }
  | { type: "spot-sprout" }
  | { type: "spot-landmark"; stage: 1 | 2 | 3 }
  | { type: "landmark-upgrade" }
  | { type: "progress"; kind: "tick" | "streak" | "level-up" }
  | { type: "explode" }
  | { type: "recover" }
  | { type: "visit" }
  | { type: "evidence-ingested" }
  | { type: "error" };

const UI_SFX: Record<"tap" | "confirm" | "cancel" | "hover", SfxName> = {
  tap: "ui-tap",
  confirm: "ui-confirm",
  cancel: "ui-cancel",
  hover: "ui-hover",
};

const PROGRESS_SFX: Record<"tick" | "streak" | "level-up", SfxName> = {
  tick: "progress-tick",
  streak: "progress-streak",
  "level-up": "progress-level-up",
};

/** bold creatures greet louder, shy ones barely */
const GREET_GAIN: Record<CreaturePersonality, number> = {
  bold: 1,
  curious: 0.9,
  grumpy: 0.8,
  sleepy: 0.7,
  shy: 0.55,
};

const ALWAYS_WARM: SfxName[] = ["ui-tap", "ui-confirm", "ui-cancel", "card-open", "card-close", "camera-dive", "camera-rise"];
const ISLAND_WARM: SfxName[] = [
  "creature-tap",
  "creature-greet",
  "sprout-appear",
  "landmark-build-1",
  "landmark-build-2",
  "landmark-build-3",
  "landmark-upgrade",
  "progress-tick",
  "progress-streak",
  "progress-level-up",
  "explode-comic",
  "recover-chime",
  "evidence-ingested",
];

const SPACE_WARM: SfxName[] = ["space-enter", "star-select", "lens-weak", "cluster-glide", "ui-hover", "ui-tap"];

/** Pointer sweeps cross many stars a second; at most one twinkle per this many ms. */
export const STAR_HOVER_GAP_MS = 110;
const starHoverAllowed = makeThrottle(STAR_HOVER_GAP_MS);
/** One whoosh per arrival, even when dev StrictMode mounts the page twice. */
const spaceEnterAllowed = makeThrottle(1500);

let scene: Scene = EMPTY_SCENE;
let nightOverride: boolean | null = null;
let nightMedia: MediaQueryList | null = null;

function systemNight(): boolean {
  if (nightOverride !== null) return nightOverride;
  return nightMedia?.matches ?? false;
}

function watchNight() {
  if (nightMedia || typeof window === "undefined" || !window.matchMedia) return;
  nightMedia = window.matchMedia("(prefers-color-scheme: dark)");
  nightMedia.addEventListener("change", () => setScene({ night: systemNight() }));
}

function setScene(patch: Partial<Scene>) {
  scene = { ...scene, ...patch };
  const choice = pickMusic(scene);
  audio.setBgm(choice.bgm);
  audio.setAmbience(choice.ambience);
}

/** For the controls UI: what the director currently believes. */
export function currentScene(): Scene {
  return scene;
}

export function emit(event: AudioEvent): void {
  if (typeof window === "undefined") return;
  switch (event.type) {
    case "enter-world":
      watchNight();
      setScene({ view: "globe", night: systemNight() });
      audio.preloadSfx(ALWAYS_WARM);
      return;

    case "enter-island":
      void audio.unlock();
      audio.playSfx(event.arrival === "visit" ? "visit-whoosh" : "camera-dive");
      setScene({ view: "island", biome: event.biome, night: systemNight() });
      audio.preloadSfx([...ALWAYS_WARM, ...ISLAND_WARM]);
      if (event.biome) audio.preloadVoice(BIOME_VOICE[event.biome]);
      return;

    case "island-biome":
      if (scene.view === "island" && scene.biome !== event.biome) setScene({ biome: event.biome });
      if (event.biome) audio.preloadVoice(BIOME_VOICE[event.biome]);
      return;

    case "leave-island":
      audio.stopSpeech();
      audio.playSfx("camera-rise");
      setScene({ view: "globe", biome: null });
      return;

    case "leave-world":
      audio.stopSpeech();
      setScene({ view: "none", biome: null });
      return;

    case "enter-space":
      // Mounting is not a gesture; the bed is remembered and starts once the context runs,
      // and the whoosh only sounds when the sky was reached from a page that already unlocked.
      if (spaceEnterAllowed(performance.now())) audio.playSfx("space-enter", { gain: 0.8 });
      setScene({ view: "space", biome: null });
      audio.preloadSfx(SPACE_WARM);
      return;

    case "leave-space":
      setScene({ view: "none", biome: null });
      return;

    case "star":
      if (event.kind === "select") {
        audio.playSfx("star-select", { gain: 0.8 });
      } else if (starHoverAllowed(performance.now())) {
        // The ordinary hover tick, lifted a fifth: same family, further away.
        audio.playSfx("ui-hover", { gain: 0.45, rate: 1.5 });
      }
      return;

    case "lens-weak":
      audio.playSfx("lens-weak", { gain: 0.8 });
      return;

    case "cluster-focus":
      audio.playSfx("cluster-glide", { gain: 0.75 });
      return;

    case "night":
      nightOverride = event.on;
      setScene({ night: event.on });
      return;

    case "ui":
      audio.playSfx(UI_SFX[event.kind], event.kind === "hover" ? { gain: 0.6 } : undefined);
      return;

    case "card":
      audio.playSfx(event.open ? "card-open" : "card-close");
      return;

    case "creature-select": {
      audio.playSfx("creature-tap");
      audio.playSfx("creature-greet", { at: 0.08, gain: GREET_GAIN[event.personality ?? "curious"] });
      void audio.speak(event.label, event.species, event.mood, { at: 0.32 });
      return;
    }

    case "creature-arrive":
      audio.playSfx("creature-arrive");
      return;

    case "creature-sleep":
      audio.playSfx("creature-sleep", { gain: 0.7 });
      return;

    case "spot-sprout":
      audio.playSfx("sprout-appear");
      return;

    case "spot-landmark":
      audio.playSfx(`landmark-build-${event.stage}` as SfxName);
      return;

    case "landmark-upgrade":
      audio.playSfx("landmark-upgrade");
      return;

    case "progress":
      audio.playSfx(PROGRESS_SFX[event.kind]);
      return;

    case "explode":
      audio.playSfx("explode-comic");
      return;

    case "recover":
      audio.playSfx("recover-chime");
      return;

    case "visit":
      audio.playSfx("visit-whoosh");
      return;

    case "evidence-ingested":
      audio.playSfx("evidence-ingested");
      return;

    case "error":
      audio.playSfx("error-soft");
      return;
  }
}
