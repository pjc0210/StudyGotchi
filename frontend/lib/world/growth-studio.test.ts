import { describe, expect, it } from "vitest";
import { visualForGlobeBiome } from "@/components/world/biomes/types";
import {
  DEMO_GROWTH_COURSES,
  GROWTH_STAGES,
  assignPlaces,
  landmarkStageForProgress,
  nearestGrowthStage,
  placeStateAtProgress,
  progressForStage,
} from "./growth-studio";

describe("growth studio mapping", () => {
  it("maps each demo-data course onto the product biome and land", () => {
    const byCode = Object.fromEntries(
      DEMO_GROWTH_COURSES.filter((course) => course.role === "live").map((course) => [course.code, course]),
    );
    expect(byCode["8.223"]).toMatchObject({
      globeBiome: "sand",
      land: "frontier-town",
      landName: "Frontier Town",
    });
    expect(byCode["6.1400"]).toMatchObject({
      globeBiome: "forest",
      land: "jungle-forest-village",
      landName: "Jungle / Forest Village",
    });
    const snapshot = Object.fromEntries(
      DEMO_GROWTH_COURSES.filter((course) => course.role === "snapshot").map((course) => [course.code, course]),
    );
    expect(snapshot["18.06"]).toMatchObject({
      globeBiome: "city",
      land: "medieval-meadow-kingdom",
    });
    expect(snapshot["CS-4780"].land).toBe(visualForGlobeBiome(snapshot["CS-4780"].globeBiome));
    for (const course of DEMO_GROWTH_COURSES) {
      expect(visualForGlobeBiome(course.globeBiome)).toBe(course.land);
    }
  });

  it("puts ontology / world clusters into named districts on that land", () => {
    const jungle = DEMO_GROWTH_COURSES.find((course) => course.code === "6.1400")!;
    const places = assignPlaces(jungle);
    expect(places.map((place) => place.districtName)).toContain("Great Canopy Village");
    expect(places.some((place) => place.cluster === "Regular Language")).toBe(true);
    expect(places.some((place) => place.cluster === "Deterministic Finite Automaton (DFA)")).toBe(true);

    const frontier = DEMO_GROWTH_COURSES.find((course) => course.code === "8.223")!;
    const frontierPlaces = assignPlaces(frontier);
    expect(frontierPlaces[0]).toMatchObject({
      cluster: "Canonical Momentum",
      districtName: "Main Town",
    });
    expect(frontierPlaces.map((place) => place.districtName)).toContain("Grand Railway");
  });

  it("scrubs the product growth ladder, not a made-up set of looks", () => {
    expect(GROWTH_STAGES.map((stage) => stage.id)).toEqual([
      "empty",
      "arriving",
      "sprouting",
      "populated",
      "mastered",
    ]);
    expect(progressForStage("empty")).toBe(0);
    expect(progressForStage("mastered")).toBe(1);
    expect(nearestGrowthStage(0)).toBe("empty");
    expect(nearestGrowthStage(0.3)).toBe("sprouting");
    expect(nearestGrowthStage(0.62)).toBe("populated");
    expect(nearestGrowthStage(1)).toBe("mastered");
    expect(landmarkStageForProgress(0)).toBe("stake");
    expect(landmarkStageForProgress(0.28)).toBe("s1");
    expect(landmarkStageForProgress(0.62)).toBe("s2");
    expect(landmarkStageForProgress(1)).toBe("s3");
  });

  it("staggers subsection spots so earlier districts sprout first", () => {
    const places = assignPlaces(DEMO_GROWTH_COURSES.find((course) => course.code === "6.1400")!);
    expect(placeStateAtProgress(places[0], 0)).toMatchObject({ semantic: "frontier", spot: 0, resident: false });
    expect(placeStateAtProgress(places[0], 0.28).spot).toBe(1);
    expect(placeStateAtProgress(places[0], 0.62)).toMatchObject({ spot: 2, resident: true });
    expect(placeStateAtProgress(places[places.length - 1], 0.12).semantic).toBe("frontier");
    expect(placeStateAtProgress(places[places.length - 1], 1).semantic).toBe("mastered");
  });
});
