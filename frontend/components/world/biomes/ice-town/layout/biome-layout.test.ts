import { describe, expect, it } from "vitest";
import { ICE_TOWN_LAYOUT, districtCentre, shapePolygon } from "./biome-layout";

describe("ice town places", () => {
  it("names the six hoverable districts", () => {
    expect(ICE_TOWN_LAYOUT.districts.map((district) => district.id)).toEqual([
      "harbour",
      "town",
      "lake",
      "forest",
      "glacier",
      "station",
    ]);
    expect(ICE_TOWN_LAYOUT.districts.find((district) => district.id === "station")?.name).toBe("Research island");
    expect(ICE_TOWN_LAYOUT.districts.find((district) => district.id === "forest")?.name).toBe("Pine town");
  });

  it("gives the research island room to breathe", () => {
    expect(ICE_TOWN_LAYOUT.miniIsland.radius).toBeGreaterThanOrEqual(13);
    const station = ICE_TOWN_LAYOUT.districts.find((district) => district.id === "station")!;
    const [cx, cz] = districtCentre(station);
    const span = Math.max(
      ...shapePolygon(station.shape).map(([x, z]) => Math.hypot(x - cx, z - cz)),
    );
    expect(span).toBeGreaterThan(12);
  });
});
