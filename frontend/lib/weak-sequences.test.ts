import { describe, expect, it } from "vitest";
import { normalizeGraph } from "./api";
import { buildGraphModel } from "./graphModel";
import { CONSTELLATION_FAMILIES } from "./world/constellation-families";
import { DEMO_COURSES } from "./world/demo-courses";
import { pipelineGraphForCourse } from "./world/pipeline-assets";
import { pickWeakSequences, WEAK_SEQUENCE_MAX, WEAK_SEQUENCE_MIN, weakTraceIdsForLens } from "./weak-sequences";
import type { ConceptNode, ConceptState } from "./types";

function concept(
  partial: Pick<ConceptNode, "id" | "name"> & Partial<ConceptNode>,
): ConceptNode {
  return {
    scope: "course",
    discovery_state: "active",
    importance: 0.4,
    personal_relevance: 0.5,
    mastery: 0.3,
    familiarity: 0.4,
    confidence: 0.4,
    readiness: 0.4,
    fragility: 0.3,
    state: "struggling",
    cluster: "Kernels",
    ...partial,
  };
}

function link(
  source: string,
  target: string,
  type = "PREREQUISITE_FOR",
  kind: "concept" | "resource" = "concept",
) {
  return { id: `c:${source}->${target}`, source, target, type, kind };
}

describe("pickWeakSequences", () => {
  it("returns none when the sky is empty or every concept is mastered", () => {
    expect(pickWeakSequences([], [])).toEqual([]);

    const mastered = [
      concept({ id: "a", name: "Inner Products", mastery: 0.92, state: "mastered" }),
      concept({ id: "b", name: "Eigendecomposition", mastery: 0.88, state: "strong" }),
      concept({ id: "c", name: "Gram Matrices", mastery: 0.81, state: "mastered" }),
    ];
    expect(
      pickWeakSequences(mastered, [link("a", "b"), link("b", "c")]),
    ).toEqual([]);
  });

  it("picks 3–6 short concept-to-concept chains, not a course-wide blob", () => {
    const nodes: ConceptNode[] = [
      concept({
        id: "course",
        name: "Classical Mechanics II",
        cluster: "Classical Mechanics II",
        constellation: "Lagrangian mechanics",
        importance: 0.99,
        mastery: 0.12,
        state: "struggling",
      }),
    ];
    const links = [];

    // A giant topic web — every Lagrangian concept linked to every other.
    const blob = [
      "Action",
      "Generalized coordinates",
      "Euler-Lagrange",
      "Virtual work",
      "Holonomic constraints",
      "Lagrange multipliers",
      "Cyclic coordinates",
      "Energy function",
    ];
    for (const [index, name] of blob.entries()) {
      const id = `blob-${index}`;
      nodes.push(
        concept({
          id,
          name,
          cluster: "Lagrangian mechanics",
          constellation: "Lagrangian mechanics",
          mastery: 0.44,
          state: "uncertain",
          importance: 0.7,
        }),
      );
      links.push(link("course", id, "RELATED_TO"));
      for (let prior = 0; prior < index; prior++) {
        links.push(link(`blob-${prior}`, id, "RELATED_TO"));
      }
    }

    // Specific weak chains the student should actually see.
    const chains: { ids: string[]; names: string[]; mastery: number; state: ConceptState }[] = [
      {
        ids: ["psd", "mercer"],
        names: ["Positive Semidefinite Matrices", "Mercer's Theorem"],
        mastery: 0.18,
        state: "struggling",
      },
      {
        ids: ["gram", "kernel-trick", "rkhs"],
        names: ["Gram Matrices", "Kernel Trick", "Reproducing Kernel Hilbert Spaces"],
        mastery: 0.22,
        state: "fragile",
      },
      {
        ids: ["poisson", "hamilton"],
        names: ["Poisson brackets", "Hamilton's equations"],
        mastery: 0.28,
        state: "struggling",
      },
      {
        ids: ["noether", "conserved"],
        names: ["Noether's theorem", "Conserved quantities"],
        mastery: 0.31,
        state: "uncertain",
      },
      {
        ids: ["orbit", "radial"],
        names: ["Central-force orbits", "Radial effective potential"],
        mastery: 0.33,
        state: "stale",
      },
      {
        ids: ["rolling", "nonholonomic"],
        names: ["Rolling without slipping", "Nonholonomic constraints"],
        mastery: 0.35,
        state: "fragile",
      },
    ];

    for (const chain of chains) {
      chain.ids.forEach((id, index) => {
        nodes.push(
          concept({
            id,
            name: chain.names[index],
            cluster: chain.names[0],
            mastery: chain.mastery + index * 0.02,
            state: chain.state,
            importance: 0.35,
          }),
        );
        if (index > 0) links.push(link(chain.ids[index - 1], id));
      });
    }

    const sequences = pickWeakSequences(nodes, links);

    expect(sequences.length).toBeGreaterThanOrEqual(3);
    expect(sequences.length).toBeLessThanOrEqual(6);

    for (const sequence of sequences) {
      expect(sequence.nodeIds.length).toBeGreaterThanOrEqual(2);
      expect(sequence.nodeIds.length).toBeLessThanOrEqual(4);
      expect(sequence.edgeIds.length).toBe(sequence.nodeIds.length - 1);
      expect(sequence.nodeIds).not.toContain("course");
    }

    const covered = new Set(sequences.flatMap((sequence) => sequence.nodeIds));
    expect(covered.has("psd") || covered.has("gram") || covered.has("poisson")).toBe(true);

    const blobOnly = sequences.some(
      (sequence) => sequence.nodeIds.length >= 5 && sequence.nodeIds.every((id) => id.startsWith("blob-") || id === "course"),
    );
    expect(blobOnly).toBe(false);
  });

  it("prefers the weakest short links and skips isolated needs-work stars", () => {
    const nodes = [
      concept({ id: "lonely", name: "Orphan gap", mastery: 0.05, state: "struggling" }),
      concept({ id: "a", name: "A", mastery: 0.1, state: "struggling" }),
      concept({ id: "b", name: "B", mastery: 0.12, state: "struggling" }),
      concept({ id: "c", name: "C", mastery: 0.4, state: "uncertain" }),
      concept({ id: "d", name: "D", mastery: 0.42, state: "uncertain" }),
      concept({ id: "ok", name: "Mastered neighbor", mastery: 0.9, state: "mastered" }),
    ];
    const sequences = pickWeakSequences(nodes, [
      link("a", "b"),
      link("c", "d", "RELATED_TO"),
      link("a", "ok"),
    ]);

    expect(sequences.map((sequence) => sequence.nodeIds)).toEqual([["a", "b"], ["c", "d"]]);
    expect(sequences[0]!.edgeIds).toEqual(["c:a->b"]);
    expect(sequences.every((sequence) => !sequence.nodeIds.includes("lonely"))).toBe(true);
    expect(sequences.every((sequence) => !sequence.nodeIds.includes("ok"))).toBe(true);
  });

  it("mounts red traces only while the Weak Areas lens is selected", () => {
    const sequences = pickWeakSequences(
      [
        concept({ id: "a", name: "A", mastery: 0.1, state: "struggling" }),
        concept({ id: "b", name: "B", mastery: 0.12, state: "struggling" }),
      ],
      [link("a", "b")],
    );
    expect(weakTraceIdsForLens("weak", sequences)).toEqual(["c:a->b"]);
    expect(weakTraceIdsForLens("all", sequences)).toEqual([]);
    expect(weakTraceIdsForLens("mine", sequences)).toEqual([]);
  });

  it("keeps 8.223 weak traces as a handful of specific concept chains", () => {
    const graph = normalizeGraph(pipelineGraphForCourse(DEMO_COURSES[0].id));
    const model = buildGraphModel(graph, []);
    const sequences = pickWeakSequences(graph.nodes, model.links);
    expect(sequences.length).toBeGreaterThanOrEqual(WEAK_SEQUENCE_MIN);
    expect(sequences.length).toBeLessThanOrEqual(WEAK_SEQUENCE_MAX);
    const family = new Set<string>(CONSTELLATION_FAMILIES);
    for (const sequence of sequences) {
      expect(sequence.nodeIds.length).toBeGreaterThanOrEqual(2);
      expect(sequence.nodeIds.length).toBeLessThanOrEqual(4);
      expect(sequence.labels.some((label) => family.has(label))).toBe(false);
    }
  });
});
