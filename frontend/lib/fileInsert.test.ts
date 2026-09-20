import { describe, expect, it } from "vitest";
import { planFileInsert } from "./fileInsert";
import type { ConceptNode, KnowledgeGraphResponse } from "./types";

function concept(partial: Pick<ConceptNode, "id" | "name" | "cluster"> & Partial<ConceptNode>): ConceptNode {
  return {
    scope: "course",
    discovery_state: "active",
    importance: 0.5,
    personal_relevance: 0.5,
    mastery: 0.5,
    familiarity: 0.5,
    confidence: 0.5,
    readiness: 0.5,
    fragility: 0.1,
    state: "developing",
    ...partial,
  };
}

function graph(overrides: Partial<KnowledgeGraphResponse> = {}): KnowledgeGraphResponse {
  return {
    student_id: "s",
    course_id: "c",
    graph_version: "1",
    hidden_concept_count: 0,
    nodes: [
      concept({ id: "a1", name: "A1", cluster: "Alpha", importance: 0.9 }),
      concept({ id: "a2", name: "A2", cluster: "Alpha", importance: 0.4 }),
      concept({ id: "b1", name: "B1", cluster: "Beta", importance: 0.8 }),
      concept({ id: "b2", name: "B2", cluster: "Beta", importance: 0.3 }),
    ],
    edges: [
      { source: "a1", target: "a2", type: "PREREQUISITE_FOR", origin: "course", confidence: 1 },
      { source: "b1", target: "b2", type: "PREREQUISITE_FOR", origin: "course", confidence: 1 },
    ],
    ...overrides,
  };
}

describe("planFileInsert", () => {
  it("bridges two topic clusters with a resource and a RELATED_TO edge", () => {
    const plan = planFileInsert(graph(), [], { name: "week4_kernel_notes.pdf" }, "student_self", "student_notes", 1);
    expect(plan).not.toBeNull();
    expect(plan!.resource.id).toBe("ins_1");
    expect(plan!.resource.title).toBe("week4 kernel notes");
    expect(plan!.resource.concept_ids).toHaveLength(2);

    const clusters = new Set(
      graph()
        .nodes.filter((node) => plan!.resource.concept_ids.includes(node.id))
        .map((node) => node.cluster),
    );
    expect(clusters).toEqual(new Set(["Alpha", "Beta"]));

    expect(plan!.edges).toHaveLength(1);
    expect(plan!.edges[0]).toMatchObject({
      type: "RELATED_TO",
      origin: "personal",
      source: plan!.resource.concept_ids[0],
      target: plan!.resource.concept_ids[1],
    });
  });

  it("does not add a second RELATED_TO when the concepts are already linked", () => {
    const g = graph({
      edges: [
        { source: "a1", target: "a2", type: "PREREQUISITE_FOR", origin: "course", confidence: 1 },
        { source: "b1", target: "b2", type: "PREREQUISITE_FOR", origin: "course", confidence: 1 },
        { source: "a1", target: "b1", type: "RELATED_TO", origin: "personal", confidence: 0.9 },
      ],
    });
    const plan = planFileInsert(g, [], { name: "notes.md" }, "student_self", "student_notes", 0);
    expect(plan!.resource.concept_ids.sort()).toEqual(["a1", "b1"]);
    expect(plan!.edges).toEqual([]);
  });

  it("returns null when the graph has no concepts", () => {
    expect(planFileInsert(graph({ nodes: [], edges: [] }), [], { name: "notes.pdf" }, "student_self", "student_notes", 1)).toBeNull();
    expect(planFileInsert(null, [], { name: "notes.pdf" }, "student_self", "student_notes", 1)).toBeNull();
  });
});
