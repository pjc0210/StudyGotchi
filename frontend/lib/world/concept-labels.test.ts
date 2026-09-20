import { describe, expect, it } from "vitest";
import graph from "./pipeline/8.223-knowledge-graph.json";
import { displayClusterName, displayConceptName, looksBrokenConceptName } from "./concept-labels";
import { CONSTELLATION_FAMILIES, constellationFamily } from "./constellation-families";

describe("8.223 concept names", () => {
  it("replaces failed TeX with readable English", () => {
    expect(displayConceptName("Euler-Lagrange Equation Derived Frequencies \\(\\omega_p\\) and \\(\\omega_s\\)")).toBe(
      "Euler-Lagrange Derived Frequencies",
    );
    expect(displayConceptName("Angular Velocity Vector (\\(\\vec{\\omega}\\))")).toBe("Angular Velocity Vector");
    expect(displayConceptName("Constraint Equation Function \\(f(\\vec{q}_t, t) = 0\\)")).toBe("Constraint Equation");
    expect(displayConceptName("Relation Between Scattering Angle θ and ω")).toBe("Scattering Angle and Frequency");
    expect(displayConceptName("Natural Frequency of Single Pendulum (ω₀)")).toBe("Natural Frequency of a Pendulum");
    expect(displayConceptName("Lagrangian Formalism")).toBe("Lagrangian Formalism");
    expect(displayConceptName("Euler-Lagrange Equation")).toBe("Euler-Lagrange Equation");
    expect(displayConceptName("Canonical Momentum")).toBe("Canonical Momentum");
  });

  it("cleans every pipeline node and cluster so the sky never shows broken TeX", () => {
    const nodes = (graph as { nodes: { name: string; cluster?: string }[] }).nodes;
    expect(nodes.length).toBe(186);
    for (const node of nodes) {
      const name = displayConceptName(node.name);
      const cluster = displayClusterName(node.cluster);
      expect(looksBrokenConceptName(name), name).toBe(false);
      expect(name).not.toMatch(/\\frac|\\omega|\\vec|Lagrangianfo-/);
      expect(name.length).toBeGreaterThan(3);
      if (cluster) {
        expect(looksBrokenConceptName(cluster), cluster).toBe(false);
      }
    }
  });
});

describe("constellation families", () => {
  it("groups the 8.223 clusters into the eight general sky names", () => {
    expect(constellationFamily("Canonical Momentum")).toBe("Hamiltonian mechanics");
    expect(constellationFamily("Lagrangian Formalism")).toBe("Lagrangian mechanics");
    expect(constellationFamily("Noether's Theorem")).toBe("Conserved quantities");
    expect(constellationFamily("Lagrange Multipliers")).toBe("Constrained motion");
    expect(constellationFamily("Lorentz Force Law")).toBe("Electromagnetism");
    expect(constellationFamily("General Solution for Simple Harmonic Oscillator")).toBe("Oscillations");
    expect(constellationFamily("Orbital Energy and Conic Sections Relationship")).toBe("Orbital motion");
    expect(constellationFamily("Angular Velocity Vector")).toBe("Rigid body motion");
  });

  it("covers every 8.223 node with a top-level constellation", () => {
    const nodes = (graph as { nodes: { name: string; cluster?: string }[] }).nodes;
    const families = new Set<string>();
    for (const node of nodes) {
      const family = constellationFamily(node.cluster, node.name);
      expect(family, node.name).toBeTruthy();
      families.add(family!);
    }
    expect([...families].sort()).toEqual([...CONSTELLATION_FAMILIES].sort());
  });
});
