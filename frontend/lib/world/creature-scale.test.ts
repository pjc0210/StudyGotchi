import { describe, expect, it } from "vitest";
import { CREATURE_DISPLAY_HEIGHT, creatureMeshScale } from "./creature-scale";

describe("creature mesh scale", () => {
  it("shrinks millimetre-authored bodies down to display height", () => {
    expect(creatureMeshScale(820)).toBeCloseTo(CREATURE_DISPLAY_HEIGHT / 820);
    expect(creatureMeshScale(820)).toBeLessThan(0.01);
  });

  it("leaves metre-authored bodies near 1", () => {
    expect(creatureMeshScale(0.82)).toBeCloseTo(1);
    expect(creatureMeshScale(0.82)).toBeGreaterThan(0.5);
    expect(creatureMeshScale(0.82)).toBeLessThan(2);
  });

  it("does not explode when a mesh reports no height", () => {
    expect(creatureMeshScale(0)).toBeCloseTo(1);
    expect(creatureMeshScale(Number.NaN)).toBeCloseTo(1);
  });
});
