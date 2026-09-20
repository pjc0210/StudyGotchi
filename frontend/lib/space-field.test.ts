import { describe, expect, it } from "vitest";
import { edgeBackboneScore, fieldStarCount, keepBackboneEdge, spiralPlacement, weakTraceCurve } from "./space-field";

describe("shared space backdrop", () => {
  it("keeps the generated spiral a tiny faded sky object", () => {
    const { cx, cy, size, fade } = spiralPlacement(1200, 800);
    expect(size).toBeLessThan(64);
    expect(fade).toBeLessThan(0.28);
    expect(cx).toBeGreaterThan(800);
    expect(cy).toBeLessThan(200);
    expect(fieldStarCount(1200, 800)).toBeGreaterThan(Math.round((1200 * 800) / 5200));
  });

  it("keeps the strongest backbone at Fit and reveals weaker edges as zoom grows", () => {
    const backbone = edgeBackboneScore({
      kind: "concept",
      directed: true,
      type: "PREREQUISITE_FOR",
      sourceWeight: 1,
      targetWeight: 0.85,
    });
    const weak = edgeBackboneScore({
      kind: "concept",
      directed: false,
      type: "RELATED",
      sourceWeight: 0.45,
      targetWeight: 0.4,
    });
    const resource = edgeBackboneScore({
      kind: "resource",
      directed: false,
      type: "EXPLAINED_IN",
      sourceWeight: 0.5,
      targetWeight: 0.8,
    });
    expect(backbone).toBeGreaterThan(weak);
    expect(keepBackboneEdge(backbone, 0.81)).toBe(true);
    expect(keepBackboneEdge(weak, 0.81)).toBe(false);
    expect(keepBackboneEdge(resource, 0.81)).toBe(false);
    expect(keepBackboneEdge(weak, 1.4)).toBe(true);
    expect(keepBackboneEdge(resource, 1.6)).toBe(true);
  });

  it("cuts a short smooth mid-span from a quadratic edge", () => {
    const seg = weakTraceCurve(0, 0, 50, 40, 100, 0);
    expect(seg.x0).toBeGreaterThan(20);
    expect(seg.x1).toBeLessThan(80);
    expect(seg.x0).toBeLessThan(seg.xc);
    expect(seg.xc).toBeLessThan(seg.x1);
    expect(seg.y0).toBeGreaterThan(0);
    expect(seg.y1).toBeGreaterThan(0);
  });
});
