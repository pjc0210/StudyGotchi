import { describe, expect, it } from "vitest";
import {
  DEMO_CONFETTI_COUNT,
  DEMO_CONFETTI_DURATION_S,
  DEMO_THEATER_KEYS,
  buildConfettiPieces,
  parseDemoKey,
} from "./demo-theater";

describe("demo theater keys", () => {
  it("maps 1/2/3/F/P to empty, half, full, fail, pass", () => {
    expect(parseDemoKey(DEMO_THEATER_KEYS.empty)).toEqual({ beat: "empty" });
    expect(parseDemoKey(DEMO_THEATER_KEYS.half)).toEqual({ beat: "half" });
    expect(parseDemoKey(DEMO_THEATER_KEYS.full)).toEqual({ beat: "full" });
    expect(parseDemoKey("F")).toEqual({ event: "fail" });
    expect(parseDemoKey("P")).toEqual({ event: "pass" });
    expect(parseDemoKey("x")).toBeNull();
  });

  it("fills the screen with a long confetti burst", () => {
    const pieces = buildConfettiPieces();
    expect(DEMO_CONFETTI_COUNT).toBeGreaterThanOrEqual(200);
    expect(DEMO_CONFETTI_DURATION_S).toBeGreaterThanOrEqual(4);
    expect(pieces).toHaveLength(DEMO_CONFETTI_COUNT);
    expect(Math.min(...pieces.map((piece) => piece.left))).toBeLessThan(5);
    expect(Math.max(...pieces.map((piece) => piece.left))).toBeGreaterThan(90);
    expect(Math.max(...pieces.map((piece) => piece.duration))).toBeGreaterThan(4);
  });
});
