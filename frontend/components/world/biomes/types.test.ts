import { describe, expect, it } from "vitest";
import { visualForGlobeBiome } from "./types";

describe("developed biome wiring", () => {
  it("maps globe palettes onto finished local lands", () => {
    expect(visualForGlobeBiome("ice")).toBe("ice-golden");
    expect(visualForGlobeBiome("sand")).toBe("frontier-town");
    expect(visualForGlobeBiome("coast")).toBe("coastal-ruins");
    expect(visualForGlobeBiome("forest")).toBe("jungle-forest-village");
    expect(visualForGlobeBiome("meadow")).toBe("medieval-meadow-kingdom");
    expect(visualForGlobeBiome("volcanic")).toBe("nordic-volcanic-highlands");
    expect(visualForGlobeBiome("city")).toBe("medieval-meadow-kingdom");
  });
});
