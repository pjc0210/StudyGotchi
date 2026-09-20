/** Presenter keybinds for the 8.223 ice-land demo theater. */

export const DEMO_THEATER_KEYS = {
  empty: "1",
  half: "2",
  full: "3",
  fail: "f",
  pass: "p",
} as const;

export type DemoProgressBeat = "empty" | "half" | "full";
export type DemoResultEvent = "idle" | "fail" | "pass";

export interface IceDemoState {
  beat: DemoProgressBeat;
  event: DemoResultEvent;
}

export const ICE_DEMO_DEFAULT: IceDemoState = { beat: "full", event: "idle" };

export const DEMO_PROGRESS: Record<DemoProgressBeat, number> = {
  empty: 0,
  half: 0.5,
  full: 1,
};

export function demoProgress(beat: DemoProgressBeat): number {
  return DEMO_PROGRESS[beat];
}

export function parseDemoKey(key: string): { beat?: DemoProgressBeat; event?: DemoResultEvent } | null {
  const value = key.length === 1 ? key.toLowerCase() : key;
  if (value === DEMO_THEATER_KEYS.empty) return { beat: "empty" };
  if (value === DEMO_THEATER_KEYS.half) return { beat: "half" };
  if (value === DEMO_THEATER_KEYS.full) return { beat: "full" };
  if (value === DEMO_THEATER_KEYS.fail) return { event: "fail" };
  if (value === DEMO_THEATER_KEYS.pass) return { event: "pass" };
  return null;
}

export const DEMO_CONFETTI_COUNT = 240;
export const DEMO_CONFETTI_DURATION_S = 4.4;
const CONFETTI_COLORS = ["#ffe7a3", "#e88a8a", "#8fc9d8", "#fff6df", "#9b8daf", "#c8524a", "#7ec4e8"] as const;

export interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  width: number;
  height: number;
}

/** Screen-filling pass burst: many pieces, staggered, long fall. */
export function buildConfettiPieces(count = DEMO_CONFETTI_COUNT): ConfettiPiece[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: (index * 37 + (index % 9) * 11) % 100,
    delay: ((index % 24) / 24) * 1.15,
    duration: DEMO_CONFETTI_DURATION_S + (index % 7) * 0.18,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    rotate: (index * 47) % 360,
    width: 7 + (index % 5) * 3,
    height: 10 + (index % 4) * 4,
  }));
}
