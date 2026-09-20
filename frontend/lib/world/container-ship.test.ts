import { describe, expect, it } from "vitest";
import { containerShipHull } from "./container-ship";

describe("containerShipHull", () => {
  const hull = containerShipHull({ length: 10, width: 4, height: 2, bowLength: 2.4 });

  it("ends in a single centered triangular bow, not a blunt box", () => {
    expect(hull.bowTip.x).toBe(0);
    expect(hull.bowTip.z).toBeCloseTo(5);
    expect(hull.bowLength).toBeCloseTo(2.4);
    expect(hull.bowLength).toBeLessThan(hull.length / 2);
  });

  it("keeps a rectangular cargo midbody and a flat transom", () => {
    expect(hull.midshipWidth).toBeCloseTo(4);
    expect(hull.transomWidth).toBeCloseTo(4);
    expect(hull.deckLength).toBeCloseTo(7.6);
    const midDeck = hull.vertices.filter((v) => Math.abs(v.z) < 0.01 && Math.abs(v.y - 1) < 0.01);
    expect(midDeck.map((v) => Math.abs(v.x)).sort()).toEqual([2, 2]);
  });
});
