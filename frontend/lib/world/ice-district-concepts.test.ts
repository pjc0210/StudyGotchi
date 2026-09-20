import { describe, expect, it } from "vitest";
import world from "./pipeline/8.223-world.json";
import {
  ICE_DISTRICT_CONCEPTS,
  ICE_DISTRICT_ORDER,
  conceptsForIceDistrict,
  conceptsFromWorldRegions,
  generalConceptLabel,
} from "./ice-district-concepts";

describe("ice district concepts", () => {
  it("maps the 8.223 general clusters onto the six land places", () => {
    expect(conceptsForIceDistrict("harbour")).toEqual(["Canonical Momentum", "Lorentz Force Law"]);
    expect(conceptsForIceDistrict("town")).toContain("Lagrangian Formalism");
    expect(conceptsForIceDistrict("lake")).toContain("Euler-Lagrange");
    expect(conceptsForIceDistrict("forest")).toContain("Lagrangian for Rolling Cylinder");
    expect(conceptsForIceDistrict("glacier")).toContain("Noether's Theorem");
    expect(conceptsForIceDistrict("station")).toContain("Poisson Brackets");
    expect(conceptsForIceDistrict("void")).toEqual([]);
  });

  it("shortens long 8.223 cluster titles to the general idea", () => {
    expect(generalConceptLabel("Euler-Lagrange Equation with Holonomic Constraint and Lagrange Multiplier")).toBe(
      "Euler-Lagrange",
    );
    expect(generalConceptLabel("Energy Conservation in Lagrangian Mechanics")).toBe("Energy Conservation");
    expect(generalConceptLabel("Canonical Momentum")).toBe("Canonical Momentum");
  });

  it("places live 8.223 world clusters on the same districts", () => {
    const mapped = conceptsFromWorldRegions(world.regions);
    expect(ICE_DISTRICT_ORDER.every((id) => mapped[id].length >= 2)).toBe(true);
    expect(mapped.harbour).toContain("Canonical Momentum");
    expect(mapped.town).toContain("Lagrangian Formalism");
    expect(mapped.lake).toContain("Euler-Lagrange");
    expect(mapped.glacier).toContain("Noether's Theorem");
  });

  it("keeps the fallback map when the world is empty", () => {
    expect(conceptsFromWorldRegions([])).toEqual(ICE_DISTRICT_CONCEPTS);
  });
});
