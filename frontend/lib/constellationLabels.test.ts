import { describe, expect, it } from "vitest";
import {
  buildSpaceClusters,
  clipSpaceLabel,
  CLUSTER_ZOOM,
  clusterLabelBudget,
  FIT_CLUSTER_ZOOM,
  nodeLabelBudget,
  spaceLabelLayer,
  tidySpaceLabel,
} from "./constellationLabels";

describe("space label zoom", () => {
  it("shows cluster names in the default space view, not every file", () => {
    expect(spaceLabelLayer(0.4)).toBe("clusters");
    expect(spaceLabelLayer(0.84)).toBe("clusters");
  });

  it("switches to truncated node names only after zooming in", () => {
    expect(spaceLabelLayer(0.85)).toBe("nodes");
    expect(spaceLabelLayer(1.6)).toBe("nodes");
  });

  it("keeps the default fit below the node-name threshold", () => {
    expect(FIT_CLUSTER_ZOOM).toBeLessThan(CLUSTER_ZOOM);
    expect(spaceLabelLayer(FIT_CLUSTER_ZOOM)).toBe("clusters");
  });
});

describe("space label clipping", () => {
  it("strips filenames down to a readable stem", () => {
    expect(tidySpaceLabel("notes/6.7900_kernel_methods_lecture.pdf")).toBe(
      "6.7900 kernel methods lecture",
    );
  });

  it("never returns a full long title", () => {
    const title = "Bishop Ch. 6 - Kernel Methods and the Representer Theorem";
    const clipped = clipSpaceLabel(title, 18);
    expect(clipped.endsWith("…")).toBe(true);
    expect(clipped.length).toBeLessThanOrEqual(18);
    expect(clipped).not.toBe(title);
  });

  it("grows a little with zoom but stays short even when forced", () => {
    expect(nodeLabelBudget(0.9, false)).toBeLessThan(nodeLabelBudget(1.4, false));
    expect(nodeLabelBudget(2.2, false)).toBeLessThan(30);
    expect(nodeLabelBudget(2.2, true)).toBeLessThanOrEqual(24);
    expect(clusterLabelBudget(0.4)).toBeLessThanOrEqual(26);
  });
});

describe("space clusters", () => {
  it("uses backend topic names instead of stacking every concept", () => {
    const clusters = buildSpaceClusters([
      { id: "a", x: 0, y: 0, kind: "concept", label: "Linear Algebra", weight: 0.9, cluster: "Foundations" },
      { id: "b", x: 10, y: 4, kind: "concept", label: "Inner Products", weight: 0.8, cluster: "Foundations" },
      { id: "c", x: 80, y: 12, kind: "concept", label: "RBF Kernel", weight: 0.7, cluster: "Kernels" },
      { id: "d", x: 88, y: 18, kind: "concept", label: "Polynomial Kernel", weight: 0.6, cluster: "Kernels" },
      { id: "file", x: 6, y: 2, kind: "resource", label: "6.7900_week4_notes.pdf", weight: 0.4 },
    ]);

    expect(clusters.map((c) => c.label).sort()).toEqual(["Foundations", "Kernels"]);
    expect(clusters.every((c) => typeof c.mastery === "number")).toBe(true);
    const foundations = clusters.find((c) => c.label === "Foundations");
    expect(foundations?.x).toBeCloseTo(5);
    expect(foundations?.y).toBeCloseTo(2);
  });

  it("generates a short constellation name when the engine left a group unnamed", () => {
    const adjacency = new Map<string, Set<string>>([
      ["k1", new Set(["k2"])],
      ["k2", new Set(["k1"])],
    ]);
    const clusters = buildSpaceClusters(
      [
        { id: "k1", x: 0, y: 0, kind: "concept", label: "Representer Theorem Notes", weight: 0.8 },
        { id: "k2", x: 8, y: 0, kind: "concept", label: "Representer Theorem Proof", weight: 0.4 },
      ],
      adjacency,
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0].label).toBe("Representer Theorem");
    expect(clusters[0].label.length).toBeLessThan(24);
  });
});
