import type { ScreenPoint } from "./globe-types";

export const DIVE_MS = 700;
export const DIVE_REDUCED_MS = 100;

export function diveDurationMs(reducedMotion: boolean): number {
  return reducedMotion ? DIVE_REDUCED_MS : DIVE_MS;
}

export function easeInOutCubic(t: number): number {
  const unit = Math.min(1, Math.max(0, t));
  return unit < 0.5 ? 4 * unit * unit * unit : 1 - (-2 * unit + 2) ** 3 / 2;
}

/** End camera position for a dive toward the town already facing the lens. */
export function diveCameraPosition(
  start: readonly [number, number, number],
  lookAt: readonly [number, number, number] = [0, -0.7, 0],
): [number, number, number] {
  const [sx, sy, sz] = start;
  const [lx, ly, lz] = lookAt;
  return [sx * 0.38 + lx * 0.22, sy * 0.48 + ly + 0.42, sz * 0.38 + lz * 0.12];
}

export function diveOriginFromAnchor(
  anchor: ScreenPoint | null,
  viewport: { width: number; height: number },
): { x: string; y: string } {
  if (!anchor || viewport.width <= 0 || viewport.height <= 0) {
    return { x: "80%", y: "54%" };
  }
  const x = Math.min(88, Math.max(12, (anchor.x / viewport.width) * 100));
  const y = Math.min(82, Math.max(14, (anchor.y / viewport.height) * 100));
  return { x: `${Math.round(x)}%`, y: `${Math.round(y)}%` };
}
