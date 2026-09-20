import { describe, expect, it } from "vitest";
import {
  DIVE_MS,
  DIVE_REDUCED_MS,
  diveCameraPosition,
  diveDurationMs,
  diveOriginFromAnchor,
  easeInOutCubic,
} from "./globe-dive";

describe("planet to biome dive", () => {
  it("fades immediately when motion is reduced", () => {
    expect(diveDurationMs(true)).toBe(DIVE_REDUCED_MS);
    expect(diveDurationMs(false)).toBe(DIVE_MS);
    expect(DIVE_REDUCED_MS).toBeLessThan(DIVE_MS);
  });

  it("eases in and out without overshoot", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
  });

  it("moves the camera closer to the facing town", () => {
    const start = [0, 4, 30] as const;
    const end = diveCameraPosition(start);
    expect(Math.hypot(end[0], end[1] + 0.7, end[2])).toBeLessThan(
      Math.hypot(start[0], start[1] + 0.7, start[2]),
    );
  });

  it("aims the css zoom at the town when an anchor is known", () => {
    expect(diveOriginFromAnchor({ x: 800, y: 200 }, { width: 1000, height: 800 })).toEqual({
      x: "80%",
      y: "25%",
    });
    expect(diveOriginFromAnchor(null, { width: 1000, height: 800 })).toEqual({
      x: "80%",
      y: "54%",
    });
  });
});
