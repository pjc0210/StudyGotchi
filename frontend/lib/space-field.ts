/** Shared sky behind /earth (globe) and /knowledge. */

/** One slow revolution so the disc reads as weather, not a spinner. */
export const SPIRAL_SPIN_PERIOD_MS = 180_000;

export function spiralPlacement(width: number, height: number): {
  cx: number;
  cy: number;
  size: number;
  fade: number;
} {
  return {
    cx: width * 0.82,
    cy: height * 0.16,
    size: Math.min(width, height) * 0.065,
    fade: 0.22,
  };
}

export function fieldStarCount(width: number, height: number): number {
  return Math.round((width * height) / 3000);
}

export function spiralSpinAngle(nowMs: number): number {
  return (nowMs / SPIRAL_SPIN_PERIOD_MS) * Math.PI * 2;
}

export function edgeBackboneScore(input: {
  kind: "concept" | "resource";
  directed: boolean;
  type: string;
  sourceWeight: number;
  targetWeight: number;
}): number {
  const lo = Math.min(input.sourceWeight, input.targetWeight);
  const hi = Math.max(input.sourceWeight, input.targetWeight);
  let score = hi * 0.55 + lo * 0.45;
  if (input.directed || /PREREQUISITE|BUILDS_ON/i.test(input.type)) score += 0.22;
  if (input.kind === "resource") score -= 0.4;
  return score;
}

export function backboneThreshold(zoom: number): number {
  if (zoom < 0.7) return 0.78;
  if (zoom < 0.85) return 0.68;
  if (zoom < 1.15) return 0.5;
  if (zoom < 1.45) return 0.32;
  return 0;
}

export function keepBackboneEdge(score: number, zoom: number): boolean {
  return score >= backboneThreshold(zoom);
}

export function edgeDrawBudget(zoom: number): { alpha: number; width: number } {
  if (zoom < 0.85) return { alpha: 0.74, width: 0.95 };
  if (zoom < 1.2) return { alpha: 0.62, width: 0.82 };
  return { alpha: 0.88, width: 0.9 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Mid-span quadratic of a quadratic curve — a short local accent, not the whole edge. */
export function weakTraceCurve(
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
  t0 = 0.3,
  t1 = 0.7,
): { x0: number; y0: number; xc: number; yc: number; x1: number; y1: number } {
  const at = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * ax + 2 * u * t * cx + t * t * bx,
      y: u * u * ay + 2 * u * t * cy + t * t * by,
    };
  };
  const start = at(t0);
  const end = at(t1);
  return {
    x0: start.x,
    y0: start.y,
    xc: lerp(lerp(ax, cx, t0), lerp(cx, bx, t0), t1),
    yc: lerp(lerp(ay, cy, t0), lerp(cy, by, t0), t1),
    x1: end.x,
    y1: end.y,
  };
}
