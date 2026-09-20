import { describe, expect, it } from "vitest";
import { CALM_SNOW_COUNT, STORM_SNOW_COUNT } from "./Ambient";

describe("ice storm snow", () => {
  it("keeps the blizzard thinner than a whiteout", () => {
    expect(STORM_SNOW_COUNT).toBeLessThan(CALM_SNOW_COUNT);
    expect(STORM_SNOW_COUNT).toBeLessThan(800);
    expect(STORM_SNOW_COUNT).toBeGreaterThan(200);
  });
});
