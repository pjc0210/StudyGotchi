import { describe, expect, it } from "vitest";
import { clustersForRail } from "./ConceptRail";
import type { CourseOverview } from "@/lib/world/course-overview";
import type { WorldResponse } from "@/lib/world/types";

function overview(topics: CourseOverview["topics"]): CourseOverview {
  return {
    course: { id: "c", name: "Classical Mechanics II", code: "8.223", term: "IAP" },
    topics,
    unmatchedFiles: [],
    stats: { reached: 4, total: 10, mastered: 1, residents: 2, sources: 3 },
    worldVersion: "1",
  };
}

describe("clustersForRail", () => {
  it("uses a short topic list and skips unclustered dumps", () => {
    const items = clustersForRail(
      null,
      overview([
        { id: "unclustered", label: "Other concepts", concepts: [{ id: "a", label: "A", semanticState: "frontier", creatureState: "unhatched", files: [] }] },
        { id: "lagrange", label: "Lagrangian mechanics", concepts: [{ id: "b", label: "B", semanticState: "developing", creatureState: "normal", files: [] }] },
        { id: "orbit", label: "Orbits", concepts: [{ id: "c", label: "C", semanticState: "strong", creatureState: "evolved", files: [] }] },
      ]),
    );
    expect(items.map((item) => item.label)).toEqual(["Lagrangian mechanics", "Orbits"]);
  });

  it("does not list every region name as a cluster", () => {
    const world = {
      regions: [
        { concept_id: "1", name: "Angular Acceleration", cluster: null, semantic_state: "reached" },
        { concept_id: "2", name: "Canonical Momentum", cluster: null, semantic_state: "frontier" },
        { concept_id: "3", name: "Torque", cluster: "Rotation", semantic_state: "reached" },
      ],
    } as unknown as WorldResponse;
    expect(clustersForRail(world, null)).toEqual([]);
  });

  it("keeps shared cluster names when a few groups exist", () => {
    const world = {
      regions: [
        { concept_id: "1", name: "A", cluster: "Rotation", semantic_state: "reached" },
        { concept_id: "2", name: "B", cluster: "Rotation", semantic_state: "frontier" },
        { concept_id: "3", name: "C", cluster: "Energy", semantic_state: "reached" },
        { concept_id: "4", name: "D", cluster: "Energy", semantic_state: "reached" },
      ],
    } as unknown as WorldResponse;
    expect(clustersForRail(world, null).map((item) => item.label)).toEqual(["Energy", "Rotation"]);
  });
});
